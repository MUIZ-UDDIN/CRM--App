"""
Custom Fields Model - Allows companies to add custom fields to entities
"""

import enum
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, Enum as SQLEnum, JSON as JSONB
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from .base import Base


class FieldType(str, enum.Enum):
    TEXT = "text"
    NUMBER = "number"
    DATE = "date"
    BOOLEAN = "boolean"
    SELECT = "select"  # Dropdown
    MULTI_SELECT = "multi_select"
    EMAIL = "email"
    PHONE = "phone"
    URL = "url"
    TEXTAREA = "textarea"


class EntityType(str, enum.Enum):
    CONTACT = "contact"
    DEAL = "deal"
    COMPANY = "company"
    ACTIVITY = "activity"


class CustomField(Base):
    __tablename__ = "custom_fields"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)  # Display name
    field_key = Column(String(100), nullable=False)  # Internal key (e.g., "custom_budget")
    field_type = Column(SQLEnum(FieldType), nullable=False)
    entity_type = Column(SQLEnum(EntityType), nullable=False)
    
    # Configuration
    description = Column(Text, nullable=True)
    is_required = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    default_value = Column(Text, nullable=True)
    options = Column(JSON, nullable=True)  # For select/multi-select fields
    validation_rules = Column(JSON, nullable=True)  # Custom validation rules
    
    # Ordering and display
    display_order = Column(Integer, default=0)
    show_in_list = Column(Boolean, default=False)  # Show in list views
    show_in_detail = Column(Boolean, default=True)  # Show in detail views
    
    # Ownership
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Unique constraint: field_key must be unique per company and entity type
    __table_args__ = (
        {'schema': None},
    )


class CustomFieldValue(Base):
    __tablename__ = "custom_field_values"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    custom_field_id = Column(UUID(as_uuid=True), ForeignKey('custom_fields.id'), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)  # ID of the contact/deal/etc
    entity_type = Column(SQLEnum(EntityType), nullable=False)
    
    # Value storage (use appropriate column based on field type)
    value_text = Column(Text, nullable=True)
    value_number = Column(Integer, nullable=True)
    value_boolean = Column(Boolean, nullable=True)
    value_date = Column(DateTime, nullable=True)
    value_json = Column(JSON, nullable=True)  # For multi-select and complex types
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    custom_field = relationship("CustomField")
