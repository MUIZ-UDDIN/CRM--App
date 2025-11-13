"""
Billing and subscription management API endpoints with Square integration
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, UUID4, validator, Field, EmailStr
from datetime import datetime, timedelta
import uuid
from decimal import Decimal
import json
import os

from app.core.database import get_db
from app.core.security import get_current_user, get_current_active_user
from app.models import (
    Company, User, SubscriptionPlan, PlanFeature, Subscription, 
    Invoice, Payment, BillingCycle, PaymentMethod, SubscriptionStatus
)
from app.middleware.tenant import require_super_admin, require_company_admin, get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission
from app.services.square_payment import SquarePaymentService

router = APIRouter(prefix="/api/billing", tags=["billing"])

# Initialize Square payment service
square_service = SquarePaymentService(
    access_token=os.getenv("SQUARE_ACCESS_TOKEN"),
    environment=os.getenv("SQUARE_ENVIRONMENT", "sandbox")
)

# Pydantic models
class CardDetails(BaseModel):
    card_number: str
    exp_month: int
    exp_year: int
    cvc: str
    postal_code: Optional[str] = None
    cardholder_name: Optional[str] = None

class PaymentMethodRequest(BaseModel):
    payment_method: PaymentMethod
    card_details: Optional[CardDetails] = None
    billing_name: Optional[str] = None
    billing_address: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_zip: Optional[str] = None
    billing_country: Optional[str] = "US"

class SubscriptionRequest(BaseModel):
    billing_cycle: BillingCycle = BillingCycle.MONTHLY
    payment_method: Optional[PaymentMethodRequest] = None
    auto_renew: bool = True

class SubscriptionResponse(BaseModel):
    id: str
    company_id: str
    plan_name: str
    status: str
    billing_cycle: str
    trial_ends_at: Optional[datetime] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    canceled_at: Optional[datetime] = None
    payment_method: Optional[str] = None
    card_last_4: Optional[str] = None
    card_brand: Optional[str] = None
    auto_renew: bool
    created_at: datetime
    updated_at: datetime
    days_remaining: Optional[int] = None
    monthly_price: Optional[float] = None

    class Config:
        from_attributes = True

class InvoiceResponse(BaseModel):
    id: str
    subscription_id: str
    company_id: str
    amount: float
    currency: str
    status: str
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    invoice_number: str
    invoice_pdf: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PaymentResponse(BaseModel):
    id: str
    invoice_id: str
    company_id: str
    amount: float
    currency: str
    status: str
    payment_method: Optional[str] = None
    payment_provider: Optional[str] = "square"
    card_last_4: Optional[str] = None
    card_brand: Optional[str] = None
    receipt_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Helper functions
def get_or_create_subscription_plan(db: Session) -> SubscriptionPlan:
    """Get or create the default subscription plan"""
    plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.name == "Enterprise Plan"
    ).first()
    
    if not plan:
        # Create the default plan
        plan = SubscriptionPlan(
            name="Enterprise Plan",
            description="Full access to all CRM features",
            monthly_price=Decimal("99.99"),
            annual_price=Decimal("999.99"),  # ~2 months free
            quarterly_price=Decimal("269.97"),  # ~10% discount
            trial_days=14,
            max_users=999999,  # Unlimited
            is_active=True,
            features_json={
                "users": {"value": "Unlimited", "enabled": True},
                "contacts": {"value": "Unlimited", "enabled": True},
                "deals": {"value": "Unlimited", "enabled": True},
                "storage": {"value": "Unlimited", "enabled": True},
                "email_integration": {"value": "Yes", "enabled": True},
                "sms_integration": {"value": "Yes", "enabled": True},
                "call_integration": {"value": "Yes", "enabled": True},
                "automations": {"value": "Yes", "enabled": True},
                "analytics": {"value": "Advanced", "enabled": True},
                "api_access": {"value": "Yes", "enabled": True},
                "support": {"value": "Priority", "enabled": True}
            }
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)
        
        # Add features
        features = [
            PlanFeature(plan_id=plan.id, feature_name="users", feature_value="Unlimited", is_enabled=True),
            PlanFeature(plan_id=plan.id, feature_name="contacts", feature_value="Unlimited", is_enabled=True),
            PlanFeature(plan_id=plan.id, feature_name="deals", feature_value="Unlimited", is_enabled=True),
            PlanFeature(plan_id=plan.id, feature_name="storage", feature_value="Unlimited", is_enabled=True),
            PlanFeature(plan_id=plan.id, feature_name="email_integration", feature_value="Yes", is_enabled=True),
            PlanFeature(plan_id=plan.id, feature_name="sms_integration", feature_value="Yes", is_enabled=True),
            PlanFeature(plan_id=plan.id, feature_name="call_integration", feature_value="Yes", is_enabled=True),
            PlanFeature(plan_id=plan.id, feature_name="automations", feature_value="Yes", is_enabled=True),
            PlanFeature(plan_id=plan.id, feature_name="analytics", feature_value="Advanced", is_enabled=True),
            PlanFeature(plan_id=plan.id, feature_name="api_access", feature_value="Yes", is_enabled=True),
            PlanFeature(plan_id=plan.id, feature_name="support", feature_value="Priority", is_enabled=True)
        ]
        
        for feature in features:
            db.add(feature)
        
        db.commit()
    
    return plan

# Subscription Endpoints
@router.post("/companies/{company_id}/subscription", response_model=SubscriptionResponse)
async def create_company_subscription(
    company_id: UUID4,
    subscription_request: SubscriptionRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Create a subscription for a company (Super Admin only)"""
    if not has_permission(current_user, Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot manage billing"
        )
    
    # Check if company exists
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Check if company already has a subscription
    existing_subscription = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if existing_subscription:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company already has a subscription"
        )
    
    # Get or create the default subscription plan
    plan = get_or_create_subscription_plan(db)
    
    # Calculate trial end date
    now = datetime.utcnow()
    trial_ends_at = now + timedelta(days=plan.trial_days)
    
    # Create subscription
    db_subscription = Subscription(
        company_id=company_id,
        plan_id=plan.id,
        status="trial",
        billing_cycle=subscription_request.billing_cycle,
        trial_ends_at=trial_ends_at,
        current_period_start=now,
        current_period_end=trial_ends_at,
        auto_renew=subscription_request.auto_renew,
        payment_provider="square"
    )
    
    db.add(db_subscription)
    db.commit()
    db.refresh(db_subscription)
    
    # Update company subscription status
    company.subscription_status = "trial"
    company.trial_ends_at = trial_ends_at
    company.plan = plan.name.lower()
    db.commit()
    
    # Process payment method if provided
    if subscription_request.payment_method:
        # In a real implementation, this would integrate with Square.js frontend
        # For now, we'll just store the payment method details
        payment_method = subscription_request.payment_method
        db_subscription.payment_method = payment_method.payment_method
        
        if payment_method.card_details:
            # Mask card number for security
            db_subscription.card_last_4 = payment_method.card_details.card_number[-4:]
            db_subscription.card_brand = "Visa"  # In real implementation, detect brand
            db_subscription.card_exp_month = payment_method.card_details.exp_month
            db_subscription.card_exp_year = payment_method.card_details.exp_year
        
        db.commit()
    
    # Prepare response
    response = SubscriptionResponse(
        id=str(db_subscription.id),
        company_id=str(db_subscription.company_id),
        plan_name=plan.name,
        status=db_subscription.status,
        billing_cycle=db_subscription.billing_cycle,
        trial_ends_at=db_subscription.trial_ends_at,
        current_period_start=db_subscription.current_period_start,
        current_period_end=db_subscription.current_period_end,
        canceled_at=db_subscription.canceled_at,
        payment_method=db_subscription.payment_method,
        card_last_4=db_subscription.card_last_4,
        card_brand=db_subscription.card_brand,
        auto_renew=db_subscription.auto_renew,
        created_at=db_subscription.created_at,
        updated_at=db_subscription.updated_at,
        days_remaining=(trial_ends_at - now).days,
        monthly_price=float(plan.monthly_price)
    )
    
    return response

@router.get("/companies/{company_id}/subscription", response_model=SubscriptionResponse)
async def get_company_subscription(
    company_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get company subscription details"""
    context = get_tenant_context(current_user)
    
    # Check if user can access company
    if not context.can_access_company(str(company_id)) and not has_permission(current_user, Permission.VIEW_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company"
        )
    
    # Get subscription
    subscription = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    # Get plan
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == subscription.plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )
    
    # Calculate days remaining
    now = datetime.utcnow()
    days_remaining = 0
    if subscription.status == "trial" and subscription.trial_ends_at:
        days_remaining = max(0, (subscription.trial_ends_at - now).days)
    elif subscription.current_period_end:
        days_remaining = max(0, (subscription.current_period_end - now).days)
    
    # Prepare response
    response = SubscriptionResponse(
        id=str(subscription.id),
        company_id=str(subscription.company_id),
        plan_name=plan.name,
        status=subscription.status,
        billing_cycle=subscription.billing_cycle,
        trial_ends_at=subscription.trial_ends_at,
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end,
        canceled_at=subscription.canceled_at,
        payment_method=subscription.payment_method,
        card_last_4=subscription.card_last_4,
        card_brand=subscription.card_brand,
        auto_renew=subscription.auto_renew,
        created_at=subscription.created_at,
        updated_at=subscription.updated_at,
        days_remaining=days_remaining,
        monthly_price=float(plan.monthly_price)
    )
    
    return response

@router.post("/companies/{company_id}/subscription/cancel")
async def cancel_company_subscription(
    company_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Cancel company subscription"""
    context = get_tenant_context(current_user)
    
    # Check if user can manage company
    if not context.can_manage_company() and not has_permission(current_user, Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot manage billing"
        )
    
    # Check if user can access company
    if not context.can_access_company(str(company_id)) and not has_permission(current_user, Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company"
        )
    
    # Get subscription
    subscription = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    # Cancel subscription
    subscription.status = "cancelled"
    subscription.canceled_at = datetime.utcnow()
    subscription.auto_renew = False
    
    # Update company subscription status
    company = db.query(Company).filter(Company.id == company_id).first()
    if company:
        company.subscription_status = "cancelled"
    
    db.commit()
    
    return {"message": "Subscription cancelled successfully"}

@router.post("/companies/{company_id}/subscription/activate")
async def activate_company_subscription(
    company_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Activate company subscription after trial or reactivate cancelled subscription"""
    if not has_permission(current_user, Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot manage billing"
        )
    
    # Get subscription
    subscription = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    # Check if payment method exists
    if not subscription.payment_method:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment method required to activate subscription"
        )
    
    # Get plan
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == subscription.plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )
    
    # Calculate next billing date
    now = datetime.utcnow()
    
    if subscription.billing_cycle == BillingCycle.MONTHLY:
        next_billing_date = now + timedelta(days=30)
        amount = plan.monthly_price
    elif subscription.billing_cycle == BillingCycle.QUARTERLY:
        next_billing_date = now + timedelta(days=90)
        amount = plan.quarterly_price
    else:  # Annual
        next_billing_date = now + timedelta(days=365)
        amount = plan.annual_price
    
    # Update subscription
    subscription.status = "active"
    subscription.current_period_start = now
    subscription.current_period_end = next_billing_date
    subscription.canceled_at = None
    subscription.auto_renew = True
    
    # Update company subscription status
    company = db.query(Company).filter(Company.id == company_id).first()
    if company:
        company.subscription_status = "active"
        company.next_billing_date = next_billing_date
    
    db.commit()
    
    # Create invoice
    invoice = Invoice(
        subscription_id=subscription.id,
        company_id=company_id,
        amount=amount,
        currency="USD",
        status="paid",  # Assume payment is processed immediately
        due_date=now,
        paid_at=now,
        invoice_number=f"INV-{uuid.uuid4().hex[:8].upper()}",
        billing_reason="subscription_create"
    )
    
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    
    # Create payment record
    payment = Payment(
        invoice_id=invoice.id,
        company_id=company_id,
        amount=amount,
        currency="USD",
        status="succeeded",
        payment_method=subscription.payment_method,
        payment_provider="square",
        card_last_4=subscription.card_last_4,
        card_brand=subscription.card_brand
    )
    
    db.add(payment)
    db.commit()
    
    return {
        "message": "Subscription activated successfully",
        "subscription_id": str(subscription.id),
        "status": subscription.status,
        "current_period_end": subscription.current_period_end,
        "invoice_id": str(invoice.id)
    }

@router.post("/companies/{company_id}/payment-methods")
async def add_payment_method(
    company_id: UUID4,
    payment_method: PaymentMethodRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Add a payment method to a company"""
    context = get_tenant_context(current_user)
    
    # Check if user can manage company
    if not context.can_manage_company() and not has_permission(current_user, Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot manage billing"
        )
    
    # Check if user can access company
    if not context.can_access_company(str(company_id)) and not has_permission(current_user, Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company"
        )
    
    # Get subscription
    subscription = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if not subscription:
        # Create a subscription if it doesn't exist
        plan = get_or_create_subscription_plan(db)
        
        # Calculate trial end date
        now = datetime.utcnow()
        trial_ends_at = now + timedelta(days=plan.trial_days)
        
        subscription = Subscription(
            company_id=company_id,
            plan_id=plan.id,
            status="trial",
            billing_cycle=BillingCycle.MONTHLY,
            trial_ends_at=trial_ends_at,
            current_period_start=now,
            current_period_end=trial_ends_at,
            auto_renew=True,
            payment_provider="square"
        )
        
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
        
        # Update company subscription status
        company = db.query(Company).filter(Company.id == company_id).first()
        if company:
            company.subscription_status = "trial"
            company.trial_ends_at = trial_ends_at
            company.plan = plan.name.lower()
            db.commit()
    
    # Update subscription with payment method
    subscription.payment_method = payment_method.payment_method
    
    # If credit card, store last 4 digits and brand
    if payment_method.payment_method == PaymentMethod.CREDIT_CARD and payment_method.card_details:
        subscription.card_last_4 = payment_method.card_details.card_number[-4:]
        subscription.card_brand = "Visa"  # In a real implementation, detect the brand
        subscription.card_exp_month = payment_method.card_details.exp_month
        subscription.card_exp_year = payment_method.card_details.exp_year
    
    db.commit()
    
    return {"message": "Payment method added successfully"}

# Invoice Endpoints
@router.get("/companies/{company_id}/invoices", response_model=List[InvoiceResponse])
async def list_company_invoices(
    company_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """List all invoices for a company"""
    context = get_tenant_context(current_user)
    
    # Check if user can access company
    if not context.can_access_company(str(company_id)) and not has_permission(current_user, Permission.VIEW_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company"
        )
    
    # Get invoices
    invoices = db.query(Invoice).filter(Invoice.company_id == company_id).order_by(Invoice.created_at.desc()).all()
    
    # Convert to response models
    response = []
    for invoice in invoices:
        response.append(InvoiceResponse(
            id=str(invoice.id),
            subscription_id=str(invoice.subscription_id),
            company_id=str(invoice.company_id),
            amount=float(invoice.amount),
            currency=invoice.currency,
            status=invoice.status,
            due_date=invoice.due_date,
            paid_at=invoice.paid_at,
            invoice_number=invoice.invoice_number,
            invoice_pdf=invoice.invoice_pdf,
            created_at=invoice.created_at,
            updated_at=invoice.updated_at
        ))
    
    return response

@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get invoice details"""
    # Get invoice
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    context = get_tenant_context(current_user)
    
    # Check if user can access company
    if not context.can_access_company(str(invoice.company_id)) and not has_permission(current_user, Permission.VIEW_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this invoice"
        )
    
    return InvoiceResponse(
        id=str(invoice.id),
        subscription_id=str(invoice.subscription_id),
        company_id=str(invoice.company_id),
        amount=float(invoice.amount),
        currency=invoice.currency,
        status=invoice.status,
        due_date=invoice.due_date,
        paid_at=invoice.paid_at,
        invoice_number=invoice.invoice_number,
        invoice_pdf=invoice.invoice_pdf,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at
    )

# Payment Endpoints
@router.get("/companies/{company_id}/payments", response_model=List[PaymentResponse])
async def list_company_payments(
    company_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """List all payments for a company"""
    context = get_tenant_context(current_user)
    
    # Check if user can access company
    if not context.can_access_company(str(company_id)) and not has_permission(current_user, Permission.VIEW_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company"
        )
    
    # Get payments
    payments = db.query(Payment).filter(Payment.company_id == company_id).order_by(Payment.created_at.desc()).all()
    
    # Convert to response models
    response = []
    for payment in payments:
        response.append(PaymentResponse(
            id=str(payment.id),
            invoice_id=str(payment.invoice_id),
            company_id=str(payment.company_id),
            amount=float(payment.amount),
            currency=payment.currency,
            status=payment.status,
            payment_method=payment.payment_method,
            payment_provider=payment.payment_provider,
            card_last_4=payment.card_last_4,
            card_brand=payment.card_brand,
            receipt_url=payment.receipt_url,
            created_at=payment.created_at
        ))
    
    return response

# Trial Management Endpoints
@router.post("/companies/{company_id}/trial/extend")
async def extend_company_trial(
    company_id: UUID4,
    days: int = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Extend company trial period (Super Admin only)"""
    if not has_permission(current_user, Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot manage billing"
        )
    
    # Get subscription
    subscription = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    # Check if subscription is in trial
    if subscription.status != "trial":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subscription is not in trial period"
        )
    
    # Extend trial
    if subscription.trial_ends_at:
        subscription.trial_ends_at += timedelta(days=days)
        subscription.current_period_end = subscription.trial_ends_at
    else:
        now = datetime.utcnow()
        subscription.trial_ends_at = now + timedelta(days=days)
        subscription.current_period_end = subscription.trial_ends_at
    
    # Update company trial end date
    company = db.query(Company).filter(Company.id == company_id).first()
    if company:
        company.trial_ends_at = subscription.trial_ends_at
    
    db.commit()
    
    return {
        "message": f"Trial extended by {days} days",
        "new_trial_end_date": subscription.trial_ends_at
    }

# Dashboard Endpoints for Super Admin
@router.get("/dashboard")
async def billing_dashboard(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get billing dashboard data (Super Admin only)"""
    if not has_permission(current_user, Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot access billing dashboard"
        )
    
    # Get counts
    total_companies = db.query(Company).count()
    active_subscriptions = db.query(Subscription).filter(Subscription.status == "active").count()
    trial_subscriptions = db.query(Subscription).filter(Subscription.status == "trial").count()
    cancelled_subscriptions = db.query(Subscription).filter(Subscription.status == "cancelled").count()
    
    # Get revenue
    total_revenue = db.query(Payment).filter(Payment.status == "succeeded").count()
    
    # Get plan
    plan = get_or_create_subscription_plan(db)
    
    # Get upcoming trials ending
    now = datetime.utcnow()
    upcoming_trial_ends = db.query(Subscription).filter(
        Subscription.status == "trial",
        Subscription.trial_ends_at > now,
        Subscription.trial_ends_at <= now + timedelta(days=7)
    ).all()
    
    upcoming_trials = []
    for sub in upcoming_trial_ends:
        company = db.query(Company).filter(Company.id == sub.company_id).first()
        if company:
            upcoming_trials.append({
                "company_id": str(sub.company_id),
                "company_name": company.name,
                "trial_ends_at": sub.trial_ends_at,
                "days_remaining": (sub.trial_ends_at - now).days
            })
    
    return {
        "total_companies": total_companies,
        "subscription_stats": {
            "active": active_subscriptions,
            "trial": trial_subscriptions,
            "cancelled": cancelled_subscriptions
        },
        "plan_details": {
            "name": plan.name,
            "monthly_price": float(plan.monthly_price),
            "annual_price": float(plan.annual_price),
            "quarterly_price": float(plan.quarterly_price),
            "trial_days": plan.trial_days
        },
        "total_revenue": total_revenue,
        "upcoming_trial_ends": upcoming_trials
    }
