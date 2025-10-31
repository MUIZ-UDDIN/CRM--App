"""
Company model for multi-tenant SaaS
"""

from sqlalchemy import Column, String, Enum, ForeignKey, DECIMAL, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from datetime import datetime, timedelta
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


class SubscriptionStatus(str, enum.Enum):
    """Subscription status for trial and payment tracking"""
    TRIAL = "trial"
    ACTIVE = "active"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


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
    
    # Billing & Subscription (Square Integration)
    stripe_customer_id = Column(String(255))  # Legacy - keeping for backward compatibility
    square_customer_id = Column(String(255))  # Square payment gateway customer ID
    subscription_status = Column(String(50), default='trial', nullable=False)  # trial, active, expired, suspended, cancelled
    trial_ends_at = Column(TIMESTAMP)  # 14-day trial expiration
    monthly_price = Column(DECIMAL(10, 2), default=0.00)  # Monthly subscription price
    last_payment_date = Column(TIMESTAMP)  # Last successful payment
    next_billing_date = Column(TIMESTAMP)  # Next billing cycle
    subscription_ends_at = Column(String)  # Legacy - keeping for backward compatibility
    
    # Integrations (company-level)
    twilio_account_sid = Column(String(255))
    twilio_auth_token = Column(String(255))
    sendgrid_api_key = Column(String(255))
    
    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))  # Super Admin who created it
    
    # Relationships
    users = relationship('User', back_populates='company', foreign_keys='User.company_id')
    # contacts = relationship('Contact', back_populates='company')
    # deals = relationship('Deal', back_populates='company')
    # activities = relationship('Activity', back_populates='company')
    
    def is_trial_active(self) -> bool:
        """Check if trial period is still active"""
        if self.subscription_status != 'trial':
            return False
        if not self.trial_ends_at:
            return False
        return datetime.utcnow() < self.trial_ends_at
    
    def is_subscription_active(self) -> bool:
        """Check if company has active subscription (trial or paid)"""
        if self.subscription_status == 'active':
            return True
        if self.subscription_status == 'trial':
            return self.is_trial_active()
        return False
    
    def days_until_trial_ends(self) -> int:
        """Get number of days remaining in trial"""
        if not self.trial_ends_at or self.subscription_status != 'trial':
            return 0
        delta = self.trial_ends_at - datetime.utcnow()
        return max(0, delta.days)
    
    def __repr__(self):
        return f"<Company {self.name}>"
