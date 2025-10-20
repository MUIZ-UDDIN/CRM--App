"""
Quote models
"""

from sqlalchemy import Column, String, ForeignKey, Numeric, Date, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from .base import BaseModel
import enum


class QuoteStatus(str, enum.Enum):
    """Quote status enum"""
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"


class Quote(BaseModel):
    """Quote model"""
    __tablename__ = 'quotes'
    
    # Basic Information
    quote_number = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    
    # Status
    status = Column(SQLEnum(QuoteStatus), default=QuoteStatus.DRAFT, nullable=False, index=True)
    
    # Relations
    client_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), index=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey('deals.id'), index=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    
    # Dates
    valid_until = Column(Date)
    sent_at = Column(Date)
    accepted_at = Column(Date)
    
    # Content
    description = Column(Text)
    terms = Column(Text)
    notes = Column(Text)
    
    # Metadata
    custom_fields = Column(JSONB)
    
    # Relationships
    owner = relationship('User', foreign_keys=[owner_id])
    client = relationship('Contact', foreign_keys=[client_id])
    deal = relationship('Deal', foreign_keys=[deal_id])
    
    def __repr__(self):
        return f"<Quote {self.quote_number} - {self.title}>"
