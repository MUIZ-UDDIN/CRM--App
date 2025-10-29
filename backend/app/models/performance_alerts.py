"""
Performance Alerts Model - Automated alerts for underperforming numbers/campaigns
"""

from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import BaseModel


class PerformanceAlert(BaseModel):
    """
    Automated performance alerts
    Triggered when metrics fall below thresholds
    """
    __tablename__ = "performance_alerts"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    alert_type = Column(String(50), nullable=False, index=True)  # low_response_rate, high_bounce_rate, etc.
    severity = Column(String(20), default='medium')  # low, medium, high, critical
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Metrics
    metric_value = Column(Numeric(10, 2))
    threshold_value = Column(Numeric(10, 2))
    
    # Related entity
    related_entity_type = Column(String(50))  # phone_number, campaign, conversation
    related_entity_id = Column(UUID(as_uuid=True))
    
    # Status
    is_read = Column(Boolean, default=False, index=True)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)

    # Relationships
    user = relationship("User")

    class Config:
        from_attributes = True

    def __repr__(self):
        return f"<PerformanceAlert {self.alert_type} severity={self.severity}>"
