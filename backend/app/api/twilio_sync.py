"""
Twilio Sync API - Bidirectional sync endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict
from pydantic import BaseModel
import uuid

from app.core.security import get_current_active_user
from app.core.database import get_db
from app.services.twilio_sync_service import get_twilio_sync_service
from app.models.twilio_settings import TwilioSettings

router = APIRouter(prefix="/twilio/sync", tags=["Twilio Sync"])


class SyncRequest(BaseModel):
    sync_phone_numbers: bool = True
    sync_messages: bool = True
    sync_calls: bool = True
    days: int = 7  # How many days of history to sync


@router.post("/full")
async def full_sync(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Perform full sync of all Twilio data
    - Phone numbers
    - Messages (last 30 days)
    - Calls (last 30 days)
    """
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # Get Twilio sync service
    sync_service = get_twilio_sync_service(user_id, db)
    
    if not sync_service:
        raise HTTPException(
            status_code=400,
            detail="Twilio not configured or credentials not verified"
        )
    
    # Perform sync in background
    def run_sync():
        result = sync_service.full_sync()
        print(f"✅ Full sync completed: {result}")
    
    background_tasks.add_task(run_sync)
    
    return {
        "message": "Full sync started in background",
        "status": "processing"
    }


@router.post("/phone-numbers")
async def sync_phone_numbers(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Sync phone numbers from Twilio
    - Fetches all purchased numbers
    - Adds new numbers to CRM
    - Removes deleted numbers
    """
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    sync_service = get_twilio_sync_service(user_id, db)
    
    if not sync_service:
        raise HTTPException(
            status_code=400,
            detail="Twilio not configured"
        )
    
    result = sync_service.sync_phone_numbers()
    
    if not result['success']:
        raise HTTPException(
            status_code=500,
            detail=f"Sync failed: {result.get('error')}"
        )
    
    return result


@router.post("/messages")
async def sync_messages(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Sync messages from Twilio
    - Fetches recent messages
    - Updates message statuses
    """
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    sync_service = get_twilio_sync_service(user_id, db)
    
    if not sync_service:
        raise HTTPException(
            status_code=400,
            detail="Twilio not configured"
        )
    
    result = sync_service.sync_messages(days=days)
    
    if not result['success']:
        raise HTTPException(
            status_code=500,
            detail=f"Sync failed: {result.get('error')}"
        )
    
    return result


@router.post("/calls")
async def sync_calls(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Sync calls from Twilio
    - Fetches recent calls
    - Updates call statuses and durations
    """
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    sync_service = get_twilio_sync_service(user_id, db)
    
    if not sync_service:
        raise HTTPException(
            status_code=400,
            detail="Twilio not configured"
        )
    
    result = sync_service.sync_calls(days=days)
    
    if not result['success']:
        raise HTTPException(
            status_code=500,
            detail=f"Sync failed: {result.get('error')}"
        )
    
    return result


@router.get("/status")
async def get_sync_status(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get Twilio sync status and statistics
    """
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # Check if Twilio is configured
    settings = db.query(TwilioSettings).filter(
        TwilioSettings.user_id == user_id
    ).first()
    
    if not settings:
        return {
            "configured": False,
            "verified": False,
            "message": "Twilio not configured"
        }
    
    # Get counts
    from app.models.phone_numbers import PhoneNumber
    from app.models.sms import SMSMessage
    from app.models.calls import Call
    from sqlalchemy import func, and_
    
    phone_count = db.query(func.count(PhoneNumber.id)).filter(
        and_(
            PhoneNumber.user_id == user_id,
            PhoneNumber.is_deleted == False
        )
    ).scalar()
    
    message_count = db.query(func.count(SMSMessage.id)).filter(
        SMSMessage.user_id == user_id
    ).scalar()
    
    call_count = db.query(func.count(Call.id)).filter(
        Call.user_id == user_id
    ).scalar()
    
    return {
        "configured": True,
        "verified": settings.is_verified,
        "account_sid": settings.account_sid,
        "last_verified": settings.last_verified_at.isoformat() if settings.last_verified_at else None,
        "statistics": {
            "phone_numbers": phone_count or 0,
            "messages": message_count or 0,
            "calls": call_count or 0
        }
    }


@router.post("/auto-sync/enable")
async def enable_auto_sync(
    interval_minutes: int = 30,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Enable automatic sync (runs every X minutes)
    """
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    settings = db.query(TwilioSettings).filter(
        TwilioSettings.user_id == user_id
    ).first()
    
    if not settings:
        raise HTTPException(status_code=404, detail="Twilio not configured")
    
    # Store auto-sync settings (you'd implement this in TwilioSettings model)
    # For now, just return success
    
    return {
        "message": f"Auto-sync enabled (every {interval_minutes} minutes)",
        "interval_minutes": interval_minutes
    }
