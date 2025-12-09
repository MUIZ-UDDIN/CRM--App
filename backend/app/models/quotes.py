"""
Quote models
"""

from sqlalchemy import Column, String, ForeignKey, Numeric, Date, Text, Enum as SQLEnum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from .base import BaseModel
import enum
import secrets


class QuoteStatus(str, enum.Enum):
    """Quote status enum"""
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"


def generate_public_token():
    """Generate a secure random token for public quote access"""
    return secrets.token_urlsafe(32)


class Quote(BaseModel):
    """Quote model"""
    __tablename__ = 'quotes'
    
    # Basic Information
    quote_number = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    
    # Status
    status = Column(SQLEnum(QuoteStatus), default=QuoteStatus.DRAFT, nullable=False, index=True)
    
    # Public Access Token - for client to view/respond without login
    public_token = Column(String(64), unique=True, index=True, default=generate_public_token)
    
    # Relations
    client_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), index=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey('deals.id'), index=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=True, index=True)
    
    # Dates
    valid_until = Column(Date)
    sent_at = Column(DateTime)  # Changed to DateTime for more precision
    accepted_at = Column(DateTime)  # Changed to DateTime for more precision
    rejected_at = Column(DateTime)  # Added for tracking rejection time
    
    # Content
    description = Column(Text)
    terms = Column(Text)
    notes = Column(Text)
    
    # Client Response
    client_response_note = Column(Text)  # Optional note from client when accepting/rejecting
    client_ip = Column(String(50))  # IP address when client responded (for audit)
    
    # Metadata
    custom_fields = Column(JSONB)
    
    # Relationships
    owner = relationship('User', foreign_keys=[owner_id])
    client = relationship('Contact', foreign_keys=[client_id])
    deal = relationship('Deal', foreign_keys=[deal_id])
    
    def __repr__(self):
        return f"<Quote {self.quote_number} - {self.title}>"
