"""
Users API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr, UUID4
from datetime import datetime
import uuid
import base64

from ..core.security import get_current_active_user, get_password_hash, verify_password
from ..core.database import get_db
from ..models.users import User as UserModel, UserRole, UserStatus
from ..middleware.tenant import get_tenant_context
from ..middleware.permissions import has_permission
from ..models.permissions import Permission

router = APIRouter()


# Pydantic models
class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    user_role: Optional[str] = None  # Add user_role field
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
    status: Optional[str] = None  # Add status field
    
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
    team_id: Optional[UUID4] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get users based on role-based permissions"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    
    # Start with base query
    query = db.query(UserModel).filter(UserModel.is_deleted == False)
    
    # Apply filters based on role permissions
    if context.is_super_admin():
        # Super admin can see all users or filter by company
        if company_id:
            query = query.filter(UserModel.company_id == company_id)
    elif has_permission(current_user, Permission.MANAGE_COMPANY_USERS):
        # Company admin can see all users in their company
        query = query.filter(UserModel.company_id == company_id)
    elif has_permission(current_user, Permission.MANAGE_TEAM_USERS):
        # Sales manager can see users in their team
        user_team_id = current_user.get('team_id')
        if not user_team_id:
            return []
        query = query.filter(
            UserModel.company_id == company_id,
            UserModel.team_id == user_team_id
        )
    else:
        # Regular users can only see themselves
        query = query.filter(UserModel.id == current_user.get('id'))
    
    # Apply additional filters
    if team_id:
        # Check if user has permission to view this team
        if not context.is_super_admin() and not has_permission(current_user, Permission.MANAGE_COMPANY_USERS):
            user_team_id = current_user.get('team_id')
            if str(team_id) != str(user_team_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to view users from this team"
                )
        query = query.filter(UserModel.team_id == team_id)
    
    if role:
        query = query.filter(UserModel.user_role == role)
    
    if status:
        query = query.filter(UserModel.status == status)
    
    users = query.all()
    
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
            is_active=user.is_active,
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
    context = get_tenant_context(current_user)
    
    user = db.query(UserModel).filter(
        UserModel.id == user_id,
        UserModel.is_deleted == False
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check permissions
    if not context.is_super_admin():
        # Check if user is from the same company
        if str(user.company_id) != str(context.company_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this user"
            )
        
        # Company admin can view any user in their company
        if has_permission(current_user, Permission.MANAGE_COMPANY_USERS):
            pass
        # Sales manager can only view users in their team
        elif has_permission(current_user, Permission.MANAGE_TEAM_USERS):
            if str(user.team_id) != str(current_user.get('team_id')):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this user"
                )
        # Regular users can only view themselves
        elif str(user.id) != str(current_user.get('id')):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this user"
            )
    
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


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a user based on role-based permissions"""
    context = get_tenant_context(current_user)
    
    # Check if user has permission to update users
    can_update = False
    
    # Super admin can update any user
    if context.is_super_admin():
        can_update = True
    # Company admin can update users in their company
    elif has_permission(current_user, Permission.MANAGE_COMPANY_USERS):
        can_update = True
    # Sales manager can update users in their team
    elif has_permission(current_user, Permission.MANAGE_TEAM_USERS):
        can_update = True
    # Users can update their own profile
    elif str(current_user.get('id')) == user_id:
        can_update = True
    
    if not can_update:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update users"
        )
    
    user = db.query(UserModel).filter(
        UserModel.id == user_id,
        UserModel.is_deleted == False
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check access permissions
    if not context.is_super_admin():
        # Check if user is from the same company
        if str(user.company_id) != str(context.company_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this user"
            )
        
        # Sales manager can only update users in their team
        if has_permission(current_user, Permission.MANAGE_TEAM_USERS) and not has_permission(current_user, Permission.MANAGE_COMPANY_USERS):
            if str(user.team_id) != str(current_user.get('team_id')):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only update users in your team"
                )
            
            # Sales managers cannot change user roles to higher roles
            if user_update.role and user_update.role.lower() in ['super_admin', 'company_admin', 'admin']:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Sales managers cannot assign admin roles"
                )
        
        # Regular users can only update themselves
        if not has_permission(current_user, Permission.MANAGE_TEAM_USERS) and not has_permission(current_user, Permission.MANAGE_COMPANY_USERS):
            if str(user.id) != str(current_user.get('id')):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only update your own profile"
                )
            
            # Regular users cannot change their role
            if user_update.role is not None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You cannot change your own role"
                )
    
    # Update user fields
    if user_update.first_name is not None:
        user.first_name = user_update.first_name
    if user_update.last_name is not None:
        user.last_name = user_update.last_name
    if user_update.email is not None:
        # Normalize email to lowercase
        email_lower = user_update.email.lower()
        
        # Only check for duplicates if email is actually changing
        if user.email.lower() != email_lower:
            # Check if email is already taken by another user (case-insensitive)
            # Convert user_id to UUID for proper comparison
            user_id_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            
            existing = db.query(UserModel).filter(
                UserModel.email.ilike(email_lower),
                UserModel.id != user_id_uuid,
                UserModel.is_deleted == False
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="Email already in use")
        
        user.email = email_lower
    if user_update.role is not None:
        # Normalize role from display name to database format
        role_mapping = {
            'Admin': 'company_admin',
            'Company Admin': 'company_admin',
            'Sales Manager': 'sales_manager',
            'Sales Rep': 'sales_rep',
            'Regular User': 'company_user',
            'Support': 'support',
            'User': 'company_user'
        }
        
        # Get normalized role (or use as-is if already normalized)
        normalized_role = role_mapping.get(user_update.role, user_update.role.lower().replace(' ', '_'))
        
        # Prevent assigning super_admin role
        # Only admin@sunstonecrm.com can be super_admin
        if normalized_role in ['super_admin', 'super admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super Admin role cannot be assigned. Only the system super admin (admin@sunstonecrm.com) has this role."
            )
        
        user.role = normalized_role
        # Also update user_role to match
        user.user_role = normalized_role
    
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
    """Delete a user (soft delete) based on role-based permissions"""
    context = get_tenant_context(current_user)
    
    # Check if user has permission to delete users
    can_delete = False
    
    # Super admin can delete any user
    if context.is_super_admin():
        can_delete = True
    # Company admin can delete users in their company
    elif has_permission(current_user, Permission.MANAGE_COMPANY_USERS):
        can_delete = True
    # Sales manager can delete users in their team
    elif has_permission(current_user, Permission.MANAGE_TEAM_USERS):
        can_delete = True
    
    if not can_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete users"
        )
    
    # Prevent self-deletion
    if str(current_user["id"]) == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user = db.query(UserModel).filter(
        UserModel.id == user_id,
        UserModel.is_deleted == False
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check access permissions
    if not context.is_super_admin():
        # Check if user is from the same company
        if str(user.company_id) != str(context.company_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this user"
            )
        
        # Sales manager can only delete users in their team
        if has_permission(current_user, Permission.MANAGE_TEAM_USERS) and not has_permission(current_user, Permission.MANAGE_COMPANY_USERS):
            if str(user.team_id) != str(current_user.get('team_id')):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only delete users in your team"
                )
            
            # Sales managers cannot delete admins
            if user.user_role in [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN] or \
               (isinstance(user.user_role, str) and user.user_role.lower() in ['super_admin', 'company_admin', 'admin']):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Sales managers cannot delete admin users"
                )
        
        # Company admin cannot delete super admin
        if has_permission(current_user, Permission.MANAGE_COMPANY_USERS) and not context.is_super_admin():
            if user.user_role == UserRole.SUPER_ADMIN or \
               (isinstance(user.user_role, str) and user.user_role.lower() == 'super_admin'):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Company admins cannot delete super admin users"
                )
    
    # Soft delete
    user.is_deleted = True
    user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "User deleted successfully"}


@router.get("/assignable/list", response_model=List[UserResponse])
async def get_assignable_users(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get list of users that current user can assign deals/leads to"""
    context = get_tenant_context(current_user)
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = current_user.get('company_id')
    team_id = current_user.get('team_id')
    
    # Super Admin can assign to anyone in any company
    if context.is_super_admin():
        users = db.query(UserModel).filter(
            UserModel.is_deleted == False,
            UserModel.is_active == True
        ).all()
    
    # Company Admin can assign within their company
    elif has_permission(current_user, Permission.MANAGE_COMPANY_USERS):
        if not company_id:
            return []
        users = db.query(UserModel).filter(
            UserModel.company_id == company_id,
            UserModel.is_deleted == False,
            UserModel.is_active == True
        ).all()
    
    # Sales Manager can assign to their team members
    elif has_permission(current_user, Permission.MANAGE_TEAM_USERS):
        if not team_id:
            # If no team, can only assign to self
            users = db.query(UserModel).filter(
                UserModel.id == user_id,
                UserModel.is_deleted == False
            ).all()
        else:
            users = db.query(UserModel).filter(
                UserModel.team_id == team_id,
                UserModel.is_deleted == False,
                UserModel.is_active == True
            ).all()
    
    # Sales Rep cannot assign
    else:
        return []
    
    return [
        UserResponse(
            id=str(user.id),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.user_role.value if isinstance(user.user_role, UserRole) else user.user_role,
            user_role=user.user_role.value if isinstance(user.user_role, UserRole) else user.user_role,
            company_id=str(user.company_id) if user.company_id else None,
            phone=user.phone,
            title=user.title,
            department=user.department,
            location=user.location,
            bio=user.bio,
            avatar=user.avatar_url,
            team_id=str(user.team_id) if user.team_id else None,
            is_active=user.is_active,
            created_at=user.created_at,
            status=user.status.value if hasattr(user.status, 'value') else user.status
        )
        for user in users
    ]