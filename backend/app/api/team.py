"""
Team Management API
Handles adding and managing team members with proper validation
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, validator
from typing import Optional
import re
import html

from app.core.database import get_db
from app.core.security import get_password_hash, get_current_active_user
from app.models import User, Company

router = APIRouter(prefix="/api/team", tags=["Team"])

import logging
logger = logging.getLogger(__name__)
logger.info("✅ Team router loaded with prefix /api/team")


class AddTeamMemberRequest(BaseModel):
    """Add team member request schema with validation"""
    email: EmailStr
    first_name: str
    last_name: Optional[str] = ''
    role: str
    phone: Optional[str] = None
    
    @validator('first_name')
    def validate_first_name(cls, v):
        if not v or not v.strip():
            raise ValueError('First name is required. Please enter the team member\'s first name.')
        
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
    
    @validator('last_name')
    def validate_last_name(cls, v):
        # Last name is optional - allow empty string
        if not v:
            return ''
        
        v = v.strip()
        
        # If empty after strip, return empty string
        if not v:
            return ''
        
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
    
    @validator('role')
    def validate_role(cls, v):
        if not v or not v.strip():
            raise ValueError('Role is required. Please select a role for the team member.')
        
        v = v.strip()
        
        # Prevent super_admin role assignment
        if v.lower() in ['super_admin', 'super admin']:
            raise ValueError('Super Admin role cannot be assigned. This role is reserved for system administrators.')
        
        # Character limit
        if len(v) > 50:
            raise ValueError('Role name is too long. Maximum 50 characters allowed.')
        
        return v
    
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


@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify router is working"""
    return {"status": "ok", "message": "Team router is working", "prefix": "/api/team"}


@router.post("/members")
async def add_team_member(
    request: AddTeamMemberRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Add a new team member to the company
    Only accessible by company admins and super admins
    """
    
    # Check permissions
    user_role = current_user.get("role", "").lower()
    if user_role not in ['super_admin', 'company_admin', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to add team members. Only administrators can add new team members."
        )
    
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No company found for your account. Please contact support."
        )
    
    # Check if email already exists (case-insensitive)
    existing_user = db.query(User).filter(
        User.email == request.email.lower(),
        User.is_deleted == False
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The email address '{request.email}' is already registered. Please use a different email address."
        )
    
    try:
        # Create new team member with default password
        default_password = "ChangeMe123!"
        
        # Map role to user_role (lowercase with underscores)
        role_mapping = {
            'Admin': 'company_admin',
            'Sales Manager': 'sales_manager',
            'Sales Rep': 'sales_rep',
            'Regular User': 'company_user',
            'Support': 'support'
        }
        user_role = role_mapping.get(request.role, 'company_user')
        
        new_user = User(
            email=request.email.lower(),
            hashed_password=get_password_hash(default_password),
            first_name=request.first_name,
            last_name=request.last_name,
            phone=request.phone,
            user_role=user_role,
            status='active',
            company_id=company_id,
            is_active=True,
            is_deleted=False
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return {
            "success": True,
            "message": f"Team member '{request.first_name} {request.last_name}' added successfully! Default password: {default_password}",
            "user_id": str(new_user.id),
            "email": new_user.email,
            "default_password": default_password
        }
        
    except ValueError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        import logging
        logging.error(f"Error adding team member: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="We encountered an issue adding the team member. Please try again or contact support if the problem persists."
        )
