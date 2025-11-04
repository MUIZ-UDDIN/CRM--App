"""
Email Campaigns Models - Bulk email with SendGrid integration
"""

from sqlalchemy import Column, String, ForeignKey, DateTime, Integer, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import BaseModel


class BulkEmailCampaign(BaseModel):
    """
    Bulk email campaigns with SendGrid integration and IP rotation
    Separate from regular email campaigns for bulk operations
    """
    __tablename__ = "bulk_email_campaigns"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=True, index=True)
    campaign_name = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    html_body = Column(Text)
    ip_pool = Column(String(50))  # SendGrid IP pool name
    
    # Scheduling
    scheduled_at = Column(DateTime)
    sent_at = Column(DateTime)
    
    # Status
    status = Column(String(20), default='draft', index=True)  # draft, scheduled, sending, sent, failed
    
    # Statistics
    total_recipients = Column(Integer, default=0)
    total_sent = Column(Integer, default=0)
    total_delivered = Column(Integer, default=0)
    total_opened = Column(Integer, default=0)
    total_clicked = Column(Integer, default=0)
    total_bounced = Column(Integer, default=0)

    # Relationships
    user = relationship("User")
    analytics = relationship("BulkEmailAnalytics", back_populates="campaign", cascade="all, delete-orphan")

    class Config:
        from_attributes = True

    def __repr__(self):
        return f"<BulkEmailCampaign {self.campaign_name} status={self.status}>"


class BulkEmailAnalytics(BaseModel):
    """
    Per-recipient email analytics for bulk campaigns
    Tracks opens, clicks, bounces for each email sent
    """
    __tablename__ = "bulk_email_analytics"

    campaign_id = Column(UUID(as_uuid=True), ForeignKey("bulk_email_campaigns.id"), nullable=False, index=True)
    recipient_email = Column(String(255), nullable=False, index=True)
    recipient_name = Column(String(255))
    
    # Timestamps
    sent_at = Column(DateTime)
    delivered_at = Column(DateTime)
    opened_at = Column(DateTime)
    clicked_at = Column(DateTime)
    bounced_at = Column(DateTime)
    bounce_reason = Column(Text)
    
    # Status flags
    opened = Column(Boolean, default=False)
    clicked = Column(Boolean, default=False)
    bounced = Column(Boolean, default=False)
    unsubscribed = Column(Boolean, default=False)

    # Relationships
    campaign = relationship("BulkEmailCampaign", back_populates="analytics")

    class Config:
        from_attributes = True

    def __repr__(self):
        return f"<BulkEmailAnalytics {self.recipient_email} campaign={self.campaign_id}>"
