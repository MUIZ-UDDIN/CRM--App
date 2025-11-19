"""
Admin API endpoints for managing users across companies
Super Admin only
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import secrets
import string

from app.core.database import get_db
from app.core.security import get_current_user, get_password_hash
from app.models import User, Company, Team
from app.models.users import UserRole, UserStatus
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/api/admin", tags=["admin-users"])


class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    role: str
    team_id: str | None = None


class UserResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    role: str
    status: str
    created_at: str
    team_id: str | None = None

    class Config:
        from_attributes = True


class UserCreateResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    role: str
    password: str  # Generated password to show to admin

    class Config:
        from_attributes = True


class TeamResponse(BaseModel):
    id: str
    name: str

    class Config:
        from_attributes = True


class RoleUpdate(BaseModel):
    role: str


def generate_random_password(length: int = 12) -> str:
    """Generate a random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password


@router.get("/companies/{company_id}/users", response_model=List[UserResponse])
def get_company_users(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all users for a specific company (Super Admin only)"""
    # Check if user is super admin
    user = db.query(User).filter(User.id == current_user.get("id")).first()
    if not user or user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admins can access this endpoint"
        )
    
    # Verify company exists
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Get all users for this company
    users = db.query(User).filter(User.company_id == company_id).all()
    
    return users


@router.get("/companies/{company_id}/teams", response_model=List[TeamResponse])
def get_company_teams(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all teams for a specific company (Super Admin only)"""
    # Check if user is super admin
    user = db.query(User).filter(User.id == current_user.get("id")).first()
    if not user or user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admins can access this endpoint"
        )
    
    # Verify company exists
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Get all teams for this company
    teams = db.query(Team).filter(Team.company_id == company_id).all()
    
    return teams


@router.post("/companies/{company_id}/users", response_model=UserCreateResponse)
def create_company_user(
    company_id: str,
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new user for a specific company (Super Admin only)"""
    # Check if user is super admin
    admin_user = db.query(User).filter(User.id == current_user.get("id")).first()
    if not admin_user or admin_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admins can create users for companies"
        )
    
    # Verify company exists
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Check if email already exists (globally unique)
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{user_data.email}' is already registered in the system"
        )
    
    # Validate role
    try:
        role = UserRole(user_data.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {user_data.role}"
        )
    
    # Validate team requirement for Sales Manager
    if role == UserRole.SALES_MANAGER and not user_data.team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sales Manager must be assigned to a team"
        )
    
    # If team_id provided, verify it exists and belongs to this company
    if user_data.team_id:
        team = db.query(Team).filter(
            Team.id == user_data.team_id,
            Team.company_id == company_id
        ).first()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found or does not belong to this company"
            )
    
    # Generate random password
    password = generate_random_password()
    hashed_password = get_password_hash(password)
    
    # Create user
    new_user = User(
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        hashed_password=hashed_password,
        role=role,
        company_id=company_id,
        team_id=user_data.team_id if user_data.team_id else None,
        status=UserStatus.ACTIVE
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Return user with generated password
    return UserCreateResponse(
        id=str(new_user.id),
        first_name=new_user.first_name,
        last_name=new_user.last_name,
        email=new_user.email,
        role=new_user.role.value,
        password=password
    )


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a user permanently (Super Admin only)"""
    # Check if user is super admin
    admin_user = db.query(User).filter(User.id == current_user.get("id")).first()
    if not admin_user or admin_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admins can delete users"
        )
    
    # Get user to delete
    user_to_delete = db.query(User).filter(User.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent deleting super admin
    if user_to_delete.role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete Super Admin users"
        )
    
    # Delete user (cascade delete will handle related data)
    db.delete(user_to_delete)
    db.commit()
    
    return {"message": "User deleted successfully"}


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    role_update: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a user's role (Super Admin only)"""
    # Check if user is super admin
    admin_user = db.query(User).filter(User.id == current_user.get("id")).first()
    if not admin_user or admin_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admins can change user roles"
        )
    
    # Get user to update
    user_to_update = db.query(User).filter(User.id == user_id).first()
    if not user_to_update:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent changing super admin role
    if user_to_update.role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot change Super Admin role"
        )
    
    # Validate new role
    try:
        new_role = UserRole(role_update.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {role_update.role}"
        )
    
    # Prevent creating new super admins
    if new_role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot promote users to Super Admin"
        )
    
    # Update role
    user_to_update.role = new_role
    
    # If changing to Sales Manager, ensure they have a team
    if new_role == UserRole.SALES_MANAGER and not user_to_update.team_id:
        # Optionally, you could assign them to a default team or require team assignment
        pass
    
    db.commit()
    db.refresh(user_to_update)
    
    return {"message": "User role updated successfully", "new_role": new_role.value}
