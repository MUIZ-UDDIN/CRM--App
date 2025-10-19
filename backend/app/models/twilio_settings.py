from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from .base import BaseModel

class TwilioSettings(BaseModel):
    """
    Twilio settings for each user - allows multi-tenant Twilio integration
    Each user can configure their own Twilio account
    """
    __tablename__ = "twilio_settings"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    
    # Twilio Account Credentials
    account_sid = Column(String(255), nullable=False)
    auth_token = Column(String(255), nullable=False)  # Should be encrypted in production
    
    # Twilio Phone Numbers
    phone_number = Column(String(20), nullable=True)  # Primary phone number for calls/SMS
    
    # Feature Flags
    sms_enabled = Column(Boolean, default=True)
    voice_enabled = Column(Boolean, default=True)
    
    # Status
    is_verified = Column(Boolean, default=False)  # Whether credentials have been verified
    last_verified_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="twilio_settings")

    class Config:
        from_attributes = True
