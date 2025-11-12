"""
Company management API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import Company, User, UserRole, UserStatus, PlanType, CompanyStatus
from app.middleware.tenant import require_super_admin, require_company_admin, get_tenant_context

router = APIRouter(prefix="/api/companies", tags=["companies"])


# Pydantic models
class CompanyCreate(BaseModel):
    name: str
    plan: PlanType = PlanType.FREE
    domain: Optional[str] = None
    timezone: str = "UTC"
    currency: str = "USD"


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    plan: Optional[PlanType] = None
    status: Optional[CompanyStatus] = None
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    sendgrid_api_key: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None


class CompanyResponse(BaseModel):
    id: str
    name: str
    plan: str
    status: str
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    timezone: str
    currency: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    created_at: datetime
    user_count: Optional[int] = 0
    subscription_status: Optional[str] = None
    trial_ends_at: Optional[datetime] = None
    days_remaining: Optional[int] = None
    
    @field_validator('id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v
    
    class Config:
        from_attributes = True


class CompanyUserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    password: str
    user_role: UserRole = UserRole.COMPANY_USER


# Super Admin endpoints
@router.post("/", response_model=CompanyResponse)
def create_company(
    company: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new company (Super Admin only)"""
    require_super_admin(current_user)
    
    # Check if domain already exists
    if company.domain:
        existing = db.query(Company).filter(Company.domain == company.domain).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Domain already exists"
            )
    
    # Create company
    db_company = Company(
        name=company.name,
        plan=company.plan,
        domain=company.domain,
        timezone=company.timezone,
        currency=company.currency,
        created_by=current_user.id,
        status=CompanyStatus.ACTIVE
    )
    
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    
    return db_company


@router.get("/", response_model=List[CompanyResponse])
def list_companies(
    skip: int = 0,
    limit: int = 100,
    status: Optional[CompanyStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all companies (Super Admin only)"""
    require_super_admin(current_user)
    
    query = db.query(Company)
    
    # Exclude super admin's own company from the list
    # Handle both dict and User object
    company_id = current_user.company_id if hasattr(current_user, 'company_id') else current_user.get('company_id')
    if company_id:
        query = query.filter(Company.id != company_id)
    
    if status:
        query = query.filter(Company.status == status)
    
    companies = query.offset(skip).limit(limit).all()
    
    # Add user count and calculate days_remaining
    from datetime import datetime
    for company in companies:
        company.user_count = db.query(User).filter(User.company_id == company.id).count()
        
        # Calculate days remaining for trial accounts
        if company.subscription_status == 'trial' and company.trial_ends_at:
            now = datetime.utcnow()
            trial_end = company.trial_ends_at
            # Remove timezone info for comparison if present
            if trial_end.tzinfo is not None:
                trial_end = trial_end.replace(tzinfo=None)
            days_left = (trial_end - now).days
            company.days_remaining = max(0, days_left)
        else:
            company.days_remaining = None
    
    return companies


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get company details"""
    context = get_tenant_context(current_user)
    
    # Super admin can access any company, others only their own
    if not context.can_access_company(company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company"
        )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    company.user_count = db.query(User).filter(User.company_id == company.id).count()
    
    # Calculate days remaining if on trial
    if company.subscription_status == 'trial' and company.trial_ends_at:
        from datetime import datetime
        days_remaining = (company.trial_ends_at - datetime.utcnow()).days
        company.days_remaining = max(0, days_remaining)
    
    return company


@router.put("/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: str,
    company_update: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update company (Super Admin or Company Admin)"""
    context = get_tenant_context(current_user)
    
    # Validate access
    if not context.can_access_company(company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company"
        )
    
    # Only super admin can change status and plan
    if not context.is_super_admin():
        if company_update.status or company_update.plan:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only super admin can change status or plan"
            )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Update fields
    update_data = company_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)
    
    db.commit()
    db.refresh(company)
    
    return company


@router.delete("/{company_id}")
def delete_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete company (Super Admin only)"""
    require_super_admin(current_user)
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Check if company has users
    user_count = db.query(User).filter(User.company_id == company.id).count()
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete company with {user_count} users. Please remove users first."
        )
    
    db.delete(company)
    db.commit()
    
    return {"message": "Company deleted successfully"}


@router.post("/{company_id}/suspend")
def suspend_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Suspend a company (Super Admin only)"""
    require_super_admin(current_user)
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Check if company is already suspended
    if company.status == CompanyStatus.SUSPENDED:
        return {"message": "Company is already suspended"}
    
    # Suspend company
    company.status = CompanyStatus.SUSPENDED
    
    # Also suspend all users in the company
    users = db.query(User).filter(User.company_id == company.id).all()
    for user in users:
        user.status = UserStatus.SUSPENDED
    
    db.commit()
    db.refresh(company)
    
    return {"message": "Company suspended successfully"}


@router.post("/{company_id}/activate")
def activate_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Activate a suspended company (Super Admin only)"""
    require_super_admin(current_user)
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Check if company is already active
    if company.status == CompanyStatus.ACTIVE:
        return {"message": "Company is already active"}
    
    # Activate company
    company.status = CompanyStatus.ACTIVE
    
    # Also activate all users in the company
    users = db.query(User).filter(User.company_id == company.id).all()
    for user in users:
        user.status = UserStatus.ACTIVE
    
    db.commit()
    db.refresh(company)
    
    return {"message": "Company activated successfully"}


# Company user management
@router.get("/{company_id}/users", response_model=List[dict])
def list_company_users(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all users in a company"""
    context = get_tenant_context(current_user)
    
    if not context.can_access_company(company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company"
        )
    
    users = db.query(User).filter(
        User.company_id == company_id,
        User.is_deleted == False
    ).all()
    
    return [
        {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "user_role": user.user_role.value if hasattr(user.user_role, 'value') else user.user_role,
            "status": user.status.value if hasattr(user.status, 'value') else user.status,
            "created_at": user.created_at
        }
        for user in users
    ]


@router.post("/{company_id}/users")
def add_company_user(
    company_id: str,
    user_data: CompanyUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new user to company (Company Admin or Super Admin)"""
    context = get_tenant_context(current_user)
    
    if not context.can_manage_company():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    if not context.can_access_company(company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company"
        )
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    from app.core.security import get_password_hash
    
    new_user = User(
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        hashed_password=get_password_hash(user_data.password),
        company_id=company_id,
        user_role=user_data.user_role,
        status=UserStatus.ACTIVE
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "id": str(new_user.id),
        "email": new_user.email,
        "message": "User created successfully"
    }
