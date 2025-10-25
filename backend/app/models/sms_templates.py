"""
SMS Templates Model
"""

from sqlalchemy import Column, String, Text, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .base import BaseModel


class SMSTemplate(BaseModel):
    """SMS Message Template model"""
    __tablename__ = 'sms_templates'
    
    # Basic Information
    name = Column(String(255), nullable=False)
    category = Column(String(100))  # greeting, follow_up, appointment, etc.
    body = Column(Text, nullable=False)
    
    # Template Type
    is_static = Column(Boolean, default=True)  # Static or dynamic (with variables)
    variables = Column(Text)  # JSON array of variable names like {contact_name}, {company}
    
    # AI Settings
    use_ai_enhancement = Column(Boolean, default=False)  # Use Claude to enhance/personalize
    ai_tone = Column(String(50), default='professional')  # professional, friendly, casual
    
    # Usage Tracking
    usage_count = Column(Integer, default=0)
    
    # Ownership
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user = relationship('User')
