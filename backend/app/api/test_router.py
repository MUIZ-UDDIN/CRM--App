from fastapi import APIRouter, Depends
from ..core.security import get_current_active_user

router = APIRouter()

@router.get("/simple")
def simple_test():
    """Public test"""
    return {"message": "Simple test working"}

@router.get("/auth")
def auth_test(current_user: dict = Depends(get_current_active_user)):
    """Authenticated test"""
    return {"message": "Auth test working", "user_email": current_user.get("email", "unknown")}
