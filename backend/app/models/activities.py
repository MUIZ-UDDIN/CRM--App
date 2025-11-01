"""
Activity models
"""

from sqlalchemy import Column, String, ForeignKey, DateTime, Text, Integer, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from .base import BaseModel
from datetime import datetime
import enum


class ActivityType(str, enum.Enum):
    """Activity type enum"""
    CALL = "call"
    EMAIL = "email"
    MEETING = "meeting"
    TASK = "task"
    NOTE = "note"
    DEADLINE = "deadline"


class ActivityStatus(str, enum.Enum):
    """Activity status enum"""
    PENDING = "pending"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class Activity(BaseModel):
    """Activity model"""
    __tablename__ = 'activities'
    
    # Basic Information
    type = Column(SQLEnum(ActivityType), nullable=False, index=True)
    subject = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(SQLEnum(ActivityStatus), default=ActivityStatus.PENDING, nullable=False, index=True)
    
    # Dates
    due_date = Column(DateTime, index=True)
    completed_at = Column(DateTime)
    duration_minutes = Column(Integer)  # Planned or actual duration
    
    # Ownership and Relations
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), index=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey('deals.id'), index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=True, index=True)
    
    # Additional Information
    location = Column(String(255))
    outcome = Column(String(500))  # Result/outcome of the activity
    priority = Column(Integer, default=0)  # 0=low, 1=medium, 2=high
    
    # Metadata
    custom_fields = Column(JSONB)
    
    # Relationships
    owner = relationship('User', back_populates='activities', foreign_keys=[owner_id])
    contact = relationship('Contact', back_populates='activities')
    deal = relationship('Deal', back_populates='activities')
    
    def __repr__(self):
        return f"<Activity {self.type} - {self.subject}>"
