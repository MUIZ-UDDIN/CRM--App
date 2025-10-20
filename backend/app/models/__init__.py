"""
Database models package
All models are imported here to ensure they are registered with SQLAlchemy
"""

from .base import Base, BaseModel

# Core models
from .users import User, Role, Team, user_roles
from .contacts import Contact, ContactStatus, LeadSource
from .deals import Deal, Pipeline, PipelineStage, DealStatus
from .activities import Activity, ActivityType, ActivityStatus
from .emails import Email, EmailTemplate, EmailCampaign, EmailStatus
from .sms import SMSMessage, SMSDirection, SMSStatus
from .calls import Call, CallDirection, CallStatus
from .documents import Document, DocumentSignature, DocumentType, DocumentStatus
from .workflows import Workflow, WorkflowExecution, WorkflowStatus, WorkflowTrigger
from .files import File, Folder
from .notifications import Notification, NotificationType
from .quotes import Quote, QuoteStatus
from .security import AuditLog, SecurityLog, Session, AuditAction, SecurityEventType
from .twilio_settings import TwilioSettings

# Analytics models (materialized views / aggregation tables)
from .analytics import (
    PipelineMetrics,
    ActivityMetrics,
    EmailMetrics,
    CallMetrics,
    ContactMetrics,
    DocumentMetrics,
    RevenueMetrics
)

# Export all models
__all__ = [
    # Base
    'Base',
    'BaseModel',
    
    # Users & Auth
    'User',
    'Role',
    'Team',
    'user_roles',
    
    # Contacts
    'Contact',
    'ContactStatus',
    'LeadSource',
    
    # Deals & Pipeline
    'Deal',
    'Pipeline',
    'PipelineStage',
    'DealStatus',
    
    # Activities
    'Activity',
    'ActivityType',
    'ActivityStatus',
    
    # Emails
    'Email',
    'EmailTemplate',
    'EmailCampaign',
    'EmailStatus',
    
    # SMS
    'SMSMessage',
    'SMSDirection',
    'SMSStatus',
    
    # Calls
    'Call',
    'CallDirection',
    'CallStatus',
    
    # Documents
    'Document',
    'DocumentSignature',
    'DocumentType',
    'DocumentStatus',
    
    # Workflows
    'Workflow',
    'WorkflowExecution',
    'WorkflowStatus',
    'WorkflowTrigger',
    
    # Files
    'File',
    'Folder',
    
    # Notifications
    'Notification',
    'NotificationType',
    
    # Quotes
    'Quote',
    'QuoteStatus',
    
    # Security
    'AuditLog',
    'SecurityLog',
    'Session',
    'AuditAction',
    'SecurityEventType',
    
    # Analytics
    'PipelineMetrics',
    'ActivityMetrics',
    'EmailMetrics',
    'CallMetrics',
    'ContactMetrics',
    'DocumentMetrics',
    'RevenueMetrics',
    
    # Twilio
    'TwilioSettings',
]