"""
Company model for multi-tenant SaaS
"""

from sqlalchemy import Column, String, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from .base import BaseModel


class PlanType(str, enum.Enum):
    """Subscription plan types"""
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class CompanyStatus(str, enum.Enum):
    """Company status"""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING = "pending"


class Company(BaseModel):
    """
    Company/Tenant model for multi-tenant SaaS
    Each company operates in isolation
    """
    __tablename__ = 'companies'
    
    name = Column(String(255), nullable=False, index=True)
    plan = Column(String(50), default='free', nullable=False)
    status = Column(String(50), default='active', nullable=False)
    
    # Company settings
    domain = Column(String(255), unique=True)  # Custom domain (e.g., acme.yourcrm.com)
    logo_url = Column(String(500))
    timezone = Column(String(50), default='UTC')
    currency = Column(String(10), default='USD')
    
    # Billing
    stripe_customer_id = Column(String(255))
    subscription_ends_at = Column(String)
    
    # Integrations (company-level)
    twilio_account_sid = Column(String(255))
    twilio_auth_token = Column(String(255))
    sendgrid_api_key = Column(String(255))
    
    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))  # Super Admin who created it
    
    # Relationships
    users = relationship('User', back_populates='company', foreign_keys='User.company_id')
    contacts = relationship('Contact', back_populates='company')
    deals = relationship('Deal', back_populates='company')
    activities = relationship('Activity', back_populates='company')
    
    def __repr__(self):
        return f"<Company {self.name}>"
