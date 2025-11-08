"""
Notification models
"""

from sqlalchemy import Column, String, ForeignKey, Boolean, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from .base import BaseModel
import enum


class NotificationType(str, enum.Enum):
    """Notification type enum"""
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"


class Notification(BaseModel):
    """Notification model"""
    __tablename__ = 'notifications'
    
    # Basic Information
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(SQLEnum(NotificationType), default=NotificationType.INFO, nullable=False)
    
    # Status
    read = Column(Boolean, default=False, nullable=False, index=True)
    
    # Link
    link = Column(String(500))  # Optional link to related resource
    
    # Metadata for additional data (e.g., call info)
    metadata = Column(JSONB, default=dict)
    
    # User
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=True, index=True)
    
    # Relationships
    user = relationship('User')
    
    def __repr__(self):
        return f"<Notification {self.title} - {self.type}>"
