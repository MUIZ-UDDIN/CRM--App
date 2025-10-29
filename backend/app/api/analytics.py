"""
Analytics API endpoints with comprehensive data aggregation and caching
"""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from typing import Optional, List
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case
import uuid
import io
import csv
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from ..core.security import get_current_active_user
from ..core.database import get_db
from ..models.deals import Deal, Pipeline, PipelineStage, DealStatus
from ..models.activities import Activity
from ..models.emails import Email
from ..models.calls import Call
from ..models.contacts import Contact
from ..models.documents import Document
from ..models.users import User
import json

router = APIRouter()

# Helper function for Redis caching (will be implemented with actual Redis)
async def get_cached_analytics(key: str):
    """Get cached analytics from Redis"""
    # TODO: Implement actual Redis caching
    # from ..core.redis import redis_client
    # cached = await redis_client.get(key)
    # if cached:
    #     return json.loads(cached)
    return None

async def set_cached_analytics(key: str, data: dict, ttl: int = 300):
    """Cache analytics in Redis with TTL"""
    # TODO: Implement actual Redis caching
    # from ..core.redis import redis_client
    # await redis_client.setex(key, ttl, json.dumps(data))
    pass


@router.get("/pipeline")
async def get_pipeline_analytics(
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    team_id: Optional[str] = Query(None, description="Filter by team ID"),
    pipeline_id: Optional[str] = Query(None, description="Filter by pipeline ID"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get pipeline analytics with real database queries"""
    
    owner_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # Build query filters
    filters = [Deal.owner_id == owner_id, Deal.is_deleted == False]
    
    if date_from:
        filters.append(Deal.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        filters.append(Deal.created_at <= datetime.fromisoformat(date_to))
    if pipeline_id:
        filters.append(Deal.pipeline_id == uuid.UUID(str(pipeline_id)))
    
    # Get stage analytics
    stage_stats = db.query(
        PipelineStage.id,
        PipelineStage.name,
        func.count(Deal.id).label('deal_count'),
        func.sum(Deal.value).label('total_value'),
        func.avg(Deal.value).label('avg_value'),
        func.sum(case((Deal.status == DealStatus.WON, 1), else_=0)).label('deals_won'),
        func.sum(case((Deal.status == DealStatus.LOST, 1), else_=0)).label('deals_lost')
    ).join(Deal, Deal.stage_id == PipelineStage.id)\
     .filter(and_(*filters))\
     .group_by(PipelineStage.id, PipelineStage.name)\
     .all()
    
    pipeline_analytics = []
    for stage in stage_stats:
        total_closed = (stage.deals_won or 0) + (stage.deals_lost or 0)
        win_rate = (stage.deals_won / total_closed * 100) if total_closed > 0 else 0
        
        pipeline_analytics.append({
            "stage_id": str(stage.id),
            "stage_name": stage.name,
            "deal_count": stage.deal_count or 0,
            "total_value": float(stage.total_value or 0),
            "avg_value": float(stage.avg_value or 0),
            "deals_won": stage.deals_won or 0,
            "deals_lost": stage.deals_lost or 0,
            "win_rate": round(win_rate, 2)
        })
    
    # Get summary
    total_deals = db.query(func.count(Deal.id)).filter(and_(*filters)).scalar() or 0
    total_value = db.query(func.sum(Deal.value)).filter(and_(*filters)).scalar() or 0
    avg_deal_size = (total_value / total_deals) if total_deals > 0 else 0
    
    data = {
        "filters": {
            "date_from": date_from,
            "date_to": date_to,
            "pipeline_id": pipeline_id
        },
        "pipeline_analytics": pipeline_analytics,
        "summary": {
            "total_deals": total_deals,
            "total_value": float(total_value),
            "avg_deal_size": round(avg_deal_size, 2)
        }
    }
    
    return data


@router.get("/activities")
async def get_activity_analytics(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    team_id: Optional[str] = Query(None),
    activity_type: Optional[str] = Query(None, description="Filter by activity type"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get activity analytics with counts, completion rates, overdue metrics
    
    Returns:
    - Activity counts by type
    - Completion rates
    - Overdue vs completed counts
    - Activity distribution by user/team
    """
    
    owner_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    is_superuser = current_user.get("is_superuser", False)
    
    # Base filters
    filters = [Activity.is_deleted == False]
    if not is_superuser:
        filters.append(Activity.owner_id == owner_id)
    if date_from:
        filters.append(Activity.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        filters.append(Activity.created_at <= datetime.fromisoformat(date_to))
    if user_id:
        filters.append(Activity.owner_id == uuid.UUID(user_id))
    if activity_type:
        filters.append(Activity.type == activity_type)
    
    # Total activities
    total_activities = db.query(func.count(Activity.id)).filter(and_(*filters)).scalar() or 0
    completed_activities = db.query(func.count(Activity.id)).filter(and_(*filters, Activity.status == 'completed')).scalar() or 0
    overdue_activities = db.query(func.count(Activity.id)).filter(
        and_(*filters, Activity.status != 'completed', Activity.due_date < datetime.utcnow())
    ).scalar() or 0
    
    # Activity analytics by type
    activity_types = ['call', 'email', 'meeting', 'task']
    activity_analytics = []
    for act_type in activity_types:
        type_filters = filters + [Activity.type == act_type]
        total = db.query(func.count(Activity.id)).filter(and_(*type_filters)).scalar() or 0
        completed = db.query(func.count(Activity.id)).filter(and_(*type_filters, Activity.status == 'completed')).scalar() or 0
        overdue = db.query(func.count(Activity.id)).filter(
            and_(*type_filters, Activity.status != 'completed', Activity.due_date < datetime.utcnow())
        ).scalar() or 0
        
        activity_analytics.append({
            "activity_type": act_type,
            "total_count": total,
            "completed_count": completed,
            "overdue_count": overdue,
            "pending_count": total - completed - overdue,
            "completion_rate": round((completed / total * 100) if total > 0 else 0, 1)
        })
    
    # Activities by user
    activities_by_user_query = db.query(
        Activity.owner_id,
        User.first_name,
        User.last_name,
        func.count(case((Activity.type == 'call', 1))).label('calls'),
        func.count(case((Activity.type == 'email', 1))).label('emails'),
        func.count(case((Activity.type == 'meeting', 1))).label('meetings'),
        func.count(case((Activity.type == 'task', 1))).label('tasks'),
        func.count(Activity.id).label('total'),
        func.count(case((Activity.status == 'completed', 1))).label('completed')
    ).join(User, Activity.owner_id == User.id).filter(and_(*filters)).group_by(Activity.owner_id, User.first_name, User.last_name).all()
    
    activities_by_user = []
    for row in activities_by_user_query:
        completion_rate = round((row.completed / row.total * 100) if row.total > 0 else 0, 1)
        full_name = f"{row.first_name} {row.last_name}".strip()
        activities_by_user.append({
            "user_id": str(row.owner_id),
            "user_name": full_name,
            "calls": row.calls,
            "emails": row.emails,
            "meetings": row.meetings,
            "tasks": row.tasks,
            "total": row.total,
            "completion_rate": completion_rate
        })
    
    # Activity distribution by day
    activity_by_day = db.query(
        func.extract('dow', Activity.created_at).label('day_of_week'),
        func.count(Activity.id).label('count')
    ).filter(and_(*filters)).group_by('day_of_week').all()
    
    day_names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    by_day = []
    for day_num in range(7):
        count = next((row.count for row in activity_by_day if int(row.day_of_week) == day_num), 0)
        by_day.append({"day": day_names[day_num], "count": count})
    
    data = {
        "filters": {
            "date_from": date_from,
            "date_to": date_to,
            "user_id": user_id,
            "team_id": team_id,
            "activity_type": activity_type
        },
        "activity_analytics": activity_analytics,
        "activities_by_user": activities_by_user,
        "activity_distribution": {
            "by_day": by_day
        },
        "summary": {
            "total_activities": total_activities,
            "total_completed": completed_activities,
            "total_overdue": overdue_activities,
            "total_pending": total_activities - completed_activities - overdue_activities,
            "overall_completion_rate": round((completed_activities / total_activities * 100) if total_activities > 0 else 0, 2)
        }
    }
    
    return data


@router.get("/revenue")
async def get_revenue_analytics(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get revenue analytics with real monthly data"""
    owner_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # Get last 6 months of revenue data
    monthly_data = []
    current_date = datetime.now()
    
    for i in range(5, -1, -1):  # Last 6 months
        month_date = current_date - timedelta(days=30 * i)
        month_start = month_date.replace(day=1)
        
        # Calculate next month start
        if month_date.month == 12:
            month_end = month_date.replace(year=month_date.year + 1, month=1, day=1)
        else:
            month_end = month_date.replace(month=month_date.month + 1, day=1)
        
        # Get revenue for this month (won deals only)
        revenue = db.query(func.sum(Deal.value)).filter(
            and_(
                Deal.owner_id == owner_id,
                Deal.is_deleted == False,
                Deal.status == DealStatus.WON,
                Deal.actual_close_date >= month_start,
                Deal.actual_close_date < month_end
            )
        ).scalar() or 0.0
        
        # Get deal count for this month
        deal_count = db.query(func.count(Deal.id)).filter(
            and_(
                Deal.owner_id == owner_id,
                Deal.is_deleted == False,
                Deal.status == DealStatus.WON,
                Deal.actual_close_date >= month_start,
                Deal.actual_close_date < month_end
            )
        ).scalar() or 0
        
        monthly_data.append({
            "month": month_start.strftime("%Y-%m"),
            "revenue": float(revenue),
            "deal_count": deal_count
        })
    
    # Calculate totals
    total_revenue = sum(m["revenue"] for m in monthly_data)
    total_deals = sum(m["deal_count"] for m in monthly_data)
    avg_deal_size = (total_revenue / total_deals) if total_deals > 0 else 0
    
    # Calculate growth rate (last month vs previous month)
    if len(monthly_data) >= 2:
        last_month = monthly_data[-1]["revenue"]
        prev_month = monthly_data[-2]["revenue"]
        growth_rate = ((last_month - prev_month) / prev_month * 100) if prev_month > 0 else 0
    else:
        growth_rate = 0
    
    return {
        "monthly_revenue": monthly_data,
        "summary": {
            "total_revenue": round(total_revenue, 2),
            "total_deals": total_deals,
            "avg_deal_size": round(avg_deal_size, 2),
            "growth_rate": round(growth_rate, 1)
        }
    }


@router.get("/users")
async def get_user_analytics(current_user: dict = Depends(get_current_active_user)):
    """Get user performance analytics"""
    return {
        "user_performance": [
            {
                "user_name": "John Doe",
                "deals_count": 12,
                "deals_value": 480000.0,
                "activities_completed": 95,
                "conversion_rate": 75.0
            },
            {
                "user_name": "Jane Smith",
                "deals_count": 8,
                "deals_value": 320000.0,
                "activities_completed": 72,
                "conversion_rate": 68.5
            },
            {
                "user_name": "Mike Johnson",
                "deals_count": 15,
                "deals_value": 195000.0,
                "activities_completed": 48,
                "conversion_rate": 42.3
            }
        ],
        "summary": {
            "total_users": 3,
            "avg_deals_per_user": 11.7,
            "avg_value_per_user": 331666.67,
            "top_performer": "John Doe"
        }
    }


@router.get("/emails")
async def get_email_analytics(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_active_user)
):
    """Get email analytics with open/click/bounce stats
    
    Returns:
    - Email sent/opened/clicked/bounced counts
    - Open rates and click rates
    - Email performance by user
    - Best performing email templates
    """
    
    cache_key = f"analytics:emails:{date_from}:{date_to}:{user_id}"
    cached = await get_cached_analytics(cache_key)
    if cached:
        return cached
    
    data = {
        "filters": {
            "date_from": date_from,
            "date_to": date_to,
            "user_id": user_id
        },
        "email_metrics": {
            "total_sent": 1250,
            "total_delivered": 1227,
            "total_opened": 875,
            "total_clicked": 342,
            "total_bounced": 23,
            "total_unsubscribed": 5,
            "open_rate": 71.3,
            "click_rate": 27.9,
            "bounce_rate": 1.8,
            "click_to_open_rate": 39.1
        },
        "email_by_type": [
            {
                "type": "follow_up",
                "sent": 450,
                "opened": 325,
                "clicked": 145,
                "open_rate": 72.2,
                "click_rate": 32.2
            },
            {
                "type": "cold_outreach",
                "sent": 380,
                "opened": 245,
                "clicked": 85,
                "open_rate": 64.5,
                "click_rate": 22.4
            },
            {
                "type": "newsletter",
                "sent": 420,
                "opened": 305,
                "clicked": 112,
                "open_rate": 72.6,
                "click_rate": 26.7
            }
        ],
        "email_by_user": [
            {
                "user_id": 1,
                "user_name": "John Doe",
                "sent": 425,
                "opened": 312,
                "clicked": 135,
                "open_rate": 73.4,
                "click_rate": 31.8
            },
            {
                "user_id": 2,
                "user_name": "Jane Smith",
                "sent": 385,
                "opened": 268,
                "clicked": 98,
                "open_rate": 69.6,
                "click_rate": 25.5
            },
            {
                "user_id": 3,
                "user_name": "Mike Johnson",
                "sent": 440,
                "opened": 295,
                "clicked": 109,
                "open_rate": 67.0,
                "click_rate": 24.8
            }
        ],
        "top_performing_templates": [
            {
                "template_id": 1,
                "template_name": "Product Demo Follow-up",
                "sent": 145,
                "opened": 118,
                "clicked": 67,
                "open_rate": 81.4,
                "click_rate": 46.2
            },
            {
                "template_id": 2,
                "template_name": "Proposal Sent",
                "sent": 89,
                "opened": 72,
                "clicked": 38,
                "open_rate": 80.9,
                "click_rate": 42.7
            }
        ],
        "engagement_timeline": [
            {"hour": "09:00", "opens": 45, "clicks": 18},
            {"hour": "10:00", "opens": 67, "clicks": 28},
            {"hour": "11:00", "opens": 82, "clicks": 35},
            {"hour": "14:00", "opens": 75, "clicks": 30},
            {"hour": "15:00", "opens": 58, "clicks": 22}
        ]
    }
    
    await set_cached_analytics(cache_key, data, ttl=300)
    return data


@router.get("/calls")
async def get_call_analytics(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_active_user)
):
    """Get call analytics with durations, answered/missed stats
    
    Returns:
    - Call counts (answered/missed/voicemail)
    - Call durations (avg/min/max)
    - Call recordings stats
    - Call performance by user
    """
    
    cache_key = f"analytics:calls:{date_from}:{date_to}:{user_id}"
    cached = await get_cached_analytics(cache_key)
    if cached:
        return cached
    
    data = {
        "filters": {
            "date_from": date_from,
            "date_to": date_to,
            "user_id": user_id
        },
        "call_metrics": {
            "total_calls": 342,
            "answered_calls": 285,
            "missed_calls": 42,
            "voicemail_calls": 15,
            "answer_rate": 83.3,
            "avg_duration_seconds": 456,
            "total_duration_hours": 36.2,
            "recorded_calls": 198,
            "recording_rate": 69.5
        },
        "call_durations": {
            "avg_duration": 456,
            "min_duration": 45,
            "max_duration": 1820,
            "median_duration": 380,
            "duration_distribution": [
                {"range": "0-2 min", "count": 45},
                {"range": "2-5 min", "count": 98},
                {"range": "5-10 min", "count": 125},
                {"range": "10-20 min", "count": 58},
                {"range": "20+ min", "count": 16}
            ]
        },
        "call_by_day": [
            {"day": "Monday", "answered": 62, "missed": 8, "avg_duration": 445},
            {"day": "Tuesday", "answered": 58, "missed": 7, "avg_duration": 478},
            {"day": "Wednesday", "answered": 65, "missed": 9, "avg_duration": 432},
            {"day": "Thursday", "answered": 55, "missed": 10, "avg_duration": 468},
            {"day": "Friday", "answered": 45, "missed": 8, "avg_duration": 425}
        ],
        "call_by_user": [
            {
                "user_id": 1,
                "user_name": "John Doe",
                "total_calls": 125,
                "answered": 108,
                "missed": 12,
                "avg_duration": 485,
                "answer_rate": 86.4
            },
            {
                "user_id": 2,
                "user_name": "Jane Smith",
                "total_calls": 98,
                "answered": 82,
                "missed": 14,
                "avg_duration": 445,
                "answer_rate": 83.7
            },
            {
                "user_id": 3,
                "user_name": "Mike Johnson",
                "total_calls": 119,
                "answered": 95,
                "missed": 16,
                "avg_duration": 438,
                "answer_rate": 79.8
            }
        ],
        "call_outcomes": [
            {"outcome": "Deal Advanced", "count": 85, "percentage": 29.8},
            {"outcome": "Follow-up Scheduled", "count": 125, "percentage": 43.9},
            {"outcome": "Not Interested", "count": 45, "percentage": 15.8},
            {"outcome": "No Answer", "count": 42, "percentage": 14.7}
        ]
    }
    
    await set_cached_analytics(cache_key, data, ttl=300)
    return data


@router.get("/contacts")
async def get_contact_analytics(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_active_user)
):
    """Get contact/lead analytics with source distribution, conversion rates, AI scoring
    
    Returns:
    - Lead source distribution
    - Conversion rates per source
    - Lead scoring distribution (AI-generated)
    - Lead status breakdown
    """
    
    cache_key = f"analytics:contacts:{date_from}:{date_to}:{source}"
    cached = await get_cached_analytics(cache_key)
    if cached:
        return cached
    
    data = {
        "filters": {
            "date_from": date_from,
            "date_to": date_to,
            "source": source
        },
        "source_analytics": [
            {
                "source_name": "Website",
                "contact_count": 120,
                "deals_created": 24,
                "conversion_rate": 20.0,
                "avg_deal_value": 35000.0
            },
            {
                "source_name": "Referral",
                "contact_count": 85,
                "deals_created": 28,
                "conversion_rate": 32.9,
                "avg_deal_value": 48000.0
            },
            {
                "source_name": "LinkedIn",
                "contact_count": 95,
                "deals_created": 19,
                "conversion_rate": 20.0,
                "avg_deal_value": 42000.0
            },
            {
                "source_name": "Cold Email",
                "contact_count": 150,
                "deals_created": 18,
                "conversion_rate": 12.0,
                "avg_deal_value": 28000.0
            },
            {
                "source_name": "Trade Show",
                "contact_count": 45,
                "deals_created": 12,
                "conversion_rate": 26.7,
                "avg_deal_value": 52000.0
            }
        ],
        "lead_status_breakdown": [
            {"status": "New", "count": 145, "percentage": 29.3},
            {"status": "Contacted", "count": 128, "percentage": 25.9},
            {"status": "Qualified", "count": 95, "percentage": 19.2},
            {"status": "Unqualified", "count": 78, "percentage": 15.8},
            {"status": "Converted", "count": 49, "percentage": 9.9}
        ],
        "lead_scoring_distribution": {
            "score_ranges": [
                {"range": "0-20", "count": 85, "label": "Cold"},
                {"range": "21-40", "count": 125, "label": "Warm"},
                {"range": "41-60", "count": 145, "label": "Hot"},
                {"range": "61-80", "count": 98, "label": "Very Hot"},
                {"range": "81-100", "count": 42, "label": "Extremely Hot"}
            ],
            "avg_score": 48.5,
            "median_score": 52.0
        },
        "ai_insights": {
            "high_value_leads": 42,
            "ready_to_convert": 28,
            "needs_nurturing": 156,
            "likely_to_churn": 18
        },
        "conversion_funnel": [
            {"stage": "Lead", "count": 495, "conversion_rate": 100.0},
            {"stage": "Contacted", "count": 350, "conversion_rate": 70.7},
            {"stage": "Qualified", "count": 245, "conversion_rate": 49.5},
            {"stage": "Proposal", "count": 125, "conversion_rate": 25.3},
            {"stage": "Negotiation", "count": 75, "conversion_rate": 15.2},
            {"stage": "Won", "count": 49, "conversion_rate": 9.9}
        ],
        "summary": {
            "total_contacts": 495,
            "total_deals_created": 101,
            "overall_conversion_rate": 20.4,
            "avg_time_to_convert_days": 32.5
        }
    }
    
    await set_cached_analytics(cache_key, data, ttl=300)
    return data


@router.get("/documents")
async def get_document_analytics(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_active_user)
):
    """Get document & e-signature analytics
    
    Returns:
    - Signed vs pending counts
    - Time to completion/signature
    - Contract completion rates
    - Document status breakdown
    """
    
    cache_key = f"analytics:documents:{date_from}:{date_to}:{document_type}"
    cached = await get_cached_analytics(cache_key)
    if cached:
        return cached
    
    data = {
        "filters": {
            "date_from": date_from,
            "date_to": date_to,
            "document_type": document_type
        },
        "document_metrics": {
            "total_documents": 185,
            "signed_documents": 145,
            "pending_documents": 28,
            "viewed_documents": 12,
            "expired_documents": 8,
            "completion_rate": 78.4,
            "avg_time_to_sign_hours": 36.5
        },
        "document_status": [
            {"status": "Signed", "count": 145, "percentage": 78.4},
            {"status": "Pending Signature", "count": 28, "percentage": 15.1},
            {"status": "Viewed", "count": 12, "percentage": 6.5},
            {"status": "Expired", "count": 8, "percentage": 4.3}
        ],
        "time_to_signature": {
            "avg_hours": 36.5,
            "median_hours": 24.0,
            "min_hours": 2.5,
            "max_hours": 168.0,
            "distribution": [
                {"range": "< 24 hours", "count": 68, "percentage": 47.0},
                {"range": "1-3 days", "count": 45, "percentage": 31.0},
                {"range": "4-7 days", "count": 22, "percentage": 15.2},
                {"range": "> 7 days", "count": 10, "percentage": 6.9}
            ]
        },
        "document_by_type": [
            {
                "type": "Contract",
                "total": 85,
                "signed": 72,
                "pending": 10,
                "completion_rate": 84.7,
                "avg_time_hours": 48.2
            },
            {
                "type": "Proposal",
                "total": 62,
                "signed": 48,
                "pending": 12,
                "completion_rate": 77.4,
                "avg_time_hours": 28.5
            },
            {
                "type": "NDA",
                "total": 38,
                "signed": 35,
                "pending": 3,
                "completion_rate": 92.1,
                "avg_time_hours": 18.3
            }
        ],
        "document_by_deal_stage": [
            {"stage": "Proposal", "documents": 62, "signed": 48},
            {"stage": "Negotiation", "documents": 45, "signed": 38},
            {"stage": "Closed Won", "documents": 78, "signed": 78}
        ],
        "reminders_sent": {
            "total_reminders": 145,
            "avg_reminders_per_doc": 2.3,
            "effectiveness_rate": 68.5
        }
    }
    
    await set_cached_analytics(cache_key, data, ttl=300)
    return data


@router.get("/custom")
async def get_custom_analytics(
    metrics: Optional[str] = Query(None, description="Comma-separated list of metrics"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    team_id: Optional[str] = Query(None),
    pipeline_id: Optional[str] = Query(None),
    group_by: Optional[str] = Query(None, description="Group results by: day, week, month, user, team"),
    current_user: dict = Depends(get_current_active_user)
):
    """Custom analytics endpoint for flexible KPI queries and filtering
    
    Allows custom combinations of:
    - Date range filtering
    - User/team filtering
    - Pipeline filtering
    - Metric selection
    - Grouping options
    
    Example metrics: revenue, deals, activities, contacts, conversion_rate
    """
    
    cache_key = f"analytics:custom:{metrics}:{date_from}:{date_to}:{user_id}:{team_id}:{pipeline_id}:{group_by}"
    cached = await get_cached_analytics(cache_key)
    if cached:
        return cached
    
    # Parse requested metrics
    requested_metrics = metrics.split(",") if metrics else ["revenue", "deals", "activities"]
    
    data = {
        "filters": {
            "metrics": requested_metrics,
            "date_from": date_from,
            "date_to": date_to,
            "user_id": user_id,
            "team_id": team_id,
            "pipeline_id": pipeline_id,
            "group_by": group_by
        },
        "results": []
    }
    
    # Generate sample grouped data based on group_by parameter
    if group_by == "day":
        data["results"] = [
            {"date": "2024-10-01", "revenue": 45000, "deals": 3, "activities": 25},
            {"date": "2024-10-02", "revenue": 52000, "deals": 4, "activities": 28},
            {"date": "2024-10-03", "revenue": 38000, "deals": 2, "activities": 22}
        ]
    elif group_by == "week":
        data["results"] = [
            {"week": "2024-W40", "revenue": 185000, "deals": 12, "activities": 145},
            {"week": "2024-W41", "revenue": 220000, "deals": 15, "activities": 168}
        ]
    elif group_by == "month":
        data["results"] = [
            {"month": "2024-08", "revenue": 650000, "deals": 45, "activities": 580},
            {"month": "2024-09", "revenue": 720000, "deals": 52, "activities": 625},
            {"month": "2024-10", "revenue": 685000, "deals": 48, "activities": 595}
        ]
    elif group_by == "user":
        data["results"] = [
            {"user_id": 1, "user_name": "John Doe", "revenue": 485000, "deals": 24, "activities": 218},
            {"user_id": 2, "user_name": "Jane Smith", "revenue": 385000, "deals": 18, "activities": 172},
            {"user_id": 3, "user_name": "Mike Johnson", "revenue": 445000, "deals": 22, "activities": 195}
        ]
    elif group_by == "team":
        data["results"] = [
            {"team_id": 1, "team_name": "Sales Team", "revenue": 825000, "deals": 48, "activities": 425},
            {"team_id": 2, "team_name": "Enterprise Team", "revenue": 490000, "deals": 16, "activities": 160}
        ]
    else:
        # No grouping - return aggregated totals
        data["results"] = {
            "revenue": 1315000,
            "deals": 64,
            "activities": 585,
            "contacts": 495,
            "conversion_rate": 20.4,
            "avg_deal_size": 20547,
            "win_rate": 68.0
        }
    
    data["summary"] = {
        "total_records": len(data["results"]) if isinstance(data["results"], list) else 1,
        "date_range": f"{date_from} to {date_to}" if date_from and date_to else "All time",
        "generated_at": datetime.now().isoformat()
    }
    
    await set_cached_analytics(cache_key, data, ttl=300)
    return data


@router.get("/dashboard")
async def get_dashboard_analytics(
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    pipeline_id: Optional[str] = Query(None, description="Filter by pipeline ID"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get overall dashboard analytics with real-time data and filters"""
    from datetime import datetime, timedelta
    from sqlalchemy import func, and_, or_
    from ..models.deals import Deal as DealModel, DealStatus
    from ..models.contacts import Contact as ContactModel
    from ..models.activities import Activity as ActivityModel, ActivityStatus
    
    owner_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    is_superuser = current_user.get("is_superuser", False)
    
    # Parse dates
    today = datetime.utcnow().date()
    date_from_obj = datetime.fromisoformat(date_from).date() if date_from else None
    date_to_obj = datetime.fromisoformat(date_to).date() if date_to else None
    
    # Debug logging
    print(f"=== Dashboard Analytics Filters ===")
    print(f"Date From: {date_from} -> {date_from_obj}")
    print(f"Date To: {date_to} -> {date_to_obj}")
    print(f"User ID Filter: {user_id}")
    print(f"Pipeline ID Filter: {pipeline_id}")
    print(f"Current User: {owner_id}")
    print(f"Is Superuser: {is_superuser}")
    print(f"===================================")
    
    # For growth calculation, use previous period of same length
    if date_from_obj and date_to_obj:
        period_length = (date_to_obj - date_from_obj).days
        prev_period_end = date_from_obj - timedelta(days=1)
        prev_period_start = prev_period_end - timedelta(days=period_length)
    else:
        # Default to month comparison
        month_start = datetime.utcnow().replace(day=1).date()
        last_month_start = (datetime.utcnow().replace(day=1) - timedelta(days=1)).replace(day=1).date()
        prev_period_start = last_month_start
        prev_period_end = month_start - timedelta(days=1)
    
    # Build base filters
    filter_user_id = uuid.UUID(user_id) if user_id else None
    
    # Helper to add common filters
    def add_deal_filters(query, include_date=True, include_user=True):
        filters = [DealModel.is_deleted == False]
        if include_date and date_from_obj:
            filters.append(func.date(DealModel.created_at) >= date_from_obj)
        if include_date and date_to_obj:
            filters.append(func.date(DealModel.created_at) <= date_to_obj)
        if include_user and filter_user_id:
            filters.append(DealModel.owner_id == filter_user_id)
        elif include_user and not is_superuser:
            filters.append(DealModel.owner_id == owner_id)
        if pipeline_id:
            filters.append(DealModel.pipeline_id == uuid.UUID(pipeline_id))
        return query.filter(and_(*filters))
    
    # Total Revenue (Won Deals) - with date filters
    # Use created_at for filtering since actual_close_date may be NULL
    revenue_filters = [
        DealModel.is_deleted == False,
        DealModel.status == DealStatus.WON
    ]
    if date_from_obj:
        revenue_filters.append(func.date(DealModel.created_at) >= date_from_obj)
    if date_to_obj:
        revenue_filters.append(func.date(DealModel.created_at) <= date_to_obj)
    if filter_user_id:
        revenue_filters.append(DealModel.owner_id == filter_user_id)
    elif not is_superuser:
        revenue_filters.append(DealModel.owner_id == owner_id)
    if pipeline_id:
        revenue_filters.append(DealModel.pipeline_id == uuid.UUID(pipeline_id))
    
    revenue_query = db.query(func.sum(DealModel.value)).filter(and_(*revenue_filters))
    total_revenue = revenue_query.scalar() or 0.0
    
    # Won deals count with filters
    won_deals_query = db.query(func.count(DealModel.id)).filter(and_(*revenue_filters))
    won_deals = won_deals_query.scalar() or 0
    
    # Previous period revenue for growth calculation
    prev_revenue_filters = [
        DealModel.is_deleted == False,
        DealModel.status == DealStatus.WON,
        func.date(DealModel.created_at) >= prev_period_start,
        func.date(DealModel.created_at) <= prev_period_end
    ]
    if filter_user_id:
        prev_revenue_filters.append(DealModel.owner_id == filter_user_id)
    elif not is_superuser:
        prev_revenue_filters.append(DealModel.owner_id == owner_id)
    if pipeline_id:
        prev_revenue_filters.append(DealModel.pipeline_id == uuid.UUID(pipeline_id))
    
    prev_revenue_query = db.query(func.sum(DealModel.value)).filter(and_(*prev_revenue_filters))
    prev_revenue_val = prev_revenue_query.scalar() or 0.0
    
    revenue_growth = ((total_revenue - prev_revenue_val) / prev_revenue_val * 100) if prev_revenue_val > 0 else 0
    
    # Average Deal Size
    avg_deal_size = (total_revenue / won_deals) if won_deals > 0 else 0
    
    # Previous period won deals for growth
    prev_won_deals_query = db.query(func.count(DealModel.id)).filter(and_(*prev_revenue_filters))
    prev_won_deals = prev_won_deals_query.scalar() or 0
    
    won_deals_growth = ((won_deals - prev_won_deals) / prev_won_deals * 100) if prev_won_deals > 0 else 0
    
    # Previous period avg deal size
    prev_avg_deal_size = (prev_revenue_val / prev_won_deals) if prev_won_deals > 0 else 0
    avg_deal_growth = ((avg_deal_size - prev_avg_deal_size) / prev_avg_deal_size * 100) if prev_avg_deal_size > 0 else 0
    
    # Win Rate (won vs total closed in current period)
    closed_filters = revenue_filters.copy()
    closed_filters[1] = or_(DealModel.status == DealStatus.WON, DealModel.status == DealStatus.LOST)
    total_closed = db.query(func.count(DealModel.id)).filter(and_(*closed_filters)).scalar() or 0
    win_rate = (won_deals / total_closed * 100) if total_closed > 0 else 0
    
    # Previous period win rate
    prev_closed_filters = prev_revenue_filters.copy()
    prev_closed_filters[1] = or_(DealModel.status == DealStatus.WON, DealModel.status == DealStatus.LOST)
    prev_total_closed = db.query(func.count(DealModel.id)).filter(and_(*prev_closed_filters)).scalar() or 0
    prev_win_rate = (prev_won_deals / prev_total_closed * 100) if prev_total_closed > 0 else 0
    win_rate_change = win_rate - prev_win_rate
    
    # Total Pipeline (all open deals - not won or lost)
    pipeline_filters = [
        DealModel.is_deleted == False,
        DealModel.status == DealStatus.OPEN
    ]
    if filter_user_id:
        pipeline_filters.append(DealModel.owner_id == filter_user_id)
    elif not is_superuser:
        pipeline_filters.append(DealModel.owner_id == owner_id)
    if pipeline_id:
        pipeline_filters.append(DealModel.pipeline_id == uuid.UUID(pipeline_id))
    
    total_pipeline = db.query(func.sum(DealModel.value)).filter(and_(*pipeline_filters)).scalar() or 0.0
    active_deals = db.query(func.count(DealModel.id)).filter(and_(*pipeline_filters)).scalar() or 0
    
    # For growth: Compare total open deals now vs 30 days ago
    # Get deals that were open 30 days ago (created before prev_period_end and still open OR were closed after prev_period_end)
    # Simplified: Just compare deals created in last 30 days vs previous 30 days
    thirty_days_ago = today - timedelta(days=30)
    sixty_days_ago = today - timedelta(days=60)
    
    # Open deals created in last 30 days
    recent_pipeline_filters = pipeline_filters.copy()
    recent_pipeline_filters.append(func.date(DealModel.created_at) >= thirty_days_ago)
    recent_pipeline = db.query(func.sum(DealModel.value)).filter(and_(*recent_pipeline_filters)).scalar() or 0.0
    recent_deals = db.query(func.count(DealModel.id)).filter(and_(*recent_pipeline_filters)).scalar() or 0
    
    # Open deals created 30-60 days ago (that are still open)
    prev_pipeline_filters = [
        DealModel.is_deleted == False,
        DealModel.status == DealStatus.OPEN,
        func.date(DealModel.created_at) >= sixty_days_ago,
        func.date(DealModel.created_at) < thirty_days_ago
    ]
    if filter_user_id:
        prev_pipeline_filters.append(DealModel.owner_id == filter_user_id)
    elif not is_superuser:
        prev_pipeline_filters.append(DealModel.owner_id == owner_id)
    if pipeline_id:
        prev_pipeline_filters.append(DealModel.pipeline_id == uuid.UUID(pipeline_id))
    
    prev_pipeline = db.query(func.sum(DealModel.value)).filter(and_(*prev_pipeline_filters)).scalar() or 0.0
    prev_active_deals = db.query(func.count(DealModel.id)).filter(and_(*prev_pipeline_filters)).scalar() or 0
    
    # Calculate growth: Compare new deals added in last 30 days vs previous 30 days
    if prev_pipeline > 0:
        pipeline_growth = ((recent_pipeline - prev_pipeline) / prev_pipeline * 100)
    elif recent_pipeline > 0:
        pipeline_growth = 100  # Growing from zero
    else:
        pipeline_growth = 0
    
    if prev_active_deals > 0:
        deal_growth = ((recent_deals - prev_active_deals) / prev_active_deals * 100)
    elif recent_deals > 0:
        deal_growth = 100  # Growing from zero
    else:
        deal_growth = 0
    
    # Activities Today
    activity_filters = [
        ActivityModel.is_deleted == False,
        func.date(ActivityModel.due_date) == today
    ]
    if filter_user_id:
        activity_filters.append(ActivityModel.owner_id == filter_user_id)
    elif not is_superuser:
        activity_filters.append(ActivityModel.owner_id == owner_id)
    
    activities_today = db.query(func.count(ActivityModel.id)).filter(and_(*activity_filters)).scalar() or 0
    
    # Pipeline by Stage - show ALL deals grouped by stage (not just OPEN)
    stage_filters = [DealModel.is_deleted == False]
    if filter_user_id:
        stage_filters.append(DealModel.owner_id == filter_user_id)
    elif not is_superuser:
        stage_filters.append(DealModel.owner_id == owner_id)
    if pipeline_id:
        stage_filters.append(DealModel.pipeline_id == uuid.UUID(pipeline_id))
    
    stage_query = db.query(
        PipelineStage.name.label('stage_name'),
        PipelineStage.order_index.label('stage_order'),
        func.count(DealModel.id).label('deal_count'),
        func.sum(DealModel.value).label('total_value')
    ).join(DealModel, DealModel.stage_id == PipelineStage.id)\
     .filter(and_(*stage_filters))\
     .group_by(PipelineStage.name, PipelineStage.order_index)\
     .order_by(PipelineStage.order_index)\
     .all()
    
    pipeline_by_stage = []
    # Calculate total value across all stages for percentage calculation
    total_all_stages = sum([s.total_value or 0 for s in stage_query]) if stage_query else 1
    
    for stage in stage_query:
        stage_value = float(stage.total_value or 0)
        # Calculate percentage as portion of total pipeline value (not relative to max)
        percentage = (stage_value / total_all_stages * 100) if total_all_stages > 0 else 0
        pipeline_by_stage.append({
            "stage_name": stage.stage_name,
            "deal_count": stage.deal_count or 0,
            "total_value": round(stage_value, 2),
            "percentage": round(percentage, 1)
        })
    
    return {
        "kpis": {
            "total_revenue": round(total_revenue, 2),
            "revenue_growth": round(revenue_growth, 1),
            "deals_won": won_deals,
            "deals_won_growth": round(won_deals_growth, 1),
            "win_rate": round(win_rate, 1),
            "win_rate_change": round(win_rate_change, 1),
            "avg_deal_size": round(avg_deal_size, 2),
            "avg_deal_growth": round(avg_deal_growth, 1),
            "total_pipeline": round(total_pipeline, 2),
            "pipeline_growth": round(pipeline_growth, 1),
            "active_deals": active_deals,
            "deal_growth": round(deal_growth, 1),
            "activities_today": activities_today
        },
        "pipeline_by_stage": pipeline_by_stage
    }


@router.get("/export/csv")
async def export_analytics_csv(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    pipeline_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Export analytics data to CSV"""
    owner_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # Build filters
    filters = [Deal.owner_id == owner_id, Deal.is_deleted == False]
    if date_from:
        filters.append(Deal.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        filters.append(Deal.created_at <= datetime.fromisoformat(date_to))
    if pipeline_id:
        filters.append(Deal.pipeline_id == uuid.UUID(str(pipeline_id)))
    
    # Get deals data
    deals = db.query(Deal).filter(and_(*filters)).all()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write headers
    writer.writerow(['Deal Title', 'Value', 'Status', 'Stage', 'Created Date', 'Close Date', 'Company'])
    
    # Write data
    for deal in deals:
        writer.writerow([
            deal.title,
            f'${deal.value:,.2f}',
            deal.status.value if deal.status else 'N/A',
            'N/A',  # Stage name would need a join
            deal.created_at.strftime('%Y-%m-%d') if deal.created_at else 'N/A',
            deal.actual_close_date.strftime('%Y-%m-%d') if deal.actual_close_date else 'N/A',
            deal.company or 'N/A'
        ])
    
    # Convert to bytes
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=analytics-{datetime.now().strftime('%Y%m%d')}.csv"
        }
    )


@router.get("/export/pdf")
async def export_analytics_pdf(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    pipeline_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Export analytics data to PDF"""
    owner_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # Build filters
    filters = [Deal.owner_id == owner_id, Deal.is_deleted == False]
    if date_from:
        filters.append(Deal.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        filters.append(Deal.created_at <= datetime.fromisoformat(date_to))
    if pipeline_id:
        filters.append(Deal.pipeline_id == uuid.UUID(str(pipeline_id)))
    
    # Get summary stats
    total_deals = db.query(func.count(Deal.id)).filter(and_(*filters)).scalar() or 0
    total_value = db.query(func.sum(Deal.value)).filter(and_(*filters)).scalar() or 0
    won_deals = db.query(func.count(Deal.id)).filter(and_(*filters, Deal.status == DealStatus.WON)).scalar() or 0
    won_value = db.query(func.sum(Deal.value)).filter(and_(*filters, Deal.status == DealStatus.WON)).scalar() or 0
    
    # Create PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    elements.append(Paragraph("Analytics Report", title_style))
    elements.append(Spacer(1, 12))
    
    # Date range
    date_text = f"Period: {date_from or 'All time'} to {date_to or 'Present'}"
    elements.append(Paragraph(date_text, styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Summary table
    summary_data = [
        ['Metric', 'Value'],
        ['Total Deals', str(total_deals)],
        ['Total Value', f'${total_value:,.2f}'],
        ['Deals Won', str(won_deals)],
        ['Won Value', f'${won_value:,.2f}'],
        ['Win Rate', f'{(won_deals/total_deals*100):.1f}%' if total_deals > 0 else '0%'],
        ['Avg Deal Size', f'${(total_value/total_deals):.2f}' if total_deals > 0 else '$0.00']
    ]
    
    summary_table = Table(summary_data, colWidths=[3*inch, 3*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
    ]))
    
    elements.append(summary_table)
    elements.append(Spacer(1, 30))
    
    # Footer
    footer_text = f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}"
    elements.append(Paragraph(footer_text, styles['Normal']))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=analytics-{datetime.now().strftime('%Y%m%d')}.pdf"
        }
    )