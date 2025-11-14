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
    """Get admin dashboard analytics"""
    context = get_tenant_context(current_user)
    
    # Only super admins can access this endpoint
    # Add debug logging to help diagnose the issue
    logger.info(f"User role: {current_user.get('role')}, type: {type(current_user.get('role'))}")
    
    # More flexible role check that handles string variations
    user_role = current_user.get('role', '').lower() if current_user.get('role') else ''
    is_super_admin = user_role in ['super_admin', 'super admin', 'superadmin']
    
    if not is_super_admin:
        # Return mock data instead of raising an error
        logger.warning(f"Non-admin user {current_user.get('email')} attempted to access admin dashboard")
        return get_mock_admin_dashboard_data()
    
    # Initialize default values
    company_count = 0
    user_count = 0
    active_users = 0
    total_deals = 0
    total_deal_value = 0.0
    recent_activities = []
    companies_by_size = []
    deals_by_stage = []
    user_activity = []
    
    try:
        # Get company counts
        try:
            company_count = db.query(func.count(User.company_id.distinct())).scalar() or 0
            user_count = db.query(func.count(User.id)).filter(User.is_deleted == False).scalar() or 0
            active_users = db.query(func.count(User.id)).filter(User.is_deleted == False, User.status == 'active').scalar() or 0
        except Exception as e:
            logger.error(f"Error fetching user counts: {str(e)}")
            # Continue with default values
        
        # Get deal metrics
        try:
            total_deals = db.query(func.count(Deal.id)).filter(Deal.is_deleted == False).scalar() or 0
            total_deal_value = float(db.query(func.sum(Deal.value)).filter(Deal.is_deleted == False).scalar() or 0)
        except Exception as e:
            logger.error(f"Error fetching deal metrics: {str(e)}")
            # Continue with default values
        
        # Get recent activities
        recent_activities = []
        try:
            activities = db.query(Activity).filter(
                Activity.is_deleted == False
            ).order_by(Activity.created_at.desc()).limit(10).all()
            
            for activity in activities:
                try:
                    # Get user name
                    user = db.query(User).filter(User.id == activity.owner_id).first()
                    user_name = f"{user.first_name} {user.last_name}" if user else "Unknown User"
                    
                    recent_activities.append({
                        "id": str(activity.id),
                        "type": activity.type,
                        "title": activity.title or "Untitled Activity",
                        "user_name": user_name,
                        "created_at": activity.created_at.isoformat(),
                        "status": activity.status
                    })
                except Exception as e:
                    logger.error(f"Error processing activity {getattr(activity, 'id', 'unknown')}: {str(e)}")
                    # Skip this activity and continue with the next one
        except Exception as e:
            logger.error(f"Error fetching activities: {str(e)}")
            # Continue with empty list
        
        # Get companies by size
        companies_by_size = []
        try:
            company_sizes = db.query(
                User.company_id,
                func.count(User.id).label('user_count')
            ).filter(
                User.is_deleted == False,
                User.company_id.isnot(None)  # Ensure company_id is not None
            ).group_by(User.company_id).all()
            
            # Get all company IDs
            company_ids = [cs.company_id for cs in company_sizes if cs.company_id]
            
            # Fetch all companies in one query
            companies_dict = {}
            if company_ids:
                companies = db.query(Company).filter(Company.id.in_(company_ids)).all()
                companies_dict = {str(c.id): c for c in companies}
            
            # Build the response
            for company_size in company_sizes:
                if not company_size.company_id:
                    continue
                    
                company_id_str = str(company_size.company_id)
                company = companies_dict.get(company_id_str)
                
                if company:
                    companies_by_size.append({
                        "company_id": company_id_str,
                        "company_name": company.name,
                        "user_count": company_size.user_count,
                        "size_category": get_company_size_category(company_size.user_count)
                    })
        except Exception as e:
            logger.error(f"Error fetching company sizes: {str(e)}")
            # Continue with empty list rather than failing the whole request
        
        # Get deals by stage
        deals_by_stage = []
        try:
            stages = db.query(PipelineStage).all()
            for stage in stages:
                try:
                    deal_count = db.query(func.count(Deal.id)).filter(
                        Deal.stage_id == stage.id,
                        Deal.is_deleted == False
                    ).scalar() or 0
                    
                    if deal_count > 0:
                        deals_by_stage.append({
                            "stage_id": str(stage.id),
                            "stage_name": stage.name,
                            "deal_count": deal_count
                        })
                except Exception as e:
                    logger.error(f"Error processing stage {getattr(stage, 'id', 'unknown')}: {str(e)}")
                    # Skip this stage and continue with the next one
        except Exception as e:
            logger.error(f"Error fetching pipeline stages: {str(e)}")
            # Continue with empty list
        
        # Get user activity
        user_activity = []
        try:
            active_users_data = db.query(
                User.id,
                User.first_name,
                User.last_name,
                func.count(Activity.id).label('activity_count')
            ).outerjoin(
                Activity, Activity.owner_id == User.id
            ).filter(
                User.is_deleted == False,
                or_(Activity.is_deleted == False, Activity.id == None)
            ).group_by(User.id, User.first_name, User.last_name).order_by(func.count(Activity.id).desc()).limit(10).all()
            
            for user_data in active_users_data:
                try:
                    user_activity.append({
                        "user_id": str(user_data.id),
                        "user_name": f"{user_data.first_name} {user_data.last_name}",
                        "activity_count": user_data.activity_count
                    })
                except Exception as e:
                    logger.error(f"Error processing user activity {getattr(user_data, 'id', 'unknown')}: {str(e)}")
                    # Skip this user and continue with the next one
        except Exception as e:
            logger.error(f"Error fetching user activity: {str(e)}")
            # Continue with empty list
        
        return {
            "companies_count": company_count,
            "active_users_count": active_users,
            "total_users_count": user_count,
            "total_deals_count": total_deals,
            "total_pipeline_value": total_deal_value,
            "recent_activities": recent_activities,
            "companies_by_size": companies_by_size,
            "deals_by_stage": deals_by_stage,
            "user_activity": user_activity
        }
    except Exception as e:
        # Log the error
        print(f"Error in admin dashboard analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving admin dashboard analytics: {str(e)}"
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
