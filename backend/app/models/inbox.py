"""
Inbox models for SMS and Email management
"""

from sqlalchemy import Column, String, ForeignKey, Text, DateTime, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from .base import BaseModel
from datetime import datetime
import enum


class MessageType(str, enum.Enum):
    """Message type enum"""
    SMS = "sms"
    EMAIL = "email"
    VOICE = "voice"


class MessageStatus(str, enum.Enum):
    """Message status enum"""
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"
    PENDING = "pending"


class MessageDirection(str, enum.Enum):
    """Message direction enum"""
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class Inbox(BaseModel):
    """Unified inbox for SMS and Email messages"""
    __tablename__ = 'inbox'
    
    # Basic fields
    message_type = Column(SQLEnum(MessageType), nullable=False, index=True)
    direction = Column(SQLEnum(MessageDirection), nullable=False, index=True)
    status = Column(SQLEnum(MessageStatus), default=MessageStatus.PENDING, index=True)
    
    # Sender/Recipient info
    from_address = Column(String(255), nullable=False, index=True)  # Email or phone number
    to_address = Column(String(255), nullable=False, index=True)    # Email or phone number
    
    # Message content
    subject = Column(String(500))  # For emails
    body = Column(Text, nullable=False)
    html_body = Column(Text)  # For HTML emails
    
    # Timestamps
    sent_at = Column(DateTime, default=datetime.utcnow)
    delivered_at = Column(DateTime)
    read_at = Column(DateTime)
    
    # Twilio/Provider fields
    provider_message_id = Column(String(255), unique=True)  # Twilio SID or Email ID
    provider_status = Column(String(50))
    provider_data = Column(JSONB)  # Additional provider metadata
    
    # CRM relationships
    contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'))
    deal_id = Column(UUID(as_uuid=True), ForeignKey('deals.id'))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Message metadata
    attachments = Column(JSONB)  # Array of attachment info
    tags = Column(JSONB)  # Array of tags
    is_archived = Column(Boolean, default=False)
    is_important = Column(Boolean, default=False)
    
    # Relationships
    contact = relationship('Contact', foreign_keys=[contact_id])
    user = relationship('User', foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<Inbox {self.message_type} from {self.from_address}>"
