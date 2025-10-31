"""
User invitation system
Send invitation emails to new team members
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional
import secrets
import hashlib

from app.core.database import get_db
from app.core.security import get_current_user, get_password_hash
from app.models import User, Company
from app.services.email_service import send_invitation_email

router = APIRouter(prefix="/api/invitations", tags=["Invitations"])


class InvitationCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    user_role: str = "company_user"  # company_admin or company_user


class InvitationAccept(BaseModel):
    token: str
    password: str


# Store invitation tokens (in production, use Redis or database)
invitation_tokens = {}


@router.post("/send")
async def send_invitation(
    invitation: InvitationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send invitation to new team member
    Only Company Admin or Super Admin can send invitations
    """
    
    # Check if user is admin
    if current_user.user_role not in ['super_admin', 'company_admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can invite users"
        )
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == invitation.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Get company
    if current_user.user_role == 'super_admin':
        # Super admin must specify company_id (add this to request model if needed)
        company_id = current_user.company_id  # For now, use their company
    else:
        company_id = current_user.company_id
    
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company not found"
        )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Generate invitation token
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    # Store invitation data (expires in 7 days)
    invitation_tokens[token_hash] = {
        "email": invitation.email,
        "first_name": invitation.first_name,
        "last_name": invitation.last_name,
        "user_role": invitation.user_role,
        "company_id": str(company_id),
        "invited_by": str(current_user.id),
        "expires_at": datetime.utcnow() + timedelta(days=7)
    }
    
    # Send invitation email in background
    invitation_link = f"https://sunstonecrm.com/auth/accept-invitation?token={token}"
    
    background_tasks.add_task(
        send_invitation_email,
        to_email=invitation.email,
        first_name=invitation.first_name,
        company_name=company.name,
        invited_by=f"{current_user.first_name} {current_user.last_name}",
        invitation_link=invitation_link,
        sendgrid_api_key=company.sendgrid_api_key
    )
    
    return {
        "success": True,
        "message": f"Invitation sent to {invitation.email}",
        "expires_in_days": 7
    }


@router.post("/accept")
async def accept_invitation(
    data: InvitationAccept,
    db: Session = Depends(get_db)
):
    """
    Accept invitation and create user account
    """
    
    # Hash token to lookup
    token_hash = hashlib.sha256(data.token.encode()).hexdigest()
    
    # Get invitation data
    invitation_data = invitation_tokens.get(token_hash)
    if not invitation_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired invitation token"
        )
    
    # Check if expired
    if datetime.utcnow() > invitation_data["expires_at"]:
        del invitation_tokens[token_hash]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired"
        )
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == invitation_data["email"]).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists"
        )
    
    # Create user
    new_user = User(
        email=invitation_data["email"],
        first_name=invitation_data["first_name"],
        last_name=invitation_data["last_name"],
        hashed_password=get_password_hash(data.password),
        user_role=invitation_data["user_role"],
        company_id=invitation_data["company_id"],
        status="active"
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Remove used token
    del invitation_tokens[token_hash]
    
    # Generate access token for immediate login
    from app.core.security import create_access_token
    access_token = create_access_token(data={"sub": new_user.email})
    
    return {
        "success": True,
        "message": "Account created successfully",
        "access_token": access_token,
        "user": {
            "id": str(new_user.id),
            "email": new_user.email,
            "first_name": new_user.first_name,
            "last_name": new_user.last_name,
            "role": new_user.user_role
        }
    }


@router.get("/verify/{token}")
async def verify_invitation_token(token: str):
    """
    Verify if invitation token is valid
    """
    
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    invitation_data = invitation_tokens.get(token_hash)
    
    if not invitation_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid invitation token"
        )
    
    # Check if expired
    if datetime.utcnow() > invitation_data["expires_at"]:
        del invitation_tokens[token_hash]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired"
        )
    
    return {
        "valid": True,
        "email": invitation_data["email"],
        "first_name": invitation_data["first_name"],
        "last_name": invitation_data["last_name"],
        "role": invitation_data["user_role"]
    }
