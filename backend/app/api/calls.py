"""
Voice calls API endpoints for Twilio integration
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

from ..core.security import get_current_active_user
from ..core.database import get_db
from ..models.calls import Call as CallModel, CallDirection, CallStatus
from ..services.twilio_service import TwilioService

router = APIRouter()
twilio_service = TwilioService()


class CallMakeRequest(BaseModel):
    from_: str = None  # Twilio number to call from
    to: str
    notes: Optional[str] = None
    contact_id: Optional[str] = None

    class Config:
        populate_by_name = True
        fields = {'from_': 'from'}


class CallResponse(BaseModel):
    id: str
    direction: str
    status: str
    from_address: str
    to_address: str
    duration: int
    recording_url: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    notes: Optional[str] = None
    contact_id: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/", response_model=List[CallResponse])
async def get_calls(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get all calls for current user"""
    calls = db.query(CallModel).filter(
        CallModel.user_id == current_user["id"]
    ).order_by(CallModel.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        CallResponse(
            id=str(call.id),
            direction=call.direction,
            status=call.status,
            from_address=call.from_address,
            to_address=call.to_address,
            duration=call.duration or 0,
            recording_url=call.recording_url,
            started_at=call.started_at or call.created_at,
            ended_at=call.ended_at,
            notes=call.notes,
            contact_id=str(call.contact_id) if call.contact_id else None
        ) for call in calls
    ]


@router.post("/make")
@router.post("/initiate")  # Alias for frontend compatibility
async def make_call(
    request: CallMakeRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Make outbound call via Twilio"""
    try:
        from twilio.rest import Client
        from twilio.base.exceptions import TwilioRestException
        from ..models.twilio_settings import TwilioSettings
        
        # Get Twilio settings from database
        settings = db.query(TwilioSettings).filter(
            TwilioSettings.user_id == current_user["id"]
        ).first()
        
        if not settings:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No Twilio settings configured. Please configure Twilio in settings."
            )
        
        # Initialize Twilio client with user's credentials
        client = Client(settings.account_sid, settings.auth_token)
        
        # Use from number from request or get from database
        from_number = request.from_
        if not from_number:
            from ..models.phone_numbers import PhoneNumber
            phone_number = db.query(PhoneNumber).filter(
                PhoneNumber.user_id == current_user["id"],
                PhoneNumber.is_active == True
            ).first()
            
            if not phone_number:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No active phone number found. Please add a phone number in settings."
                )
            from_number = phone_number.phone_number
        
        # For now, we'll create a simple TwiML URL that plays a message
        # In production, you would have proper TwiML endpoints
        twiml_url = "https://handler.twilio.com/twiml/EHaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        
        # Make call via Twilio
        call = client.calls.create(
            url=twiml_url,
            to=request.to,
            from_=from_number
        )
        
        # Save to database
        call_record = CallModel(
            direction=CallDirection.OUTBOUND,
            status=CallStatus.INITIATED,
            from_address=from_number,
            to_address=request.to,
            user_id=current_user["id"],
            contact_id=request.contact_id,
            notes=request.notes,
            twilio_sid=call.sid,
            started_at=datetime.utcnow()
        )
        
        db.add(call_record)
        db.commit()
        db.refresh(call_record)
        
        return {
            "success": True,
            "call_id": str(call_record.id),
            "twilio_sid": call.sid,
            "status": call.status
        }
        
    except TwilioRestException as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Twilio error: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to make call: {str(e)}"
        )


@router.delete("/{call_id}")
async def delete_call(
    call_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Delete call record"""
    call = db.query(CallModel).filter(
        CallModel.id == call_id,
        CallModel.user_id == current_user["id"]
    ).first()
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    db.delete(call)
    db.commit()
    
    return {"success": True, "message": "Call record deleted"}


@router.put("/{call_id}/notes")
async def update_call_notes(
    call_id: str,
    notes: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Update call notes"""
    call = db.query(CallModel).filter(
        CallModel.id == call_id,
        CallModel.user_id == current_user["id"]
    ).first()
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    call.notes = notes.get("notes", "")
    call.updated_at = datetime.utcnow()
    db.commit()
    
    return {"success": True, "message": "Call notes updated"}


@router.post("/webhook")
async def call_webhook(
    request: dict,
    db: Session = Depends(get_db)
):
    """Webhook for call status updates from Twilio"""
    try:
        # Extract webhook data
        call_sid = request.get("CallSid")
        call_status = request.get("CallStatus")
        from_number = request.get("From")
        to_number = request.get("To")
        duration = request.get("CallDuration")
        recording_url = request.get("RecordingUrl")
        
        # Find existing call record
        call = db.query(CallModel).filter(CallModel.twilio_sid == call_sid).first()
        
        if call:
            # Update existing call
            call.status = call_status
            if duration:
                call.duration = int(duration)
            if recording_url:
                call.recording_url = recording_url
            if call_status in ["completed", "failed", "canceled", "busy", "no-answer"]:
                call.ended_at = datetime.utcnow()
            call.updated_at = datetime.utcnow()
        else:
            # Create new inbound call record
            call = CallModel(
                direction=CallDirection.INBOUND,
                status=call_status,
                from_address=from_number,
                to_address=to_number,
                twilio_sid=call_sid,
                duration=int(duration) if duration else 0,
                recording_url=recording_url,
                started_at=datetime.utcnow(),
                ended_at=datetime.utcnow() if call_status in ["completed", "failed", "canceled", "busy", "no-answer"] else None,
                # Note: user_id should be determined by to_number mapping
                user_id="default-user-id"  # TODO: Map phone number to user
            )
            db.add(call)
        
        db.commit()
        
        return {"success": True, "message": "Webhook processed"}
        
    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}