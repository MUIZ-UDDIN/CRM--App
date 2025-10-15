"""
Users API endpoints
"""

from fastapi import APIRouter, Depends
from ..core.security import get_current_active_user

router = APIRouter()


@router.get("/me")
async def get_current_user(current_user: dict = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user


@router.get("/")
async def get_users(current_user: dict = Depends(get_current_active_user)):
    """Get all users (for team management)"""
    return {"message": "Users API endpoint - Coming soon"}