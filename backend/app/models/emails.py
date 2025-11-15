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
    
    # Basic Information
    subject = Column(String(500), nullable=False)
    body_html = Column(Text)
    body_text = Column(Text)
    # snippet = Column(String(500))  # Preview text like Gmail - TODO: Add migration
    
    # Sender/Recipient
    from_email = Column(String(255), nullable=False, index=True)
    from_name = Column(String(255))
    to_email = Column(String(255), nullable=False, index=True)
    to_name = Column(String(255))
    cc = Column(String(1000))  # Comma-separated CC emails
    bcc = Column(String(1000))  # Comma-separated BCC emails
    reply_to = Column(String(255))
    
    # Gmail-like Features
    thread_id = Column(String(255), index=True)  # For email threading/conversations
    in_reply_to = Column(String(255))  # Message-ID of email being replied to
    references = Column(Text)  # Full reference chain
    labels = Column(ARRAY(String), default=[])  # Gmail-style labels
    is_starred = Column(Boolean, default=False, index=True)
    is_important = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False, index=True)
    is_archived = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False, index=True)
    is_spam = Column(Boolean, default=False)
    
    # Status & Provider
    status = Column(SQLEnum(EmailStatus), default=EmailStatus.DRAFT, nullable=False, index=True)
    provider = Column(SQLEnum(EmailProvider), default=EmailProvider.SENDGRID, nullable=False)
    direction = Column(String(20), default="outbound")  # inbound or outbound
    
    # Attachments
    has_attachments = Column(Boolean, default=False)
    attachments = Column(JSONB, default=[])  # Array of attachment metadata
    
    # Relations
    contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), index=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey('deals.id'), index=True)
    template_id = Column(UUID(as_uuid=True), ForeignKey('email_templates.id'))
    campaign_id = Column(UUID(as_uuid=True), ForeignKey('email_campaigns.id'), index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False, index=True)
    
    # Tracking
    sent_at = Column(DateTime, index=True)
    delivered_at = Column(DateTime)
    read_at = Column(DateTime)
    opened_at = Column(DateTime)
    clicked_at = Column(DateTime)
    bounced_at = Column(DateTime)
    replied_at = Column(DateTime)
    
    open_count = Column(Integer, default=0)
    click_count = Column(Integer, default=0)
    
    # Email Provider Data
    provider_message_id = Column(String(255), index=True)  # SendGrid/Gmail message ID
    gmail_message_id = Column(String(255), index=True)  # Gmail specific ID
    gmail_thread_id = Column(String(255), index=True)  # Gmail thread ID
    provider_data = Column(JSONB, default={})
    
    # Metadata
    headers = Column(JSONB, default={})  # Email headers
    raw_data = Column(JSONB, default={})  # Full raw email data
    
    # Relationships
    contact = relationship('Contact', back_populates='emails')
    deal = relationship('Deal')
    template = relationship('EmailTemplate', back_populates='emails')
    campaign = relationship('EmailCampaign', back_populates='emails')
    user = relationship('User')
    
    def __repr__(self):
        return f"<Email {self.subject} to {self.to_email}>"
