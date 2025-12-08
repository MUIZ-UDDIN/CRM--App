"""
Admin Analytics API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_, case
import uuid

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.deals import Deal, Pipeline, PipelineStage, DealStatus
from app.models.activities import Activity
from app.models.contacts import Contact
from app.models.users import User, Team
from app.models.companies import Company
from app.middleware.tenant import get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission
import logging

# Set up logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin-analytics", tags=["admin_analytics"])


@router.get("/dashboard")
async def get_admin_dashboard_analytics(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get admin dashboard analytics - Real data with proper error handling"""
    try:
        logger.info(f"✅ User {current_user.get('email')} accessing admin dashboard")
        
        # Get user's role and IDs
        user_role = current_user.get('role', 'user')
        user_id = uuid.UUID(current_user.get('id')) if current_user.get('id') else None
        company_id = uuid.UUID(current_user.get('company_id')) if current_user.get('company_id') else None
        user_team_id = uuid.UUID(current_user.get('team_id')) if current_user.get('team_id') else None
        
        # Initialize default values
        companies_count = 0
        total_users = 0
        active_users = 0
        total_deals = 0
        total_value = 0.0
        recent_activities = []
        upcoming_activities = []
        
        # Role-based data access
        if user_role == 'super_admin':
            # Super admin sees all data
            companies_count = db.query(Company).count()
            total_users = db.query(User).count()
            active_users = db.query(User).filter(User.is_active == True).count()
            total_deals = db.query(Deal).filter(Deal.is_deleted == False).count()
            total_value = db.query(func.sum(Deal.value)).filter(Deal.is_deleted == False).scalar() or 0
        elif user_role == 'company_admin':
            # Company admin sees company-wide data
            companies_count = 1
            total_users = db.query(User).filter(User.company_id == company_id).count()
            active_users = db.query(User).filter(
                User.company_id == company_id,
                User.is_active == True
            ).count()
            total_deals = db.query(Deal).filter(
                Deal.company_id == company_id,
                Deal.is_deleted == False
            ).count()
            total_value = db.query(func.sum(Deal.value)).filter(
                Deal.company_id == company_id,
                Deal.is_deleted == False
            ).scalar() or 0
        elif user_role == 'sales_manager' and user_team_id:
            # Sales manager sees only their team's data
            companies_count = 1
            team_user_ids = [u.id for u in db.query(User).filter(
                User.team_id == user_team_id,
                User.is_deleted == False
            ).all()]
            total_users = len(team_user_ids)
            active_users = db.query(User).filter(
                User.team_id == user_team_id,
                User.is_active == True,
                User.is_deleted == False
            ).count()
            total_deals = db.query(Deal).filter(
                Deal.company_id == company_id,
                Deal.owner_id.in_(team_user_ids),
                Deal.is_deleted == False
            ).count()
            total_value = db.query(func.sum(Deal.value)).filter(
                Deal.company_id == company_id,
                Deal.owner_id.in_(team_user_ids),
                Deal.is_deleted == False
            ).scalar() or 0
        else:
            # Sales rep and other users see only their own data
            companies_count = 1
            total_users = 1
            active_users = 1 if current_user.get('is_active') else 0
            total_deals = db.query(Deal).filter(
                Deal.company_id == company_id,
                Deal.owner_id == user_id,
                Deal.is_deleted == False
            ).count()
            total_value = db.query(func.sum(Deal.value)).filter(
                Deal.company_id == company_id,
                Deal.owner_id == user_id,
                Deal.is_deleted == False
            ).scalar() or 0
        
        # Get recent activities with role-based filtering
        activities_query = db.query(Activity).filter(
            Activity.created_at >= datetime.now() - timedelta(days=30),
            Activity.is_deleted == False
        )
        if user_role == 'super_admin':
            # Super admin sees all recent activities
            pass
        elif user_role == 'company_admin':
            # Company admin sees company activities
            activities_query = activities_query.filter(Activity.company_id == company_id)
        elif user_role == 'sales_manager' and user_team_id:
            # Sales manager sees only their team's activities
            activities_query = activities_query.filter(
                Activity.company_id == company_id,
                Activity.owner_id.in_(team_user_ids)
            )
        else:
            # Sales rep sees only their own activities
            activities_query = activities_query.filter(
                Activity.company_id == company_id,
                Activity.owner_id == user_id
            )
        activities_query = activities_query.order_by(Activity.created_at.desc()).limit(5)
        
        for activity in activities_query.all():
            try:
                user = db.query(User).filter(User.id == activity.owner_id).first()
                recent_activities.append({
                    "id": str(activity.id),
                    "type": str(activity.type.value) if hasattr(activity.type, 'value') else str(activity.type),
                    "title": activity.subject or f"{activity.type} activity",
                    "user_name": f"{user.first_name} {user.last_name}" if user else "Unknown",
                    "created_at": activity.created_at.isoformat(),
                    "status": str(activity.status.value) if hasattr(activity.status, 'value') else str(activity.status)
                })
            except Exception as e:
                logger.error(f"Error processing activity: {str(e)}")
                continue
        
        # Get upcoming activities with role-based filtering
        upcoming_query = db.query(Activity).filter(
            Activity.due_date >= datetime.now(),
            Activity.status != 'completed',
            Activity.is_deleted == False
        )
        if user_role == 'super_admin':
            # Super admin sees all upcoming activities
            pass
        elif user_role == 'company_admin':
            # Company admin sees company upcoming activities
            upcoming_query = upcoming_query.filter(Activity.company_id == company_id)
        elif user_role == 'sales_manager' and user_team_id:
            # Sales manager sees only their team's upcoming activities
            upcoming_query = upcoming_query.filter(
                Activity.company_id == company_id,
                Activity.owner_id.in_(team_user_ids)
            )
        else:
            # Sales rep sees only their own upcoming activities
            upcoming_query = upcoming_query.filter(
                Activity.company_id == company_id,
                Activity.owner_id == user_id
            )
        upcoming_query = upcoming_query.order_by(Activity.due_date.asc()).limit(5)
        
        for activity in upcoming_query.all():
            try:
                user = db.query(User).filter(User.id == activity.owner_id).first()
                upcoming_activities.append({
                    "id": str(activity.id),
                    "type": str(activity.type.value) if hasattr(activity.type, 'value') else str(activity.type),
                    "title": activity.subject or f"{activity.type} activity",
                    "user_name": f"{user.first_name} {user.last_name}" if user else "Unknown",
                    "due_date": activity.due_date.isoformat() if activity.due_date else None,
                    "status": str(activity.status.value) if hasattr(activity.status, 'value') else str(activity.status)
                })
            except Exception as e:
                logger.error(f"Error processing upcoming activity: {str(e)}")
                continue
        
        # Get pipeline stage progress (deal value and counts per stage)
        pipeline_stages = []
        
        # For Super Admin: Aggregate by stage name across all companies
        # For others: Group by individual stage ID
        if user_role == 'super_admin':
            # Super Admin: Aggregate all stages with same name across all companies
            stages_query = db.query(
                PipelineStage.name,
                func.count(Deal.id).label('deal_count'),
                func.coalesce(func.sum(Deal.value), 0).label('total_value')
            ).join(
                Pipeline, PipelineStage.pipeline_id == Pipeline.id
            ).outerjoin(
                Deal, and_(
                    Deal.stage_id == PipelineStage.id,
                    Deal.is_deleted == False
                )
            ).group_by(
                PipelineStage.name
            ).order_by(
                func.sum(Deal.value).desc()  # Order by total value descending
            )
        else:
            # Other roles: Group by individual stage ID
            stages_query = db.query(
                PipelineStage.id,
                PipelineStage.name,
                PipelineStage.order_index,
                func.count(Deal.id).label('deal_count'),
                func.coalesce(func.sum(Deal.value), 0).label('total_value')
            ).outerjoin(
                Deal, and_(
                    Deal.stage_id == PipelineStage.id,
                    Deal.is_deleted == False
                )
            )
            
            # Apply role-based filtering
            if user_role == 'company_admin' and company_id:
                # Company Admin sees only their company's stages
                stages_query = stages_query.join(
                    Pipeline, PipelineStage.pipeline_id == Pipeline.id
                ).filter(Pipeline.company_id == company_id)
            elif user_role == 'sales_manager' and user_team_id:
                # Sales Manager sees only their team's deals
                stages_query = stages_query.join(
                    Pipeline, PipelineStage.pipeline_id == Pipeline.id
                ).filter(
                    Pipeline.company_id == company_id,
                    Deal.owner_id.in_(team_user_ids)
                )
            else:
                # Sales Rep and other users see only their own deals
                stages_query = stages_query.join(
                    Pipeline, PipelineStage.pipeline_id == Pipeline.id
                ).filter(
                    Pipeline.company_id == company_id,
                    Deal.owner_id == user_id
                )
            
            stages_query = stages_query.group_by(
                PipelineStage.id,
                PipelineStage.name,
                PipelineStage.order_index
            ).order_by(PipelineStage.order_index)
        
        total_value_in_stages = 0
        for stage in stages_query.all():
            deal_count = stage.deal_count or 0
            stage_value = float(stage.total_value or 0)
            
            # Only include stages that have deals
            if deal_count > 0:
                total_value_in_stages += stage_value
                
                # For Super Admin: stage object only has name, deal_count, total_value
                # For others: stage object has id, name, order_index, deal_count, total_value
                if user_role == 'super_admin':
                    pipeline_stages.append({
                        "stage_name": stage.name,
                        "deal_count": deal_count,
                        "total_value": stage_value
                    })
                else:
                    pipeline_stages.append({
                        "stage_id": str(stage.id),
                        "stage_name": stage.name,
                        "deal_count": deal_count,
                        "total_value": stage_value,
                        "order_index": stage.order_index
                    })
        
        # Calculate percentages based on value
        for stage in pipeline_stages:
            if total_value_in_stages > 0:
                stage["percentage"] = round((stage["total_value"] / total_value_in_stages) * 100, 1)
            else:
                stage["percentage"] = 0
        
        return {
            "companies_count": companies_count,
            "active_users_count": active_users,
            "total_users_count": total_users,
            "total_deals_count": total_deals,
            "total_pipeline_value": float(total_value),
            "recent_activities": recent_activities,
            "upcoming_activities": upcoming_activities,
            "pipeline_stages": pipeline_stages,
            "companies_by_size": [],
            "deals_by_stage": [],
            "user_activity": []
        }
    except Exception as e:
        logger.error(f"❌ Error in admin dashboard: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch admin dashboard data: {str(e)}"
        )


@router.get("/companies")
async def get_companies_analytics(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get companies analytics - Super Admin only"""
    try:
        user_role = current_user.get('role', 'user')
        
        # Only super admins can see all companies
        if user_role != 'super_admin':
            raise HTTPException(
                status_code=403,
                detail="Only Super Admins can view all companies analytics"
            )
        
        # Get all companies with user counts
        companies = db.query(Company).all()
        companies_data = []
        
        for company in companies:
            user_count = db.query(User).filter(User.company_id == company.id).count()
            deal_count = db.query(Deal).filter(Deal.company_id == company.id).count()
            total_value = db.query(func.sum(Deal.value)).filter(
                Deal.company_id == company.id
            ).scalar() or 0
            
            # Check if this company has any super admin users
            has_super_admin = db.query(User).filter(
                User.company_id == company.id,
                User.role == 'super_admin'
            ).count() > 0
            
            # Set defaults for NULL/empty values
            plan = company.plan if company.plan else 'free'
            subscription_status = company.subscription_status if company.subscription_status else 'trial'
            
            # Super admin company should have special treatment
            if has_super_admin:
                plan = 'super_admin'
                subscription_status = 'active'
            else:
                # If plan is 'pro' but subscription_status is 'trial', it means no billing configured yet
                # Show as TRIAL instead of PRO
                if plan == 'pro' and subscription_status == 'trial':
                    plan = 'free'  # Will display as TRIAL in frontend
            
            # Calculate days remaining for trial accounts
            days_remaining = None
            if subscription_status == 'trial' and company.trial_ends_at:
                from datetime import datetime
                now = datetime.utcnow()
                trial_end = company.trial_ends_at
                # Remove timezone info for comparison if present
                if trial_end.tzinfo is not None:
                    trial_end = trial_end.replace(tzinfo=None)
                days_left = (trial_end - now).days
                days_remaining = max(0, days_left)
            
            companies_data.append({
                "id": str(company.id),
                "name": company.name,
                "plan": plan,
                "subscription_status": subscription_status,
                "trial_ends_at": company.trial_ends_at.isoformat() if company.trial_ends_at else None,
                "days_remaining": days_remaining,
                "user_count": user_count,
                "deal_count": deal_count,
                "total_value": float(total_value),
                "status": company.status if hasattr(company, 'status') else "active",
                "created_at": company.created_at.isoformat() if company.created_at else None,
                "domain": company.domain if hasattr(company, 'domain') else None,
                "logo_url": company.logo_url if hasattr(company, 'logo_url') else None,
                "timezone": company.timezone if hasattr(company, 'timezone') else "UTC",
                "currency": company.currency if hasattr(company, 'currency') else "USD",
                "is_super_admin_company": has_super_admin
            })
        
        return {
            "companies": companies_data,
            "total_companies": len(companies_data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching companies analytics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch companies analytics: {str(e)}"
        )


def get_company_size_category(user_count: int) -> str:
    """Categorize company by size"""
    if user_count <= 5:
        return "Small"
    elif user_count <= 20:
        return "Medium"
    else:
        return "Large"


def get_mock_admin_dashboard_data() -> dict:
    """Return mock admin dashboard data when real data is unavailable"""
    logger.info("Returning mock admin dashboard data")
    return {
        "companies_count": 5,
        "active_users_count": 25,
        "total_users_count": 30,
        "total_deals_count": 120,
        "total_pipeline_value": 1250000.0,
        "recent_activities": [
            {
                "id": "1",
                "type": "call",
                "title": "Sales call with Acme Corp",
                "user_name": "John Doe",
                "created_at": datetime.utcnow().isoformat(),
                "status": "completed"
            },
            {
                "id": "2",
                "type": "email",
                "title": "Follow-up email to XYZ Inc",
                "user_name": "Jane Smith",
                "created_at": datetime.utcnow().isoformat(),
                "status": "completed"
            },
            {
                "id": "3",
                "type": "meeting",
                "title": "Product demo for ABC Ltd",
                "user_name": "Mike Johnson",
                "created_at": datetime.utcnow().isoformat(),
                "status": "pending"
            }
        ],
        "companies_by_size": [
            {
                "company_id": "1",
                "company_name": "Acme Corporation",
                "user_count": 12,
                "size_category": "Medium"
            },
            {
                "company_id": "2",
                "company_name": "XYZ Industries",
                "user_count": 25,
                "size_category": "Large"
            },
            {
                "company_id": "3",
                "company_name": "ABC Limited",
                "user_count": 5,
                "size_category": "Small"
            }
        ],
        "deals_by_stage": [
            {
                "stage_id": "1",
                "stage_name": "Lead",
                "deal_count": 45
            },
            {
                "stage_id": "2",
                "stage_name": "Qualified",
                "deal_count": 32
            },
            {
                "stage_id": "3",
                "stage_name": "Proposal",
                "deal_count": 18
            },
            {
                "stage_id": "4",
                "stage_name": "Negotiation",
                "deal_count": 15
            },
            {
                "stage_id": "5",
                "stage_name": "Closed Won",
                "deal_count": 10
            }
        ],
        "user_activity": [
            {
                "user_id": "1",
                "user_name": "John Doe",
                "activity_count": 42
            },
            {
                "user_id": "2",
                "user_name": "Jane Smith",
                "activity_count": 38
            },
            {
                "user_id": "3",
                "user_name": "Mike Johnson",
                "activity_count": 35
            }
        ]
    }
