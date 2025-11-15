"""
Global Workflow Templates - Super Admin can create templates for all companies
"""

import enum
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.core.database import Base


class TemplateCategory(str, enum.Enum):
    SALES = "sales"
    MARKETING = "marketing"
    SUPPORT = "support"
    ONBOARDING = "onboarding"
    FOLLOW_UP = "follow_up"
    GENERAL = "general"


class WorkflowTemplate(Base):
    __tablename__ = "workflow_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(SQLEnum(TemplateCategory), nullable=False)
    
    # Template configuration (JSON structure matching workflow format)
    trigger_type = Column(String(50), nullable=False)
    trigger_config = Column(JSON, nullable=True)
    actions = Column(JSON, nullable=False)  # Array of action configurations
    conditions = Column(JSON, nullable=True)  # Optional conditions
    
    # Metadata
    is_global = Column(Boolean, default=True)  # Global templates by Super Admin
    is_active = Column(Boolean, default=True)
    usage_count = Column(Integer, default=0)  # Track how many times used
    
    # Tags for searchability
    tags = Column(JSON, nullable=True)  # Array of tags
    
    # Ownership
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=True)  # NULL for global
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class TemplateUsage(Base):
    __tablename__ = "template_usage"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey('workflow_templates.id'), nullable=False)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey('workflows.id'), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
