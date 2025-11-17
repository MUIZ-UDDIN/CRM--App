"""
Role-based analytics API endpoints
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
from app.middleware.tenant import get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

router = APIRouter(prefix="/api/role-analytics", tags=["role_analytics"])


@router.get("/dashboard")
async def get_role_based_dashboard(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get role-based dashboard analytics"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    # Base response structure
    response = {
        "user_role": context.get_role_name(),
        "metrics": {},
        "charts": [],
        "tables": []
    }
    
    # Super Admin - Company-wide analytics (same as Company Admin)
    # Super Admin manages their own company (e.g., Sunstone), not all companies
    if context.is_super_admin():
        if not company_id:
            # Fallback: return empty metrics if no company
            response["metrics"] = {
                "total_users": 0,
                "total_teams": 0,
                "total_deals": 0,
                "total_deal_value": 0.0,
                "total_contacts": 0
            }
            return response
        
        # Get company-wide metrics (same as Company Admin)
        response["metrics"] = {
            "total_users": db.query(func.count(User.id)).filter(
                User.company_id == company_id,
                User.is_deleted == False
            ).scalar() or 0,
            "total_teams": db.query(func.count(Team.id)).filter(
                Team.company_id == company_id
            ).scalar() or 0,
            "total_deals": db.query(func.count(Deal.id)).filter(
                Deal.company_id == company_id,
                Deal.is_deleted == False
            ).scalar() or 0,
            "total_deal_value": float(db.query(func.sum(Deal.value)).filter(
                Deal.company_id == company_id,
                Deal.is_deleted == False
            ).scalar() or 0),
            "total_contacts": db.query(func.count(Contact.id)).filter(
                Contact.company_id == company_id,
                Contact.is_deleted == False
            ).scalar() or 0
        }
        
        # Add company-wide charts
        response["charts"] = [
            {
                "type": "bar",
                "title": "Deals by Team",
                "data": get_deals_by_team(db, company_id)
            },
            {
                "type": "pie",
                "title": "Deal Status Distribution",
                "data": get_deal_status_distribution(db, company_id)
            }
        ]
        
        # Add company-wide tables
        response["tables"] = [
            {
                "title": "Top Performers",
                "data": get_top_performers(db, company_id)
            }
        ]
    
    # Company Admin - Company-wide analytics
    elif has_permission(current_user, Permission.VIEW_COMPANY_ANALYTICS):
        # Get company-wide metrics
        response["metrics"] = {
            "total_users": db.query(func.count(User.id)).filter(
                User.company_id == company_id,
                User.is_deleted == False
            ).scalar() or 0,
            "total_teams": db.query(func.count(Team.id)).filter(
                Team.company_id == company_id
            ).scalar() or 0,
            "total_deals": db.query(func.count(Deal.id)).filter(
                Deal.company_id == company_id,
                Deal.is_deleted == False
            ).scalar() or 0,
            "total_deal_value": float(db.query(func.sum(Deal.value)).filter(
                Deal.company_id == company_id,
                Deal.is_deleted == False
            ).scalar() or 0),
            "total_contacts": db.query(func.count(Contact.id)).filter(
                Contact.company_id == company_id,
                Contact.is_deleted == False
            ).scalar() or 0
        }
        
        # Add company-wide charts
        response["charts"] = [
            {
                "type": "bar",
                "title": "Deals by Team",
                "data": get_deals_by_team(db, company_id)
            },
            {
                "type": "pie",
                "title": "Deal Status Distribution",
                "data": get_deal_status_distribution(db, company_id)
            }
        ]
        
        # Add company-wide tables
        response["tables"] = [
            {
                "title": "Top Performers",
                "data": get_top_performers(db, company_id)
            }
        ]
    
    # Sales Manager - Team-wide analytics
    elif has_permission(current_user, Permission.VIEW_TEAM_ANALYTICS):
        if not user_team_id:
            # Return empty metrics instead of error
            response["metrics"] = {
                "team_members": 0,
                "team_deals": 0,
                "team_deal_value": 0.0,
                "team_activities": 0
            }
            response["message"] = "You are not assigned to a team yet. Please contact your administrator."
            return response
        
        # Get team-wide metrics
        response["metrics"] = {
            "team_members": db.query(func.count(User.id)).filter(
                User.team_id == user_team_id,
                User.is_deleted == False
            ).scalar() or 0,
            "team_deals": db.query(func.count(Deal.id)).filter(
                Deal.owner_id.in_(
                    db.query(User.id).filter(User.team_id == user_team_id)
                ),
                Deal.is_deleted == False
            ).scalar() or 0,
            "team_deal_value": float(db.query(func.sum(Deal.value)).filter(
                Deal.owner_id.in_(
                    db.query(User.id).filter(User.team_id == user_team_id)
                ),
                Deal.is_deleted == False
            ).scalar() or 0),
            "team_activities": db.query(func.count(Activity.id)).filter(
                Activity.owner_id.in_(
                    db.query(User.id).filter(User.team_id == user_team_id)
                ),
                Activity.is_deleted == False
            ).scalar() or 0
        }
        
        # Add team-wide charts
        response["charts"] = [
            {
                "type": "bar",
                "title": "Team Member Performance",
                "data": get_team_member_performance(db, user_team_id)
            },
            {
                "type": "line",
                "title": "Team Activity Trend",
                "data": get_team_activity_trend(db, user_team_id)
            }
        ]
        
        # Add team-wide tables
        response["tables"] = [
            {
                "title": "Team Deals Pipeline",
                "data": get_team_deals_pipeline(db, user_team_id)
            }
        ]
    
    # Regular User / Sales Rep - Personal analytics
    # Allow all authenticated users to view their own analytics
    else:
        # Get personal metrics for any authenticated user
        try:
            user_id_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            
            response["metrics"] = {
                "my_deals": db.query(func.count(Deal.id)).filter(
                    Deal.owner_id == user_id_uuid,
                    Deal.is_deleted == False
                ).scalar() or 0,
                "my_deal_value": float(db.query(func.sum(Deal.value)).filter(
                    Deal.owner_id == user_id_uuid,
                    Deal.is_deleted == False
                ).scalar() or 0),
                "my_activities": db.query(func.count(Activity.id)).filter(
                    Activity.owner_id == user_id_uuid,
                    Activity.is_deleted == False
                ).scalar() or 0,
                "my_contacts": db.query(func.count(Contact.id)).filter(
                    Contact.owner_id == user_id_uuid,
                    Contact.is_deleted == False
                ).scalar() or 0
            }
            
            # Add personal charts
            response["charts"] = [
                {
                    "type": "pie",
                    "title": "My Deal Status",
                    "data": get_personal_deal_status(db, user_id)
                },
                {
                    "type": "line",
                    "title": "My Activity Trend",
                    "data": get_personal_activity_trend(db, user_id)
                }
            ]
            
            # Add personal tables
            response["tables"] = [
                {
                    "title": "My Recent Activities",
                    "data": get_personal_recent_activities(db, user_id)
                }
            ]
        except Exception as e:
            # If there's any error, return empty metrics instead of failing
            response["metrics"] = {
                "my_deals": 0,
                "my_deal_value": 0.0,
                "my_activities": 0,
                "my_contacts": 0
            }
            response["charts"] = []
            response["tables"] = []
            response["message"] = "Unable to load analytics data. Please try again later."
    
    return response


@router.get("/pipeline")
async def get_role_based_pipeline_analytics(
    pipeline_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get role-based pipeline analytics"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    # Base filters
    filters = [Deal.is_deleted == False]
    
    # Date filters
    if date_from:
        filters.append(Deal.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        filters.append(Deal.created_at <= datetime.fromisoformat(date_to))
    
    # Pipeline filter
    if pipeline_id:
        filters.append(Deal.pipeline_id == uuid.UUID(pipeline_id))
    
    # Apply role-based filters
    if context.is_super_admin():
        # Super admin can see all pipelines
        pass
    elif has_permission(current_user, Permission.VIEW_COMPANY_ANALYTICS):
        # Company admin can see company pipelines
        filters.append(Deal.company_id == company_id)
    elif has_permission(current_user, Permission.VIEW_TEAM_ANALYTICS):
        # Sales manager can see team pipelines
        if not user_team_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not assigned to a team"
            )
        
        # Get all team member IDs
        team_member_ids = [
            row[0] for row in db.query(User.id).filter(User.team_id == user_team_id).all()
        ]
        
        filters.append(Deal.owner_id.in_(team_member_ids))
    elif has_permission(current_user, Permission.VIEW_OWN_ANALYTICS):
        # Regular user can see own pipelines
        filters.append(Deal.owner_id == uuid.UUID(user_id) if isinstance(user_id, str) else user_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view pipeline analytics"
        )
    
    # Get pipeline stages
    stages = db.query(PipelineStage).filter(
        PipelineStage.pipeline_id == uuid.UUID(pipeline_id) if pipeline_id else True
    ).all()
    
    # Get deals by stage
    pipeline_data = []
    for stage in stages:
        stage_filters = filters + [Deal.stage_id == stage.id]
        
        deal_count = db.query(func.count(Deal.id)).filter(and_(*stage_filters)).scalar() or 0
        deal_value = db.query(func.sum(Deal.value)).filter(and_(*stage_filters)).scalar() or 0
        
        pipeline_data.append({
            "stage_id": str(stage.id),
            "stage_name": stage.name,
            "deal_count": deal_count,
            "deal_value": float(deal_value),
            "deals": [
                {
                    "id": str(deal.id),
                    "name": deal.title,  # Deal model uses 'title' not 'name'
                    "value": float(deal.value),
                    "status": deal.status
                }
                for deal in db.query(Deal).filter(and_(*stage_filters)).limit(5).all()
            ]
        })
    
    return {
        "pipeline_id": pipeline_id,
        "company_id": str(company_id) if company_id else None,
        "user_role": context.get_role_name(),
        "date_range": {
            "from": date_from,
            "to": date_to
        },
        "pipeline_data": pipeline_data
    }


# Helper functions for analytics data
def get_users_by_company(db: Session) -> List[Dict[str, Any]]:
    """Get user counts by company"""
    result = db.query(
        User.company_id,
        func.count(User.id).label('user_count')
    ).filter(
        User.is_deleted == False
    ).group_by(User.company_id).all()
    
    # Get company names
    from app.models import Company
    company_names = {
        str(c.id): c.name
        for c in db.query(Company).filter(
            Company.id.in_([r.company_id for r in result])
        ).all()
    }
    
    return [
        {
            "company_id": str(r.company_id),
            "company_name": company_names.get(str(r.company_id), "Unknown"),
            "user_count": r.user_count
        }
        for r in result
    ]


def get_system_growth(db: Session) -> List[Dict[str, Any]]:
    """Get system growth over time"""
    # Get the last 6 months
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=180)
    
    # Generate monthly periods
    periods = []
    current_date = start_date
    while current_date <= end_date:
        period_end = current_date + timedelta(days=30)
        periods.append((current_date, period_end))
        current_date = period_end
    
    growth_data = []
    for period_start, period_end in periods:
        # Get new users in this period
        new_users = db.query(func.count(User.id)).filter(
            User.created_at >= period_start,
            User.created_at < period_end
        ).scalar() or 0
        
        # Get new companies in this period
        from app.models import Company
        new_companies = db.query(func.count(Company.id)).filter(
            Company.created_at >= period_start,
            Company.created_at < period_end
        ).scalar() or 0
        
        growth_data.append({
            "period": period_start.strftime("%Y-%m"),
            "new_users": new_users,
            "new_companies": new_companies
        })
    
    return growth_data


def get_top_companies_by_deal_value(db: Session) -> List[Dict[str, Any]]:
    """Get top companies by deal value"""
    from app.models import Company
    
    result = db.query(
        Deal.company_id,
        func.sum(Deal.value).label('total_value'),
        func.count(Deal.id).label('deal_count')
    ).filter(
        Deal.is_deleted == False
    ).group_by(Deal.company_id).order_by(func.sum(Deal.value).desc()).limit(10).all()
    
    # Get company names
    company_names = {
        str(c.id): c.name
        for c in db.query(Company).filter(
            Company.id.in_([r.company_id for r in result])
        ).all()
    }
    
    return [
        {
            "company_id": str(r.company_id),
            "company_name": company_names.get(str(r.company_id), "Unknown"),
            "total_value": float(r.total_value),
            "deal_count": r.deal_count
        }
        for r in result
    ]


def get_deals_by_team(db: Session, company_id: str) -> List[Dict[str, Any]]:
    """Get deals by team for a company"""
    result = db.query(
        User.team_id,
        func.sum(Deal.value).label('total_value'),
        func.count(Deal.id).label('deal_count')
    ).join(
        Deal, Deal.owner_id == User.id
    ).filter(
        Deal.company_id == company_id,
        Deal.is_deleted == False
    ).group_by(User.team_id).all()
    
    # Get team names
    team_names = {
        str(t.id): t.name
        for t in db.query(Team).filter(
            Team.id.in_([r.team_id for r in result if r.team_id])
        ).all()
    }
    
    return [
        {
            "team_id": str(r.team_id) if r.team_id else "No Team",
            "team_name": team_names.get(str(r.team_id), "No Team"),
            "total_value": float(r.total_value),
            "deal_count": r.deal_count
        }
        for r in result
    ]


def get_deal_status_distribution(db: Session, company_id: str) -> List[Dict[str, Any]]:
    """Get deal status distribution for a company"""
    result = db.query(
        Deal.status,
        func.count(Deal.id).label('count')
    ).filter(
        Deal.company_id == company_id,
        Deal.is_deleted == False
    ).group_by(Deal.status).all()
    
    return [
        {
            "status": r.status,
            "count": r.count
        }
        for r in result
    ]


def get_top_performers(db: Session, company_id: str) -> List[Dict[str, Any]]:
    """Get top performers in a company"""
    result = db.query(
        User.id,
        User.first_name,
        User.last_name,
        func.sum(Deal.value).label('total_value'),
        func.count(Deal.id).label('deal_count')
    ).join(
        Deal, Deal.owner_id == User.id
    ).filter(
        User.company_id == company_id,
        Deal.is_deleted == False
    ).group_by(User.id, User.first_name, User.last_name).order_by(func.sum(Deal.value).desc()).limit(5).all()
    
    return [
        {
            "user_id": str(r.id),
            "user_name": f"{r.first_name} {r.last_name}",
            "total_value": float(r.total_value),
            "deal_count": r.deal_count
        }
        for r in result
    ]


def get_team_member_performance(db: Session, team_id: str) -> List[Dict[str, Any]]:
    """Get team member performance"""
    result = db.query(
        User.id,
        User.first_name,
        User.last_name,
        func.sum(Deal.value).label('total_value'),
        func.count(Deal.id).label('deal_count')
    ).join(
        Deal, Deal.owner_id == User.id
    ).filter(
        User.team_id == team_id,
        Deal.is_deleted == False
    ).group_by(User.id, User.first_name, User.last_name).all()
    
    return [
        {
            "user_id": str(r.id),
            "user_name": f"{r.first_name} {r.last_name}",
            "total_value": float(r.total_value),
            "deal_count": r.deal_count
        }
        for r in result
    ]


def get_team_activity_trend(db: Session, team_id: str) -> List[Dict[str, Any]]:
    """Get team activity trend over time"""
    # Get the last 30 days
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)
    
    # Generate daily periods
    periods = []
    current_date = start_date
    while current_date <= end_date:
        next_day = current_date + timedelta(days=1)
        periods.append((current_date, next_day, current_date.strftime("%Y-%m-%d")))
        current_date = next_day
    
    # Get team member IDs
    team_member_ids = [
        row[0] for row in db.query(User.id).filter(User.team_id == team_id).all()
    ]
    
    trend_data = []
    for period_start, period_end, date_str in periods:
        # Get activities in this period
        activities = db.query(func.count(Activity.id)).filter(
            Activity.owner_id.in_(team_member_ids),
            Activity.created_at >= period_start,
            Activity.created_at < period_end,
            Activity.is_deleted == False
        ).scalar() or 0
        
        trend_data.append({
            "date": date_str,
            "activities": activities
        })
    
    return trend_data


def get_team_deals_pipeline(db: Session, team_id: str) -> List[Dict[str, Any]]:
    """Get team deals pipeline"""
    # Get team member IDs
    team_member_ids = [
        row[0] for row in db.query(User.id).filter(User.team_id == team_id).all()
    ]
    
    # Get recent deals
    deals = db.query(Deal).filter(
        Deal.owner_id.in_(team_member_ids),
        Deal.is_deleted == False
    ).order_by(Deal.updated_at.desc()).limit(10).all()
    
    return [
        {
            "id": str(deal.id),
            "name": deal.title,  # Deal model uses 'title' not 'name'
            "value": float(deal.value),
            "status": deal.status,
            "owner_id": str(deal.owner_id),
            "updated_at": deal.updated_at.isoformat()
        }
        for deal in deals
    ]


def get_personal_deal_status(db: Session, user_id: str) -> List[Dict[str, Any]]:
    """Get personal deal status distribution"""
    user_id_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    
    result = db.query(
        Deal.status,
        func.count(Deal.id).label('count')
    ).filter(
        Deal.owner_id == user_id_uuid,
        Deal.is_deleted == False
    ).group_by(Deal.status).all()
    
    return [
        {
            "status": r.status,
            "count": r.count
        }
        for r in result
    ]


def get_personal_activity_trend(db: Session, user_id: str) -> List[Dict[str, Any]]:
    """Get personal activity trend over time"""
    user_id_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    
    # Get the last 30 days
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)
    
    # Generate daily periods
    periods = []
    current_date = start_date
    while current_date <= end_date:
        next_day = current_date + timedelta(days=1)
        periods.append((current_date, next_day, current_date.strftime("%Y-%m-%d")))
        current_date = next_day
    
    trend_data = []
    for period_start, period_end, date_str in periods:
        # Get activities in this period
        activities = db.query(func.count(Activity.id)).filter(
            Activity.owner_id == user_id_uuid,
            Activity.created_at >= period_start,
            Activity.created_at < period_end,
            Activity.is_deleted == False
        ).scalar() or 0
        
        trend_data.append({
            "date": date_str,
            "activities": activities
        })
    
    return trend_data


def get_personal_recent_activities(db: Session, user_id: str) -> List[Dict[str, Any]]:
    """Get personal recent activities"""
    user_id_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    
    activities = db.query(Activity).filter(
        Activity.owner_id == user_id_uuid,
        Activity.is_deleted == False
    ).order_by(Activity.created_at.desc()).limit(10).all()
    
    return [
        {
            "id": str(activity.id),
            "type": activity.type,
            "title": activity.title,
            "status": activity.status,
            "due_date": activity.due_date.isoformat() if activity.due_date else None,
            "created_at": activity.created_at.isoformat()
        }
        for activity in activities
    ]
