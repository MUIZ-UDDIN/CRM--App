"""
Enhanced Analytics API - Message and Number Performance
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Optional
from datetime import datetime, timedelta
import uuid

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.analytics import MessageAnalytics, NumberPerformanceStats
from app.models.conversations import UserConversation
from app.models.sms import SMSMessage
from app.models.phone_numbers import PhoneNumber

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/messages/performance")
async def get_message_performance(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    phone_number: Optional[str] = Query(None, description="Filter by phone number"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get message performance metrics"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # Default to last 30 days
    if not start_date:
        start_date = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not end_date:
        end_date = datetime.utcnow().strftime("%Y-%m-%d")
    
    # Query message analytics
    query = db.query(MessageAnalytics).join(
        UserConversation,
        MessageAnalytics.conversation_id == UserConversation.id
    ).filter(
        UserConversation.user_id == user_id,
        MessageAnalytics.timestamp >= start_date,
        MessageAnalytics.timestamp <= end_date
    )
    
    if phone_number:
        query = query.filter(MessageAnalytics.from_twilio_number == phone_number)
    
    analytics = query.all()
    
    # Calculate metrics
    total_messages = len(analytics)
    delivered = sum(1 for a in analytics if a.delivered)
    responded = sum(1 for a in analytics if a.responded)
    avg_response_time = sum(a.response_time for a in analytics if a.response_time) / responded if responded > 0 else 0
    
    return {
        "period": {"start": start_date, "end": end_date},
        "total_messages": total_messages,
        "delivered": delivered,
        "responded": responded,
        "delivery_rate": round((delivered / total_messages * 100) if total_messages > 0 else 0, 2),
        "response_rate": round((responded / total_messages * 100) if total_messages > 0 else 0, 2),
        "avg_response_time_seconds": round(avg_response_time, 2)
    }


@router.get("/numbers/performance")
async def get_number_performance(
    date: Optional[str] = Query(None, description="Date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get performance stats for all phone numbers"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    if not date:
        date = datetime.utcnow().strftime("%Y-%m-%d")
    
    stats = db.query(NumberPerformanceStats).filter(
        NumberPerformanceStats.user_id == user_id,
        func.date(NumberPerformanceStats.date) == date
    ).all()
    
    return {
        "date": date,
        "numbers": [
            {
                "twilio_number": s.twilio_number,
                "total_sent": s.total_sent,
                "total_delivered": s.total_delivered,
                "total_received": s.total_received,
                "total_responded": s.total_responded,
                "delivery_rate": s.delivery_rate,
                "response_rate": s.response_rate,
                "engagement_score": s.engagement_score,
                "avg_response_time": s.avg_response_time
            }
            for s in stats
        ]
    }


@router.get("/numbers/{phone_number}/details")
async def get_number_details(
    phone_number: str,
    days: int = Query(30, ge=1, le=90, description="Number of days to analyze"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get detailed analytics for a specific phone number"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # Get phone number info
    phone = db.query(PhoneNumber).filter(
        PhoneNumber.phone_number == phone_number,
        PhoneNumber.user_id == user_id
    ).first()
    
    if not phone:
        return {"error": "Phone number not found"}
    
    # Get stats for the period
    start_date = datetime.utcnow() - timedelta(days=days)
    stats = db.query(NumberPerformanceStats).filter(
        NumberPerformanceStats.twilio_number == phone_number,
        NumberPerformanceStats.user_id == user_id,
        NumberPerformanceStats.date >= start_date
    ).order_by(NumberPerformanceStats.date.desc()).all()
    
    # Get active conversations
    active_convos = db.query(UserConversation).filter(
        UserConversation.from_twilio_number == phone_number,
        UserConversation.user_id == user_id,
        UserConversation.conversation_status == 'active'
    ).count()
    
    return {
        "phone_number": phone_number,
        "friendly_name": phone.friendly_name,
        "rotation_enabled": phone.rotation_enabled,
        "active_conversations": active_convos,
        "daily_stats": [
            {
                "date": s.date.strftime("%Y-%m-%d"),
                "total_sent": s.total_sent,
                "delivery_rate": s.delivery_rate,
                "response_rate": s.response_rate,
                "engagement_score": s.engagement_score
            }
            for s in stats
        ]
    }
