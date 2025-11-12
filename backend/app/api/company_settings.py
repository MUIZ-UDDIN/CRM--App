"""
Company settings API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, UUID4, validator
from datetime import datetime
import uuid
import base64

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models import Company
from app.middleware.tenant import get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

router = APIRouter(prefix="/api/company-settings", tags=["company_settings"])


# Pydantic models
class CompanySettingsUpdate(BaseModel):
    name: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    domain: Optional[str] = None


class CompanySettingsResponse(BaseModel):
    id: UUID4
    name: str
    timezone: str
    currency: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @validator('id', pre=True)
    def convert_uuid(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v

    class Config:
        from_attributes = True


@router.get("/{company_id}", response_model=CompanySettingsResponse)
async def get_company_settings(
    company_id: UUID4,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get company settings"""
    context = get_tenant_context(current_user)
    
    # Check if user can access company
    if not context.can_access_company(str(company_id)) and not context.is_super_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company"
        )
    
    # Get company
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    return company


@router.put("/{company_id}", response_model=CompanySettingsResponse)
async def update_company_settings(
    company_id: UUID4,
    settings: CompanySettingsUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update company settings"""
    context = get_tenant_context(current_user)
    
    # Check if user has permission to edit company
    if not has_permission(current_user, Permission.EDIT_COMPANY) and not context.is_super_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot edit company settings"
        )
    
    # Check if user can access company
    if not context.can_access_company(str(company_id)) and not context.is_super_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company"
        )
    
    # Get company
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Update fields
    update_data = settings.dict(exclude_unset=True)
    
    # Check if domain is being updated and is unique
    if 'domain' in update_data and update_data['domain']:
        existing = db.query(Company).filter(
            Company.domain == update_data['domain'],
            Company.id != company_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Domain already exists"
            )
    
    for field, value in update_data.items():
        setattr(company, field, value)
    
    company.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(company)
    
    return company


@router.post("/{company_id}/logo")
async def upload_company_logo(
    company_id: UUID4,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload company logo"""
    context = get_tenant_context(current_user)
    
    # Check if user has permission to edit company
    if not has_permission(current_user, Permission.EDIT_COMPANY) and not context.is_super_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot edit company settings"
        )
    
    # Check if user can access company
    if not context.can_access_company(str(company_id)) and not context.is_super_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company"
        )
    
    # Get company
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG, JPEG, PNG, and SVG images are allowed"
        )
    
    # Validate file size (2MB max)
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image size must be less than 2MB"
        )
    
    # Convert to base64 data URL for storage
    base64_image = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{base64_image}"
    
    # Save to database
    company.logo_url = data_url
    company.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Logo uploaded successfully"}


@router.delete("/{company_id}/logo")
async def delete_company_logo(
    company_id: UUID4,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete company logo"""
    context = get_tenant_context(current_user)
    
    # Check if user has permission to edit company
    if not has_permission(current_user, Permission.EDIT_COMPANY) and not context.is_super_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot edit company settings"
        )
    
    # Check if user can access company
    if not context.can_access_company(str(company_id)) and not context.is_super_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company"
        )
    
    # Get company
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Remove logo
    company.logo_url = None
    company.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Logo deleted successfully"}
