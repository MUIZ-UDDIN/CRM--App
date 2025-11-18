"""
Inbox API endpoints for SMS and Email
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

from ..core.security import get_current_active_user
from ..core.database import get_db
from ..models.inbox import Inbox as InboxModel, MessageType, MessageStatus, MessageDirection
from ..services.twilio_service import TwilioService
import uuid

router = APIRouter()
twilio_service = TwilioService()


class SendSMSRequest(BaseModel):
    to_number: str
    message: str
    contact_id: Optional[str] = None


class SendEmailRequest(BaseModel):
    to_email: EmailStr
    subject: str
    html_content: str
    text_content: Optional[str] = None
    contact_id: Optional[str] = None


class InboxMessage(BaseModel):
    id: str
    message_type: str
    direction: str
    status: str
    from_address: str
    to_address: str
    subject: Optional[str] = None
    body: str
    sent_at: datetime
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    contact_id: Optional[str] = None
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[InboxMessage])
async def get_inbox(
    message_type: Optional[MessageType] = None,
    direction: Optional[MessageDirection] = None,
    status: Optional[MessageStatus] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get inbox messages with role-based filtering"""
    from ..middleware.tenant import get_tenant_context
    from ..middleware.permissions import has_permission
    from ..models.permissions import Permission
    from ..models.users import User
    
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    user_team_id = current_user.get("team_id")
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    # Get tenant context for role-based filtering
    context = get_tenant_context(current_user)
    
    # Role-based filtering
    if context.is_super_admin():
        # Super Admin sees all messages
        query = db.query(InboxModel)
    elif has_permission(current_user, Permission.VIEW_COMPANY_DATA):
        # Company Admin sees all company messages
        query = db.query(InboxModel).filter(InboxModel.company_id == company_id)
    elif has_permission(current_user, Permission.VIEW_TEAM_DATA) and user_team_id:
        # Sales Manager sees team messages
        team_user_ids = [u.id for u in db.query(User).filter(
            User.team_id == uuid.UUID(user_team_id),
            User.is_deleted == False
        ).all()]
        query = db.query(InboxModel).filter(
            InboxModel.company_id == company_id,
            InboxModel.user_id.in_(team_user_ids)
        )
    else:
        # Sales Reps see ONLY their own messages
        query = db.query(InboxModel).filter(
            InboxModel.company_id == company_id,
            InboxModel.user_id == user_id
        )
    
    if message_type:
        query = query.filter(InboxModel.message_type == message_type)
    if direction:
        query = query.filter(InboxModel.direction == direction)
    if status:
        query = query.filter(InboxModel.status == status)
    
    messages = query.order_by(InboxModel.sent_at.desc()).offset(offset).limit(limit).all()
    return messages


@router.get("/sms", response_model=List[InboxMessage])
async def get_sms_inbox(
    direction: Optional[MessageDirection] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get SMS messages with role-based filtering"""
    from ..middleware.tenant import get_tenant_context
    from ..middleware.permissions import has_permission
    from ..models.permissions import Permission
    from ..models.users import User
    
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    user_team_id = current_user.get("team_id")
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    # Get tenant context for role-based filtering
    context = get_tenant_context(current_user)
    
    # Role-based filtering
    if context.is_super_admin():
        # Super Admin sees all SMS
        query = db.query(InboxModel).filter(InboxModel.message_type == MessageType.SMS)
    elif has_permission(current_user, Permission.VIEW_COMPANY_DATA):
        # Company Admin sees all company SMS
        query = db.query(InboxModel).filter(
            InboxModel.company_id == company_id,
            InboxModel.message_type == MessageType.SMS
        )
    elif has_permission(current_user, Permission.VIEW_TEAM_DATA) and user_team_id:
        # Sales Manager sees team SMS
        team_user_ids = [u.id for u in db.query(User).filter(
            User.team_id == uuid.UUID(user_team_id),
            User.is_deleted == False
        ).all()]
        query = db.query(InboxModel).filter(
            InboxModel.company_id == company_id,
            InboxModel.message_type == MessageType.SMS,
            InboxModel.user_id.in_(team_user_ids)
        )
    else:
        # Sales Reps see ONLY their own SMS
        query = db.query(InboxModel).filter(
            InboxModel.company_id == company_id,
            InboxModel.message_type == MessageType.SMS,
            InboxModel.user_id == user_id
        )
    
    if direction:
        query = query.filter(InboxModel.direction == direction)
    
    messages = query.order_by(InboxModel.sent_at.desc()).offset(offset).limit(limit).all()
    return messages


@router.get("/emails", response_model=List[InboxMessage])
async def get_email_inbox(
    direction: Optional[MessageDirection] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get Email messages with role-based filtering"""
    from ..middleware.tenant import get_tenant_context
    from ..middleware.permissions import has_permission
    from ..models.permissions import Permission
    from ..models.users import User
    
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    user_team_id = current_user.get("team_id")
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    # Get tenant context for role-based filtering
    context = get_tenant_context(current_user)
    
    # Role-based filtering
    if context.is_super_admin():
        # Super Admin sees all emails
        query = db.query(InboxModel).filter(InboxModel.message_type == MessageType.EMAIL)
    elif has_permission(current_user, Permission.VIEW_COMPANY_DATA):
        # Company Admin sees all company emails
        query = db.query(InboxModel).filter(
            InboxModel.company_id == company_id,
            InboxModel.message_type == MessageType.EMAIL
        )
    elif has_permission(current_user, Permission.VIEW_TEAM_DATA) and user_team_id:
        # Sales Manager sees team emails
        team_user_ids = [u.id for u in db.query(User).filter(
            User.team_id == uuid.UUID(user_team_id),
            User.is_deleted == False
        ).all()]
        query = db.query(InboxModel).filter(
            InboxModel.company_id == company_id,
            InboxModel.message_type == MessageType.EMAIL,
            InboxModel.user_id.in_(team_user_ids)
        )
    else:
        # Sales Reps see ONLY their own emails
        query = db.query(InboxModel).filter(
            InboxModel.company_id == company_id,
            InboxModel.message_type == MessageType.EMAIL,
            InboxModel.user_id == user_id
        )
    
    if direction:
        query = query.filter(InboxModel.direction == direction)
    
    messages = query.order_by(InboxModel.sent_at.desc()).offset(offset).limit(limit).all()
    return messages


@router.post("/send-sms")
async def send_sms(
    request: SendSMSRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Send SMS via Twilio"""
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    # Send SMS
    result = await twilio_service.send_sms(request.to_number, request.message)
    
    # Save to inbox
    inbox_message = InboxModel(
        message_type=MessageType.SMS,
        direction=MessageDirection.OUTBOUND,
        status=MessageStatus.SENT if result["success"] else MessageStatus.FAILED,
        from_address=twilio_service.phone_number or "Unknown",
        to_address=request.to_number,
        body=request.message,
        user_id=current_user["id"],
        company_id=company_id,
        contact_id=request.contact_id,
        provider_message_id=result.get("message_sid"),
        provider_data=result
    )
    
    db.add(inbox_message)
    db.commit()
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {"message": "SMS sent successfully", "result": result}


@router.post("/send-email")
async def send_email(
    request: SendEmailRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Send Email via SendGrid"""
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    # Send Email
    result = await twilio_service.send_email(
        request.to_email,
        request.subject,
        request.html_content,
        request.text_content
    )
    
    # Save to inbox
    inbox_message = InboxModel(
        message_type=MessageType.EMAIL,
        direction=MessageDirection.OUTBOUND,
        status=MessageStatus.SENT if result["success"] else MessageStatus.FAILED,
        from_address=twilio_service.from_email,
        to_address=request.to_email,
        subject=request.subject,
        body=request.text_content or request.html_content,
        html_body=request.html_content,
        user_id=current_user["id"],
        company_id=company_id,
        contact_id=request.contact_id,
        provider_message_id=result.get("message_id"),
        provider_data=result
    )
    
    db.add(inbox_message)
    db.commit()
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {"message": "Email sent successfully", "result": result}


@router.put("/{message_id}/mark-read")
async def mark_message_read(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Mark message as read"""
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    message = db.query(InboxModel).filter(
        InboxModel.id == message_id,
        InboxModel.company_id == company_id
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    message.read_at = datetime.utcnow()
    message.status = MessageStatus.READ
    db.commit()
    
    return {"message": "Message marked as read"}


@router.delete("/{message_id}")
async def delete_message(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Delete message"""
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    message = db.query(InboxModel).filter(
        InboxModel.id == message_id,
        InboxModel.company_id == company_id
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    db.delete(message)
    db.commit()
    
    return {"message": "Message deleted successfully"}
