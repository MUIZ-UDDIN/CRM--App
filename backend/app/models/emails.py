"""
Email and Email Campaign models
"""

from sqlalchemy import Column, String, ForeignKey, DateTime, Text, Integer, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
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
    """Email model"""
    __tablename__ = 'emails'
    
    # Basic Information
    subject = Column(String(500), nullable=False)
    body_html = Column(Text)
    body_text = Column(Text)
    
    # Sender/Recipient
    from_email = Column(String(255), nullable=False)
    to_email = Column(String(255), nullable=False, index=True)
    cc_emails = Column(JSONB)  # Array of CC emails
    bcc_emails = Column(JSONB)  # Array of BCC emails
    
    # Status
    status = Column(SQLEnum(EmailStatus), default=EmailStatus.DRAFT, nullable=False, index=True)
    
    # Relations
    contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), index=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey('deals.id'), index=True)
    template_id = Column(UUID(as_uuid=True), ForeignKey('email_templates.id'))
    campaign_id = Column(UUID(as_uuid=True), ForeignKey('email_campaigns.id'), index=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=True, index=True)
    
    # Tracking
    sent_at = Column(DateTime)
    delivered_at = Column(DateTime)
    opened_at = Column(DateTime)
    clicked_at = Column(DateTime)
    bounced_at = Column(DateTime)
    
    open_count = Column(Integer, default=0)
    click_count = Column(Integer, default=0)
    
    # Email Provider Data
    provider_message_id = Column(String(255))
    provider_data = Column(JSONB)
    
    # Relationships
    contact = relationship('Contact', back_populates='emails')
    deal = relationship('Deal')
    template = relationship('EmailTemplate', back_populates='emails')
    campaign = relationship('EmailCampaign', back_populates='emails')
    owner = relationship('User')
    
    def __repr__(self):
        return f"<Email {self.subject} to {self.to_email}>"
