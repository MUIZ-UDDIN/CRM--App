"""
Voice calls API endpoints for Twilio integration
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID

from ..core.security import get_current_active_user
from ..core.database import get_db
from ..models.calls import Call as CallModel, CallDirection, CallStatus
from ..services.twilio_service import TwilioService
from ..middleware.tenant import get_tenant_context
from ..middleware.permissions import has_permission
from ..models.permissions import Permission

router = APIRouter()
twilio_service = TwilioService()


class CallMakeRequest(BaseModel):
    from_number: Optional[str] = Field(None, alias='from')  # Twilio number to call from
    to: str
    notes: Optional[str] = None
    contact_id: Optional[str] = None

    class Config:
        populate_by_name = True


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
    type: Optional[str] = None,  # Filter by type: 'all', 'incoming', 'outgoing'
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get all calls for current company, optionally filtered by direction"""
    import uuid
    from sqlalchemy import or_, and_
    
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    user_team_id = current_user.get("team_id")
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    # Get tenant context for role-based filtering
    context = get_tenant_context(current_user)
    
    # Role-based filtering
    if context.is_super_admin():
        # Super Admin sees all calls
        query = db.query(CallModel)
    elif has_permission(current_user, Permission.VIEW_COMPANY_DATA):
        # Company Admin sees all company calls
        query = db.query(CallModel).filter(CallModel.company_id == company_id)
    elif has_permission(current_user, Permission.VIEW_TEAM_DATA) and user_team_id:
        # Sales Manager sees team calls
        from ..models.users import User
        team_user_ids = [u.id for u in db.query(User).filter(
            User.team_id == uuid.UUID(user_team_id),
            User.is_deleted == False
        ).all()]
        query = db.query(CallModel).filter(
            CallModel.company_id == company_id,
            CallModel.user_id.in_(team_user_ids)
        )
    else:
        # Sales Reps see ONLY their own calls
        query = db.query(CallModel).filter(
            CallModel.company_id == company_id,
            CallModel.user_id == user_id
        )
    
    # Filter by direction if type parameter is provided
    if type == 'incoming':
        query = query.filter(CallModel.direction == CallDirection.INBOUND)
    elif type == 'outgoing':
        query = query.filter(CallModel.direction == CallDirection.OUTBOUND)
    # If type == 'all' or None, show all calls
    
    calls = query.order_by(CallModel.created_at.desc()).offset(skip).limit(limit).all()
    
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
    from loguru import logger
    
    try:
        logger.info(f"📞 Received call request: from={request.from_number}, to={request.to}")
        
        from twilio.rest import Client
        from twilio.base.exceptions import TwilioRestException
        from ..models.twilio_settings import TwilioSettings
        
        # Get Twilio settings from database
        import uuid
        company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
        
        if not company_id:
            raise HTTPException(status_code=403, detail="No company associated with user")
        
        settings = db.query(TwilioSettings).filter(
            TwilioSettings.company_id == company_id
        ).first()
        
        if not settings:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No Twilio settings configured. Please configure Twilio in settings."
            )
        
        # Initialize Twilio client with user's credentials
        client = Client(settings.account_sid, settings.auth_token)
        
        # Use from number from request or get from database
        from_number = request.from_number
        if not from_number:
            from ..models.phone_numbers import PhoneNumber
            phone_number = db.query(PhoneNumber).filter(
                PhoneNumber.company_id == company_id,
                PhoneNumber.is_active == True
            ).first()
            
            if not phone_number:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No active phone number found. Please add a phone number in settings."
                )
            from_number = phone_number.phone_number
        
        # Make call via Twilio - connect directly without automated message
        # The call will be handled by the browser Twilio Device SDK
        user_id = current_user["id"]
        
        # Create TwiML URL that will handle the outgoing call
        twiml_url = f"https://sunstonecrm.com/api/webhooks/twilio/voice/outgoing?to={request.to}&from={from_number}&user_id={user_id}"
        
        call = client.calls.create(
            url=twiml_url,
            to=request.to,
            from_=from_number,
            status_callback="https://sunstonecrm.com/api/webhooks/twilio/voice/status",
            status_callback_event=['initiated', 'ringing', 'answered', 'completed', 'busy', 'failed', 'no-answer', 'canceled']
        )
        
        # Save to database
        call_record = CallModel(
            direction=CallDirection.OUTBOUND,
            status=CallStatus.INITIATED,
            from_address=from_number,
            to_address=request.to,
            user_id=current_user["id"],
            company_id=company_id,
            contact_id=request.contact_id,
            notes=request.notes,
            twilio_sid=call.sid,
            started_at=datetime.utcnow()
        )
        
        db.add(call_record)
        db.commit()
        db.refresh(call_record)
        
        # Broadcast WebSocket event for real-time sync
        try:
            from app.services.websocket_manager import broadcast_entity_change
            import asyncio
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(broadcast_entity_change(
                    company_id=str(company_id),
                    entity_type="call",
                    action="created",
                    entity_id=str(call_record.id),
                    data={
                        "id": str(call_record.id),
                        "to_address": call_record.to_address,
                        "status": call_record.status.value
                    }
                ))
        except Exception as ws_error:
            print(f"WebSocket broadcast error: {ws_error}")
        
        return {
            "success": True,
            "call_id": str(call_record.id),
            "twilio_sid": call.sid,
            "status": call.status
        }
        
    except TwilioRestException as e:
        logger.error(f"❌ Twilio error: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Twilio error: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Call error: {str(e)}")
        logger.exception(e)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to make call: {str(e)}"
        )


@router.post("/cleanup-stale")
async def cleanup_stale_calls(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Update old calls stuck in ringing/initiated status to no-answer"""
    import uuid
    from datetime import timedelta
    from sqlalchemy import or_, and_, text
    
    try:
        user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
        company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
        
        # Find calls older than 5 minutes still in ringing/initiated status
        cutoff_time = datetime.utcnow() - timedelta(minutes=5)
        
        # Use raw SQL to avoid enum issues - UPPERCASE to match database enum
        if company_id:
            result = db.execute(
                text("""
                    UPDATE calls 
                    SET status = 'NO_ANSWER',
                        ended_at = COALESCE(started_at + INTERVAL '30 seconds', NOW()),
                        updated_at = NOW()
                    WHERE (company_id = :company_id OR (company_id IS NULL AND user_id = :user_id))
                    AND status IN ('RINGING', 'INITIATED', 'QUEUED')
                    AND (started_at < :cutoff_time OR started_at IS NULL)
                    RETURNING id
                """),
                {"company_id": company_id, "user_id": user_id, "cutoff_time": cutoff_time}
            )
        else:
            result = db.execute(
                text("""
                    UPDATE calls 
                    SET status = 'NO_ANSWER',
                        ended_at = COALESCE(started_at + INTERVAL '30 seconds', NOW()),
                        updated_at = NOW()
                    WHERE user_id = :user_id
                    AND status IN ('RINGING', 'INITIATED', 'QUEUED')
                    AND (started_at < :cutoff_time OR started_at IS NULL)
                    RETURNING id
                """),
                {"user_id": user_id, "cutoff_time": cutoff_time}
            )
        
        count = result.rowcount
        db.commit()
        
        return {"success": True, "updated_count": count, "message": f"Updated {count} stale calls"}
    
    except Exception as e:
        db.rollback()
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in cleanup_stale_calls: {error_detail}")
        raise HTTPException(status_code=500, detail=f"Error cleaning up calls: {str(e)}")


@router.delete("/{call_id}")
async def delete_call(
    call_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Delete call record - Only Managers and Admins"""
    import uuid
    context = get_tenant_context(current_user)
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    if not company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No company associated with user")
    
    call = db.query(CallModel).filter(
        CallModel.id == call_id,
        CallModel.company_id == company_id
    ).first()
    
    if not call:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found")
    
    # Only Managers and Admins can delete calls
    if context.is_super_admin():
        pass
    elif has_permission(current_user, Permission.VIEW_COMPANY_DATA):
        pass
    elif has_permission(current_user, Permission.VIEW_TEAM_DATA):
        if user_team_id:
            from ..models.users import User
            team_user_ids = [str(u.id) for u in db.query(User).filter(
                User.team_id == user_team_id,
                User.is_deleted == False
            ).all()]
            if str(call.user_id) not in team_user_ids:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete calls from your team members.")
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not assigned to a team.")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to delete calls. Only managers and administrators can delete calls.")
    
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
    import uuid
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    call = db.query(CallModel).filter(
        CallModel.id == call_id,
        CallModel.company_id == company_id
    ).first()
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    call.notes = notes.get("notes", "")
    call.updated_at = datetime.utcnow()
    db.commit()
    
    return {"success": True, "message": "Call notes updated"}


@router.post("/twiml", include_in_schema=False)
@router.get("/twiml", include_in_schema=False)
async def call_twiml():
    """TwiML endpoint for handling calls - simple dial"""
    from fastapi.responses import Response
    
    # Simple TwiML that just connects the call
    twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Hello, connecting your call.</Say>
</Response>"""
    
    return Response(content=twiml, media_type="application/xml")


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
            # Find user by phone number
            from app.models.twilio_settings import PhoneNumber as PhoneNumberModel
            phone_record = db.query(PhoneNumberModel).filter(
                PhoneNumberModel.phone_number == to_number
            ).first()
            user_id = phone_record.user_id if phone_record else None
            
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
                user_id=user_id
            )
            db.add(call)
            
            # Create notification for incoming call
            if user_id and call_status in ["ringing", "in-progress"]:
                try:
                    from app.models.notifications import Notification
                    from app.models.users import User
                    from app.models.contacts import Contact
                    
                    user = db.query(User).filter(User.id == user_id).first()
                    contact = db.query(Contact).filter(
                        Contact.phone == from_number,
                        Contact.owner_id == user_id
                    ).first()
                    
                    if user and user.company_id:
                        contact_name = f"{contact.first_name} {contact.last_name}" if contact else from_number
                        notification = Notification(
                            user_id=user_id,
                            company_id=user.company_id,
                            type="call_received",
                            title=f"Incoming call from {contact_name}",
                            message=f"Call status: {call_status}",
                            link=f"/calls",
                            is_read=False
                        )
                        db.add(notification)
                        print(f"✅ Notification created for incoming call")
                except Exception as e:
                    print(f"⚠️ Failed to create call notification: {e}")
        
        db.commit()
        
        return {"success": True, "message": "Webhook processed"}
        
    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}