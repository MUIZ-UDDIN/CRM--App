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

router = APIRouter(prefix="/analytics", tags=["admin_analytics"])


@router.get("/admin-dashboard")
async def get_admin_dashboard_analytics(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get admin dashboard analytics - Real data with proper error handling"""
    try:
        logger.info(f"✅ User {current_user.get('email')} accessing admin dashboard")
        
        # Get user's role
        user_role = current_user.get('role', 'user')
        company_id = current_user.get('company_id')
        
        # Initialize default values
        companies_count = 0
        total_users = 0
        active_users = 0
        total_deals = 0
        total_value = 0.0
        recent_activities = []
        
        # Super admin sees all data, others see only their company
        if user_role == 'super_admin':
            companies_count = db.query(Company).count()
            total_users = db.query(User).count()
            active_users = db.query(User).filter(User.is_active == True).count()
            total_deals = db.query(Deal).count()
            total_value = db.query(func.sum(Deal.value)).scalar() or 0
        else:
            companies_count = 1
            total_users = db.query(User).filter(User.company_id == company_id).count()
            active_users = db.query(User).filter(
                User.company_id == company_id,
                User.is_active == True
            ).count()
            total_deals = db.query(Deal).filter(Deal.company_id == company_id).count()
            total_value = db.query(func.sum(Deal.value)).filter(
                Deal.company_id == company_id
            ).scalar() or 0
        
        # Get recent activities (fix: use 'type' and 'subject' not 'activity_type' and 'title')
        activities_query = db.query(Activity).order_by(Activity.created_at.desc()).limit(5)
        if user_role != 'super_admin' and company_id:
            activities_query = activities_query.filter(Activity.company_id == company_id)
        
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
        
        return {
            "companies_count": companies_count,
            "active_users_count": active_users,
            "total_users_count": total_users,
            "total_deals_count": total_deals,
            "total_pipeline_value": float(total_value),
            "recent_activities": recent_activities,
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
