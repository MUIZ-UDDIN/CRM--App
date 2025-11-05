"""
Workflow and Automation models
"""

from sqlalchemy import Column, String, ForeignKey, DateTime, Text, Integer, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from .base import BaseModel
from datetime import datetime
import enum


class WorkflowStatus(str, enum.Enum):
    """Workflow status enum"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PAUSED = "paused"


class WorkflowTrigger(str, enum.Enum):
    """Workflow trigger enum"""
    DEAL_CREATED = "deal_created"
    DEAL_STAGE_CHANGED = "deal_stage_changed"
    DEAL_WON = "deal_won"
    DEAL_LOST = "deal_lost"
    CONTACT_CREATED = "contact_created"
    ACTIVITY_COMPLETED = "activity_completed"
    EMAIL_OPENED = "email_opened"
    DOCUMENT_SIGNED = "document_signed"
    SCHEDULED = "scheduled"


class Workflow(BaseModel):
    """Workflow model"""
    __tablename__ = 'workflows'
    
    # Basic Information
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    status = Column(SQLEnum(WorkflowStatus), default=WorkflowStatus.INACTIVE, nullable=False, index=True)
    
    # Trigger Configuration
    trigger_type = Column(SQLEnum(WorkflowTrigger), nullable=False, index=True)
    trigger_conditions = Column(JSONB)  # Conditions that must be met
    
    # Actions Configuration
    actions = Column(JSONB, nullable=False)  # Array of actions to perform
    
    # Execution Settings
    execution_order = Column(Integer, default=0)
    max_executions = Column(Integer)  # Limit number of times workflow can run
    execution_count = Column(Integer, default=0)
    
    # Ownership
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=True, index=True)
    
    # Dates
    last_executed_at = Column(DateTime)
    
    # Relationships
    owner = relationship('User')
    executions = relationship('WorkflowExecution', back_populates='workflow')
    
    def __repr__(self):
        return f"<Workflow {self.name} - {self.trigger_type}>"


class WorkflowExecution(BaseModel):
    """Workflow Execution Log model"""
    __tablename__ = 'workflow_executions'
    
    workflow_id = Column(UUID(as_uuid=True), ForeignKey('workflows.id'), nullable=False, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=True, index=True)
    
    # Execution Details
    status = Column(String(50), nullable=False, index=True)  # success, failed, partial
    trigger_data = Column(JSONB)  # Data that triggered the workflow
    actions_executed = Column(JSONB)  # Actions that were executed
    
    # Results
    success_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    error_message = Column(Text)
    
    # Timing
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    duration_seconds = Column(Integer)
    
    # Relationships
    workflow = relationship('Workflow', back_populates='executions')
