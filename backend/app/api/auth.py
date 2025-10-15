"""
Authentication API endpoints
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

from ..core.security import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    get_current_active_user,
    get_password_hash,
    MOCK_USERS
)

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
    username: str
    first_name: str
    last_name: str
    role: str
    team_id: Optional[str] = None
    is_active: bool


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Login endpoint"""
    user = authenticate_user(request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create tokens
    access_token = create_access_token(data={"sub": user["email"]})
    refresh_token = create_refresh_token(data={"sub": user["email"]})
    
    # Remove password hash from user data
    user_data = {k: v for k, v in user.items() if k != "hashed_password"}
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_data
    }


@router.post("/register", response_model=LoginResponse)
async def register(request: RegisterRequest):
    """Register new user endpoint"""
    # Check if user already exists
    if request.email in MOCK_USERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user (in production, this would be saved to database)
    user_id = str(len(MOCK_USERS) + 1)
    new_user = {
        "id": user_id,
        "email": request.email,
        "username": request.email.split("@")[0],
        "first_name": request.first_name,
        "last_name": request.last_name,
        "role": "Sales Rep",
        "team_id": None,
        "hashed_password": get_password_hash(request.password),
        "is_active": True,
    }
    
    # Add to mock database
    MOCK_USERS[request.email] = new_user
    
    # Create tokens
    access_token = create_access_token(data={"sub": new_user["email"]})
    refresh_token = create_refresh_token(data={"sub": new_user["email"]})
    
    # Remove password hash from user data
    user_data = {k: v for k, v in new_user.items() if k != "hashed_password"}
    
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