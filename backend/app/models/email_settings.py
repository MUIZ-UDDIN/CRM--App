"""
Email Settings model for Gmail OAuth and SendGrid configuration
"""

from sqlalchemy import Column, String, ForeignKey, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from .base import BaseModel
from datetime import datetime


class EmailSettings(BaseModel):
    """Email settings for each company - supports both SendGrid and Gmail"""
    __tablename__ = "email_settings"

    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), unique=True, nullable=False, index=True)
    
    # SendGrid Configuration
    sendgrid_api_key = Column(String(255), nullable=True)
    sendgrid_from_email = Column(String(255), nullable=True)
    sendgrid_from_name = Column(String(255), nullable=True)
    sendgrid_enabled = Column(Boolean, default=True)
    
    # Gmail OAuth Configuration
    gmail_client_id = Column(String(255), nullable=True)
    gmail_client_secret = Column(String(255), nullable=True)
    gmail_refresh_token = Column(Text, nullable=True)  # Encrypted in production
    gmail_access_token = Column(Text, nullable=True)  # Encrypted in production
    gmail_token_expires_at = Column(DateTime, nullable=True)
    gmail_email = Column(String(255), nullable=True)
    gmail_enabled = Column(Boolean, default=False)
    
    # Gmail Sync Settings
    gmail_last_sync_at = Column(DateTime, nullable=True)
    gmail_sync_enabled = Column(Boolean, default=True)
    gmail_sync_frequency = Column(String(50), default="5min")  # 5min, 15min, 30min, 1hour
    gmail_history_id = Column(String(255), nullable=True)  # For incremental sync
    
    # Email Signature
    email_signature = Column(Text, nullable=True)
    signature_enabled = Column(Boolean, default=False)
    
    # Tracking Settings
    open_tracking_enabled = Column(Boolean, default=True)
    click_tracking_enabled = Column(Boolean, default=True)
    
    # Auto-Reply Settings
    auto_reply_enabled = Column(Boolean, default=False)
    auto_reply_subject = Column(String(500), nullable=True)
    auto_reply_body = Column(Text, nullable=True)
    
    # Provider Priority
    default_provider = Column(String(50), default="sendgrid")  # sendgrid or gmail
    
    # Metadata
    settings_data = Column(JSONB, default={})  # Additional settings
    
    # Relationships
    company = relationship("Company", back_populates="email_settings")
    
    class Config:
        from_attributes = True
