"""
Contact and Lead models
"""

from sqlalchemy import Column, String, ForeignKey, Integer, Float, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from .base import BaseModel
import enum


class ContactStatus(str, enum.Enum):
    """Contact status enum"""
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    UNQUALIFIED = "unqualified"
    CUSTOMER = "customer"
    INACTIVE = "inactive"


class LeadSource(str, enum.Enum):
    """Lead source enum"""
    WEBSITE = "website"
    REFERRAL = "referral"
    LINKEDIN = "linkedin"
    COLD_EMAIL = "cold_email"
    TRADE_SHOW = "trade_show"
    SOCIAL_MEDIA = "social_media"
    OTHER = "other"


class Contact(BaseModel):
    """Contact/Lead model"""
    __tablename__ = 'contacts'
    
    # Basic Information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20))
    mobile = Column(String(20))
    
    # Company Information
    company = Column(String(200), index=True)
    title = Column(String(100))
    type = Column(String(100), default='Lead')
    department = Column(String(100))
    website = Column(String(255))
    
    # Address
    address_line1 = Column(String(255))
    address_line2 = Column(String(255))
    city = Column(String(100))
    state = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(100))
    
    # Lead Information
    status = Column(SQLEnum(ContactStatus), default=ContactStatus.NEW, nullable=False, index=True)
    source = Column(SQLEnum(LeadSource), index=True)
    lead_score = Column(Integer, default=0, index=True)  # AI-generated score 0-100
    
    # Ownership
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    
    # Additional Data
    tags = Column(JSONB)  # Array of tags
    custom_fields = Column(JSONB)  # Custom field values
    notes = Column(Text)
    
    # Social Media
    linkedin_url = Column(String(255))
    twitter_handle = Column(String(100))
    
    # Relationships
    owner = relationship('User', back_populates='contacts', foreign_keys=[owner_id])
    deals = relationship('Deal', back_populates='contact')
    activities = relationship('Activity', back_populates='contact')
    emails = relationship('Email', back_populates='contact')
    sms_messages = relationship('SMSMessage', back_populates='contact')
    calls = relationship('Call', back_populates='contact')
    files = relationship('File', back_populates='contact')
    
    def __repr__(self):
        return f"<Contact {self.first_name} {self.last_name} - {self.email}>"

    # Add this to the Contact class relationships section:
