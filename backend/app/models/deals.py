"""
Deal and Pipeline models
"""

from sqlalchemy import Column, String, ForeignKey, Float, Integer, DateTime, Text, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from .base import BaseModel
from datetime import datetime
import enum


class DealStatus(str, enum.Enum):
    """Deal status enum"""
    OPEN = "open"
    WON = "won"
    LOST = "lost"
    ABANDONED = "abandoned"


class Pipeline(BaseModel):
    """Pipeline model"""
    __tablename__ = 'pipelines'
    
    name = Column(String(100), nullable=False, index=True)
    description = Column(String(500))
    is_default = Column(Boolean, default=False)
    order_index = Column(Integer, default=0)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=True, index=True)
    
    # Relationships
    stages = relationship('PipelineStage', back_populates='pipeline', order_by='PipelineStage.order_index')
    deals = relationship('Deal', back_populates='pipeline')
    company = relationship('Company', foreign_keys=[company_id])


class PipelineStage(BaseModel):
    """Pipeline Stage model"""
    __tablename__ = 'pipeline_stages'
    
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey('pipelines.id'), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    order_index = Column(Integer, default=0, nullable=False)
    probability = Column(Float, default=0.0)  # Win probability %
    
    # Stage settings
    is_closed = Column(Boolean, default=False)  # Is this a closed stage (won/lost)
    is_won = Column(Boolean, default=False)  # Is this a won stage
    
    # Relationships
    pipeline = relationship('Pipeline', back_populates='stages')
    deals = relationship('Deal', back_populates='stage')
    
    def __repr__(self):
        return f"<PipelineStage {self.name}>"


class Deal(BaseModel):
    """Deal model"""
    __tablename__ = 'deals'
    
    # Basic Information
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    value = Column(Float, nullable=False, default=0.0, index=True)
    currency = Column(String(3), default='USD')
    
    # Pipeline Information
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey('pipelines.id'), nullable=False, index=True)
    stage_id = Column(UUID(as_uuid=True), ForeignKey('pipeline_stages.id'), nullable=False, index=True)
    status = Column(SQLEnum(DealStatus), default=DealStatus.OPEN, nullable=False, index=True)
    
    # Ownership
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), index=True)
    company = Column(String(255), index=True)  # Company name as text field
    
    # Dates
    expected_close_date = Column(DateTime, index=True)
    actual_close_date = Column(DateTime)
    stage_entered_at = Column(DateTime, default=datetime.utcnow)
    
    # Additional Information
    probability = Column(Float, default=0.0)  # Win probability %
    weighted_value = Column(Float, default=0.0)  # value * probability
    lost_reason = Column(String(255))
    won_reason = Column(String(255))
    
    # Metadata
    tags = Column(JSONB)
    custom_fields = Column(JSONB)
    
    # Relationships
    pipeline = relationship('Pipeline', back_populates='deals')
    stage = relationship('PipelineStage', back_populates='deals')
    owner = relationship('User', back_populates='deals', foreign_keys=[owner_id])
    contact = relationship('Contact', back_populates='deals')
    activities = relationship('Activity', back_populates='deal')
    documents = relationship('Document', back_populates='deal')
    files = relationship('File', back_populates='deal')
    
    def __repr__(self):
        return f"<Deal {self.title} - ${self.value}>"
