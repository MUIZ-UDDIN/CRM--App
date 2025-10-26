"""
Scheduled SMS Service
Runs scheduled SMS messages at their specified time
"""

import threading
import time
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_
from loguru import logger
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from app.core.database import SessionLocal
from app.models.scheduled_sms import ScheduledSMS
from app.models.twilio_settings import TwilioSettings
from app.models.sms import SMSMessage, SMSDirection, SMSStatus


class SMSScheduler:
    """Background service to send scheduled SMS messages"""
    
    def __init__(self):
        self.running = False
        self.thread = None
    
    def start(self):
        """Start the scheduler in a background thread"""
        if self.running:
            logger.warning("SMS scheduler already running")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.thread.start()
        logger.info("✅ SMS scheduler started")
    
    def stop(self):
        """Stop the scheduler"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("SMS scheduler stopped")
    
    def _run_scheduler(self):
        """Main scheduler loop"""
        while self.running:
            try:
                self._check_scheduled_messages()
            except Exception as e:
                logger.error(f"Error in SMS scheduler: {e}")
                logger.exception(e)
            
            # Check every 30 seconds
            time.sleep(30)
    
    def _check_scheduled_messages(self):
        """Check for messages that need to be sent"""
        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            
            # Get all pending scheduled messages that are due
            scheduled_messages = db.query(ScheduledSMS).filter(
                and_(
                    ScheduledSMS.is_sent == False,
                    ScheduledSMS.is_cancelled == False,
                    ScheduledSMS.scheduled_at <= now
                )
            ).all()
            
            if scheduled_messages:
                logger.info(f"📤 Found {len(scheduled_messages)} scheduled messages to send")
            
            for scheduled_msg in scheduled_messages:
                try:
                    self._send_scheduled_message(db, scheduled_msg)
                except Exception as e:
                    logger.error(f"Failed to send scheduled message {scheduled_msg.id}: {e}")
                    logger.exception(e)
            
            db.commit()
        except Exception as e:
            logger.error(f"Error checking scheduled messages: {e}")
            logger.exception(e)
            db.rollback()
        finally:
            db.close()
    
    def _send_scheduled_message(self, db: Session, scheduled_msg: ScheduledSMS):
        """Send a single scheduled message"""
        try:
            # Get Twilio settings for the user
            settings = db.query(TwilioSettings).filter(
                TwilioSettings.user_id == scheduled_msg.user_id
            ).first()
            
            if not settings:
                logger.error(f"No Twilio settings found for user {scheduled_msg.user_id}")
                scheduled_msg.is_cancelled = True
                return
            
            # Initialize Twilio client
            client = Client(settings.account_sid, settings.auth_token)
            
            # Determine from number
            from_number = settings.phone_number
            
            logger.info(f"📤 Sending scheduled SMS from {from_number} to {scheduled_msg.to_address}")
            
            # Send SMS via Twilio
            message = client.messages.create(
                body=scheduled_msg.body,
                from_=from_number,
                to=scheduled_msg.to_address
            )
            
            logger.info(f"✅ Scheduled SMS sent successfully: {message.sid}")
            
            # Mark as sent
            scheduled_msg.is_sent = True
            scheduled_msg.sent_at = datetime.now(timezone.utc)
            
            # Create SMS record
            sms_record = SMSMessage(
                user_id=scheduled_msg.user_id,
                contact_id=scheduled_msg.contact_id,
                from_address=from_number,
                to_address=scheduled_msg.to_address,
                body=scheduled_msg.body,
                direction=SMSDirection.OUTBOUND,
                status=SMSStatus.SENT,
                twilio_sid=message.sid,
                sent_at=datetime.now(timezone.utc)
            )
            db.add(sms_record)
            
        except TwilioRestException as e:
            logger.error(f"❌ Twilio error sending scheduled SMS: {str(e)}")
            scheduled_msg.is_cancelled = True
            scheduled_msg.error_message = str(e)
        except Exception as e:
            logger.error(f"❌ Error sending scheduled SMS: {str(e)}")
            logger.exception(e)
            scheduled_msg.is_cancelled = True
            scheduled_msg.error_message = str(e)


# Global scheduler instance
sms_scheduler = SMSScheduler()
