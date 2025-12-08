"""
Team Management API
Handles adding and managing team members with proper validation
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, validator, UUID4
from typing import Optional
import re
import html
import uuid

from app.core.database import get_db
from app.core.security import get_password_hash, get_current_active_user
from app.models import User, Company
from app.services.team_reassignment import TeamReassignmentService
from app.middleware.tenant import get_tenant_context

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
        
        # Only prevent super_admin role assignment through team member invitation
        # Company Admins can now invite other Company Admins within their own company
        if v.lower() in ['super_admin', 'super admin']:
            raise ValueError('Super Admin role cannot be assigned through team member invitation. This role is reserved for system administrators.')
        
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
    
    # If no company_id, this is an error - even Super Admin needs a company context
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No company context found. Please ensure you are logged in with a company account. Super Admin should have a company_id assigned."
        )
    
    # Check if email already exists in THIS company (allow same email in different companies)
    existing_user = db.query(User).filter(
        User.email == request.email.lower(),
        User.company_id == company_id,
        User.is_deleted == False
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The email address '{request.email}' is already registered in your company. Please use a different email address."
        )
    
    try:
        # Create new team member with default password
        default_password = "ChangeMe123!"
        
        # Map role to user_role (lowercase with underscores)
        role_mapping = {
            'Admin': 'company_admin',
            'Company Admin': 'company_admin',
            'Sales Manager': 'company_admin',  # Merged into company_admin
            'Sales Rep': 'regular_user',  # New unified role
            'Regular User': 'regular_user',  # New unified role
            'Company User': 'regular_user',  # New unified role
            'User': 'regular_user',  # New unified role
            'Employee': 'regular_user'  # New unified role
        }
        user_role = role_mapping.get(request.role, 'regular_user')
        
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
        import traceback
        logging.error(f"Error adding team member: {str(e)}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="We encountered an issue adding the team member. Please try again or contact support if the problem persists."
        )


class ReassignUserRequest(BaseModel):
    """Request to reassign a user to a different team"""
    user_id: UUID4
    new_team_id: Optional[UUID4] = None
    reassign_data: bool = False
    new_owner_id: Optional[UUID4] = None


@router.post("/reassign")
async def reassign_user_to_team(
    request: ReassignUserRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Reassign a user to a different team with optional data reassignment
    
    - **user_id**: User to reassign
    - **new_team_id**: Target team (None to remove from team)
    - **reassign_data**: If True, reassign user's deals/contacts to new_owner_id
    - **new_owner_id**: New owner for user's data (required if reassign_data=True)
    """
    
    try:
        context = get_tenant_context(current_user)
        current_user_role = context.get_role_name()
        current_user_team_id = current_user.get('team_id')
        
        # Get the user being reassigned
        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        old_team_id = user.team_id
        
        # Validate reassignment permissions
        is_valid, error_msg = TeamReassignmentService.validate_team_reassignment(
            db=db,
            user_id=request.user_id,
            new_team_id=request.new_team_id,
            current_user_role=current_user_role,
            current_user_team_id=uuid.UUID(current_user_team_id) if current_user_team_id else None
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_msg
            )
        
        # Get reassignment impact
        impact = TeamReassignmentService.get_reassignment_impact(db, request.user_id)
        
        # Perform reassignment
        stats = TeamReassignmentService.reassign_user_to_team(
            db=db,
            user_id=request.user_id,
            old_team_id=old_team_id,
            new_team_id=request.new_team_id,
            reassign_data=request.reassign_data,
            new_owner_id=request.new_owner_id
        )
        
        return {
            "success": True,
            "message": f"User successfully reassigned from team {old_team_id} to team {request.new_team_id}",
            "impact": impact,
            "stats": stats
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reassigning user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reassign user. Please try again."
        )


@router.get("/reassignment-impact/{user_id}")
async def get_reassignment_impact(
    user_id: UUID4,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get the impact of reassigning a user (preview before reassignment)
    
    Returns counts of deals, contacts, and activities owned by the user
    """
    
    try:
        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get impact
        impact = TeamReassignmentService.get_reassignment_impact(db, user_id)
        
        return {
            "success": True,
            "impact": impact,
            "warning": "Reassigning this user will affect their owned data" if impact["total_records"] > 0 else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting reassignment impact: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get reassignment impact"
        )
