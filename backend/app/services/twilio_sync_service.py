"""
Twilio Sync Service - Bidirectional sync between Twilio and CRM
Syncs: Phone Numbers, Messages, Calls, Contacts
"""

from twilio.rest import Client
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from loguru import logger
import uuid

from app.models.phone_numbers import PhoneNumber
from app.models.sms import SMSMessage, SMSDirection, SMSStatus
from app.models.calls import Call, CallDirection, CallStatus
from app.models.contacts import Contact
from app.models.twilio_settings import TwilioSettings


class TwilioSyncService:
    """Service for syncing data between Twilio and CRM"""
    
    def __init__(self, account_sid: str, auth_token: str, user_id: uuid.UUID, db: Session):
        self.client = Client(account_sid, auth_token)
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.user_id = user_id
        self.db = db
    
    # ==================== PHONE NUMBERS SYNC ====================
    
    def sync_phone_numbers(self) -> Dict:
        """
        Sync phone numbers from Twilio to CRM
        - Fetch all purchased numbers from Twilio
        - Add new numbers to CRM
        - Remove deleted numbers from CRM
        """
        try:
            logger.info(f"🔄 Syncing phone numbers for user {self.user_id}")
            
            # Fetch all phone numbers from Twilio
            twilio_numbers = self.client.incoming_phone_numbers.list(limit=100)
            
            twilio_phone_map = {}
            for pn in twilio_numbers:
                twilio_phone_map[pn.phone_number] = {
                    'sid': pn.sid,
                    'friendly_name': pn.friendly_name,
                    'capabilities': pn.capabilities
                }
            
            # Get existing numbers in CRM
            crm_numbers = self.db.query(PhoneNumber).filter(
                and_(
                    PhoneNumber.user_id == self.user_id,
                    PhoneNumber.is_deleted == False
                )
            ).all()
            
            crm_phone_map = {pn.phone_number: pn for pn in crm_numbers}
            
            added = 0
            updated = 0
            removed = 0
            
            # Add new numbers from Twilio
            for phone, data in twilio_phone_map.items():
                if phone not in crm_phone_map:
                    # Add new number
                    new_number = PhoneNumber(
                        phone_number=phone,
                        friendly_name=data['friendly_name'],
                        twilio_sid=data['sid'],
                        sms_enabled=data['capabilities'].get('sms', False),
                        voice_enabled=data['capabilities'].get('voice', False),
                        mms_enabled=data['capabilities'].get('mms', False),
                        user_id=self.user_id,
                        is_active=True
                    )
                    self.db.add(new_number)
                    added += 1
                    logger.info(f"➕ Added phone number: {phone}")
                else:
                    # Update existing number
                    existing = crm_phone_map[phone]
                    existing.friendly_name = data['friendly_name']
                    existing.twilio_sid = data['sid']
                    existing.sms_enabled = data['capabilities'].get('sms', False)
                    existing.voice_enabled = data['capabilities'].get('voice', False)
                    existing.mms_enabled = data['capabilities'].get('mms', False)
                    updated += 1
            
            # Remove numbers that no longer exist in Twilio
            for phone, crm_number in crm_phone_map.items():
                if phone not in twilio_phone_map:
                    crm_number.is_deleted = True
                    crm_number.is_active = False
                    removed += 1
                    logger.info(f"➖ Removed phone number: {phone}")
            
            self.db.commit()
            
            result = {
                'success': True,
                'total_twilio': len(twilio_phone_map),
                'added': added,
                'updated': updated,
                'removed': removed
            }
            
            logger.info(f"✅ Phone sync complete: {result}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error syncing phone numbers: {e}")
            self.db.rollback()
            return {
                'success': False,
                'error': str(e)
            }
    
    # ==================== MESSAGES SYNC ====================
    
    def sync_messages(self, days: int = 7) -> Dict:
        """
        Sync messages from Twilio to CRM
        - Fetch recent messages from Twilio
        - Add new messages to CRM
        - Update message statuses
        """
        try:
            logger.info(f"🔄 Syncing messages for last {days} days")
            
            since_date = datetime.utcnow() - timedelta(days=days)
            
            # Fetch messages from Twilio
            messages = self.client.messages.list(
                date_sent_after=since_date,
                limit=1000
            )
            
            added = 0
            updated = 0
            
            for msg in messages:
                # Check if message already exists
                existing = self.db.query(SMSMessage).filter(
                    SMSMessage.twilio_sid == msg.sid
                ).first()
                
                # Determine direction
                direction = SMSDirection.OUTBOUND if msg.direction == 'outbound-api' else SMSDirection.INBOUND
                
                # Map Twilio status to our status
                status_map = {
                    'queued': SMSStatus.QUEUED,
                    'sending': SMSStatus.SENT,
                    'sent': SMSStatus.SENT,
                    'delivered': SMSStatus.DELIVERED,
                    'undelivered': SMSStatus.UNDELIVERED,
                    'failed': SMSStatus.FAILED,
                    'received': SMSStatus.RECEIVED
                }
                status = status_map.get(msg.status, SMSStatus.SENT)
                
                if not existing:
                    # Add new message
                    new_msg = SMSMessage(
                        direction=direction,
                        status=status,
                        from_address=msg.from_,
                        to_address=msg.to,
                        body=msg.body or '',
                        user_id=self.user_id,
                        twilio_sid=msg.sid,
                        price=msg.price,
                        error_code=msg.error_code,
                        error_message=msg.error_message,
                        num_segments=str(msg.num_segments) if msg.num_segments else None,
                        sent_at=msg.date_sent if msg.date_sent else datetime.utcnow()
                    )
                    
                    # Try to match contact
                    contact_phone = msg.from_ if direction == SMSDirection.INBOUND else msg.to
                    contact = self.db.query(Contact).filter(
                        and_(
                            Contact.phone == contact_phone,
                            Contact.owner_id == self.user_id
                        )
                    ).first()
                    
                    if contact:
                        new_msg.contact_id = contact.id
                    
                    self.db.add(new_msg)
                    added += 1
                else:
                    # Update existing message status
                    if existing.status != status:
                        existing.status = status
                        existing.error_code = msg.error_code
                        existing.error_message = msg.error_message
                        if status == SMSStatus.DELIVERED and not existing.delivered_at:
                            existing.delivered_at = datetime.utcnow()
                        updated += 1
            
            self.db.commit()
            
            result = {
                'success': True,
                'total_fetched': len(messages),
                'added': added,
                'updated': updated
            }
            
            logger.info(f"✅ Message sync complete: {result}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error syncing messages: {e}")
            self.db.rollback()
            return {
                'success': False,
                'error': str(e)
            }
    
    # ==================== CALLS SYNC ====================
    
    def sync_calls(self, days: int = 7) -> Dict:
        """
        Sync calls from Twilio to CRM
        - Fetch recent calls from Twilio
        - Add new calls to CRM
        - Update call statuses and durations
        """
        try:
            logger.info(f"🔄 Syncing calls for last {days} days")
            
            since_date = datetime.utcnow() - timedelta(days=days)
            
            # Fetch calls from Twilio
            calls = self.client.calls.list(
                start_time_after=since_date,
                limit=1000
            )
            
            added = 0
            updated = 0
            
            for call in calls:
                # Check if call already exists
                existing = self.db.query(Call).filter(
                    Call.twilio_sid == call.sid
                ).first()
                
                # Determine direction
                direction = CallDirection.OUTBOUND if call.direction.startswith('outbound') else CallDirection.INBOUND
                
                # Map Twilio status to our status
                status_map = {
                    'queued': CallStatus.QUEUED,
                    'ringing': CallStatus.RINGING,
                    'in-progress': CallStatus.IN_PROGRESS,
                    'completed': CallStatus.COMPLETED,
                    'busy': CallStatus.BUSY,
                    'failed': CallStatus.FAILED,
                    'no-answer': CallStatus.NO_ANSWER,
                    'canceled': CallStatus.CANCELED
                }
                status = status_map.get(call.status, CallStatus.QUEUED)
                
                if not existing:
                    # Add new call
                    new_call = Call(
                        direction=direction,
                        status=status,
                        from_number=call.from_,
                        to_number=call.to,
                        duration=int(call.duration) if call.duration else 0,
                        user_id=self.user_id,
                        twilio_sid=call.sid,
                        price=call.price,
                        started_at=call.start_time if call.start_time else datetime.utcnow()
                    )
                    
                    # Try to match contact
                    contact_phone = call.from_ if direction == CallDirection.INBOUND else call.to
                    contact = self.db.query(Contact).filter(
                        and_(
                            Contact.phone == contact_phone,
                            Contact.owner_id == self.user_id
                        )
                    ).first()
                    
                    if contact:
                        new_call.contact_id = contact.id
                    
                    self.db.add(new_call)
                    added += 1
                else:
                    # Update existing call
                    if existing.status != status or existing.duration != int(call.duration or 0):
                        existing.status = status
                        existing.duration = int(call.duration) if call.duration else 0
                        if status == CallStatus.COMPLETED and not existing.ended_at:
                            existing.ended_at = datetime.utcnow()
                        updated += 1
            
            self.db.commit()
            
            result = {
                'success': True,
                'total_fetched': len(calls),
                'added': added,
                'updated': updated
            }
            
            logger.info(f"✅ Call sync complete: {result}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error syncing calls: {e}")
            self.db.rollback()
            return {
                'success': False,
                'error': str(e)
            }
    
    # ==================== FULL SYNC ====================
    
    def full_sync(self) -> Dict:
        """
        Perform full sync of all Twilio data
        """
        logger.info(f"🔄 Starting full Twilio sync for user {self.user_id}")
        
        results = {
            'phone_numbers': self.sync_phone_numbers(),
            'messages': self.sync_messages(days=30),  # Last 30 days
            'calls': self.sync_calls(days=30)
        }
        
        logger.info(f"✅ Full sync complete: {results}")
        return results
    
    # ==================== SEND SMS ====================
    
    def send_sms(
        self,
        to: str,
        body: str,
        from_number: Optional[str] = None
    ) -> Dict:
        """
        Send SMS via Twilio and save to CRM
        """
        try:
            # If no from_number specified, get first available
            if not from_number:
                phone = self.db.query(PhoneNumber).filter(
                    and_(
                        PhoneNumber.user_id == self.user_id,
                        PhoneNumber.is_active == True,
                        PhoneNumber.sms_enabled == True
                    )
                ).first()
                
                if not phone:
                    return {'success': False, 'error': 'No phone number available'}
                
                from_number = phone.phone_number
            
            # Send via Twilio
            message = self.client.messages.create(
                body=body,
                from_=from_number,
                to=to
            )
            
            # Save to CRM
            sms_record = SMSMessage(
                direction=SMSDirection.OUTBOUND,
                status=SMSStatus.SENT,
                from_address=from_number,
                to_address=to,
                body=body,
                user_id=self.user_id,
                twilio_sid=message.sid,
                price=message.price,
                num_segments=str(message.num_segments) if message.num_segments else None
            )
            
            # Try to match contact
            contact = self.db.query(Contact).filter(
                and_(
                    Contact.phone == to,
                    Contact.owner_id == self.user_id
                )
            ).first()
            
            if contact:
                sms_record.contact_id = contact.id
            
            self.db.add(sms_record)
            
            # Update phone number stats
            phone_record = self.db.query(PhoneNumber).filter(
                and_(
                    PhoneNumber.phone_number == from_number,
                    PhoneNumber.user_id == self.user_id
                )
            ).first()
            
            if phone_record:
                phone_record.total_messages_sent += 1
                phone_record.last_used_at = datetime.utcnow()
            
            self.db.commit()
            
            return {
                'success': True,
                'message_sid': message.sid,
                'status': message.status,
                'from': from_number,
                'to': to
            }
            
        except Exception as e:
            logger.error(f"❌ Error sending SMS: {e}")
            self.db.rollback()
            return {
                'success': False,
                'error': str(e)
            }
    
    # ==================== MAKE CALL ====================
    
    def make_call(
        self,
        to: str,
        from_number: Optional[str] = None,
        twiml_url: Optional[str] = None
    ) -> Dict:
        """
        Make call via Twilio and save to CRM
        """
        try:
            # If no from_number specified, get first available
            if not from_number:
                phone = self.db.query(PhoneNumber).filter(
                    and_(
                        PhoneNumber.user_id == self.user_id,
                        PhoneNumber.is_active == True,
                        PhoneNumber.voice_enabled == True
                    )
                ).first()
                
                if not phone:
                    return {'success': False, 'error': 'No phone number available'}
                
                from_number = phone.phone_number
            
            # Default TwiML if not provided
            if not twiml_url:
                twiml_url = "http://demo.twilio.com/docs/voice.xml"
            
            # Make call via Twilio
            call = self.client.calls.create(
                to=to,
                from_=from_number,
                url=twiml_url
            )
            
            # Save to CRM
            call_record = Call(
                direction=CallDirection.OUTBOUND,
                status=CallStatus.QUEUED,
                from_number=from_number,
                to_number=to,
                user_id=self.user_id,
                twilio_sid=call.sid
            )
            
            # Try to match contact
            contact = self.db.query(Contact).filter(
                and_(
                    Contact.phone == to,
                    Contact.owner_id == self.user_id
                )
            ).first()
            
            if contact:
                call_record.contact_id = contact.id
            
            self.db.add(call_record)
            self.db.commit()
            
            return {
                'success': True,
                'call_sid': call.sid,
                'status': call.status,
                'from': from_number,
                'to': to
            }
            
        except Exception as e:
            logger.error(f"❌ Error making call: {e}")
            self.db.rollback()
            return {
                'success': False,
                'error': str(e)
            }


def get_twilio_sync_service(user_id: uuid.UUID, db: Session) -> Optional[TwilioSyncService]:
    """Get Twilio sync service for user"""
    settings = db.query(TwilioSettings).filter(
        TwilioSettings.user_id == user_id
    ).first()
    
    if not settings or not settings.is_verified:
        return None
    
    return TwilioSyncService(
        account_sid=settings.account_sid,
        auth_token=settings.auth_token,
        user_id=user_id,
        db=db
    )
