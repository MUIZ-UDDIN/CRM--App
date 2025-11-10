"""
Service to manage TwiML Apps for each company
Each company gets their own TwiML App for isolated calling
"""

from twilio.rest import Client
from sqlalchemy.orm import Session
from loguru import logger
from app.models.twilio_settings import TwilioSettings


def create_or_get_twiml_app(twilio_settings: TwilioSettings, db: Session, domain: str = "sunstonecrm.com") -> str:
    """
    Create or retrieve TwiML App for a company
    Returns the TwiML App SID
    """
    # If already exists, return it
    if twilio_settings.twiml_app_sid:
        logger.info(f"✅ TwiML App already exists for company: {twilio_settings.twiml_app_sid}")
        return twilio_settings.twiml_app_sid
    
    try:
        # Initialize Twilio client with company's credentials
        client = Client(twilio_settings.account_sid, twilio_settings.auth_token)
        
        # Create friendly name for this company's app
        company_name = f"Company_{twilio_settings.company_id}"
        friendly_name = f"CRM Voice App - {company_name}"
        
        # Check if app already exists in Twilio
        existing_apps = client.applications.list(friendly_name=friendly_name)
        
        if existing_apps:
            app = existing_apps[0]
            logger.info(f"✅ Found existing TwiML App: {app.sid}")
        else:
            # Create new TwiML App
            app = client.applications.create(
                friendly_name=friendly_name,
                voice_url=f"https://{domain}/api/twilio/client/voice",
                voice_method="POST",
                status_callback=f"https://{domain}/api/webhooks/twilio/voice/status",
                status_callback_method="POST"
            )
            logger.info(f"✅ Created new TwiML App: {app.sid}")
        
        # Save to database
        twilio_settings.twiml_app_sid = app.sid
        db.commit()
        
        logger.info(f"📋 TwiML App SID saved for company {twilio_settings.company_id}: {app.sid}")
        
        return app.sid
        
    except Exception as e:
        logger.error(f"❌ Failed to create/get TwiML App: {e}")
        raise Exception(f"Failed to create TwiML App: {str(e)}")
