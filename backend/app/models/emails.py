"""
Email and Email Campaign models
"""

from sqlalchemy import Column, String, ForeignKey, DateTime, Text, Integer, Enum as SQLEnum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from .base import BaseModel
from datetime import datetime
import enum


class EmailStatus(str, enum.Enum):
    """Email status enum"""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENT = "sent"
    RECEIVED = "received"  # For inbound emails
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    BOUNCED = "bounced"
    FAILED = "failed"


class EmailProvider(str, enum.Enum):
    """Email provider enum"""
    SENDGRID = "sendgrid"
    GMAIL = "gmail"
    SMTP = "smtp"


class EmailTemplate(BaseModel):
    """Email Template model"""
    __tablename__ = 'email_templates'
    
    name = Column(String(255), nullable=False, index=True)
    subject = Column(String(500), nullable=False)
    body_html = Column(Text, nullable=False)
    body_text = Column(Text)
    category = Column(String(100))
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=True, index=True)
    
    # Relationships
    emails = relationship('Email', back_populates='template')


class EmailCampaign(BaseModel):
    """Email Campaign model"""
    __tablename__ = 'email_campaigns'
    
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    template_id = Column(UUID(as_uuid=True), ForeignKey('email_templates.id'))
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=True, index=True)
    
    # Campaign stats
    total_sent = Column(Integer, default=0)
    total_delivered = Column(Integer, default=0)
    total_opened = Column(Integer, default=0)
    total_clicked = Column(Integer, default=0)
    total_bounced = Column(Integer, default=0)
    
    # Dates
    scheduled_at = Column(DateTime)
    sent_at = Column(DateTime)
    
    # Relationships
    template = relationship('EmailTemplate')
    emails = relationship('Email', back_populates='campaign')


class Email(BaseModel):
    """Email model - Gmail-like functionality"""
    __tablename__ = 'emails'
    
    # Basic Information (matching actual DB schema)
    subject = Column(String(500), nullable=False)
    body_html = Column(Text)
    body_text = Column(Text)
    
    # Sender/Recipient (matching actual DB schema)
    from_email = Column(String(255), nullable=False)
    to_email = Column(String(255), nullable=False)
    cc_emails = Column(JSONB)  # JSON array of CC emails
    
    # Status (matching actual DB schema)
    status = Column(SQLEnum(EmailStatus), default=EmailStatus.DRAFT, nullable=False)
    
    # Relations (matching actual DB schema)
    contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'))
    deal_id = Column(UUID(as_uuid=True), ForeignKey('deals.id'))
    template_id = Column(UUID(as_uuid=True), ForeignKey('email_templates.id'))
    campaign_id = Column(UUID(as_uuid=True), ForeignKey('email_campaigns.id'))
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'))
    
    # Tracking (matching actual DB schema)
    sent_at = Column(DateTime)
    delivered_at = Column(DateTime)
    opened_at = Column(DateTime)
    clicked_at = Column(DateTime)
    bounced_at = Column(DateTime)
    open_count = Column(Integer)
    click_count = Column(Integer)
    
    # Provider Integration (matching actual DB schema)
    provider_message_id = Column(String(255))
    provider_data = Column(JSONB)
    
    # Relationships
    contact = relationship('Contact', back_populates='emails')
    deal = relationship('Deal')
    template = relationship('EmailTemplate', back_populates='emails')
    campaign = relationship('EmailCampaign', back_populates='emails')
    user = relationship('User')
    
    def __repr__(self):
        return f"<Email {self.subject} to {self.to_email}>"
