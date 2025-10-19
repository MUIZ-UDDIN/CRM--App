"""
SMS API endpoints for Twilio integration
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

from ..core.security import get_current_active_user
from ..core.database import get_db
from ..models.sms import SMSMessage as SMSModel, SMSDirection, SMSStatus
from ..services.twilio_service import TwilioService

router = APIRouter()
twilio_service = TwilioService()


class SMSSendRequest(BaseModel):
    to: str
    body: str
    contact_id: Optional[str] = None


class SMSMessageResponse(BaseModel):
    id: str
    direction: str
    status: str
    from_address: str
    to_address: str
    body: str
    sent_at: datetime
    read_at: Optional[datetime] = None
    contact_id: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/messages", response_model=List[SMSMessageResponse])
async def get_sms_messages(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get all SMS messages for current user"""
    messages = db.query(SMSModel).filter(
        SMSModel.user_id == current_user["id"]
    ).order_by(SMSModel.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        SMSMessageResponse(
            id=str(msg.id),
            direction=msg.direction,
            status=msg.status,
            from_address=msg.from_address,
            to_address=msg.to_address,
            body=msg.body,
            sent_at=msg.created_at,
            read_at=msg.read_at,
            contact_id=str(msg.contact_id) if msg.contact_id else None
        ) for msg in messages
    ]


@router.post("/send")
async def send_sms(
    request: SMSSendRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Send SMS message via Twilio"""
    try:
        # Send SMS via Twilio
        result = await twilio_service.send_sms(
            to_number=request.to,
            message=request.body
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to send SMS: {result.get('error', 'Unknown error')}"
            )
        
        # Save to database
        sms_message = SMSModel(
            direction=SMSDirection.OUTBOUND,
            status=SMSStatus.SENT,
            from_address=twilio_service.phone_number or "+1234567890",
            to_address=request.to,
            body=request.body,
            user_id=current_user["id"],
            contact_id=request.contact_id,
            twilio_sid=result.get("message_sid")
        )
        
        db.add(sms_message)
        db.commit()
        db.refresh(sms_message)
        
        return {
            "success": True,
            "message_id": str(sms_message.id),
            "twilio_sid": result.get("message_sid"),
            "status": result.get("status")
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send SMS: {str(e)}"
        )


@router.put("/messages/{message_id}/mark-read")
async def mark_sms_as_read(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Mark SMS message as read"""
    message = db.query(SMSModel).filter(
        SMSModel.id == message_id,
        SMSModel.user_id == current_user["id"]
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="SMS message not found")
    
    message.read_at = datetime.utcnow()
    db.commit()
    
    return {"success": True, "message": "Message marked as read"}


@router.delete("/messages/{message_id}")
async def delete_sms_message(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Delete SMS message"""
    message = db.query(SMSModel).filter(
        SMSModel.id == message_id,
        SMSModel.user_id == current_user["id"]
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="SMS message not found")
    
    db.delete(message)
    db.commit()
    
    return {"success": True, "message": "SMS message deleted"}


@router.post("/webhook")
async def sms_webhook(
    request: dict,
    db: Session = Depends(get_db)
):
    """Webhook for incoming SMS messages from Twilio"""
    try:
        # Extract webhook data
        message_sid = request.get("MessageSid")
        from_number = request.get("From")
        to_number = request.get("To")
        body = request.get("Body")
        status = request.get("SmsStatus", "received")
        
        # Save incoming SMS to database
        sms_message = SMSModel(
            direction=SMSDirection.INBOUND,
            status=SMSStatus.RECEIVED,
            from_address=from_number,
            to_address=to_number,
            body=body,
            twilio_sid=message_sid,
            # Note: user_id should be determined by to_number mapping
            user_id="default-user-id"  # TODO: Map phone number to user
        )
        
        db.add(sms_message)
        db.commit()
        
        return {"success": True, "message": "Webhook processed"}
        
    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}