"""
Authentication API endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

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


# Pydantic models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str


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
        "role": user.role,
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
    # Validate password strength
    validate_password_strength(request.password)
    
    # Check if user already exists
    existing_user = db.query(UserModel).filter(UserModel.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Assign role based on email (first admin@sunstonecrm.com becomes Super Admin)
    role = "Super Admin" if request.email == "admin@sunstonecrm.com" else "Regular User"
    
    # Create new user
    new_user = UserModel(
        email=request.email,
        hashed_password=get_password_hash(request.password),
        first_name=request.first_name,
        last_name=request.last_name,
        role=role,
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
        "role": new_user.role,
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
async def get_current_user_info(current_user: dict = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user


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
