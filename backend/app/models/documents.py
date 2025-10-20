"""
Document and E-Signature models
"""

from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Text, Integer, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from .base import BaseModel
from datetime import datetime
import enum


class DocumentType(str, enum.Enum):
    """Document type enum"""
    CONTRACT = "contract"
    PROPOSAL = "proposal"
    NDA = "nda"
    INVOICE = "invoice"
    QUOTE = "quote"
    OTHER = "other"


class DocumentStatus(str, enum.Enum):
    """Document status enum"""
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    SIGNED = "signed"
    DECLINED = "declined"
    EXPIRED = "expired"


class Document(BaseModel):
    """Document model"""
    __tablename__ = 'documents'
    
    # Basic Information
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    type = Column(SQLEnum(DocumentType), nullable=False, index=True)
    status = Column(SQLEnum(DocumentStatus), default=DocumentStatus.DRAFT, nullable=False, index=True)
    
    # File Information
    file_url = Column(String(500), nullable=False)
    file_size = Column(Integer)  # Size in bytes
    file_type = Column(String(50))  # MIME type
    
    # Relations
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), index=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey('deals.id'), index=True)
    
    # E-Signature Information
    requires_signature = Column(Boolean, default=False)
    signature_provider = Column(String(50))  # e.g., "docusign", "hellosign"
    signature_request_id = Column(String(255))
    
    # Dates
    sent_at = Column(DateTime)
    viewed_at = Column(DateTime)
    signed_at = Column(DateTime)
    expires_at = Column(DateTime)
    
    # Tracking
    view_count = Column(Integer, default=0)
    reminder_count = Column(Integer, default=0)
    last_reminder_at = Column(DateTime)
    
    # Metadata
    tags = Column(JSONB)
    custom_fields = Column(JSONB)
    
    # Relationships
    owner = relationship('User')
    contact = relationship('Contact')
    deal = relationship('Deal', back_populates='documents')
    signatures = relationship('DocumentSignature', back_populates='document')
    
    def __repr__(self):
        return f"<Document {self.name} - {self.type}>"


class DocumentSignature(BaseModel):
    """Document Signature model"""
    __tablename__ = 'document_signatures'
    
    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id'), nullable=False, index=True)
    signer_name = Column(String(255), nullable=False)
    signer_email = Column(String(255), nullable=False, index=True)
    signer_role = Column(String(100))  # e.g., "client", "witness"
    
    # Signature Data
    signed_at = Column(DateTime)
    signature_data = Column(Text)  # Base64 encoded signature image or signature ID
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    
    # Status
    is_signed = Column(Boolean, default=False)
    
    # Relationships
    document = relationship('Document', back_populates='signatures')
