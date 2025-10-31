"""
Company Registration API
Handles new company signups with 14-day trial
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, validator
from datetime import datetime, timedelta
from typing import Optional
import re

from app.core.database import get_db
from app.core.security import get_password_hash, create_access_token
from app.models import Company, User

router = APIRouter(prefix="/api/register", tags=["Registration"])


class CompanyRegistrationRequest(BaseModel):
    """Company registration request schema"""
    company_name: str
    admin_email: EmailStr
    admin_password: str
    admin_first_name: str
    admin_last_name: str
    phone: Optional[str] = None
    
    @validator('company_name')
    def validate_company_name(cls, v):
        if len(v) < 2:
            raise ValueError('Company name must be at least 2 characters')
        if len(v) > 100:
            raise ValueError('Company name must be less than 100 characters')
        return v.strip()
    
    @validator('admin_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        return v


class CompanyRegistrationResponse(BaseModel):
    """Registration response"""
    success: bool
    message: str
    company_id: str
    admin_email: str
    trial_ends_at: datetime
    access_token: Optional[str] = None


@router.post("/company", response_model=CompanyRegistrationResponse)
async def register_company(
    request: CompanyRegistrationRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new company with 14-day trial
    
    Flow:
    1. Validate email is not already registered
    2. Create company with trial status
    3. Create admin user for the company
    4. Return access token for immediate login
    """
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == request.admin_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if company name already exists
    existing_company = db.query(Company).filter(Company.name == request.company_name).first()
    if existing_company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company name already exists"
        )
    
    try:
        # Create company with 14-day trial
        trial_ends_at = datetime.utcnow() + timedelta(days=14)
        
        new_company = Company(
            name=request.company_name,
            plan='pro',  # Single plan - everything included
            status='active',
            subscription_status='trial',
            trial_ends_at=trial_ends_at,
            monthly_price=0.00  # Will be set when they pay
        )
        
        db.add(new_company)
        db.flush()  # Get company ID
        
        # Create admin user for the company
        admin_user = User(
            email=request.admin_email,
            hashed_password=get_password_hash(request.admin_password),
            first_name=request.admin_first_name,
            last_name=request.admin_last_name,
            phone=request.phone,
            user_role='company_admin',  # Company admin role
            status='active',
            company_id=new_company.id
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(new_company)
        db.refresh(admin_user)
        
        # Create access token for immediate login
        access_token = create_access_token(data={"sub": admin_user.email})
        
        return CompanyRegistrationResponse(
            success=True,
            message=f"Company registered successfully! Your 14-day trial ends on {trial_ends_at.strftime('%Y-%m-%d')}",
            company_id=str(new_company.id),
            admin_email=admin_user.email,
            trial_ends_at=trial_ends_at,
            access_token=access_token
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register company: {str(e)}"
        )


@router.get("/check-email/{email}")
async def check_email_availability(email: str, db: Session = Depends(get_db)):
    """Check if email is available for registration"""
    existing_user = db.query(User).filter(User.email == email).first()
    return {
        "available": existing_user is None,
        "message": "Email is available" if not existing_user else "Email already registered"
    }


@router.get("/check-company/{company_name}")
async def check_company_name_availability(company_name: str, db: Session = Depends(get_db)):
    """Check if company name is available"""
    existing_company = db.query(Company).filter(Company.name == company_name).first()
    return {
        "available": existing_company is None,
        "message": "Company name is available" if not existing_company else "Company name already exists"
    }
