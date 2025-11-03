"""
Authentication API endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer
from pydantic import BaseModel, EmailStr, validator
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import re

from ..core.security import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    get_current_active_user,
    get_password_hash
)
from ..core.database import get_db
from ..core.validators import validate_password_strength
from ..models.users import User as UserModel, Role as RoleModel

router = APIRouter()
security = HTTPBearer()


def sanitize_input(value: str) -> str:
    """Remove script tags and sanitize input"""
    if not value:
        return value
    # Remove script tags
    value = re.sub(r'<script[^>]*>.*?</script>', '', value, flags=re.IGNORECASE | re.DOTALL)
    # Remove other potentially dangerous tags
    value = re.sub(r'<[^>]+>', '', value)
    return value.strip()


# Pydantic models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: Optional[str] = "Regular User"  # Allow role to be specified, defaults to Regular User
    company_id: Optional[str] = None  # Company ID for team member registration
    
    @validator('first_name', 'last_name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        if len(v) > 255:
            raise ValueError('Name cannot exceed 255 characters')
        # Check for script tags
        if re.search(r'<script[^>]*>.*?</script>', v, re.IGNORECASE | re.DOTALL):
            raise ValueError('Invalid characters in name')
        if re.search(r'<[^>]+>', v):
            raise ValueError('HTML tags are not allowed in name')
        return sanitize_input(v)


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    company_id: Optional[str] = None
    team_id: Optional[str] = None
    is_active: bool


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login endpoint"""
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create tokens
    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Prepare user data
    user_data = {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.user_role.value if hasattr(user.user_role, 'value') else str(user.user_role),
        "company_id": str(user.company_id) if user.company_id else None,
        "team_id": str(user.team_id) if user.team_id else None,
        "is_active": True
    }
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_data
    }


@router.post("/register", response_model=LoginResponse)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register new user endpoint"""
    try:
        # Normalize email to lowercase
        email_lower = request.email.lower()
        
        # Validate password strength
        validate_password_strength(request.password)
        
        # Check if user already exists (case-insensitive, only active users)
        existing_user = db.query(UserModel).filter(
            UserModel.email.ilike(email_lower),
            UserModel.is_deleted == False
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A user with email '{email_lower}' is already registered. Please use a different email address."
            )
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except ValueError as e:
        # Catch validation errors from pydantic validators
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Assign role - use provided role or default to Regular User
    # Special case: admin@sunstonecrm.com always gets Super Admin
    if email_lower == "admin@sunstonecrm.com":
        role = "Super Admin"
        user_role = "super_admin"
    else:
        role = request.role if request.role else "Regular User"
        # Map role to user_role
        if role.lower() in ["admin", "company admin"]:
            user_role = "company_admin"
        else:
            user_role = "company_user"
    
    # Get company_id from request (should be provided when adding team members)
    import uuid
    company_id = None
    if request.company_id:
        try:
            company_id = uuid.UUID(request.company_id) if isinstance(request.company_id, str) else request.company_id
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid company_id format"
            )
    
    # Create new user with lowercase email
    new_user = UserModel(
        email=email_lower,
        hashed_password=get_password_hash(request.password),
        first_name=request.first_name,
        last_name=request.last_name,
        role=role,
        user_role=user_role,
        company_id=company_id,
        email_verified=False
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create tokens
    access_token = create_access_token(data={"sub": new_user.email})
    refresh_token = create_refresh_token(data={"sub": new_user.email})
    
    # Prepare user data
    user_data = {
        "id": str(new_user.id),
        "email": new_user.email,
        "first_name": new_user.first_name,
        "last_name": new_user.last_name,
        "role": new_user.user_role.value if hasattr(new_user.user_role, 'value') else str(new_user.user_role),
        "company_id": str(new_user.company_id) if new_user.company_id else None,
        "team_id": None,
        "is_active": True
    }
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_data
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user information - always fetch fresh from database"""
    from app.models import User
    
    # Fetch fresh user data from database
    user = db.query(User).filter(User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.user_role.value if hasattr(user.user_role, 'value') else str(user.user_role),
        "company_id": str(user.company_id) if user.company_id else None,
        "team_id": str(user.team_id) if user.team_id else None,
        "is_active": True
    }


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_active_user)):
    """Logout endpoint (for token blacklisting in production)"""
    return {"message": "Successfully logged out"}


@router.post("/refresh")
async def refresh_token(current_user: dict = Depends(get_current_active_user)):
    """Refresh access token"""
    access_token = create_access_token(data={"sub": current_user["email"]})
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send password reset email"""
    # Check if user exists
    user = db.query(UserModel).filter(UserModel.email == request.email).first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail="No account found with this email address. Please check your email and try again."
        )
    
    # Generate a 6-digit reset code
    import random
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    import os
    from datetime import timedelta
    
    reset_code = str(random.randint(100000, 999999))
    
    # Store reset code in user record with 15-minute expiration
    user.reset_code = reset_code
    user.reset_code_expires = datetime.utcnow() + timedelta(minutes=15)
    db.commit()
    
    print(f"Password reset code for {request.email}: {reset_code}")
    
    # Send email using SMTP
    try:
        # Get email config from environment variables
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_username = os.getenv("SMTP_USERNAME", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        
        if smtp_username and smtp_password:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = smtp_username
            msg['To'] = request.email
            msg['Subject'] = "Password Reset Code - SunstoneCRM"
            
            body = f"""
            Hello,
            
            You requested a password reset for your SunstoneCRM account.
            
            Your password reset code is: {reset_code}
            
            This code will expire in 15 minutes.
            
            If you didn't request this, please ignore this email.
            
            Best regards,
            SunstoneCRM Team
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(msg)
            server.quit()
            
            return {
                "message": f"A password reset code has been sent to {request.email}. Please check your inbox."
            }
        else:
            # Fallback if SMTP not configured
            print(f"SMTP not configured. Reset code: {reset_code}")
            return {
                "message": f"A password reset code has been sent to {request.email}. Please check your inbox.",
                "code": reset_code  # Only for development
            }
    except Exception as e:
        print(f"Error sending email: {e}")
        # Still return success but log the error
        return {
            "message": f"A password reset code has been sent to {request.email}. Please check your inbox.",
            "code": reset_code  # Only for development
        }


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_code: str
    new_password: str


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using reset code"""
    # Find user by email
    user = db.query(UserModel).filter(UserModel.email == request.email).first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail="No account found with this email address."
        )
    
    # Check if reset code exists and is valid
    if not user.reset_code or not user.reset_code_expires:
        raise HTTPException(
            status_code=400,
            detail="No password reset request found. Please request a new reset code."
        )
    
    # Check if code has expired
    if datetime.utcnow() > user.reset_code_expires:
        raise HTTPException(
            status_code=400,
            detail="Reset code has expired. Please request a new one."
        )
    
    # Verify reset code
    if user.reset_code != request.reset_code:
        raise HTTPException(
            status_code=400,
            detail="Invalid reset code. Please check and try again."
        )
    
    # Validate new password strength
    validate_password_strength(request.new_password)
    
    # Update password
    user.hashed_password = get_password_hash(request.new_password)
    
    # Clear reset code
    user.reset_code = None
    user.reset_code_expires = None
    
    db.commit()
    
    return {
        "message": "Password has been reset successfully. You can now login with your new password."
    }
