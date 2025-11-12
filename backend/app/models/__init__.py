"""
Database models package
All models are imported here to ensure they are registered with SQLAlchemy
"""

from .base import Base, BaseModel

# Core models
from .companies import Company, PlanType, CompanyStatus, SubscriptionStatus
from .users import User, Role, Team, user_roles, UserRole, UserStatus
from .payment_history import PaymentHistory
from .billing import SubscriptionPlan, PlanFeature, Subscription, Invoice, Payment, BillingCycle, PaymentMethod
from .contacts import Contact, ContactStatus, LeadSource
from .deals import Deal, Pipeline, PipelineStage, DealStatus
from .activities import Activity, ActivityType, ActivityStatus
from .emails import Email, EmailTemplate, EmailCampaign, EmailStatus
from .sms import SMSMessage, SMSDirection, SMSStatus
from .sms_templates import SMSTemplate
from .scheduled_sms import ScheduledSMS
from .phone_numbers import PhoneNumber
from .calls import Call, CallDirection, CallStatus
from .documents import Document, DocumentSignature, DocumentType, DocumentStatus
from .workflows import Workflow, WorkflowExecution, WorkflowStatus, WorkflowTrigger
from .files import File, Folder
from .notifications import Notification, NotificationType
from .quotes import Quote, QuoteStatus
from .security import AuditLog, SecurityLog, Session, AuditAction, SecurityEventType
from .twilio_settings import TwilioSettings
from .conversations import UserConversation
from .call_transcripts import CallTranscript
from .email_campaigns import BulkEmailCampaign, BulkEmailAnalytics
from .performance_alerts import PerformanceAlert

# Analytics models (materialized views / aggregation tables)
from .analytics import (
    PipelineMetrics,
    ActivityMetrics,
    EmailMetrics,
    CallMetrics,
    ContactMetrics,
    DocumentMetrics,
    RevenueMetrics,
    MessageAnalytics,
    NumberPerformanceStats
)

# Export all models
__all__ = [
    # Base
    'Base',
    'BaseModel',
    
    # Companies
    'Company',
    'PlanType',
    'CompanyStatus',
    'SubscriptionStatus',
    'PaymentHistory',
    
    # Billing
    'SubscriptionPlan',
    'PlanFeature',
    'Subscription',
    'Invoice',
    'Payment',
    'BillingCycle',
    'PaymentMethod',
    
    # Users & Auth
    'User',
    'Role',
    'Team',
    'user_roles',
    'UserRole',
    'UserStatus',
    
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
    'SMSTemplate',
    'ScheduledSMS',
    'PhoneNumber',
    
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
    'MessageAnalytics',
    'NumberPerformanceStats',
    
    # Twilio & Communications
    'TwilioSettings',
    'UserConversation',
    'CallTranscript',
    'BulkEmailCampaign',
    'BulkEmailAnalytics',
    'PerformanceAlert',
]