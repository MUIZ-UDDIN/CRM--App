"""
Analytics ETL (Extract, Transform, Load) Service
Updates analytics tables with aggregated data from source tables
Can be run as scheduled job (e.g., via Celery) or triggered on events
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from datetime import datetime, timedelta
from ..models import (
    Deal, Pipeline, PipelineStage, Activity, Email, Contact,
    Document, User, Team,
    PipelineMetrics, ActivityMetrics, EmailMetrics, CallMetrics,
    ContactMetrics, DocumentMetrics, RevenueMetrics
)
from loguru import logger


class AnalyticsETL:
    """Analytics ETL service for updating metrics tables"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def update_pipeline_metrics(self, pipeline_id: str = None, stage_id: str = None):
        """
        Update pipeline metrics table
        Aggregates deal data by pipeline and stage
        """
        try:
            logger.info(f"Updating pipeline metrics for pipeline={pipeline_id}, stage={stage_id}")
            
            # Build query filters
            filters = []
            if pipeline_id:
                filters.append(Deal.pipeline_id == pipeline_id)
            if stage_id:
                filters.append(Deal.stage_id == stage_id)
            
            # Get all pipeline-stage combinations
            query = self.db.query(
                Deal.pipeline_id,
                Deal.stage_id,
                func.count(Deal.id).label('deal_count'),
                func.sum(Deal.value).label('total_value'),
                func.avg(Deal.value).label('avg_value'),
                func.avg(
                    func.extract('epoch', Deal.updated_at - Deal.stage_entered_at) / 86400
                ).label('avg_duration_days'),
                func.sum(func.case((Deal.status == 'won', 1), else_=0)).label('deals_won'),
                func.sum(func.case((Deal.status == 'lost', 1), else_=0)).label('deals_lost')
            ).filter(
                Deal.is_deleted == False,
                *filters
            ).group_by(
                Deal.pipeline_id,
                Deal.stage_id
            )
            
            results = query.all()
            
            for result in results:
                # Calculate derived metrics
                total_closed = result.deals_won + result.deals_lost
                win_rate = (result.deals_won / total_closed * 100) if total_closed > 0 else 0
                conversion_rate = (result.deals_won / result.deal_count * 100) if result.deal_count > 0 else 0
                
                # Upsert metrics
                metric = self.db.query(PipelineMetrics).filter(
                    PipelineMetrics.pipeline_id == result.pipeline_id,
                    PipelineMetrics.stage_id == result.stage_id
                ).first()
                
                if metric:
                    # Update existing
                    metric.deal_count = result.deal_count
                    metric.total_value = result.total_value or 0
                    metric.avg_value = result.avg_value or 0
                    metric.avg_duration_days = result.avg_duration_days or 0
                    metric.deals_won = result.deals_won
                    metric.deals_lost = result.deals_lost
                    metric.win_rate = win_rate
                    metric.conversion_rate = conversion_rate
                    metric.last_updated = datetime.utcnow()
                else:
                    # Create new
                    metric = PipelineMetrics(
                        pipeline_id=result.pipeline_id,
                        stage_id=result.stage_id,
                        deal_count=result.deal_count,
                        total_value=result.total_value or 0,
                        avg_value=result.avg_value or 0,
                        avg_duration_days=result.avg_duration_days or 0,
                        deals_won=result.deals_won,
                        deals_lost=result.deals_lost,
                        win_rate=win_rate,
                        conversion_rate=conversion_rate
                    )
                    self.db.add(metric)
            
            self.db.commit()
            logger.info(f"Pipeline metrics updated successfully: {len(results)} records")
            
        except Exception as e:
            logger.error(f"Error updating pipeline metrics: {e}")
            self.db.rollback()
            raise
    
    async def update_activity_metrics(self, user_id: str = None, date: datetime = None):
        """
        Update activity metrics table
        Aggregates activity data by user, type, and date
        """
        try:
            logger.info(f"Updating activity metrics for user={user_id}, date={date}")
            
            target_date = date or datetime.utcnow().date()
            
            # Build query filters
            filters = [
                func.date(Activity.created_at) == target_date,
                Activity.is_deleted == False
            ]
            if user_id:
                filters.append(Activity.owner_id == user_id)
            
            # Aggregate by user and activity type
            query = self.db.query(
                Activity.owner_id,
                Activity.type,
                func.count(Activity.id).label('total_count'),
                func.sum(func.case((Activity.status == 'completed', 1), else_=0)).label('completed_count'),
                func.sum(func.case((Activity.status == 'overdue', 1), else_=0)).label('overdue_count'),
                func.sum(func.case((Activity.status == 'pending', 1), else_=0)).label('pending_count'),
                func.avg(Activity.duration_minutes).label('avg_duration_minutes')
            ).filter(*filters).group_by(
                Activity.owner_id,
                Activity.type
            )
            
            results = query.all()
            
            for result in results:
                completion_rate = (result.completed_count / result.total_count * 100) if result.total_count > 0 else 0
                
                # Upsert metrics
                metric = self.db.query(ActivityMetrics).filter(
                    ActivityMetrics.user_id == result.owner_id,
                    ActivityMetrics.activity_type == result.type,
                    func.date(ActivityMetrics.date) == target_date
                ).first()
                
                if metric:
                    metric.total_count = result.total_count
                    metric.completed_count = result.completed_count
                    metric.overdue_count = result.overdue_count
                    metric.pending_count = result.pending_count
                    metric.completion_rate = completion_rate
                    metric.avg_duration_minutes = result.avg_duration_minutes or 0
                    metric.last_updated = datetime.utcnow()
                else:
                    metric = ActivityMetrics(
                        user_id=result.owner_id,
                        activity_type=result.type,
                        date=target_date,
                        total_count=result.total_count,
                        completed_count=result.completed_count,
                        overdue_count=result.overdue_count,
                        pending_count=result.pending_count,
                        completion_rate=completion_rate,
                        avg_duration_minutes=result.avg_duration_minutes or 0
                    )
                    self.db.add(metric)
            
            self.db.commit()
            logger.info(f"Activity metrics updated successfully: {len(results)} records")
            
        except Exception as e:
            logger.error(f"Error updating activity metrics: {e}")
            self.db.rollback()
            raise
    
    async def update_email_metrics(self, campaign_id: str = None, date: datetime = None):
        """
        Update email metrics table
        Aggregates email data by campaign and date
        """
        try:
            logger.info(f"Updating email metrics for campaign={campaign_id}, date={date}")
            
            target_date = date or datetime.utcnow().date()
            
            filters = [
                func.date(Email.sent_at) == target_date,
                Email.is_deleted == False
            ]
            if campaign_id:
                filters.append(Email.campaign_id == campaign_id)
            
            # Aggregate email stats
            query = self.db.query(
                Email.campaign_id,
                Email.template_id,
                Email.owner_id,
                func.count(Email.id).label('sent'),
                func.sum(func.case((Email.status == 'delivered', 1), else_=0)).label('delivered'),
                func.sum(func.case((Email.status.in_(['opened', 'clicked']), 1), else_=0)).label('opened'),
                func.sum(func.case((Email.status == 'clicked', 1), else_=0)).label('clicked'),
                func.sum(func.case((Email.status == 'bounced', 1), else_=0)).label('bounced')
            ).filter(*filters).group_by(
                Email.campaign_id,
                Email.template_id,
                Email.owner_id
            )
            
            results = query.all()
            
            for result in results:
                open_rate = (result.opened / result.sent * 100) if result.sent > 0 else 0
                click_rate = (result.clicked / result.sent * 100) if result.sent > 0 else 0
                bounce_rate = (result.bounced / result.sent * 100) if result.sent > 0 else 0
                click_to_open_rate = (result.clicked / result.opened * 100) if result.opened > 0 else 0
                
                # Upsert metrics
                metric = self.db.query(EmailMetrics).filter(
                    EmailMetrics.campaign_id == result.campaign_id,
                    func.date(EmailMetrics.date) == target_date
                ).first()
                
                if metric:
                    metric.sent = result.sent
                    metric.delivered = result.delivered
                    metric.opened = result.opened
                    metric.clicked = result.clicked
                    metric.bounced = result.bounced
                    metric.open_rate = open_rate
                    metric.click_rate = click_rate
                    metric.bounce_rate = bounce_rate
                    metric.click_to_open_rate = click_to_open_rate
                    metric.last_updated = datetime.utcnow()
                else:
                    metric = EmailMetrics(
                        campaign_id=result.campaign_id,
                        template_id=result.template_id,
                        user_id=result.owner_id,
                        date=target_date,
                        sent=result.sent,
                        delivered=result.delivered,
                        opened=result.opened,
                        clicked=result.clicked,
                        bounced=result.bounced,
                        open_rate=open_rate,
                        click_rate=click_rate,
                        bounce_rate=bounce_rate,
                        click_to_open_rate=click_to_open_rate
                    )
                    self.db.add(metric)
            
            self.db.commit()
            logger.info(f"Email metrics updated successfully: {len(results)} records")
            
        except Exception as e:
            logger.error(f"Error updating email metrics: {e}")
            self.db.rollback()
            raise
    
    async def update_all_metrics(self):
        """Update all analytics metrics"""
        logger.info("Starting full analytics ETL update")
        
        await self.update_pipeline_metrics()
        await self.update_activity_metrics()
        await self.update_email_metrics()
        # Add other metric updates as needed
        
        logger.info("Full analytics ETL update completed")


# Celery task example (to be implemented with actual Celery setup)
"""
from celery import shared_task

@shared_task
def update_analytics_metrics():
    '''Scheduled task to update analytics metrics'''
    from app.core.database import SessionLocal
    
    db = SessionLocal()
    try:
        etl = AnalyticsETL(db)
        etl.update_all_metrics()
    finally:
        db.close()
"""
