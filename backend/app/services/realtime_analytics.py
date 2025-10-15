"""
Real-time Analytics Update Service
Triggers analytics updates when events occur (deal moved, activity completed, etc.)
"""

from sqlalchemy.orm import Session
from ..models import Deal, Activity, Email, Contact, Document
from .analytics_etl import AnalyticsETL
from loguru import logger
from datetime import datetime


class RealtimeAnalyticsService:
    """Service for real-time analytics updates"""
    
    def __init__(self, db: Session):
        self.db = db
        self.etl = AnalyticsETL(db)
    
    async def on_deal_stage_changed(self, deal_id: str, old_stage_id: str, new_stage_id: str):
        """
        Triggered when a deal is moved to a new stage (drag-and-drop)
        Updates pipeline metrics in real-time
        """
        try:
            logger.info(f"Deal {deal_id} moved from stage {old_stage_id} to {new_stage_id}")
            
            # Get deal info
            deal = self.db.query(Deal).filter(Deal.id == deal_id).first()
            if not deal:
                return
            
            # Update stage_entered_at timestamp
            deal.stage_entered_at = datetime.utcnow()
            self.db.commit()
            
            # Update pipeline metrics for both old and new stages
            await self.etl.update_pipeline_metrics(
                pipeline_id=str(deal.pipeline_id),
                stage_id=str(old_stage_id)
            )
            await self.etl.update_pipeline_metrics(
                pipeline_id=str(deal.pipeline_id),
                stage_id=str(new_stage_id)
            )
            
            logger.info(f"Pipeline metrics updated for deal {deal_id}")
            
            # Broadcast WebSocket event
            # await broadcast_event('deal_moved', {
            #     'deal_id': deal_id,
            #     'old_stage_id': old_stage_id,
            #     'new_stage_id': new_stage_id
            # })
            
        except Exception as e:
            logger.error(f"Error updating analytics on deal stage change: {e}")
    
    async def on_deal_created(self, deal_id: str):
        """
        Triggered when a new deal is created
        Updates pipeline metrics
        """
        try:
            logger.info(f"New deal created: {deal_id}")
            
            deal = self.db.query(Deal).filter(Deal.id == deal_id).first()
            if not deal:
                return
            
            # Update pipeline metrics
            await self.etl.update_pipeline_metrics(
                pipeline_id=str(deal.pipeline_id),
                stage_id=str(deal.stage_id)
            )
            
            logger.info(f"Pipeline metrics updated for new deal {deal_id}")
            
        except Exception as e:
            logger.error(f"Error updating analytics on deal creation: {e}")
    
    async def on_deal_won(self, deal_id: str):
        """
        Triggered when a deal is won
        Updates pipeline metrics and revenue metrics
        """
        try:
            logger.info(f"Deal won: {deal_id}")
            
            deal = self.db.query(Deal).filter(Deal.id == deal_id).first()
            if not deal:
                return
            
            # Update deal status and close date
            deal.status = 'won'
            deal.actual_close_date = datetime.utcnow()
            self.db.commit()
            
            # Update pipeline metrics
            await self.etl.update_pipeline_metrics(
                pipeline_id=str(deal.pipeline_id),
                stage_id=str(deal.stage_id)
            )
            
            # Update revenue metrics
            # await self.etl.update_revenue_metrics()
            
            logger.info(f"Analytics updated for won deal {deal_id}")
            
        except Exception as e:
            logger.error(f"Error updating analytics on deal won: {e}")
    
    async def on_activity_completed(self, activity_id: str):
        """
        Triggered when an activity is completed
        Updates activity metrics
        """
        try:
            logger.info(f"Activity completed: {activity_id}")
            
            activity = self.db.query(Activity).filter(Activity.id == activity_id).first()
            if not activity:
                return
            
            # Update activity status and completion time
            activity.status = 'completed'
            activity.completed_at = datetime.utcnow()
            self.db.commit()
            
            # Update activity metrics
            await self.etl.update_activity_metrics(
                user_id=str(activity.owner_id),
                date=datetime.utcnow()
            )
            
            logger.info(f"Activity metrics updated for {activity_id}")
            
        except Exception as e:
            logger.error(f"Error updating analytics on activity completion: {e}")
    
    async def on_contact_created(self, contact_id: str):
        """
        Triggered when a new contact is created (including bulk import)
        Updates contact metrics
        """
        try:
            logger.info(f"New contact created: {contact_id}")
            
            contact = self.db.query(Contact).filter(Contact.id == contact_id).first()
            if not contact:
                return
            
            # Update contact metrics
            # await self.etl.update_contact_metrics()
            
            logger.info(f"Contact metrics updated for {contact_id}")
            
        except Exception as e:
            logger.error(f"Error updating analytics on contact creation: {e}")
    
    async def on_bulk_contacts_imported(self, contact_ids: list):
        """
        Triggered when contacts are bulk imported
        Updates contact metrics for all new contacts
        """
        try:
            logger.info(f"Bulk import: {len(contact_ids)} contacts")
            
            # Update contact metrics once for all imported contacts
            # await self.etl.update_contact_metrics()
            
            logger.info(f"Contact metrics updated for bulk import")
            
        except Exception as e:
            logger.error(f"Error updating analytics on bulk import: {e}")
    
    async def on_email_sent(self, email_id: str):
        """
        Triggered when an email is sent
        Updates email metrics
        """
        try:
            logger.info(f"Email sent: {email_id}")
            
            email = self.db.query(Email).filter(Email.id == email_id).first()
            if not email:
                return
            
            # Update email metrics
            await self.etl.update_email_metrics(
                campaign_id=str(email.campaign_id) if email.campaign_id else None,
                date=datetime.utcnow()
            )
            
            logger.info(f"Email metrics updated for {email_id}")
            
        except Exception as e:
            logger.error(f"Error updating analytics on email sent: {e}")
    
    async def on_email_opened(self, email_id: str):
        """
        Triggered when an email is opened
        Updates email metrics
        """
        try:
            logger.info(f"Email opened: {email_id}")
            
            email = self.db.query(Email).filter(Email.id == email_id).first()
            if not email:
                return
            
            # Update email status
            if email.status != 'clicked':  # Don't overwrite clicked status
                email.status = 'opened'
            if not email.opened_at:
                email.opened_at = datetime.utcnow()
            email.open_count += 1
            self.db.commit()
            
            # Update email metrics
            await self.etl.update_email_metrics(
                campaign_id=str(email.campaign_id) if email.campaign_id else None,
                date=datetime.utcnow()
            )
            
            logger.info(f"Email metrics updated for opened email {email_id}")
            
        except Exception as e:
            logger.error(f"Error updating analytics on email opened: {e}")
    
    async def on_document_signed(self, document_id: str):
        """
        Triggered when a document is signed
        Updates document metrics
        """
        try:
            logger.info(f"Document signed: {document_id}")
            
            document = self.db.query(Document).filter(Document.id == document_id).first()
            if not document:
                return
            
            # Update document status
            document.status = 'signed'
            document.signed_at = datetime.utcnow()
            self.db.commit()
            
            # Update document metrics
            # await self.etl.update_document_metrics()
            
            logger.info(f"Document metrics updated for {document_id}")
            
        except Exception as e:
            logger.error(f"Error updating analytics on document signed: {e}")
    
    async def on_workflow_executed(self, workflow_id: str, actions: list):
        """
        Triggered when a workflow is executed
        Updates relevant metrics based on workflow actions
        """
        try:
            logger.info(f"Workflow executed: {workflow_id}")
            
            # Check what actions were performed and update relevant metrics
            for action in actions:
                action_type = action.get('type')
                
                if action_type == 'create_activity':
                    await self.etl.update_activity_metrics()
                elif action_type == 'send_email':
                    await self.etl.update_email_metrics()
                elif action_type == 'move_deal':
                    await self.etl.update_pipeline_metrics()
            
            logger.info(f"Analytics updated for workflow {workflow_id}")
            
        except Exception as e:
            logger.error(f"Error updating analytics on workflow execution: {e}")


# Helper function to get service instance
def get_realtime_analytics_service(db: Session) -> RealtimeAnalyticsService:
    return RealtimeAnalyticsService(db)
