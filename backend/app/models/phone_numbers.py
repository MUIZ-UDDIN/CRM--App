"""
Phone Numbers Model for number rotation
"""

from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import BaseModel


class PhoneNumber(BaseModel):
    """Phone Number model for Twilio number management"""
    __tablename__ = 'phone_numbers'
    
    # Phone Number Details
    phone_number = Column(String(20), nullable=False, index=True)  # E.164 format
    friendly_name = Column(String(255))
    twilio_sid = Column(String(100))  # Twilio phone number SID
    
    # Capabilities
    sms_enabled = Column(Boolean, default=True)
    voice_enabled = Column(Boolean, default=True)
    mms_enabled = Column(Boolean, default=False)
    
    # Rotation Settings
    is_active = Column(Boolean, default=True)
    rotation_enabled = Column(Boolean, default=False)  # Include in rotation pool
    rotation_priority = Column(Integer, default=0)  # Higher = used more often
    
    # Usage Statistics
    total_messages_sent = Column(Integer, default=0)
    total_messages_received = Column(Integer, default=0)
    last_used_at = Column(DateTime)
    
    # Ownership
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    twilio_settings_id = Column(UUID(as_uuid=True), ForeignKey('twilio_settings.id'), index=True)
    
    # Assignment
    assigned_to_contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), nullable=True)  # Dedicated number for specific contact
    
    # Relationships
    user = relationship('User')
    twilio_settings = relationship('TwilioSettings')
    assigned_contact = relationship('Contact', foreign_keys=[assigned_to_contact_id])
