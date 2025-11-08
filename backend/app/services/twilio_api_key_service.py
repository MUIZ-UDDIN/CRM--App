"""
Service to automatically create and manage Twilio API Keys for each company
"""

from twilio.rest import Client
from sqlalchemy.orm import Session
from app.models.twilio_settings import TwilioSettings
import logging

logger = logging.getLogger(__name__)


def create_or_get_api_keys(twilio_settings: TwilioSettings, db: Session) -> tuple[str, str]:
    """
    Create or retrieve Twilio API Keys for a company
    
    Returns:
        tuple: (api_key_sid, api_key_secret)
    """
    
    # Check if API keys already exist
    if hasattr(twilio_settings, 'api_key_sid') and twilio_settings.api_key_sid:
        if hasattr(twilio_settings, 'api_key_secret') and twilio_settings.api_key_secret:
            logger.info(f"Using existing API keys for company {twilio_settings.company_id}")
            return (twilio_settings.api_key_sid, twilio_settings.api_key_secret)
    
    # Create new API keys using the company's Twilio account
    try:
        client = Client(twilio_settings.account_sid, twilio_settings.auth_token)
        
        # Create a new API key
        new_key = client.new_keys.create(
            friendly_name=f"CRM Browser Calling - {twilio_settings.company_id}"
        )
        
        api_key_sid = new_key.sid
        api_key_secret = new_key.secret
        
        # Store the API keys in the database
        twilio_settings.api_key_sid = api_key_sid
        twilio_settings.api_key_secret = api_key_secret
        db.commit()
        
        logger.info(f"✅ Created new API keys for company {twilio_settings.company_id}")
        return (api_key_sid, api_key_secret)
        
    except Exception as e:
        logger.error(f"Failed to create API keys for company {twilio_settings.company_id}: {e}")
        raise Exception(f"Failed to create Twilio API keys: {str(e)}")
