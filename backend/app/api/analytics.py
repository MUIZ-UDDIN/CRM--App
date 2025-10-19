"""
Analytics API endpoints with comprehensive data aggregation and caching
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
import uuid
from ..core.security import get_current_active_user
from ..core.database import get_db
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
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    team_id: Optional[int] = Query(None, description="Filter by team ID"),
    pipeline_id: Optional[int] = Query(None, description="Filter by pipeline ID"),
    current_user: dict = Depends(get_current_active_user)
):
    """Get pipeline analytics with conversion rates, stage durations, deal count per pipeline/stage
    
    Returns:
    - Conversion rates by stage
    - Average deal duration per stage
    - Deal count per stage
    - Pipeline velocity metrics
    - Stage-to-stage conversion rates
    """
    
    # Check cache first
    cache_key = f"analytics:pipeline:{date_from}:{date_to}:{user_id}:{team_id}:{pipeline_id}"
    cached = await get_cached_analytics(cache_key)
    if cached:
        return cached
    
    # TODO: Implement actual database aggregation
    # This is mock data structure - replace with actual DB queries
    data = {
        "filters": {
            "date_from": date_from,
            "date_to": date_to,
            "user_id": user_id,
            "team_id": team_id,
            "pipeline_id": pipeline_id
        },
        "pipeline_analytics": [
            {
                "stage_id": 1,
                "stage_name": "Qualification",
                "deal_count": 15,
                "total_value": 450000.0,
                "avg_value": 30000.0,
                "conversion_rate": 75.0,
                "avg_duration_days": 5.2,
                "deals_won": 12,
                "deals_lost": 3,
                "win_rate": 80.0
            },
            {
                "stage_id": 2,
                "stage_name": "Proposal",
                "deal_count": 8,
                "total_value": 320000.0,
                "avg_value": 40000.0,
                "conversion_rate": 65.0,
                "avg_duration_days": 7.8,
                "deals_won": 5,
                "deals_lost": 3,
                "win_rate": 62.5
            },
            {
                "stage_id": 3,
                "stage_name": "Negotiation",
                "deal_count": 5,
                "total_value": 275000.0,
                "avg_value": 55000.0,
                "conversion_rate": 45.0,
                "avg_duration_days": 10.5,
                "deals_won": 3,
                "deals_lost": 2,
                "win_rate": 60.0
            },
            {
                "stage_id": 4,
                "stage_name": "Closed Won",
                "deal_count": 20,
                "total_value": 850000.0,
                "avg_value": 42500.0,
                "conversion_rate": 68.0,
                "avg_duration_days": 3.2,
                "deals_won": 20,
                "deals_lost": 0,
                "win_rate": 100.0
            }
        ],
        "deals_by_owner": [
            {"owner_id": 1, "owner_name": "John Doe", "deal_count": 24, "total_value": 125000.0},
            {"owner_id": 2, "owner_name": "Jane Smith", "deal_count": 18, "total_value": 98000.0},
            {"owner_id": 3, "owner_name": "Mike Johnson", "deal_count": 15, "total_value": 87000.0}
        ],
        "deals_by_team": [
            {"team_id": 1, "team_name": "Sales Team", "deal_count": 35, "total_value": 210000.0},
            {"team_id": 2, "team_name": "Enterprise Team", "deal_count": 22, "total_value": 100000.0}
        ],
        "velocity_metrics": {
            "avg_time_to_close": 26.7,
            "fastest_deal": 5.0,
            "slowest_deal": 65.0,
            "median_time": 22.0
        },
        "summary": {
            "total_deals": 48,
            "total_value": 1895000.0,
            "overall_conversion_rate": 63.25,
            "avg_deal_size": 39479.17
        }
    }
    
    # Cache the result
    await set_cached_analytics(cache_key, data, ttl=300)
    return data


@router.get("/activities")
async def get_activity_analytics(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    team_id: Optional[int] = Query(None),
    activity_type: Optional[str] = Query(None, description="Filter by activity type"),
    current_user: dict = Depends(get_current_active_user)
):
    """Get activity analytics with counts, completion rates, overdue metrics
    
    Returns:
    - Activity counts by type
    - Completion rates
    - Overdue vs completed counts
    - Activity distribution by user/team
    """
    
    cache_key = f"analytics:activities:{date_from}:{date_to}:{user_id}:{team_id}:{activity_type}"
    cached = await get_cached_analytics(cache_key)
    if cached:
        return cached
    data = {
        "filters": {
            "date_from": date_from,
            "date_to": date_to,
            "user_id": user_id,
            "team_id": team_id,
            "activity_type": activity_type
        },
        "activity_analytics": [
            {
                "activity_type": "call",
                "total_count": 145,
                "completed_count": 133,
                "overdue_count": 12,
                "pending_count": 0,
                "completion_rate": 91.7,
                "avg_duration_minutes": 12.5
            },
            {
                "activity_type": "email",
                "total_count": 234,
                "completed_count": 226,
                "overdue_count": 8,
                "pending_count": 0,
                "completion_rate": 96.6,
                "avg_duration_minutes": 5.2
            },
            {
                "activity_type": "meeting",
                "total_count": 89,
                "completed_count": 84,
                "overdue_count": 5,
                "pending_count": 0,
                "completion_rate": 94.4,
                "avg_duration_minutes": 45.0
            },
            {
                "activity_type": "task",
                "total_count": 167,
                "completed_count": 152,
                "overdue_count": 15,
                "pending_count": 0,
                "completion_rate": 91.0,
                "avg_duration_minutes": 30.0
            }
        ],
        "activities_by_user": [
            {
                "user_id": 1,
                "user_name": "John Doe",
                "calls": 45,
                "emails": 89,
                "meetings": 28,
                "tasks": 56,
                "total": 218,
                "completion_rate": 93.5
            },
            {
                "user_id": 2,
                "user_name": "Jane Smith",
                "calls": 38,
                "emails": 67,
                "meetings": 25,
                "tasks": 42,
                "total": 172,
                "completion_rate": 91.2
            },
            {
                "user_id": 3,
                "user_name": "Mike Johnson",
                "calls": 32,
                "emails": 45,
                "meetings": 18,
                "tasks": 38,
                "total": 133,
                "completion_rate": 88.7
            }
        ],
        "activity_distribution": {
            "by_day": [
                {"day": "Monday", "count": 135},
                {"day": "Tuesday", "count": 142},
                {"day": "Wednesday", "count": 128},
                {"day": "Thursday", "count": 156},
                {"day": "Friday", "count": 120}
            ],
            "by_hour": [
                {"hour": "09:00", "count": 45},
                {"hour": "10:00", "count": 67},
                {"hour": "11:00", "count": 82},
                {"hour": "14:00", "count": 75},
                {"hour": "15:00", "count": 58}
            ]
        },
        "summary": {
            "total_activities": 635,
            "total_completed": 595,
            "total_overdue": 40,
            "total_pending": 0,
            "overall_completion_rate": 93.7
        }
    }
    
    await set_cached_analytics(cache_key, data, ttl=300)
    return data


@router.get("/revenue")
async def get_revenue_analytics(current_user: dict = Depends(get_current_active_user)):
    """Get revenue analytics"""
    return {
        "monthly_revenue": [
            {"month": "2024-01", "revenue": 125000.0, "deal_count": 5},
            {"month": "2024-02", "revenue": 180000.0, "deal_count": 7},
            {"month": "2024-03", "revenue": 220000.0, "deal_count": 8},
            {"month": "2024-04", "revenue": 195000.0, "deal_count": 6},
            {"month": "2024-05", "revenue": 275000.0, "deal_count": 9}
        ],
        "quarterly_revenue": [
            {"quarter": "Q1 2024", "revenue": 525000.0, "deal_count": 20},
            {"quarter": "Q2 2024", "revenue": 470000.0, "deal_count": 15}
        ],
        "summary": {
            "total_revenue": 995000.0,
            "total_deals": 35,
            "avg_deal_size": 28428.57,
            "growth_rate": 12.5
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
    user_id: Optional[int] = Query(None),
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
    user_id: Optional[int] = Query(None),
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
    user_id: Optional[int] = Query(None),
    team_id: Optional[int] = Query(None),
    pipeline_id: Optional[int] = Query(None),
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
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get overall dashboard analytics with real-time data"""
    from datetime import datetime, timedelta
    from sqlalchemy import func, and_, or_
    from ..models.deals import Deal as DealModel, DealStatus
    from ..models.contacts import Contact as ContactModel
    from ..models.activities import Activity as ActivityModel, ActivityStatus
    
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    today = datetime.utcnow().date()
    month_start = datetime.utcnow().replace(day=1).date()
    last_month_start = (datetime.utcnow().replace(day=1) - timedelta(days=1)).replace(day=1).date()
    
    # Check if user is superuser - show all deals, otherwise filter by owner
    is_superuser = current_user.get("is_superuser", False)
    
    # Total Pipeline Value
    pipeline_query = db.query(func.sum(DealModel.value)).filter(
        and_(
            DealModel.is_deleted == False,
            DealModel.status != DealStatus.LOST,
            DealModel.status != DealStatus.WON
        )
    )
    if not is_superuser:
        pipeline_query = pipeline_query.filter(DealModel.owner_id == user_id)
    total_pipeline = pipeline_query.scalar() or 0.0
    
    # Active Deals Count
    deals_query = db.query(func.count(DealModel.id)).filter(
        and_(
            DealModel.is_deleted == False,
            DealModel.status != DealStatus.LOST,
            DealModel.status != DealStatus.WON
        )
    )
    if not is_superuser:
        deals_query = deals_query.filter(DealModel.owner_id == user_id)
    active_deals = deals_query.scalar() or 0
    
    # Win Rate
    closed_query = db.query(func.count(DealModel.id)).filter(
        and_(
            DealModel.is_deleted == False,
            or_(DealModel.status == DealStatus.WON, DealModel.status == DealStatus.LOST)
        )
    )
    if not is_superuser:
        closed_query = closed_query.filter(DealModel.owner_id == user_id)
    total_closed = closed_query.scalar() or 0
    
    won_query = db.query(func.count(DealModel.id)).filter(
        and_(
            DealModel.is_deleted == False,
            DealModel.status == DealStatus.WON
        )
    )
    if not is_superuser:
        won_query = won_query.filter(DealModel.owner_id == user_id)
    won_deals = won_query.scalar() or 0
    
    win_rate = (won_deals / total_closed * 100) if total_closed > 0 else 0
    
    # Activities Today
    activities_query = db.query(func.count(ActivityModel.id)).filter(
        and_(
            ActivityModel.is_deleted == False,
            func.date(ActivityModel.due_date) == today
        )
    )
    if not is_superuser:
        activities_query = activities_query.filter(ActivityModel.owner_id == user_id)
    activities_today = activities_query.scalar() or 0
    
    # Previous month metrics for growth calculation
    last_month_pipeline = db.query(func.sum(DealModel.value)).filter(
        and_(
            DealModel.owner_id == user_id,
            DealModel.is_deleted == False,
            func.date(DealModel.created_at) >= last_month_start,
            func.date(DealModel.created_at) < month_start
        )
    ).scalar() or 0.0
    
    last_month_deals = db.query(func.count(DealModel.id)).filter(
        and_(
            DealModel.owner_id == user_id,
            DealModel.is_deleted == False,
            func.date(DealModel.created_at) >= last_month_start,
            func.date(DealModel.created_at) < month_start
        )
    ).scalar() or 0
    
    # Calculate growth percentages
    pipeline_growth = ((total_pipeline - last_month_pipeline) / last_month_pipeline * 100) if last_month_pipeline > 0 else 0
    deal_growth = ((active_deals - last_month_deals) / last_month_deals * 100) if last_month_deals > 0 else 0
    
    return {
        "kpis": {
            "total_pipeline": round(total_pipeline, 2),
            "pipeline_growth": round(pipeline_growth, 1),
            "active_deals": active_deals,
            "deal_growth": round(deal_growth, 1),
            "win_rate": round(win_rate, 1),
            "activities_today": activities_today
        }
    }