"""
Analytics tables and materialized views for performance optimization
These tables store pre-computed analytics metrics and are updated either:
1. Real-time (on each event via triggers)
2. Batch processing (via scheduled ETL jobs)
"""

from sqlalchemy import Column, String, ForeignKey, DateTime, Integer, Float, Index
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import BaseModel
from datetime import datetime


class PipelineMetrics(BaseModel):
    """
    Pipeline Metrics table - stores aggregated pipeline performance data
    Updated: Real-time on deal stage changes or via batch ETL
    """
    __tablename__ = 'pipeline_metrics'
    
    # Dimensions
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey('pipelines.id'), nullable=False, index=True)
    stage_id = Column(UUID(as_uuid=True), ForeignKey('pipeline_stages.id'), nullable=False, index=True)
    
    # Metrics
    deal_count = Column(Integer, default=0, nullable=False)
    total_value = Column(Float, default=0.0)
    avg_value = Column(Float, default=0.0)
    avg_duration_days = Column(Float, default=0.0)
    conversion_rate = Column(Float, default=0.0)  # Percentage
    
    # Win/Loss Metrics
    deals_won = Column(Integer, default=0)
    deals_lost = Column(Integer, default=0)
    win_rate = Column(Float, default=0.0)  # Percentage
    
    # Velocity Metrics
    fastest_deal_days = Column(Float)
    slowest_deal_days = Column(Float)
    median_duration_days = Column(Float)
    
    # Timestamp
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    pipeline = relationship('Pipeline')
    stage = relationship('PipelineStage')
    
    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_pipeline_metrics_pipeline_stage', 'pipeline_id', 'stage_id'),
        Index('idx_pipeline_metrics_updated', 'last_updated'),
    )
    
    def __repr__(self):
        return f"<PipelineMetrics pipeline={self.pipeline_id} stage={self.stage_id}>"


class ActivityMetrics(BaseModel):
    """
    Activity Metrics table - stores aggregated activity performance data
    Updated: Real-time on activity completion or via batch ETL
    """
    __tablename__ = 'activity_metrics'
    
    # Dimensions
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    activity_type = Column(String(50), nullable=False, index=True)  # call, email, meeting, task
    
    # Date dimension for time-series analysis
    date = Column(DateTime, nullable=False, index=True)  # Date of the metrics (daily aggregation)
    
    # Metrics
    total_count = Column(Integer, default=0, nullable=False)
    completed_count = Column(Integer, default=0, nullable=False)
    overdue_count = Column(Integer, default=0, nullable=False)
    pending_count = Column(Integer, default=0, nullable=False)
    cancelled_count = Column(Integer, default=0, nullable=False)
    
    # Performance Metrics
    completion_rate = Column(Float, default=0.0)  # Percentage
    avg_completion_time_hours = Column(Float, default=0.0)
    avg_duration_minutes = Column(Float, default=0.0)
    
    # Timestamp
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    user = relationship('User')
    
    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_activity_metrics_user_type', 'user_id', 'activity_type'),
        Index('idx_activity_metrics_date', 'date'),
        Index('idx_activity_metrics_user_date', 'user_id', 'date'),
    )
    
    def __repr__(self):
        return f"<ActivityMetrics user={self.user_id} type={self.activity_type} date={self.date}>"


class EmailMetrics(BaseModel):
    """
    Email Metrics table - stores aggregated email campaign performance data
    Updated: Real-time on email events (sent, opened, clicked) or via batch ETL
    """
    __tablename__ = 'email_metrics'
    
    # Dimensions
    campaign_id = Column(UUID(as_uuid=True), ForeignKey('email_campaigns.id'), index=True)
    template_id = Column(UUID(as_uuid=True), ForeignKey('email_templates.id'), index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), index=True)
    
    # Date dimension
    date = Column(DateTime, nullable=False, index=True)
    
    # Metrics
    sent = Column(Integer, default=0, nullable=False)
    delivered = Column(Integer, default=0, nullable=False)
    opened = Column(Integer, default=0, nullable=False)
    clicked = Column(Integer, default=0, nullable=False)
    bounced = Column(Integer, default=0, nullable=False)
    unsubscribed = Column(Integer, default=0, nullable=False)
    
    # Unique metrics (unique opens/clicks)
    unique_opens = Column(Integer, default=0)
    unique_clicks = Column(Integer, default=0)
    
    # Rate Metrics
    open_rate = Column(Float, default=0.0)  # Percentage
    click_rate = Column(Float, default=0.0)  # Percentage
    bounce_rate = Column(Float, default=0.0)  # Percentage
    click_to_open_rate = Column(Float, default=0.0)  # Percentage
    
    # Timestamp
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    campaign = relationship('EmailCampaign')
    template = relationship('EmailTemplate')
    user = relationship('User')
    
    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_email_metrics_campaign', 'campaign_id'),
        Index('idx_email_metrics_template', 'template_id'),
        Index('idx_email_metrics_user_date', 'user_id', 'date'),
        Index('idx_email_metrics_date', 'date'),
    )
    
    def __repr__(self):
        return f"<EmailMetrics campaign={self.campaign_id} date={self.date}>"


class CallMetrics(BaseModel):
    """
    Call Metrics table - stores aggregated telephony performance data
    Updated: Real-time on call completion or via batch ETL
    """
    __tablename__ = 'call_metrics'
    
    # Dimensions
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    
    # Date dimension
    date = Column(DateTime, nullable=False, index=True)
    
    # Metrics
    total_calls = Column(Integer, default=0, nullable=False)
    answered = Column(Integer, default=0, nullable=False)
    missed = Column(Integer, default=0, nullable=False)
    voicemail = Column(Integer, default=0, nullable=False)
    
    # Duration Metrics (in seconds)
    total_duration_sec = Column(Integer, default=0)
    avg_duration_sec = Column(Float, default=0.0)
    min_duration_sec = Column(Integer)
    max_duration_sec = Column(Integer)
    
    # Performance Metrics
    answer_rate = Column(Float, default=0.0)  # Percentage
    
    # Recording Metrics
    recorded_calls = Column(Integer, default=0)
    recording_rate = Column(Float, default=0.0)  # Percentage
    
    # Outcome Metrics
    deals_advanced = Column(Integer, default=0)
    followups_scheduled = Column(Integer, default=0)
    
    # Timestamp
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    user = relationship('User')
    
    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_call_metrics_user_date', 'user_id', 'date'),
        Index('idx_call_metrics_date', 'date'),
    )
    
    def __repr__(self):
        return f"<CallMetrics user={self.user_id} date={self.date}>"


class ContactMetrics(BaseModel):
    """
    Contact/Lead Metrics table - stores aggregated lead performance data
    Updated: Real-time on contact status changes or via batch ETL
    """
    __tablename__ = 'contact_metrics'
    
    # Dimensions
    source = Column(String(100), index=True)  # Lead source
    status = Column(String(50), index=True)  # Contact status
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), index=True)
    
    # Date dimension
    date = Column(DateTime, nullable=False, index=True)
    
    # Metrics
    total_contacts = Column(Integer, default=0, nullable=False)
    new_contacts = Column(Integer, default=0)
    qualified_contacts = Column(Integer, default=0)
    converted_contacts = Column(Integer, default=0)
    
    # Conversion Metrics
    conversion_rate = Column(Float, default=0.0)  # Percentage
    avg_time_to_convert_days = Column(Float, default=0.0)
    avg_deal_value = Column(Float, default=0.0)
    
    # Lead Score Metrics
    avg_lead_score = Column(Float, default=0.0)
    high_score_count = Column(Integer, default=0)  # Score > 70
    
    # Timestamp
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    owner = relationship('User')
    
    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_contact_metrics_source_date', 'source', 'date'),
        Index('idx_contact_metrics_owner_date', 'owner_id', 'date'),
        Index('idx_contact_metrics_date', 'date'),
    )
    
    def __repr__(self):
        return f"<ContactMetrics source={self.source} date={self.date}>"


class DocumentMetrics(BaseModel):
    """
    Document Metrics table - stores aggregated document/e-signature performance data
    Updated: Real-time on document status changes or via batch ETL
    """
    __tablename__ = 'document_metrics'
    
    # Dimensions
    document_type = Column(String(50), index=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), index=True)
    
    # Date dimension
    date = Column(DateTime, nullable=False, index=True)
    
    # Metrics
    total_documents = Column(Integer, default=0, nullable=False)
    sent_documents = Column(Integer, default=0)
    viewed_documents = Column(Integer, default=0)
    signed_documents = Column(Integer, default=0)
    declined_documents = Column(Integer, default=0)
    expired_documents = Column(Integer, default=0)
    
    # Performance Metrics
    completion_rate = Column(Float, default=0.0)  # Percentage
    avg_time_to_sign_hours = Column(Float, default=0.0)
    avg_view_count = Column(Float, default=0.0)
    avg_reminder_count = Column(Float, default=0.0)
    
    # Timestamp
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    owner = relationship('User')
    
    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_document_metrics_type_date', 'document_type', 'date'),
        Index('idx_document_metrics_owner_date', 'owner_id', 'date'),
        Index('idx_document_metrics_date', 'date'),
    )
    
    def __repr__(self):
        return f"<DocumentMetrics type={self.document_type} date={self.date}>"


class RevenueMetrics(BaseModel):
    """
    Revenue Metrics table - stores aggregated revenue data
    Updated: Real-time on deal closure or via batch ETL
    """
    __tablename__ = 'revenue_metrics'
    
    # Dimensions
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey('pipelines.id'), index=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), index=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id'), index=True)
    
    # Date dimension (monthly aggregation)
    year = Column(Integer, nullable=False, index=True)
    month = Column(Integer, nullable=False, index=True)
    quarter = Column(Integer, index=True)
    
    # Metrics
    total_revenue = Column(Float, default=0.0, nullable=False)
    total_deals = Column(Integer, default=0, nullable=False)
    avg_deal_size = Column(Float, default=0.0)
    
    # Growth Metrics
    revenue_growth_rate = Column(Float, default=0.0)  # Percentage vs previous period
    deal_growth_rate = Column(Float, default=0.0)
    
    # Forecast Metrics
    forecasted_revenue = Column(Float, default=0.0)
    pipeline_value = Column(Float, default=0.0)
    
    # Timestamp
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    pipeline = relationship('Pipeline')
    owner = relationship('User')
    team = relationship('Team')
    
    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_revenue_metrics_year_month', 'year', 'month'),
        Index('idx_revenue_metrics_owner_year_month', 'owner_id', 'year', 'month'),
        Index('idx_revenue_metrics_team_year_month', 'team_id', 'year', 'month'),
    )
    
    def __repr__(self):
        return f"<RevenueMetrics year={self.year} month={self.month}>"


class MessageAnalytics(BaseModel):
    """
    Message Analytics - Track performance of each SMS message
    Used for calculating response rates, delivery rates, engagement
    """
    __tablename__ = "message_analytics"

    conversation_id = Column(UUID(as_uuid=True), ForeignKey("user_conversations.id"), index=True)
    message_id = Column(UUID(as_uuid=True), ForeignKey("sms_messages.id"), index=True)
    from_twilio_number = Column(String(20), index=True)
    to_number = Column(String(20), index=True)
    response_time = Column(Integer)  # in seconds
    delivered = Column(Boolean, default=False)
    responded = Column(Boolean, default=False)
    opened = Column(Boolean, default=False)
    clicked = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    conversation = relationship("UserConversation", back_populates="analytics")
    message = relationship("SMSMessage")

    class Config:
        from_attributes = True

    def __repr__(self):
        return f"<MessageAnalytics {self.from_twilio_number} -> {self.to_number}>"


class NumberPerformanceStats(BaseModel):
    """
    Daily performance statistics per phone number
    Used for rotation decisions and performance alerts
    """
    __tablename__ = "number_performance_stats"

    phone_number_id = Column(UUID(as_uuid=True), ForeignKey("phone_numbers.id"), nullable=False, index=True)
    twilio_number = Column(String(20), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DateTime, nullable=False, index=True)
    
    # Metrics
    total_sent = Column(Integer, default=0)
    total_delivered = Column(Integer, default=0)
    total_received = Column(Integer, default=0)
    total_responded = Column(Integer, default=0)
    avg_response_time = Column(Integer)  # in seconds
    delivery_rate = Column(Float)  # percentage
    response_rate = Column(Float)  # percentage
    engagement_score = Column(Float)  # calculated score

    # Relationships
    phone_number = relationship("PhoneNumber")
    user = relationship("User")

    __table_args__ = (
        Index('idx_number_stats_phone_date', 'phone_number_id', 'date'),
        Index('idx_number_stats_user_date', 'user_id', 'date'),
    )

    class Config:
        from_attributes = True

    def __repr__(self):
        return f"<NumberPerformanceStats {self.twilio_number} {self.date}>"
