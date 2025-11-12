"""
Company Admin management API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr, UUID4, validator
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.security import get_current_user, get_password_hash
from app.models import User, UserRole, UserStatus, Company
from app.middleware.tenant import get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

router = APIRouter(prefix="/api/company-admins", tags=["company_admins"])


# Pydantic models
class CompanyAdminCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    password: str
    company_id: UUID4


class CompanyAdminUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    status: Optional[UserStatus] = None


class CompanyAdminResponse(BaseModel):
    id: UUID4
    email: str
    first_name: str
    last_name: str
    company_id: UUID4
    company_name: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    @validator('id', 'company_id', pre=True)
    def convert_uuid(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v

    class Config:
        from_attributes = True


# Super Admin endpoints
@router.post("/", response_model=CompanyAdminResponse)
async def create_company_admin(
    admin: CompanyAdminCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new company admin (Super Admin only)"""
    # Check if user has permission to manage company admins
    if not has_permission(current_user, Permission.MANAGE_COMPANY_ADMINS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot manage company admins"
        )
    
    # Check if company exists
    company = db.query(Company).filter(Company.id == admin.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == admin.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create admin user
    new_admin = User(
        email=admin.email,
        first_name=admin.first_name,
        last_name=admin.last_name,
        hashed_password=get_password_hash(admin.password),
        company_id=admin.company_id,
        user_role=UserRole.COMPANY_ADMIN,
        status=UserStatus.ACTIVE
    )
    
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    
    # Add company name to response
    new_admin.company_name = company.name
    
    return new_admin


@router.get("/", response_model=List[CompanyAdminResponse])
async def list_company_admins(
    company_id: Optional[UUID4] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all company admins (Super Admin only)"""
    context = get_tenant_context(current_user)
    
    # Check if user has permission to view company admins
    if not context.is_super_admin() and not has_permission(current_user, Permission.MANAGE_COMPANY_ADMINS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot view company admins"
        )
    
    query = db.query(User).filter(User.user_role == UserRole.COMPANY_ADMIN)
    
    # Filter by company if specified
    if company_id:
        # If not super admin, ensure user can access the company
        if not context.is_super_admin() and not context.can_access_company(str(company_id)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this company"
            )
        query = query.filter(User.company_id == company_id)
    elif not context.is_super_admin():
        # Non-super admins can only see admins in their own company
        query = query.filter(User.company_id == context.company_id)
    
    admins = query.all()
    
    # Add company names
    company_ids = [admin.company_id for admin in admins]
    companies = {
        str(c.id): c.name 
        for c in db.query(Company).filter(Company.id.in_(company_ids)).all()
    }
    
    for admin in admins:
        admin.company_name = companies.get(str(admin.company_id))
    
    return admins


@router.get("/{admin_id}", response_model=CompanyAdminResponse)
async def get_company_admin(
    admin_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get company admin details"""
    context = get_tenant_context(current_user)
    
    # Get admin user
    admin = db.query(User).filter(
        User.id == admin_id,
        User.user_role == UserRole.COMPANY_ADMIN
    ).first()
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company admin not found"
        )
    
    # Check if user can access this admin
    if not context.is_super_admin() and str(admin.company_id) != str(context.company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company admin"
        )
    
    # Add company name
    company = db.query(Company).filter(Company.id == admin.company_id).first()
    if company:
        admin.company_name = company.name
    
    return admin


@router.put("/{admin_id}", response_model=CompanyAdminResponse)
async def update_company_admin(
    admin_id: UUID4,
    admin_update: CompanyAdminUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update company admin (Super Admin only)"""
    context = get_tenant_context(current_user)
    
    # Check if user has permission to manage company admins
    if not context.is_super_admin() and not has_permission(current_user, Permission.MANAGE_COMPANY_ADMINS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot manage company admins"
        )
    
    # Get admin user
    admin = db.query(User).filter(
        User.id == admin_id,
        User.user_role == UserRole.COMPANY_ADMIN
    ).first()
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company admin not found"
        )
    
    # Check if user can access this admin
    if not context.is_super_admin() and str(admin.company_id) != str(context.company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company admin"
        )
    
    # Update fields
    update_data = admin_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(admin, field, value)
    
    db.commit()
    db.refresh(admin)
    
    # Add company name
    company = db.query(Company).filter(Company.id == admin.company_id).first()
    if company:
        admin.company_name = company.name
    
    return admin


@router.delete("/{admin_id}")
async def delete_company_admin(
    admin_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete company admin (Super Admin only)"""
    context = get_tenant_context(current_user)
    
    # Check if user has permission to manage company admins
    if not context.is_super_admin() and not has_permission(current_user, Permission.MANAGE_COMPANY_ADMINS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot manage company admins"
        )
    
    # Get admin user
    admin = db.query(User).filter(
        User.id == admin_id,
        User.user_role == UserRole.COMPANY_ADMIN
    ).first()
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company admin not found"
        )
    
    # Check if user can access this admin
    if not context.is_super_admin() and str(admin.company_id) != str(context.company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company admin"
        )
    
    # Check if this is the last admin for the company
    admin_count = db.query(User).filter(
        User.company_id == admin.company_id,
        User.user_role == UserRole.COMPANY_ADMIN,
        User.id != admin_id
    ).count()
    
    if admin_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the last admin for a company"
        )
    
    # Soft delete the admin
    admin.is_deleted = True
    admin.status = UserStatus.INACTIVE
    db.commit()
    
    return {"message": "Company admin deleted successfully"}
