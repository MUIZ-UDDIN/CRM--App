"""
Twilio Integration Service for SMS, Voice, and Email
"""

import os
from twilio.rest import Client
from twilio.base.exceptions import TwilioException
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from typing import Optional, Dict, Any
from loguru import logger


class TwilioService:
    def __init__(self):
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.phone_number = os.getenv('TWILIO_PHONE_NUMBER')
        self.sendgrid_api_key = os.getenv('SENDGRID_API_KEY')
        self.from_email = os.getenv('FROM_EMAIL', 'noreply@sunstonecrm.com')
        
        if not all([self.account_sid, self.auth_token]):
            logger.warning("Twilio credentials not found in environment variables")
            self.client = None
        else:
            self.client = Client(self.account_sid, self.auth_token)
        
        if self.sendgrid_api_key:
            self.sg = SendGridAPIClient(api_key=self.sendgrid_api_key)
        else:
            self.sg = None
            logger.warning("SendGrid API key not found")
    
    async def send_sms(self, to_number: str, message: str, from_number: Optional[str] = None) -> Dict[str, Any]:
        """Send SMS via Twilio"""
        if not self.client:
            return {"success": False, "error": "Twilio not configured"}
        
        try:
            from_number = from_number or self.phone_number
            message = self.client.messages.create(
                body=message,
                from_=from_number,
                to=to_number
            )
            
            return {
                "success": True,
                "message_sid": message.sid,
                "status": message.status,
                "error_code": message.error_code,
                "error_message": message.error_message
            }
        except TwilioException as e:
            logger.error(f"Twilio SMS error: {e}")
            return {"success": False, "error": str(e)}
    
    async def make_call(self, to_number: str, twiml_url: str, from_number: Optional[str] = None) -> Dict[str, Any]:
        """Make voice call via Twilio"""
        if not self.client:
            return {"success": False, "error": "Twilio not configured"}
        
        try:
            from_number = from_number or self.phone_number
            call = self.client.calls.create(
                url=twiml_url,
                to=to_number,
                from_=from_number
            )
            
            return {
                "success": True,
                "call_sid": call.sid,
                "status": call.status
            }
        except TwilioException as e:
            logger.error(f"Twilio Call error: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_email(self, to_email: str, subject: str, html_content: str, 
                        text_content: Optional[str] = None, from_email: Optional[str] = None) -> Dict[str, Any]:
        """Send email via SendGrid"""
        if not self.sg:
            return {"success": False, "error": "SendGrid not configured"}
        
        try:
            from_email = from_email or self.from_email
            message = Mail(
                from_email=from_email,
                to_emails=to_email,
                subject=subject,
                html_content=html_content,
                plain_text_content=text_content
            )
            
            response = self.sg.send(message)
            
            return {
                "success": True,
                "message_id": response.headers.get("X-Message-Id"),
                "status_code": response.status_code
            }
        except Exception as e:
            logger.error(f"SendGrid email error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_sms_status(self, message_sid: str) -> Dict[str, Any]:
        """Get SMS delivery status"""
        if not self.client:
            return {"success": False, "error": "Twilio not configured"}
        
        try:
            message = self.client.messages(message_sid).fetch()
            return {
                "success": True,
                "status": message.status,
                "error_code": message.error_code,
                "error_message": message.error_message
            }
        except TwilioException as e:
            logger.error(f"Error fetching SMS status: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_call_status(self, call_sid: str) -> Dict[str, Any]:
        """Get call status"""
        if not self.client:
            return {"success": False, "error": "Twilio not configured"}
        
        try:
            call = self.client.calls(call_sid).fetch()
            return {
                "success": True,
                "status": call.status,
                "duration": call.duration,
                "start_time": call.start_time,
                "end_time": call.end_time
            }
        except TwilioException as e:
            logger.error(f"Error fetching call status: {e}")
            return {"success": False, "error": str(e)}
