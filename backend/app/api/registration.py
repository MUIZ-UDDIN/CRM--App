"""
Company Registration API
Handles new company signups with 14-day trial
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, validator, field_validator
from datetime import datetime, timedelta
from typing import Optional
import re
import html

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
        if not v or not v.strip():
            raise ValueError('Company name is required. Please enter your company name.')
        
        v = v.strip()
        
        # Check for script tags and HTML
        if re.search(r'<script|<iframe|javascript:|onerror=|onload=', v, re.IGNORECASE):
            raise ValueError('Invalid characters detected. Company name cannot contain script tags or HTML code.')
        
        # Check for any HTML tags
        if re.search(r'<[^>]+>', v):
            raise ValueError('Company name cannot contain HTML tags. Please use plain text only.')
        
        # Character limit
        if len(v) < 2:
            raise ValueError('Company name must be at least 2 characters long.')
        if len(v) > 100:
            raise ValueError('Company name is too long. Maximum 100 characters allowed.')
        
        # Only allow letters, numbers, spaces, and common business characters
        if not re.match(r'^[a-zA-Z0-9\s\-\.&,\'"()]+$', v):
            raise ValueError('Company name can only contain letters, numbers, spaces, and basic punctuation (- . & , \' " ( )).')
        
        return html.escape(v)  # Sanitize output
    
    @validator('admin_first_name')
    def validate_first_name(cls, v):
        if not v or not v.strip():
            raise ValueError('First name is required. Please enter your first name.')
        
        v = v.strip()
        
        # Check for script tags and HTML
        if re.search(r'<script|<iframe|javascript:|onerror=|onload=', v, re.IGNORECASE):
            raise ValueError('Invalid characters detected. First name cannot contain script tags or HTML code.')
        
        if re.search(r'<[^>]+>', v):
            raise ValueError('First name cannot contain HTML tags. Please use plain text only.')
        
        # Character limit
        if len(v) > 50:
            raise ValueError('First name is too long. Maximum 50 characters allowed.')
        
        # Only allow letters, spaces, hyphens, and apostrophes
        if not re.match(r'^[a-zA-Z\s\-\']+$', v):
            raise ValueError('First name can only contain letters, spaces, hyphens, and apostrophes.')
        
        return html.escape(v)
    
    @validator('admin_last_name')
    def validate_last_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Last name is required. Please enter your last name.')
        
        v = v.strip()
        
        # Check for script tags and HTML
        if re.search(r'<script|<iframe|javascript:|onerror=|onload=', v, re.IGNORECASE):
            raise ValueError('Invalid characters detected. Last name cannot contain script tags or HTML code.')
        
        if re.search(r'<[^>]+>', v):
            raise ValueError('Last name cannot contain HTML tags. Please use plain text only.')
        
        # Character limit
        if len(v) > 50:
            raise ValueError('Last name is too long. Maximum 50 characters allowed.')
        
        # Only allow letters, spaces, hyphens, and apostrophes
        if not re.match(r'^[a-zA-Z\s\-\']+$', v):
            raise ValueError('Last name can only contain letters, spaces, hyphens, and apostrophes.')
        
        return html.escape(v)
    
    @validator('phone')
    def validate_phone(cls, v):
        if v is None or not v.strip():
            return None
        
        v = v.strip()
        
        # Character limit
        if len(v) > 20:
            raise ValueError('Phone number is too long. Maximum 20 characters allowed.')
        
        # Only allow numbers, spaces, hyphens, parentheses, and plus sign
        if not re.match(r'^[\d\s\-\(\)\+]+$', v):
            raise ValueError('Phone number can only contain numbers, spaces, hyphens, parentheses, and plus sign.')
        
        # Check for minimum digits
        digits_only = re.sub(r'\D', '', v)
        if len(digits_only) < 10:
            raise ValueError('Phone number must contain at least 10 digits.')
        
        return v
    
    @validator('admin_password')
    def validate_password(cls, v):
        if not v:
            raise ValueError('Password is required. Please create a strong password.')
        
        if len(v) < 8:
            raise ValueError('Password is too short. It must be at least 8 characters long.')
        
        if len(v) > 128:
            raise ValueError('Password is too long. Maximum 128 characters allowed.')
        
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter (A-Z).')
        
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter (a-z).')
        
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number (0-9).')
        
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
    existing_user = db.query(User).filter(User.email == request.admin_email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email address is already registered. Please use a different email or try logging in."
        )
    
    # Check if company name already exists
    existing_company = db.query(Company).filter(Company.name == request.company_name).first()
    if existing_company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This company name is already taken. Please choose a different company name."
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
        
        # Create default pipeline and stages for the new company
        from app.models.deals import Pipeline, PipelineStage
        
        default_pipeline = Pipeline(
            name='Sales Pipeline',
            description='Default sales pipeline',
            is_default=True,
            company_id=new_company.id,
            order_index=0
        )
        db.add(default_pipeline)
        db.flush()  # Get pipeline ID
        
        # Create default stages
        default_stages = [
            {'name': 'Lead', 'order_index': 0, 'probability': 10.0},
            {'name': 'Qualified', 'order_index': 1, 'probability': 25.0},
            {'name': 'Proposal', 'order_index': 2, 'probability': 50.0},
            {'name': 'Negotiation', 'order_index': 3, 'probability': 75.0},
            {'name': 'Closed Won', 'order_index': 4, 'probability': 100.0, 'is_closed': True, 'is_won': True},
            {'name': 'Closed Lost', 'order_index': 5, 'probability': 0.0, 'is_closed': True, 'is_won': False},
        ]
        
        for stage_data in default_stages:
            stage = PipelineStage(
                pipeline_id=default_pipeline.id,
                name=stage_data['name'],
                order_index=stage_data['order_index'],
                probability=stage_data['probability'],
                is_closed=stage_data.get('is_closed', False),
                is_won=stage_data.get('is_won', False)
            )
            db.add(stage)
        
        db.commit()
        
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
        
    except ValueError as e:
        db.rollback()
        # Validation errors - return as 400 with the specific message
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        # Log the actual error for debugging
        import logging
        logging.error(f"Registration error: {str(e)}")
        # Return user-friendly message
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="We encountered an issue creating your account. Please try again or contact support if the problem persists."
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
