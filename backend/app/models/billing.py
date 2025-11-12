"""
Billing and subscription models for CRM
"""

from sqlalchemy import Column, String, ForeignKey, DECIMAL, TIMESTAMP, Text, Integer, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timedelta
import enum
from .base import BaseModel


class BillingCycle(str, enum.Enum):
    """Billing cycle types"""
    MONTHLY = "monthly"
    ANNUAL = "annual"
    QUARTERLY = "quarterly"


class PaymentMethod(str, enum.Enum):
    """Payment method types"""
    CREDIT_CARD = "credit_card"
    ACH = "ach"
    WIRE = "wire"
    CHECK = "check"
    PAYPAL = "paypal"


class PlanFeature(BaseModel):
    """Plan features and limits"""
    __tablename__ = 'plan_features'
    
    plan_id = Column(UUID(as_uuid=True), ForeignKey('subscription_plans.id', ondelete='CASCADE'), nullable=False)
    feature_name = Column(String(100), nullable=False)
    feature_value = Column(String(255), nullable=False)
    is_enabled = Column(Boolean, default=True)
    
    # Relationship
    plan = relationship('SubscriptionPlan', back_populates='features')
    
    def __repr__(self):
        return f"<PlanFeature {self.feature_name}: {self.feature_value}>"


class SubscriptionPlan(BaseModel):
    """Subscription plan model"""
    __tablename__ = 'subscription_plans'
    
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    monthly_price = Column(DECIMAL(10, 2), nullable=False)
    annual_price = Column(DECIMAL(10, 2), nullable=False)
    quarterly_price = Column(DECIMAL(10, 2), nullable=False)
    trial_days = Column(Integer, default=14)
    max_users = Column(Integer, default=5)
    is_active = Column(Boolean, default=True)
    features_json = Column(JSON)  # For quick access to features
    
    # Relationships
    features = relationship('PlanFeature', back_populates='plan', cascade='all, delete-orphan')
    subscriptions = relationship('Subscription', back_populates='plan')
    
    def __repr__(self):
        return f"<SubscriptionPlan {self.name} - ${self.monthly_price}/month>"


class Subscription(BaseModel):
    """Subscription model"""
    __tablename__ = 'subscriptions'
    
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, unique=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey('subscription_plans.id'), nullable=False)
    status = Column(String(50), default='trial', nullable=False)  # trial, active, expired, suspended, cancelled
    billing_cycle = Column(String(20), default='monthly', nullable=False)
    trial_ends_at = Column(TIMESTAMP)
    current_period_start = Column(TIMESTAMP)
    current_period_end = Column(TIMESTAMP)
    canceled_at = Column(TIMESTAMP)
    payment_method = Column(String(50))
    payment_provider = Column(String(50), default='square')
    payment_provider_id = Column(String(255))  # ID from payment provider
    card_last_4 = Column(String(4))
    card_brand = Column(String(50))
    card_exp_month = Column(Integer)
    card_exp_year = Column(Integer)
    auto_renew = Column(Boolean, default=True)
    
    # Relationships
    company = relationship('Company', backref='subscription')
    plan = relationship('SubscriptionPlan', back_populates='subscriptions')
    invoices = relationship('Invoice', back_populates='subscription')
    
    def is_active(self) -> bool:
        """Check if subscription is active"""
        if self.status == 'active':
            return True
        if self.status == 'trial' and self.trial_ends_at and datetime.utcnow() < self.trial_ends_at:
            return True
        return False
    
    def days_remaining(self) -> int:
        """Get days remaining in current period"""
        if not self.current_period_end:
            return 0
        delta = self.current_period_end - datetime.utcnow()
        return max(0, delta.days)
    
    def __repr__(self):
        return f"<Subscription {self.company_id} - {self.status}>"


class Invoice(BaseModel):
    """Invoice model"""
    __tablename__ = 'invoices'
    
    subscription_id = Column(UUID(as_uuid=True), ForeignKey('subscriptions.id', ondelete='CASCADE'), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(String(3), default='USD')
    status = Column(String(50), nullable=False)  # draft, open, paid, void, uncollectible
    due_date = Column(TIMESTAMP)
    paid_at = Column(TIMESTAMP)
    invoice_number = Column(String(50), unique=True)
    invoice_pdf = Column(String(255))
    billing_reason = Column(String(50))  # subscription_create, subscription_cycle, etc.
    
    # Relationships
    subscription = relationship('Subscription', back_populates='invoices')
    company = relationship('Company', backref='invoices')
    payments = relationship('Payment', back_populates='invoice')
    
    def __repr__(self):
        return f"<Invoice {self.invoice_number} - ${self.amount} - {self.status}>"


class Payment(BaseModel):
    """Payment model"""
    __tablename__ = 'payments'
    
    invoice_id = Column(UUID(as_uuid=True), ForeignKey('invoices.id', ondelete='CASCADE'), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(String(3), default='USD')
    status = Column(String(50), nullable=False)  # succeeded, pending, failed
    payment_method = Column(String(50))
    payment_provider = Column(String(50), default='square')
    payment_provider_id = Column(String(255))
    card_last_4 = Column(String(4))
    card_brand = Column(String(50))
    receipt_url = Column(String(255))
    failure_message = Column(Text)
    
    # Relationships
    invoice = relationship('Invoice', back_populates='payments')
    company = relationship('Company', backref='payments')
    
    def __repr__(self):
        return f"<Payment {self.id} - ${self.amount} - {self.status}>"
