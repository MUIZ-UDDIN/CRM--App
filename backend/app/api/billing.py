"""
Billing and subscription management API endpoints
Updated: 2025-11-16
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, UUID4, validator, Field
from datetime import datetime, timedelta
import uuid
from decimal import Decimal

from app.core.database import get_db
from app.core.security import get_current_user, get_current_active_user
from app.models import (
    Company, User, SubscriptionPlan, PlanFeature, Subscription, 
    Invoice, Payment, BillingCycle, PaymentMethod
)
from app.middleware.tenant import require_super_admin, require_company_admin, get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

router = APIRouter(prefix="/api/billing", tags=["billing"])


# Pydantic models
class PlanFeatureCreate(BaseModel):
    feature_name: str
    feature_value: str
    is_enabled: bool = True


class PlanFeatureResponse(PlanFeatureCreate):
    id: UUID4
    plan_id: UUID4
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SubscriptionPlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    monthly_price: Decimal = Field(..., ge=0)
    annual_price: Decimal = Field(..., ge=0)
    quarterly_price: Decimal = Field(..., ge=0)
    trial_days: int = 14
    max_users: int = 5
    is_active: bool = True
    features: List[PlanFeatureCreate] = []


class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    monthly_price: Optional[Decimal] = Field(None, ge=0)
    annual_price: Optional[Decimal] = Field(None, ge=0)
    quarterly_price: Optional[Decimal] = Field(None, ge=0)
    trial_days: Optional[int] = None
    max_users: Optional[int] = None
    is_active: Optional[bool] = None


class PlanPriceUpdate(BaseModel):
    monthly_price: float = Field(..., ge=0, description="New monthly price for the plan")


class SubscriptionPlanResponse(BaseModel):
    id: UUID4
    name: str
    description: Optional[str] = None
    monthly_price: Decimal
    annual_price: Decimal
    quarterly_price: Decimal
    trial_days: int
    max_users: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    features: List[PlanFeatureResponse] = []

    @validator('id', 'monthly_price', 'annual_price', 'quarterly_price', pre=True)
    def convert_types(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v

    class Config:
        from_attributes = True


class SubscriptionCreate(BaseModel):
    plan_id: UUID4
    billing_cycle: BillingCycle = BillingCycle.MONTHLY
    payment_method: Optional[PaymentMethod] = None
    auto_renew: bool = True


class SubscriptionUpdate(BaseModel):
    plan_id: Optional[UUID4] = None
    billing_cycle: Optional[BillingCycle] = None
    payment_method: Optional[PaymentMethod] = None
    auto_renew: Optional[bool] = None
    status: Optional[str] = None


class SubscriptionResponse(BaseModel):
    id: UUID4
    company_id: UUID4
    plan_id: UUID4
    plan_name: Optional[str] = None
    status: str
    billing_cycle: str
    trial_ends_at: Optional[datetime] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    canceled_at: Optional[datetime] = None
    payment_method: Optional[str] = None
    payment_provider: Optional[str] = None
    card_last_4: Optional[str] = None
    card_brand: Optional[str] = None
    auto_renew: bool
    created_at: datetime
    updated_at: datetime
    days_remaining: Optional[int] = None

    @validator('id', 'company_id', 'plan_id', pre=True)
    def convert_uuid(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    id: UUID4
    subscription_id: UUID4
    company_id: UUID4
    amount: Decimal
    currency: str
    status: str
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    invoice_number: str
    invoice_pdf: Optional[str] = None
    billing_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @validator('id', 'subscription_id', 'company_id', 'amount', pre=True)
    def convert_types(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v

    class Config:
        from_attributes = True


class PaymentResponse(BaseModel):
    id: UUID4
    invoice_id: UUID4
    company_id: UUID4
    amount: Decimal
    currency: str
    status: str
    payment_method: Optional[str] = None
    payment_provider: Optional[str] = None
    card_last_4: Optional[str] = None
    card_brand: Optional[str] = None
    receipt_url: Optional[str] = None
    created_at: datetime

    @validator('id', 'invoice_id', 'company_id', 'amount', pre=True)
    def convert_types(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v

    class Config:
        from_attributes = True


class PaymentMethodCreate(BaseModel):
    payment_method: PaymentMethod
    card_number: Optional[str] = None
    card_exp_month: Optional[int] = None
    card_exp_year: Optional[int] = None
    card_cvc: Optional[str] = None
    billing_name: Optional[str] = None
    billing_address: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_zip: Optional[str] = None
    billing_country: Optional[str] = None


# Subscription Plan Endpoints (Super Admin only)
@router.post("/plans", response_model=SubscriptionPlanResponse)
async def create_subscription_plan(
    plan: SubscriptionPlanCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new subscription plan (Super Admin only)"""
    if not has_permission(current_user, Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot manage billing"
        )
    
    # Create features JSON for quick access
    features_json = {
        feature.feature_name: {
            "value": feature.feature_value,
            "enabled": feature.is_enabled
        }
        for feature in plan.features
    }
    
    # Create plan
    db_plan = SubscriptionPlan(
        name=plan.name,
        description=plan.description,
        monthly_price=plan.monthly_price,
        annual_price=plan.annual_price,
        quarterly_price=plan.quarterly_price,
        trial_days=plan.trial_days,
        max_users=plan.max_users,
        is_active=plan.is_active,
        features_json=features_json
    )
    
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    
    # Create features
    for feature in plan.features:
        db_feature = PlanFeature(
            plan_id=db_plan.id,
            feature_name=feature.feature_name,
            feature_value=feature.feature_value,
            is_enabled=feature.is_enabled
        )
        db.add(db_feature)
    
    db.commit()
    db.refresh(db_plan)
    
    return db_plan


@router.get("/plans", response_model=List[SubscriptionPlanResponse])
async def list_subscription_plans(
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """List all subscription plans"""
    query = db.query(SubscriptionPlan)
    
    if active_only:
        query = query.filter(SubscriptionPlan.is_active == True)
    
    plans = query.all()
    return plans


@router.get("/plans/current-price")
async def get_current_plan_price(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get the current monthly price for the active plan"""
    # Get the first active plan (assuming single plan model)
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.is_active == True).first()
    if not plan:
        # Return default price if no plan exists yet
        return {"monthly_price": 50.00}
    
    return {"monthly_price": float(plan.monthly_price)}


@router.patch("/plans/update-price")
async def update_plan_price(
    price_update: PlanPriceUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Update the monthly price for the plan (Super Admin only)"""
    if not has_permission(current_user, Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )
    
    # Get the first active plan (assuming single plan model)
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.is_active == True).first()
    if not plan:
        raise HTTPException(status_code=404, detail="No active plan found")
    
    plan.monthly_price = Decimal(str(price_update.monthly_price))
    plan.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(plan)
    
    return {"message": "Plan price updated successfully", "new_price": float(plan.monthly_price)}


@router.get("/plans/{plan_id}", response_model=SubscriptionPlanResponse)
async def get_subscription_plan(
    plan_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get subscription plan details"""
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )
    
    return plan


@router.put("/plans/{plan_id}", response_model=SubscriptionPlanResponse)
async def update_subscription_plan(
    plan_id: UUID4,
    plan_update: SubscriptionPlanUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Update subscription plan (Super Admin only)"""
    if not has_permission(current_user, Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot manage billing"
        )
    
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )
    
    # Update fields
    update_data = plan_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(plan, field, value)
    
    db.commit()
    db.refresh(plan)
    
    return plan


@router.delete("/plans/{plan_id}")
async def delete_subscription_plan(
    plan_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Delete subscription plan (Super Admin only)"""
    if not has_permission(current_user, Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot manage billing"
        )
    
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )
    
    # Check if plan is in use
    subscriptions = db.query(Subscription).filter(Subscription.plan_id == plan_id).count()
    if subscriptions > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete plan that is in use by {subscriptions} subscriptions"
        )
    
    db.delete(plan)
    db.commit()
    
    return {"message": "Subscription plan deleted successfully"}


# Company Subscription Endpoints
@router.post("/companies/{company_id}/subscription", response_model=SubscriptionResponse)
async def create_company_subscription(
    company_id: UUID4,
    subscription: SubscriptionCreate,
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
    
    # Check if plan exists
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == subscription.plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found"
        )
    
    # Check if company already has a subscription
    existing_subscription = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if existing_subscription:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company already has a subscription"
        )
    
    # Calculate trial end date
    now = datetime.utcnow()
    trial_ends_at = now + timedelta(days=plan.trial_days)
    
    # Create subscription
    db_subscription = Subscription(
        company_id=company_id,
        plan_id=subscription.plan_id,
        status="trial",
        billing_cycle=subscription.billing_cycle,
        trial_ends_at=trial_ends_at,
        current_period_start=now,
        current_period_end=trial_ends_at,
        payment_method=subscription.payment_method,
        auto_renew=subscription.auto_renew
    )
    
    db.add(db_subscription)
    db.commit()
    db.refresh(db_subscription)
    
    # Update company subscription status
    company.subscription_status = "trial"
    company.trial_ends_at = trial_ends_at
    company.plan = plan.name.lower()
    db.commit()
    
    # Add plan name to response
    db_subscription.plan_name = plan.name
    db_subscription.days_remaining = (trial_ends_at - now).days
    
    return db_subscription


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
    
    # Get plan name
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == subscription.plan_id).first()
    if plan:
        subscription.plan_name = plan.name
    
    # Calculate days remaining
    if subscription.current_period_end:
        now = datetime.utcnow()
        subscription.days_remaining = max(0, (subscription.current_period_end - now).days)
    
    return subscription


@router.put("/companies/{company_id}/subscription", response_model=SubscriptionResponse)
async def update_company_subscription(
    company_id: UUID4,
    subscription_update: SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Update company subscription (Super Admin only)"""
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
    
    # Check if plan exists if changing plan
    if subscription_update.plan_id:
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == subscription_update.plan_id).first()
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription plan not found"
            )
    
    # Update fields
    update_data = subscription_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subscription, field, value)
    
    # If status is changing to canceled, set canceled_at
    if subscription_update.status == "cancelled" and not subscription.canceled_at:
        subscription.canceled_at = datetime.utcnow()
    
    db.commit()
    db.refresh(subscription)
    
    # Update company subscription status if needed
    company = db.query(Company).filter(Company.id == company_id).first()
    if company and subscription_update.status:
        company.subscription_status = subscription_update.status
        if subscription_update.plan_id:
            plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == subscription_update.plan_id).first()
            if plan:
                company.plan = plan.name.lower()
        db.commit()
    
    # Get plan name for response
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == subscription.plan_id).first()
    if plan:
        subscription.plan_name = plan.name
    
    # Calculate days remaining
    if subscription.current_period_end:
        now = datetime.utcnow()
        subscription.days_remaining = max(0, (subscription.current_period_end - now).days)
    
    return subscription


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
    return invoices


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
    
    return invoice


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
    return payments


@router.post("/companies/{company_id}/payment-methods")
async def add_payment_method(
    company_id: UUID4,
    payment_method: PaymentMethodCreate,
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    # In a real implementation, you would integrate with a payment processor like Stripe or Square
    # For this demo, we'll just update the subscription with the payment method details
    
    # Update subscription with payment method
    subscription.payment_method = payment_method.payment_method
    
    # If credit card, store last 4 digits and brand
    if payment_method.payment_method == PaymentMethod.CREDIT_CARD and payment_method.card_number:
        subscription.card_last_4 = payment_method.card_number[-4:]
        subscription.card_brand = "Visa"  # In a real implementation, detect the brand
        subscription.card_exp_month = payment_method.card_exp_month
        subscription.card_exp_year = payment_method.card_exp_year
    
    db.commit()
    
    return {"message": "Payment method added successfully"}


# Dashboard Endpoints
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
    
    # Get plans
    plans = db.query(SubscriptionPlan).filter(SubscriptionPlan.is_active == True).all()
    plan_counts = {}
    for plan in plans:
        count = db.query(Subscription).filter(Subscription.plan_id == plan.id).count()
        plan_counts[plan.name] = count
    
    return {
        "total_companies": total_companies,
        "subscription_stats": {
            "active": active_subscriptions,
            "trial": trial_subscriptions,
            "cancelled": cancelled_subscriptions
        },
        "total_revenue": total_revenue,
        "plan_distribution": plan_counts
    }


@router.get("/subscriptions/all")
async def get_all_subscriptions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get all company subscriptions (Super Admin only)"""
    if not has_permission(current_user, Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )
    
    subscriptions = db.query(Subscription).join(Company).join(SubscriptionPlan).all()
    
    result = []
    for sub in subscriptions:
        # Get user count for the company
        user_count = db.query(User).filter(User.company_id == sub.company_id).count()
        
        result.append({
            "id": str(sub.id),
            "company_id": str(sub.company_id),
            "company_name": sub.company.name,
            "plan_name": sub.plan.name,
            "status": sub.status,
            "billing_cycle": sub.billing_cycle,
            "monthly_price": float(sub.plan.monthly_price),
            "user_count": user_count,
            "total_amount": float(sub.plan.monthly_price) * user_count,
            "current_period_start": sub.current_period_start.isoformat() if sub.current_period_start else None,
            "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
            "trial_ends_at": sub.trial_ends_at.isoformat() if sub.trial_ends_at else None,
            "card_last_4": sub.card_last_4,
            "card_brand": sub.card_brand,
            "auto_renew": sub.auto_renew,
            "payment_provider": sub.payment_provider
        })
    
    return result


@router.post("/subscriptions/{subscription_id}/suspend")
async def suspend_subscription(
    subscription_id: str,
    reason: str = "Suspended by admin",
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Suspend a subscription (Super Admin only)"""
    if not has_permission(current_user, Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )
    
    # Try to find subscription by ID, if not found, try to find by company_id
    try:
        subscription = db.query(Subscription).filter(Subscription.id == uuid.UUID(subscription_id)).first()
    except ValueError:
        # subscription_id might be company_id
        subscription = db.query(Subscription).filter(Subscription.company_id == uuid.UUID(subscription_id)).first()
    
    if not subscription:
        # If no subscription exists, just suspend the company directly
        company = db.query(Company).filter(Company.id == uuid.UUID(subscription_id)).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        company.status = "suspended"
        company.updated_at = datetime.utcnow()
        db.commit()
        return {"message": "Company suspended successfully (no subscription found)", "reason": reason}
    
    subscription.status = "suspended"
    subscription.updated_at = datetime.utcnow()
    
    # Also suspend the company
    company = db.query(Company).filter(Company.id == subscription.company_id).first()
    if company:
        company.status = "suspended"
        company.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Subscription suspended successfully", "reason": reason}


@router.post("/subscriptions/{subscription_id}/activate")
async def activate_subscription(
    subscription_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Activate a suspended subscription (Super Admin only)"""
    if not has_permission(current_user, Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )
    
    # Try to find subscription by ID, if not found, try to find by company_id
    try:
        subscription = db.query(Subscription).filter(Subscription.id == uuid.UUID(subscription_id)).first()
    except ValueError:
        # subscription_id might be company_id
        subscription = db.query(Subscription).filter(Subscription.company_id == uuid.UUID(subscription_id)).first()
    
    if not subscription:
        # If no subscription exists, just activate the company directly
        company = db.query(Company).filter(Company.id == uuid.UUID(subscription_id)).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        company.status = "active"
        company.updated_at = datetime.utcnow()
        db.commit()
        return {"message": "Company activated successfully (no subscription found)"}
    
    subscription.status = "active"
    subscription.updated_at = datetime.utcnow()
    
    # Also activate the company
    company = db.query(Company).filter(Company.id == subscription.company_id).first()
    if company:
        company.status = "active"
        company.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Subscription activated successfully"}


@router.get("/subscription")
async def get_current_subscription(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get current user's company subscription - All roles can view their company subscription"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="No company associated with your account. Please contact support."
        )
    
    # Check if user can access this company
    if not context.is_super_admin() and not context.can_access_company(company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this company's subscription."
        )
    
    subscription = db.query(Subscription).filter(
        Subscription.company_id == uuid.UUID(company_id)
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No active subscription found for your company. Please contact your administrator to set up billing."
        )
    
    # Get user count
    user_count = db.query(User).filter(User.company_id == uuid.UUID(company_id)).count()
    
    # Get plan details
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == subscription.plan_id).first()
    
    return {
        "id": str(subscription.id),
        "plan_name": plan.name if plan else "Unknown",
        "status": subscription.status,
        "billing_cycle": subscription.billing_cycle,
        "monthly_price": float(plan.monthly_price) if plan else 0,
        "user_count": user_count,
        "total_amount": float(plan.monthly_price) * user_count if plan else 0,
        "current_period_start": subscription.current_period_start.isoformat() if subscription.current_period_start else None,
        "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
        "trial_ends_at": subscription.trial_ends_at.isoformat() if subscription.trial_ends_at else None,
        "card_last_4": subscription.card_last_4,
        "card_brand": subscription.card_brand,
        "auto_renew": subscription.auto_renew
    }


@router.get("/invoices")
async def get_company_invoices(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get invoices for current user's company (Company Admin)"""
    company_id = current_user.get('company_id')
    if not company_id:
        raise HTTPException(status_code=404, detail="No company associated with user")
    
    invoices = db.query(Invoice).filter(
        Invoice.company_id == uuid.UUID(company_id)
    ).order_by(Invoice.created_at.desc()).limit(50).all()
    
    return [
        {
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "amount": float(inv.amount),
            "status": inv.status,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
            "invoice_pdf": inv.invoice_pdf
        }
        for inv in invoices
    ]
