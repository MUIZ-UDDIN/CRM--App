from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from .base import BaseModel

class TwilioSettings(BaseModel):
    """
    Twilio settings for each company - allows multi-tenant Twilio integration
    Each company can configure their own Twilio account
    """
    __tablename__ = "twilio_settings"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Legacy, keep for migration
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), unique=True, nullable=False, index=True)
    
    # Twilio Account Credentials
    account_sid = Column(String(255), nullable=False)
    auth_token = Column(String(255), nullable=False)  # Should be encrypted in production
    
    # Twilio Phone Numbers
    phone_number = Column(String(20), nullable=True)  # Primary phone number for calls/SMS
    
    # SendGrid (Twilio Email) Settings
    sendgrid_api_key = Column(String(255), nullable=True)  # SendGrid API key for emails
    sendgrid_from_email = Column(String(255), nullable=True)  # Verified sender email
    
    # Feature Flags
    sms_enabled = Column(Boolean, default=True)
    voice_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=False)
    
    # Status
    is_verified = Column(Boolean, default=False)  # Whether credentials have been verified
    last_verified_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="twilio_settings")

    class Config:
        from_attributes = True
