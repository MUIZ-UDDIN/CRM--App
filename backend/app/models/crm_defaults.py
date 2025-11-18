"""
Global CRM Defaults - Super Admin can set default configurations for new companies
"""

from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from .base import Base


class GlobalPipelineDefault(Base):
    """Global default pipeline templates that can be applied to new companies"""
    __tablename__ = "global_pipeline_defaults"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    stages = Column(JSON, nullable=False, default=[])  # Array of stage configurations
    is_active = Column(Boolean, default=True)
    apply_to_new_companies = Column(Boolean, default=True)  # Auto-apply to new companies
    
    # Metadata
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<GlobalPipelineDefault {self.name}>"


class GlobalFieldDefault(Base):
    """Global default custom fields that can be applied to new companies"""
    __tablename__ = "global_field_defaults"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    field_type = Column(String(50), nullable=False)  # text, number, date, dropdown, etc.
    entity_type = Column(String(50), nullable=False)  # contact, deal, company, etc.
    is_required = Column(Boolean, default=False)
    default_value = Column(Text, nullable=True)
    options = Column(JSON, nullable=True)  # For dropdown fields
    placeholder = Column(String(255), nullable=True)
    help_text = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    apply_to_new_companies = Column(Boolean, default=True)  # Auto-apply to new companies
    
    # Metadata
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<GlobalFieldDefault {self.name} - {self.entity_type}>"


class GlobalIntegrationTemplate(Base):
    """Global integration templates that can be applied to new companies"""
    __tablename__ = "global_integration_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    provider = Column(String(100), nullable=False)  # twilio, sendgrid, mailchimp, etc.
    integration_type = Column(String(50), nullable=False)  # email, sms, call, etc.
    config_template = Column(JSON, nullable=False, default={})  # Configuration template
    is_active = Column(Boolean, default=True)
    apply_to_new_companies = Column(Boolean, default=False)  # Optional auto-apply
    
    # Metadata
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<GlobalIntegrationTemplate {self.name} - {self.provider}>"
