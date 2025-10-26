"""
Enhanced SMS API with AI responses, templates, and number rotation
"""

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from typing import List, Optional, Dict
from pydantic import BaseModel
from datetime import datetime, timedelta
from uuid import UUID
import uuid
import json
from loguru import logger

from app.core.security import get_current_active_user
from app.core.database import get_db
from app.models.sms import SMSMessage as SMSModel, SMSDirection, SMSStatus
from app.models.sms_templates import SMSTemplate
from app.models.phone_numbers import PhoneNumber
from app.models.twilio_settings import TwilioSettings
from app.models.contacts import Contact
from app.services.claude_service import get_claude_service

router = APIRouter(prefix="/sms", tags=["SMS Enhanced"])


# Pydantic Models
class SMSSendRequest(BaseModel):
    to: str
    body: Optional[str] = None
    template_id: Optional[str] = None
    contact_id: Optional[str] = None
    from_number: Optional[str] = None  # Specific number to use
    use_rotation: bool = True  # Use number rotation
    variables: Optional[Dict[str, str]] = None  # For template variables


class SMSTemplateCreate(BaseModel):
    name: str
    category: Optional[str] = None
    body: str
    is_static: bool = True
    variables: Optional[str] = None
    use_ai_enhancement: bool = False
    ai_tone: str = 'professional'


class SMSTemplateResponse(BaseModel):
    id: str
    name: str
    category: Optional[str]
    body: str
    is_static: bool
    use_ai_enhancement: bool
    usage_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class PhoneNumberCreate(BaseModel):
    phone_number: str
    friendly_name: Optional[str] = None
    twilio_sid: Optional[str] = None
    rotation_enabled: bool = False
    rotation_priority: int = 0


class PhoneNumberCapabilities(BaseModel):
    voice: bool
    sms: bool
    mms: bool


class PhoneNumberResponse(BaseModel):
    id: str
    phone_number: str
    friendly_name: Optional[str]
    capabilities: PhoneNumberCapabilities
    is_active: bool
    use_for_rotation: bool
    rotation_enabled: bool  # Deprecated, use use_for_rotation
    total_messages_sent: int
    total_messages_received: int
    last_used_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class SMSAnalytics(BaseModel):
    total_sent: int
    total_received: int
    total_failed: int
    total_delivered: int
    success_rate: float
    response_rate: float
    avg_response_time_minutes: Optional[float]


# Helper Functions
def get_next_rotation_number(db: Session, user_id: UUID) -> Optional[PhoneNumber]:
    """Get next phone number in rotation"""
    numbers = db.query(PhoneNumber).filter(
        and_(
            PhoneNumber.user_id == user_id,
            PhoneNumber.is_active == True,
            PhoneNumber.rotation_enabled == True
        )
    ).order_by(
        desc(PhoneNumber.rotation_priority),
        PhoneNumber.last_used_at.asc().nullsfirst()
    ).all()
    
    if not numbers:
        return None
    
    # Return least recently used number with highest priority
    return numbers[0]


def process_template(template: SMSTemplate, variables: Optional[Dict[str, str]] = None) -> str:
    """Process template with variables"""
    body = template.body
    
    if variables and not template.is_static:
        for key, value in variables.items():
            placeholder = f"{{{key}}}"
            body = body.replace(placeholder, value)
    
    return body


async def generate_ai_response(
    incoming_message: str,
    contact: Optional[Contact],
    conversation_history: List[SMSModel],
    user_id: UUID,
    db: Session
) -> str:
    """Generate AI response using Claude"""
    try:
        # Get Twilio settings for business context
        settings = db.query(TwilioSettings).filter(
            TwilioSettings.user_id == user_id
        ).first()
        
        # Build conversation history
        history = [
            {
                "direction": msg.direction.value,
                "body": msg.body
            }
            for msg in conversation_history[-10:]  # Last 10 messages
        ]
        
        # Get Claude service
        import os
        claude_api_key = os.getenv("CLAUDE_API_KEY")
        if not claude_api_key:
            # Fallback to default response if Claude not configured
            return "Thank you for your message. We'll get back to you soon!"
        
        claude = get_claude_service(api_key=claude_api_key)
        
        # Generate response
        response = await claude.generate_sms_response(
            incoming_message=incoming_message,
            contact_name=f"{contact.first_name} {contact.last_name}" if contact else None,
            contact_company=contact.company if contact else None,
            conversation_history=history,
            business_context="Sales CRM - helping businesses manage customer relationships",
            response_tone="professional"
        )
        
        return response
        
    except Exception as e:
        print(f"Error generating AI response: {e}")
        return "Thank you for your message. We'll get back to you soon!"


# Endpoints

@router.get("/messages")
async def get_sms_messages(
    skip: int = 0,
    limit: int = 100,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get all SMS messages for current user"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    query = db.query(SMSModel).filter(SMSModel.user_id == user_id)
    
    # Filter by type if provided
    if type:
        if type == "sent":
            query = query.filter(SMSModel.direction == SMSDirection.OUTBOUND)
        elif type == "received":
            query = query.filter(SMSModel.direction == SMSDirection.INBOUND)
    
    messages = query.order_by(SMSModel.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": str(msg.id),
            "direction": msg.direction,
            "status": msg.status,
            "from_address": msg.from_address,
            "to_address": msg.to_address,
            "body": msg.body,
            "sent_at": msg.created_at,
            "read_at": msg.read_at,
            "contact_id": str(msg.contact_id) if msg.contact_id else None,
            "created_at": msg.created_at
        } for msg in messages
    ]


@router.post("/send")
async def send_sms(
    request: SMSSendRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Send SMS with template support and number rotation"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # Validate and format recipient phone number
    to_number = request.to.strip()
    
    # Check if it starts with +
    if not to_number.startswith('+'):
        # Try to detect country and add country code
        if to_number.startswith('0'):
            # Pakistani number (03xx -> +923xx)
            if to_number.startswith('03'):
                to_number = '+92' + to_number[1:]
            # US/Canada number (1xxx -> +1xxx)
            elif len(to_number) == 10:
                to_number = '+1' + to_number
        elif len(to_number) == 10:
            # Assume US/Canada
            to_number = '+1' + to_number
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid phone number format. Please use E.164 format (e.g., +923160978329 for Pakistan, +1234567890 for US). You entered: {request.to}"
            )
    
    # Validate E.164 format (+ followed by 1-15 digits)
    if not to_number[1:].isdigit() or len(to_number) < 8 or len(to_number) > 16:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid phone number format. Must be E.164 format: +[country code][number]. Example: +923160978329 (Pakistan) or +12345678900 (US). You entered: {request.to}"
        )
    
    # Get message body
    message_body = request.body
    
    # If template_id provided, use template
    if request.template_id:
        template = db.query(SMSTemplate).filter(
            and_(
                SMSTemplate.id == uuid.UUID(request.template_id),
                SMSTemplate.user_id == user_id
            )
        ).first()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        message_body = process_template(template, request.variables)
        
        # Increment usage count
        template.usage_count += 1
        db.commit()
    
    if not message_body:
        raise HTTPException(status_code=400, detail="Message body or template_id required")
    
    # Determine which number to use
    from_number = None
    phone_number_record = None
    
    if request.from_number:
        # Use specific number
        phone_number_record = db.query(PhoneNumber).filter(
            and_(
                PhoneNumber.phone_number == request.from_number,
                PhoneNumber.user_id == user_id
            )
        ).first()
        from_number = request.from_number
    elif request.use_rotation:
        # Use rotation
        phone_number_record = get_next_rotation_number(db, user_id)
        if phone_number_record:
            from_number = phone_number_record.phone_number
    
    if not from_number:
        # Fallback to first active phone number
        first_number = db.query(PhoneNumber).filter(
            and_(
                PhoneNumber.user_id == user_id,
                PhoneNumber.is_active == True,
                PhoneNumber.sms_enabled == True
            )
        ).first()
        
        if first_number:
            from_number = first_number.phone_number
        else:
            # Try Twilio settings default
            settings = db.query(TwilioSettings).filter(
                TwilioSettings.user_id == user_id
            ).first()
            if settings and settings.phone_number:
                from_number = settings.phone_number
            else:
                raise HTTPException(
                    status_code=400, 
                    detail="No phone number available. Please sync phone numbers from Settings > Integrations > Twilio > Sync Phone Numbers."
                )
    
    # Send SMS via Twilio
    try:
        from twilio.rest import Client
        from twilio.base.exceptions import TwilioRestException
        settings = db.query(TwilioSettings).filter(
            TwilioSettings.user_id == user_id
        ).first()
        
        if not settings:
            raise HTTPException(status_code=400, detail="Twilio not configured. Please connect Twilio in Settings > Integrations.")
        
        logger.info(f"📤 Sending SMS from {from_number} to {to_number}")
        
        client = Client(settings.account_sid, settings.auth_token)
        message = client.messages.create(
            body=message_body,
            from_=from_number,
            to=to_number
        )
        
        logger.info(f"✅ SMS sent successfully: {message.sid}")
        
        # Save to database
        sms_record = SMSModel(
            direction=SMSDirection.OUTBOUND,
            status=SMSStatus.SENT,
            from_address=from_number,
            to_address=to_number,
            body=message_body,
            user_id=user_id,
            contact_id=uuid.UUID(request.contact_id) if request.contact_id else None,
            twilio_sid=message.sid
        )
        db.add(sms_record)
        
        # Update phone number stats
        if phone_number_record:
            phone_number_record.total_messages_sent += 1
            phone_number_record.last_used_at = datetime.utcnow()
        
        db.commit()
        
        return {
            "success": True,
            "message_sid": message.sid,
            "from": from_number,
            "to": to_number,
            "body": message_body
        }
    
    except TwilioRestException as e:
        # Handle Twilio-specific errors
        error_message = str(e)
        logger.error(f"❌ Twilio error: {error_message}")
        logger.error(f"Error code: {e.code if hasattr(e, 'code') else 'N/A'}")
        
        if "authentication" in error_message.lower() or "401" in error_message:
            raise HTTPException(
                status_code=400, 
                detail="Invalid Twilio credentials. Please reconnect Twilio in Settings > Integrations with correct Account SID and Auth Token."
            )
        elif "phone number" in error_message.lower() or "21606" in str(e.code) if hasattr(e, 'code') else False:
            raise HTTPException(
                status_code=400,
                detail=f"The phone number '{from_number}' is not verified or doesn't belong to your Twilio account. Please sync phone numbers in Settings > Integrations."
            )
        elif "21211" in str(e.code) if hasattr(e, 'code') else False:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid 'To' phone number: {to_number}. Please use E.164 format (e.g., +1234567890)."
            )
        else:
            raise HTTPException(status_code=400, detail=f"Twilio error: {error_message}")
        
    except Exception as e:
        logger.error(f"❌ SMS send failed: {str(e)}")
        logger.exception(e)
        raise HTTPException(status_code=500, detail=f"Failed to send SMS: {str(e)}")


@router.post("/webhook/incoming")
async def handle_incoming_sms(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Webhook for incoming SMS from Twilio"""
    try:
        form_data = await request.form()
        
        from_number = form_data.get("From")
        to_number = form_data.get("To")
        body = form_data.get("Body")
        message_sid = form_data.get("MessageSid")
        
        print(f"📱 Incoming SMS from {from_number}: {body}")
        
        # Find user by phone number
        phone_record = db.query(PhoneNumber).filter(
            PhoneNumber.phone_number == to_number
        ).first()
        
        if not phone_record:
            # Try Twilio settings
            settings = db.query(TwilioSettings).filter(
                TwilioSettings.phone_number == to_number
            ).first()
            user_id = settings.user_id if settings else None
        else:
            user_id = phone_record.user_id
            phone_record.total_messages_received += 1
            db.commit()
        
        if not user_id:
            print(f"⚠️ No user found for number {to_number}")
            return {"status": "ok"}
        
        # Find contact by phone number
        contact = db.query(Contact).filter(
            and_(
                Contact.phone == from_number,
                Contact.owner_id == user_id
            )
        ).first()
        
        # Save incoming message
        sms_record = SMSModel(
            direction=SMSDirection.INBOUND,
            status=SMSStatus.RECEIVED,
            from_address=from_number,
            to_address=to_number,
            body=body,
            user_id=user_id,
            contact_id=contact.id if contact else None,
            twilio_sid=message_sid
        )
        db.add(sms_record)
        db.commit()
        db.refresh(sms_record)
        
        # Get conversation history
        conversation = db.query(SMSModel).filter(
            or_(
                and_(SMSModel.from_address == from_number, SMSModel.to_address == to_number),
                and_(SMSModel.from_address == to_number, SMSModel.to_address == from_number)
            )
        ).order_by(SMSModel.created_at.desc()).limit(10).all()
        
        # Generate AI response
        ai_response = await generate_ai_response(
            incoming_message=body,
            contact=contact,
            conversation_history=conversation,
            user_id=user_id,
            db=db
        )
        
        # Send auto-response
        try:
            settings = db.query(TwilioSettings).filter(
                TwilioSettings.user_id == user_id
            ).first()
            
            if settings and settings.is_active:
                from twilio.rest import Client
                client = Client(settings.account_sid, settings.auth_token)
                
                response_message = client.messages.create(
                    body=ai_response,
                    from_=to_number,
                    to=from_number
                )
                
                # Save auto-response
                auto_response_record = SMSModel(
                    direction=SMSDirection.OUTBOUND,
                    status=SMSStatus.SENT,
                    from_address=to_number,
                    to_address=from_number,
                    body=ai_response,
                    user_id=user_id,
                    contact_id=contact.id if contact else None,
                    twilio_sid=response_message.sid,
                    is_auto_response=True
                )
                db.add(auto_response_record)
                db.commit()
                
                print(f"🤖 Auto-response sent: {ai_response[:50]}...")
        
        except Exception as e:
            print(f"❌ Error sending auto-response: {e}")
        
        return {"status": "ok"}
        
    except Exception as e:
        print(f"Error handling incoming SMS: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}


@router.get("/analytics", response_model=SMSAnalytics)
async def get_sms_analytics(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get SMS analytics"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    since_date = datetime.utcnow() - timedelta(days=days)
    
    # Total sent
    total_sent = db.query(func.count(SMSModel.id)).filter(
        and_(
            SMSModel.user_id == user_id,
            SMSModel.direction == SMSDirection.OUTBOUND,
            SMSModel.created_at >= since_date
        )
    ).scalar()
    
    # Total received
    total_received = db.query(func.count(SMSModel.id)).filter(
        and_(
            SMSModel.user_id == user_id,
            SMSModel.direction == SMSDirection.INBOUND,
            SMSModel.created_at >= since_date
        )
    ).scalar()
    
    # Total failed
    total_failed = db.query(func.count(SMSModel.id)).filter(
        and_(
            SMSModel.user_id == user_id,
            SMSModel.status == SMSStatus.FAILED,
            SMSModel.created_at >= since_date
        )
    ).scalar()
    
    # Total delivered
    total_delivered = db.query(func.count(SMSModel.id)).filter(
        and_(
            SMSModel.user_id == user_id,
            SMSModel.status == SMSStatus.DELIVERED,
            SMSModel.created_at >= since_date
        )
    ).scalar()
    
    # Calculate rates
    success_rate = (total_delivered / total_sent * 100) if total_sent > 0 else 0
    response_rate = (total_received / total_sent * 100) if total_sent > 0 else 0
    
    return SMSAnalytics(
        total_sent=total_sent or 0,
        total_received=total_received or 0,
        total_failed=total_failed or 0,
        total_delivered=total_delivered or 0,
        success_rate=round(success_rate, 2),
        response_rate=round(response_rate, 2),
        avg_response_time_minutes=None  # TODO: Calculate from conversation pairs
    )


# Template Management

@router.post("/templates", response_model=SMSTemplateResponse)
async def create_template(
    template: SMSTemplateCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Create SMS template"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    db_template = SMSTemplate(
        name=template.name,
        category=template.category,
        body=template.body,
        is_static=template.is_static,
        variables=template.variables,
        use_ai_enhancement=template.use_ai_enhancement,
        ai_tone=template.ai_tone,
        user_id=user_id
    )
    
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    
    return SMSTemplateResponse(
        id=str(db_template.id),
        name=db_template.name,
        category=db_template.category,
        body=db_template.body,
        is_static=db_template.is_static,
        use_ai_enhancement=db_template.use_ai_enhancement,
        usage_count=db_template.usage_count,
        created_at=db_template.created_at
    )


@router.get("/templates", response_model=List[SMSTemplateResponse])
async def get_templates(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get all SMS templates"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    templates = db.query(SMSTemplate).filter(
        and_(
            SMSTemplate.user_id == user_id,
            SMSTemplate.is_active == True
        )
    ).order_by(desc(SMSTemplate.usage_count)).all()
    
    return [
        SMSTemplateResponse(
            id=str(t.id),
            name=t.name,
            category=t.category,
            body=t.body,
            is_static=t.is_static,
            use_ai_enhancement=t.use_ai_enhancement,
            usage_count=t.usage_count,
            created_at=t.created_at
        )
        for t in templates
    ]


# Phone Number Management

@router.post("/phone-numbers", response_model=PhoneNumberResponse)
async def add_phone_number(
    phone_data: PhoneNumberCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Add phone number to rotation pool"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # Get Twilio settings
    settings = db.query(TwilioSettings).filter(
        TwilioSettings.user_id == user_id
    ).first()
    
    if not settings:
        raise HTTPException(status_code=400, detail="Twilio not configured")
    
    # Check if number already exists
    existing = db.query(PhoneNumber).filter(
        and_(
            PhoneNumber.phone_number == phone_data.phone_number,
            PhoneNumber.user_id == user_id
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already added")
    
    db_number = PhoneNumber(
        phone_number=phone_data.phone_number,
        friendly_name=phone_data.friendly_name,
        twilio_sid=phone_data.twilio_sid,
        rotation_enabled=phone_data.rotation_enabled,
        rotation_priority=phone_data.rotation_priority,
        user_id=user_id,
        twilio_settings_id=settings.id
    )
    
    db.add(db_number)
    db.commit()
    db.refresh(db_number)
    
    return PhoneNumberResponse(
        id=str(db_number.id),
        phone_number=db_number.phone_number,
        friendly_name=db_number.friendly_name,
        capabilities=PhoneNumberCapabilities(
            voice=db_number.voice_enabled,
            sms=db_number.sms_enabled,
            mms=db_number.mms_enabled
        ),
        is_active=db_number.is_active,
        use_for_rotation=db_number.rotation_enabled,
        rotation_enabled=db_number.rotation_enabled,
        total_messages_sent=db_number.total_messages_sent,
        total_messages_received=db_number.total_messages_received,
        last_used_at=db_number.last_used_at,
        created_at=db_number.created_at
    )


@router.get("/phone-numbers", response_model=List[PhoneNumberResponse])
async def get_phone_numbers(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get all phone numbers"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    numbers = db.query(PhoneNumber).filter(
        and_(
            PhoneNumber.user_id == user_id,
            PhoneNumber.is_active == True
        )
    ).order_by(desc(PhoneNumber.rotation_priority)).all()
    
    return [
        PhoneNumberResponse(
            id=str(n.id),
            phone_number=n.phone_number,
            friendly_name=n.friendly_name,
            capabilities=PhoneNumberCapabilities(
                voice=n.voice_enabled,
                sms=n.sms_enabled,
                mms=n.mms_enabled
            ),
            is_active=n.is_active,
            use_for_rotation=n.rotation_enabled,
            rotation_enabled=n.rotation_enabled,
            total_messages_sent=n.total_messages_sent,
            total_messages_received=n.total_messages_received,
            last_used_at=n.last_used_at,
            created_at=n.created_at
        )
        for n in numbers
    ]


@router.patch("/phone-numbers/{number_id}/rotation")
async def toggle_rotation(
    number_id: str,
    enabled: bool,
    priority: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Toggle number rotation"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    number = db.query(PhoneNumber).filter(
        and_(
            PhoneNumber.id == uuid.UUID(number_id),
            PhoneNumber.user_id == user_id
        )
    ).first()
    
    if not number:
        raise HTTPException(status_code=404, detail="Phone number not found")
    
    number.rotation_enabled = enabled
    if priority is not None:
        number.rotation_priority = priority
    
    db.commit()
    
    return {"success": True, "rotation_enabled": enabled}


# Scheduled SMS Models
class ScheduledSMSCreate(BaseModel):
    to: str
    body: str
    contact_id: Optional[str] = None
    template_id: Optional[str] = None
    scheduled_at: datetime


class ScheduledSMSResponse(BaseModel):
    id: str
    to_address: str
    body: str
    scheduled_at: datetime
    is_sent: bool
    is_cancelled: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/scheduled", response_model=ScheduledSMSResponse)
async def create_scheduled_sms(
    request: ScheduledSMSCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Schedule an SMS to be sent later"""
    from app.models.scheduled_sms import ScheduledSMS
    
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # Validate scheduled time is in the future
    if request.scheduled_at <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
    
    scheduled_sms = ScheduledSMS(
        user_id=user_id,
        contact_id=uuid.UUID(request.contact_id) if request.contact_id else None,
        to_address=request.to,
        body=request.body,
        template_id=uuid.UUID(request.template_id) if request.template_id else None,
        scheduled_at=request.scheduled_at
    )
    
    db.add(scheduled_sms)
    db.commit()
    db.refresh(scheduled_sms)
    
    return ScheduledSMSResponse(
        id=str(scheduled_sms.id),
        to_address=scheduled_sms.to_address,
        body=scheduled_sms.body,
        scheduled_at=scheduled_sms.scheduled_at,
        is_sent=scheduled_sms.is_sent,
        is_cancelled=scheduled_sms.is_cancelled,
        created_at=scheduled_sms.created_at
    )


@router.get("/scheduled", response_model=List[ScheduledSMSResponse])
async def get_scheduled_sms(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get all scheduled SMS"""
    from app.models.scheduled_sms import ScheduledSMS
    
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    scheduled = db.query(ScheduledSMS).filter(
        and_(
            ScheduledSMS.user_id == user_id,
            ScheduledSMS.is_sent == False,
            ScheduledSMS.is_cancelled == False
        )
    ).order_by(ScheduledSMS.scheduled_at).all()
    
    return [
        ScheduledSMSResponse(
            id=str(s.id),
            to_address=s.to_address,
            body=s.body,
            scheduled_at=s.scheduled_at,
            is_sent=s.is_sent,
            is_cancelled=s.is_cancelled,
            created_at=s.created_at
        )
        for s in scheduled
    ]


@router.delete("/scheduled/{scheduled_id}")
async def cancel_scheduled_sms(
    scheduled_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Cancel a scheduled SMS"""
    from app.models.scheduled_sms import ScheduledSMS
    
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    scheduled = db.query(ScheduledSMS).filter(
        and_(
            ScheduledSMS.id == uuid.UUID(scheduled_id),
            ScheduledSMS.user_id == user_id
        )
    ).first()
    
    if not scheduled:
        raise HTTPException(status_code=404, detail="Scheduled SMS not found")
    
    if scheduled.is_sent:
        raise HTTPException(status_code=400, detail="SMS already sent")
    
    scheduled.is_cancelled = True
    db.commit()
    
    return {"success": True, "message": "Scheduled SMS cancelled"}


@router.patch("/phone-numbers/{number_id}/active")
async def toggle_phone_number_active(
    number_id: str,
    enabled: bool,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Toggle phone number active status"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    phone_number = db.query(PhoneNumber).filter(
        and_(
            PhoneNumber.id == uuid.UUID(number_id),
            PhoneNumber.user_id == user_id
        )
    ).first()
    
    if not phone_number:
        raise HTTPException(status_code=404, detail="Phone number not found")
    
    phone_number.is_active = enabled
    db.commit()
    
    return {"success": True, "is_active": enabled}
