"""
SMS Message models
"""

from sqlalchemy import Column, String, ForeignKey, DateTime, Text, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import BaseModel
from datetime import datetime
import enum


class SMSDirection(str, enum.Enum):
    """SMS direction enum"""
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class SMSStatus(str, enum.Enum):
    """SMS status enum"""
    QUEUED = "queued"
    SENDING = "sending"
    SENT = "sent"
    RECEIVED = "received"
    DELIVERED = "delivered"
    UNDELIVERED = "undelivered"
    FAILED = "failed"
    READ = "read"


class SMSMessage(BaseModel):
    """SMS message model"""
    __tablename__ = 'sms_messages'
    
    # Message Details
    direction = Column(SQLEnum(SMSDirection), nullable=False, index=True)
    status = Column(SQLEnum(SMSStatus), nullable=False, index=True)
    from_address = Column(String(20), nullable=False, index=True)
    to_address = Column(String(20), nullable=False, index=True)
    body = Column(Text, nullable=False)
    
    # Timestamps
    sent_at = Column(DateTime, default=datetime.utcnow)
    delivered_at = Column(DateTime)
    read_at = Column(DateTime)
    
    # Relationships
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=True, index=True)
    
    # Twilio Integration
    twilio_sid = Column(String(100), unique=True, index=True)
    price = Column(String(20))  # Cost of message
    error_code = Column(String(20))
    error_message = Column(String(500))
    
    # Metadata
    num_segments = Column(String(10))  # Number of message segments
    num_media = Column(String(10))  # Number of media attachments
    is_auto_response = Column(Boolean, default=False)  # AI-generated auto-response
    conversation_id = Column(UUID(as_uuid=True), ForeignKey('user_conversations.id'), nullable=True, index=True)
    
    # Relationships
    user = relationship('User', back_populates='sms_messages', foreign_keys=[user_id])
    contact = relationship('Contact', back_populates='sms_messages')
    conversation = relationship('UserConversation', back_populates='messages', foreign_keys=[conversation_id])
    
    def __repr__(self):
        return f"<SMSMessage {self.direction} - {self.from_address} to {self.to_address}>"