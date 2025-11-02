"""
Users API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
import uuid
import base64

from ..core.security import get_current_active_user, get_password_hash, verify_password
from ..core.database import get_db
from ..models.users import User as UserModel

router = APIRouter()


# Pydantic models
class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    company_id: Optional[str] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    team_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user information"""
    user = db.query(UserModel).filter(UserModel.id == current_user["id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.user_role.value if hasattr(user.user_role, 'value') else str(user.user_role),
        company_id=str(user.company_id) if user.company_id else None,
        phone=user.phone,
        title=user.title,
        department=user.department,
        location=user.location,
        bio=user.bio,
        avatar=user.avatar_url,
        team_id=str(user.team_id) if user.team_id else None,
        is_active=True,
        created_at=user.created_at
    )


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user information"""
    user = db.query(UserModel).filter(UserModel.id == current_user["id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        phone=user.phone,
        title=user.title,
        department=user.department,
        location=user.location,
        bio=user.bio,
        avatar=user.avatar_url,
        team_id=str(user.team_id) if user.team_id else None,
        is_active=True,
        created_at=user.created_at
    )


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload user avatar - stores as base64 data URL"""
    user = db.query(UserModel).filter(UserModel.id == current_user["id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPG, JPEG, and PNG images are allowed")
    
    # Validate file size (5MB max)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size must be less than 5MB")
    
    # Delete old avatar (if exists and is base64 data)
    # Note: We're storing in database, so just overwriting is fine
    # In production with S3/Cloudinary, you'd delete the old file here
    old_avatar = user.avatar_url
    if old_avatar and old_avatar.startswith('data:image'):
        # Old base64 image will be garbage collected
        pass
    
    # Convert to base64 data URL for storage
    base64_image = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{base64_image}"
    
    # Save to database (overwrites old avatar)
    user.avatar_url = data_url
    user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"avatar": data_url, "message": "Avatar uploaded successfully"}


@router.post("/me/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    user = db.query(UserModel).filter(UserModel.id == current_user["id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(password_data.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password
    user.hashed_password = get_password_hash(password_data.new_password)
    user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Password changed successfully"}


@router.get("/", response_model=List[UserResponse])
async def get_all_users(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all users from current user's company (for team management)"""
    company_id = current_user.get('company_id')
    
    # Super admin can see all users, others only see their company's users
    if current_user.get('role') == 'super_admin':
        users = db.query(UserModel).filter(UserModel.is_deleted == False).all()
    elif company_id:
        users = db.query(UserModel).filter(
            UserModel.is_deleted == False,
            UserModel.company_id == company_id
        ).all()
    else:
        users = []
    
    return [
        UserResponse(
            id=str(user.id),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            phone=user.phone,
            title=user.title,
            department=user.department,
            location=user.location,
            bio=user.bio,
            avatar=user.avatar_url,
            team_id=str(user.team_id) if user.team_id else None,
            is_active=True,
            created_at=user.created_at
        )
        for user in users
    ]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get specific user by ID"""
    user = db.query(UserModel).filter(
        UserModel.id == user_id,
        UserModel.is_deleted == False
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        phone=user.phone,
        title=user.title,
        department=user.department,
        location=user.location,
        bio=user.bio,
        avatar=user.avatar_url,
        team_id=str(user.team_id) if user.team_id else None,
        is_active=True,
        created_at=user.created_at
    )


@router.delete("/me")
async def delete_own_account(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete own account (permanent deletion)"""
    import uuid
    from sqlalchemy import text
    
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # Check if user exists
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        # Delete related data first using raw SQL to avoid relationship loading issues
        db.execute(text("DELETE FROM twilio_settings WHERE user_id = :user_id"), {"user_id": user_id})
        db.execute(text("DELETE FROM workflows WHERE owner_id = :user_id"), {"user_id": user_id})
        db.execute(text("DELETE FROM folders WHERE owner_id = :user_id"), {"user_id": user_id})
        db.execute(text("DELETE FROM files WHERE owner_id = :user_id"), {"user_id": user_id})
        db.execute(text("DELETE FROM documents WHERE owner_id = :user_id"), {"user_id": user_id})
        db.execute(text("DELETE FROM deals WHERE owner_id = :user_id"), {"user_id": user_id})
        db.execute(text("DELETE FROM activities WHERE owner_id = :user_id"), {"user_id": user_id})
        db.execute(text("DELETE FROM contacts WHERE owner_id = :user_id"), {"user_id": user_id})
        
        # Now delete the user
        db.execute(text("DELETE FROM users WHERE id = :user_id"), {"user_id": user_id})
        db.commit()
        
        return {"message": "Account permanently deleted"}
    except Exception as e:
        db.rollback()
        print(f"Error deleting account: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete account. Please try again.")


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a user - Admin only"""
    # Check if current user is admin
    if current_user.get("role") not in ["Admin", "Super Admin"]:
        raise HTTPException(status_code=403, detail="Only admins can update users")
    
    user = db.query(UserModel).filter(
        UserModel.id == user_id,
        UserModel.is_deleted == False
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user fields
    if user_update.first_name is not None:
        user.first_name = user_update.first_name
    if user_update.last_name is not None:
        user.last_name = user_update.last_name
    if user_update.email is not None:
        # Normalize email to lowercase
        email_lower = user_update.email.lower()
        # Check if email is already taken by another user (case-insensitive)
        existing = db.query(UserModel).filter(
            UserModel.email.ilike(email_lower),
            UserModel.id != user_id,
            UserModel.is_deleted == False
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = email_lower
    if user_update.role is not None:
        user.role = user_update.role
    
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        phone=user.phone,
        title=user.title,
        department=user.department,
        location=user.location,
        bio=user.bio,
        avatar=user.avatar_url,
        team_id=str(user.team_id) if user.team_id else None,
        is_active=user.is_active,
        created_at=user.created_at
    )


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a user (soft delete) - Admin only"""
    # Check if current user is admin
    if current_user.get("role") not in ["Admin", "Super Admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    
    # Prevent self-deletion
    if str(current_user["id"]) == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user = db.query(UserModel).filter(
        UserModel.id == user_id,
        UserModel.is_deleted == False
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Soft delete
    user.is_deleted = True
    user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "User deleted successfully"}