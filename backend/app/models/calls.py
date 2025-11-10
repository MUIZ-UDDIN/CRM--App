"""
Voice Call models
"""

from sqlalchemy import Column, String, ForeignKey, DateTime, Text, Integer, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import BaseModel
from datetime import datetime
import enum


class CallDirection(str, enum.Enum):
    """Call direction enum"""
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class CallStatus(str, enum.Enum):
    """Call status enum"""
    QUEUED = "queued"
    INITIATED = "initiated"
    RINGING = "ringing"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"
    FAILED = "failed"
    BUSY = "busy"
    NO_ANSWER = "no-answer"
    CANCELED = "canceled"


class Call(BaseModel):
    """Voice call model"""
    __tablename__ = 'calls'
    
    # Call Details
    direction = Column(SQLEnum(CallDirection), nullable=False, index=True)
    status = Column(SQLEnum(CallStatus), nullable=False, index=True)
    from_address = Column(String(20), nullable=False, index=True)
    to_address = Column(String(20), nullable=False, index=True)
    
    # Call Information
    duration = Column(Integer, default=0)  # Duration in seconds
    price = Column(String(20))  # Cost of call
    price_unit = Column(String(10), default='USD')
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    answered_at = Column(DateTime)
    ended_at = Column(DateTime)
    
    # Recording
    recording_url = Column(String(500))
    recording_duration = Column(Integer)  # Recording duration in seconds
    
    # Relationships
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=True, index=True)
    
    # Twilio Integration
    twilio_sid = Column(String(100), unique=True, index=True)
    parent_call_sid = Column(String(100))  # For conference calls
    
    # Additional Information
    notes = Column(Text)
    forwarded_from = Column(String(20))  # If call was forwarded
    caller_name = Column(String(200))  # Caller ID name
    
    # Call Quality Metrics
    quality_score = Column(Integer)  # 1-5 rating
    queue_time = Column(Integer)  # Time spent in queue (seconds)
    
    # Error Information
    error_code = Column(String(20))
    error_message = Column(String(500))
    
    # Relationships
    user = relationship('User', back_populates='calls', foreign_keys=[user_id])
    contact = relationship('Contact', back_populates='calls')
    
    def __repr__(self):
        return f"<Call {self.direction} - {self.from_address} to {self.to_address}>"