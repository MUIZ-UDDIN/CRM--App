"""
File management models
"""

from sqlalchemy import Column, String, ForeignKey, Integer, BigInteger, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from .base import BaseModel


class File(BaseModel):
    """File model for document management"""
    __tablename__ = 'files'
    
    # Basic Information
    name = Column(String(255), nullable=False, index=True)
    original_name = Column(String(255), nullable=False)
    file_type = Column(String(100))  # pdf, docx, xlsx, image, etc.
    mime_type = Column(String(100))
    size = Column(BigInteger)  # Size in bytes
    
    # Storage
    storage_path = Column(String(500))  # Path to file in storage
    url = Column(String(500))  # Public URL if applicable
    
    # Categorization
    category = Column(String(100), index=True)  # Sales, Legal, Marketing, etc.
    folder_id = Column(UUID(as_uuid=True), ForeignKey('folders.id'), index=True)
    tags = Column(ARRAY(String), default=[])
    
    # Relations
    contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), index=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey('deals.id'), index=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=True, index=True)
    
    # Metadata
    description = Column(Text)
    status = Column(String(50), default='active')  # active, inactive, archived
    version = Column(Integer, default=1)
    custom_fields = Column(JSONB)
    
    # Relationships
    owner = relationship('User', foreign_keys=[owner_id])
    contact = relationship('Contact', back_populates='files')
    deal = relationship('Deal', back_populates='files')
    folder = relationship('Folder', back_populates='files')
    
    def __repr__(self):
        return f"<File {self.name}>"


class Folder(BaseModel):
    """Folder model for organizing files"""
    __tablename__ = 'folders'
    
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    category = Column(String(100), index=True)  # Sales, Legal, Marketing, etc.
    parent_id = Column(UUID(as_uuid=True), ForeignKey('folders.id'), index=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=True, index=True)
    
    # Metadata
    status = Column(String(50), default='active')  # active, inactive, archived
    tags = Column(ARRAY(String), default=[])
    color = Column(String(50))  # For UI customization
    icon = Column(String(50))
    custom_fields = Column(JSONB)
    
    # Relationships
    owner = relationship('User', foreign_keys=[owner_id])
    parent = relationship('Folder', remote_side='Folder.id', backref='subfolders')
    files = relationship('File', back_populates='folder')
    
    def __repr__(self):
        return f"<Folder {self.name}>"
