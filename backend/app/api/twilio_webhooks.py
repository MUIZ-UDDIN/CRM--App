"""
Twilio Webhooks for SMS, Voice, and Status Callbacks
According to Twilio documentation:
- https://www.twilio.com/docs/sms/tutorials/how-to-receive-and-reply-python
- https://www.twilio.com/docs/voice/tutorials/how-to-respond-to-incoming-phone-calls-python
- https://www.twilio.com/docs/usage/webhooks/sms-webhooks
- https://www.twilio.com/docs/voice/twiml
"""

from fastapi import APIRouter, Request, Depends, BackgroundTasks, Response
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from twilio.twiml.messaging_response import MessagingResponse
from twilio.twiml.voice_response import VoiceResponse, Gather, Say, Record
# from twilio.request_validator import RequestValidator  # Optional - commented out for now
from typing import Optional
import uuid
from datetime import datetime
from loguru import logger

from ..core.database import get_db
from ..models.sms import SMSMessage, SMSDirection, SMSStatus
from ..models.calls import Call, CallDirection, CallStatus
from ..models.contacts import Contact
from ..models.users import User
from ..models.notifications import Notification
from ..services.websocket_manager import manager

router = APIRouter(prefix="/webhooks/twilio", tags=["Twilio Webhooks"])


# Validator function commented out for now - can be enabled later for production security
# def validate_twilio_request(request: Request, auth_token: str) -> bool:
#     """Validate that the request is actually from Twilio"""
#     try:
#         validator = RequestValidator(auth_token)
#         url = str(request.url)
#         signature = request.headers.get('X-Twilio-Signature', '')
#         
#         # Get form data as dict
#         params = dict(request.query_params)
#         
#         return validator.validate(url, params, signature)
#     except Exception as e:
#         logger.error(f"Error validating Twilio request: {e}")
#         return False


@router.post("/sms/incoming", response_class=Response)
async def handle_incoming_sms(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Webhook for incoming SMS from Twilio
    Configure in Twilio Console: https://console.twilio.com/
    Webhook URL: https://your-domain.com/api/webhooks/twilio/sms/incoming
    Method: POST
    """
    try:
        logger.info("=" * 80)
        logger.info("📱 INCOMING SMS WEBHOOK")
        logger.info("=" * 80)
        
        # Parse form data from Twilio
        form_data = await request.form()
        
        # Extract Twilio parameters
        message_sid = form_data.get("MessageSid")
        from_number = form_data.get("From")
        to_number = form_data.get("To")
        body = form_data.get("Body", "")
        num_media = int(form_data.get("NumMedia", 0))
        account_sid = form_data.get("AccountSid")
        
        logger.info(f"From: {from_number}")
        logger.info(f"To: {to_number}")
        logger.info(f"Body: {body}")
        logger.info(f"MessageSid: {message_sid}")
        logger.info(f"Media Count: {num_media}")
        
        # Find the user who owns this phone number
        # Handle both formats: +19296730383 and 19296730383
        from app.models.phone_numbers import PhoneNumber
        
        # Clean and normalize phone number (remove spaces, add + if missing)
        to_number = to_number.strip() if to_number else ""
        from_number = from_number.strip() if from_number else ""
        normalized_to = to_number if to_number.startswith('+') else f'+{to_number}'
        
        logger.info(f"Normalized To: {normalized_to}")
        
        phone_record = db.query(PhoneNumber).filter(
            and_(
                or_(
                    PhoneNumber.phone_number == to_number,
                    PhoneNumber.phone_number == normalized_to
                ),
                PhoneNumber.is_active == True,
                PhoneNumber.is_deleted == False
            )
        ).first()
        
        if not phone_record:
            logger.warning(f"No phone number found: {to_number} or {normalized_to}")
            return Response(content="<?xml version='1.0' encoding='UTF-8'?><Response></Response>", media_type="application/xml")
        
        user_id = phone_record.user_id
        company_id = phone_record.company_id
        
        logger.info(f"✅ Phone number found - User: {user_id}, Company: {company_id}")
        
        # Get twilio settings for auto-reply
        from app.models.twilio_settings import TwilioSettings
        twilio_settings = db.query(TwilioSettings).filter(
            TwilioSettings.company_id == company_id
        ).first()
        
        # Find or create contact
        contact = db.query(Contact).filter(
            and_(
                Contact.phone == from_number,
                Contact.company_id == company_id,
                Contact.is_deleted == False
            )
        ).first()
        
        if not contact:
            # Create new contact
            contact = Contact(
                first_name="Unknown",
                last_name="Contact",
                phone=from_number,
                email=f"{from_number.replace('+', '')}@sms.placeholder",  # Placeholder email required
                type="Lead",
                status="NEW",
                source="other",  # Use valid enum value
                lead_score=0,
                owner_id=user_id,
                company_id=company_id
            )
            db.add(contact)
            db.flush()
            logger.info(f" Created new contact for {from_number}")
        
        contact_name = f"{contact.first_name} {contact.last_name}"
        
        # Handle media attachments
        media_urls = []
        if num_media > 0:
            for i in range(num_media):
                media_url = form_data.get(f"MediaUrl{i}")
                media_type = form_data.get(f"MediaContentType{i}")
                if media_url:
                    media_urls.append({"url": media_url, "type": media_type})
                    logger.info(f"Media {i}: {media_url} ({media_type})")
        
        # Save incoming SMS to database
        sms_record = SMSMessage(
            direction=SMSDirection.INBOUND,
            status=SMSStatus.RECEIVED,
            from_address=from_number,
            to_address=to_number,
            body=body,
            twilio_sid=message_sid,  # Use twilio_sid not message_sid
            contact_id=contact.id,
            user_id=user_id,
            company_id=company_id
        )
        db.add(sms_record)
        db.commit()
        
        logger.info(f"✅ SMS saved to database with ID: {sms_record.id}")
        
        # Create notification for incoming SMS
        try:
            from app.models.notifications import NotificationType
            notification = Notification(
                user_id=user_id,
                company_id=company_id,
                type=NotificationType.INFO,  # Use valid enum value
                title=f"📱 New SMS from {contact_name}",
                message=body[:100] + ("..." if len(body) > 100 else ""),
                link=f"/sms"
            )
            db.add(notification)
            db.commit()
            logger.info(f"✅ Notification created")
            
            # Send real-time notification via WebSocket
            await manager.send_notification(user_id, {
                "type": "sms_received",
                "title": f"New SMS from {contact_name}",
                "message": body[:100],
                "contact_id": str(contact.id),
                "sms_id": str(sms_record.id)
            })
        except Exception as e:
            logger.error(f"Failed to create notification: {e}")
        
        # Generate TwiML response (optional auto-reply)
        resp = MessagingResponse()
        
        # Check if auto-reply is enabled
        if twilio_settings.auto_reply_enabled:
            auto_reply_message = twilio_settings.auto_reply_message or "Thank you for your message. We'll get back to you soon!"
            resp.message(auto_reply_message)
            logger.info(f"📤 Auto-reply sent: {auto_reply_message}")
        
        return Response(content=str(resp), media_type="application/xml")
        
    except Exception as e:
        logger.error(f"Error handling incoming SMS: {e}")
        import traceback
        traceback.print_exc()
        return Response(content="<?xml version='1.0' encoding='UTF-8'?><Response></Response>", media_type="application/xml")


@router.post("/sms/status", response_class=Response)
async def handle_sms_status(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook for SMS status callbacks from Twilio
    Configure in Twilio Console for status updates
    Webhook URL: https://your-domain.com/api/webhooks/twilio/sms/status
    """
    try:
        form_data = await request.form()
        
        message_sid = form_data.get("MessageSid")
        message_status = form_data.get("MessageStatus")
        error_code = form_data.get("ErrorCode")
        error_message = form_data.get("ErrorMessage")
        
        logger.info(f"📊 SMS Status Update: {message_sid} -> {message_status}")
        
        # Update SMS record in database
        sms_record = db.query(SMSMessage).filter(
            SMSMessage.twilio_sid == message_sid
        ).first()
        
        if sms_record:
            # Map Twilio status to our status
            status_mapping = {
                "queued": SMSStatus.QUEUED,
                "sending": SMSStatus.SENDING,
                "sent": SMSStatus.SENT,
                "delivered": SMSStatus.DELIVERED,
                "undelivered": SMSStatus.FAILED,
                "failed": SMSStatus.FAILED
            }
            
            sms_record.status = status_mapping.get(message_status, SMSStatus.SENT)
            sms_record.error_code = error_code
            sms_record.error_message = error_message
            sms_record.updated_at = datetime.utcnow()
            
            db.commit()
            logger.info(f"✅ SMS status updated: {message_status}")
            
            # Send WebSocket update
            if sms_record.user_id:
                await manager.send_notification(str(sms_record.user_id), {
                    "type": "sms_status_update",
                    "sms_id": str(sms_record.id),
                    "status": message_status
                })
        
        return Response(content="OK", media_type="text/plain")
        
    except Exception as e:
        logger.error(f"Error handling SMS status: {e}")
        return Response(content="ERROR", media_type="text/plain")


@router.post("/voice/incoming", response_class=Response)
async def handle_incoming_call(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook for incoming voice calls from Twilio
    Configure in Twilio Console: https://console.twilio.com/
    Webhook URL: https://your-domain.com/api/webhooks/twilio/voice/incoming
    Method: POST
    """
    try:
        logger.info("=" * 80)
        logger.info("📞 INCOMING CALL WEBHOOK")
        logger.info("=" * 80)
        
        form_data = await request.form()
        
        # Extract Twilio parameters
        call_sid = form_data.get("CallSid")
        from_number = form_data.get("From")
        to_number = form_data.get("To")
        call_status = form_data.get("CallStatus")
        direction = form_data.get("Direction")
        
        logger.info(f"From: {from_number}")
        logger.info(f"To: {to_number}")
        logger.info(f"CallSid: {call_sid}")
        logger.info(f"Status: {call_status}")
        
        # Find the user who owns this phone number
        # Handle both formats: +19296730383 and 19296730383
        from app.models.phone_numbers import PhoneNumber
        
        # Clean and normalize phone number (remove spaces, add + if missing)
        to_number = to_number.strip() if to_number else ""
        from_number = from_number.strip() if from_number else ""
        normalized_to = to_number if to_number.startswith('+') else f'+{to_number}'
        
        logger.info(f"Normalized To: {normalized_to}")
        
        phone_record = db.query(PhoneNumber).filter(
            and_(
                or_(
                    PhoneNumber.phone_number == to_number,
                    PhoneNumber.phone_number == normalized_to
                ),
                PhoneNumber.is_active == True,
                PhoneNumber.is_deleted == False
            )
        ).first()
        
        if not phone_record:
            logger.warning(f"No phone number found: {to_number} or {normalized_to}")
            resp = VoiceResponse()
            resp.say("This number is not configured. Please try again later.")
            resp.hangup()
            return Response(content=str(resp), media_type="application/xml")
        
        user_id = phone_record.user_id
        company_id = phone_record.company_id
        
        logger.info(f"✅ Phone number found - User: {user_id}, Company: {company_id}")
        
        # Find or create contact
        contact = db.query(Contact).filter(
            and_(
                Contact.phone == from_number,
                Contact.company_id == company_id,
                Contact.is_deleted == False
            )
        ).first()
        
        if not contact:
            contact = Contact(
                first_name="Unknown",
                last_name="Caller",
                phone=from_number,
                email=f"{from_number.replace('+', '')}@call.placeholder",  # Placeholder email required
                company_id=company_id,
                owner_id=user_id,
                source="other"  # Use valid enum value
            )
            db.add(contact)
            db.flush()
            logger.info(f"✅ Created new contact for {from_number}")
        
        contact_name = f"{contact.first_name} {contact.last_name}"
        
        # Save call to database
        call_record = Call(
            direction=CallDirection.INBOUND,
            status=CallStatus.RINGING,
            from_address=from_number,
            to_address=to_number,
            twilio_sid=call_sid,
            contact_id=contact.id,
            user_id=user_id,
            company_id=company_id
        )
        db.add(call_record)
        db.commit()
        
        logger.info(f"✅ Call saved to database with ID: {call_record.id}")
        
        # Create notification for incoming call
        try:
            from app.models.notifications import NotificationType
            notification = Notification(
                user_id=user_id,
                company_id=company_id,
                type=NotificationType.INFO,  # Use valid enum value
                title=f"📞 Incoming Call from {contact_name}",
                message=f"Call from {from_number}",
                link=f"/calls",
                extra_data={
                    "isCall": True,
                    "from_number": from_number,
                    "call_sid": call_sid,
                    "contact_id": str(contact.id) if contact else None
                }
            )
            db.add(notification)
            db.commit()
            logger.info(f"✅ Notification created with isCall flag")
            
            # Send real-time notification via WebSocket
            try:
                from app.api.websocket import manager
                await manager.broadcast({
                    "type": "incoming_call",
                    "notification_id": str(notification.id),
                    "title": f"📞 Incoming Call from {contact_name}",
                    "message": f"Call from {from_number}",
                    "from_number": from_number,
                    "to_number": to_number,
                    "call_sid": call_sid,
                    "contact_id": str(contact.id),
                    "call_id": str(call_record.id),
                    "user_id": str(user_id),
                    "company_id": str(company_id)
                }, user_id=str(user_id))
            except Exception as ws_error:
                logger.warning(f"WebSocket notification failed: {ws_error}")
        except Exception as e:
            logger.error(f"Failed to create notification: {e}")
        
        # Generate TwiML response
        resp = VoiceResponse()
        
        # Dial directly to the browser client using their identity
        # This allows the Twilio Device to receive the call via the 'incoming' event
        dial = resp.dial()
        dial.client(f"user_{user_id}")
        
        return Response(content=str(resp), media_type="application/xml")
        
    except Exception as e:
        logger.error(f"Error handling incoming call: {e}")
        import traceback
        traceback.print_exc()
        resp = VoiceResponse()
        resp.say("An error occurred. Please try again later.")
        resp.hangup()
        return Response(content=str(resp), media_type="application/xml")


@router.post("/voice/wait-silent", response_class=Response)
async def handle_wait_silent():
    """
    Silent wait endpoint - returns empty TwiML to prevent any audio
    """
    resp = VoiceResponse()
    # Empty response = silence
    return Response(content=str(resp), media_type="application/xml")


@router.post("/voice/status", response_class=Response)
async def handle_call_status(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook for call status callbacks from Twilio
    Webhook URL: https://your-domain.com/api/webhooks/twilio/voice/status
    """
    try:
        form_data = await request.form()
        
        call_sid = form_data.get("CallSid")
        call_status = form_data.get("CallStatus")
        call_duration = form_data.get("CallDuration")
        recording_url = form_data.get("RecordingUrl")
        
        logger.info(f"📊 Call Status Update: {call_sid} -> {call_status}")
        
        # Update call record in database
        call_record = db.query(Call).filter(
            Call.twilio_sid == call_sid
        ).first()
        
        if call_record:
            # Map Twilio status to our status
            status_mapping = {
                "queued": CallStatus.QUEUED,
                "ringing": CallStatus.RINGING,
                "in-progress": CallStatus.IN_PROGRESS,
                "completed": CallStatus.COMPLETED,
                "busy": CallStatus.BUSY,
                "failed": CallStatus.FAILED,
                "no-answer": CallStatus.NO_ANSWER,
                "canceled": CallStatus.CANCELED
            }
            
            call_record.status = status_mapping.get(call_status, CallStatus.COMPLETED)
            
            if call_duration:
                call_record.duration = int(call_duration)
            
            if recording_url:
                call_record.recording_url = recording_url
            
            if call_status in ["completed", "no-answer", "busy", "failed", "canceled"]:
                call_record.ended_at = datetime.utcnow()
            
            call_record.updated_at = datetime.utcnow()
            
            db.commit()
            logger.info(f"✅ Call status updated: {call_status}")
            
            # Send WebSocket update
            if call_record.user_id:
                await manager.send_notification(str(call_record.user_id), {
                    "type": "call_status_update",
                    "call_id": str(call_record.id),
                    "status": call_status,
                    "duration": call_duration
                })
        
        return Response(content="OK", media_type="text/plain")
        
    except Exception as e:
        logger.error(f"Error handling call status: {e}")
        return Response(content="ERROR", media_type="text/plain")


@router.post("/voice/recording", response_class=Response)
async def handle_recording(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook for call recording callbacks from Twilio
    Webhook URL: https://your-domain.com/api/webhooks/twilio/voice/recording
    """
    try:
        form_data = await request.form()
        
        call_sid = form_data.get("CallSid")
        recording_sid = form_data.get("RecordingSid")
        recording_url = form_data.get("RecordingUrl")
        recording_duration = form_data.get("RecordingDuration")
        
        logger.info(f"🎙️ Recording Available: {call_sid} -> {recording_url}")
        
        # Update call record with recording
        call_record = db.query(Call).filter(
            Call.twilio_sid == call_sid
        ).first()
        
        if call_record:
            call_record.recording_url = recording_url
            call_record.recording_sid = recording_sid
            if recording_duration:
                call_record.recording_duration = int(recording_duration)
            
            db.commit()
            logger.info(f"✅ Recording saved for call {call_sid}")
            
            # Send WebSocket notification
            if call_record.user_id:
                await manager.send_notification(str(call_record.user_id), {
                    "type": "recording_available",
                    "call_id": str(call_record.id),
                    "recording_url": recording_url
                })
        
        return Response(content="OK", media_type="text/plain")
        
    except Exception as e:
        logger.error(f"Error handling recording: {e}")
        return Response(content="ERROR", media_type="text/plain")
