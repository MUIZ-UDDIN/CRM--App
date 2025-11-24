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
        json_encoders = {
            'UUID': str,
            'datetime': lambda v: v.isoformat() if v else None
        }
    
    @classmethod
    def from_orm(cls, obj):
        # Use user_role (the correct enum field) instead of role (legacy string field)
        role_value = obj.user_role if obj.user_role else 'sales_rep'
        
        return cls(
            id=str(obj.id),
            first_name=obj.first_name,
            last_name=obj.last_name,
            email=obj.email,
            role=role_value,
            status=obj.status if isinstance(obj.status, str) else (obj.status.value if hasattr(obj.status, 'value') else str(obj.status)),
            created_at=obj.created_at.isoformat() if obj.created_at else "",
            team_id=str(obj.team_id) if obj.team_id else None
        )


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
    
    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=str(obj.id),
            name=obj.name
        )


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
    
    # Debug logging
    for user in users:
        print(f"DEBUG - User: {user.email}")
        print(f"  Legacy role field: {user.role}")
        print(f"  Correct user_role field: {user.user_role}")
        print(f"  user_role type: {type(user.user_role)}")
    
    result = [UserResponse.from_orm(user) for user in users]
    
    # Debug the serialized result
    for r in result:
        print(f"DEBUG - Serialized user: {r.email}, role: '{r.role}'")
    
    return result


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
    
    return [TeamResponse.from_orm(team) for team in teams]


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
        user_role=role,  # Use user_role (correct field) instead of role (legacy field)
        role=role,  # Also set legacy field for backward compatibility
        company_id=company_id,
        team_id=user_data.team_id if user_data.team_id else None,
        status=UserStatus.ACTIVE
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Send notifications
    try:
        from app.services.notification_service import NotificationService
        
        creator = db.query(User).filter(User.id == current_user.get("id")).first()
        creator_name = f"{creator.first_name} {creator.last_name}" if creator else "Super Admin"
        new_user_name = f"{new_user.first_name} {new_user.last_name}"
        
        NotificationService.notify_user_created(
            db=db,
            new_user_id=new_user.id,
            new_user_name=new_user_name,
            new_user_role=role.value,
            creator_id=admin_user.id,
            creator_name=creator_name,
            company_id=uuid.UUID(company_id)
        )
    except Exception as notification_error:
        # Don't fail the user creation if notifications fail
        print(f"Notification error: {notification_error}")
    
    # Return user with generated password
    return UserCreateResponse(
        id=str(new_user.id),
        first_name=new_user.first_name,
        last_name=new_user.last_name,
        email=new_user.email,
        role=new_user.user_role,  # Use user_role field
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
    if not admin_user or admin_user.user_role != UserRole.SUPER_ADMIN:
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
    if user_to_delete.user_role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete Super Admin users"
        )
    
    # Import all models that reference users
    from app.models.deals import Deal
    from app.models.contacts import Contact
    from app.models.sms import SMSMessage
    from app.models.notifications import Notification
    from app.models.quotes import Quote
    from app.models.activities import Activity
    from app.models.calls import Call
    from app.models.emails import Email
    from app.models.documents import Document
    from app.models.files import File, Folder
    from app.models.workflows import Workflow
    from app.models.call_transcripts import CallTranscript
    from app.models.conversations import UserConversation
    from app.models.email_campaigns import BulkEmailCampaign
    from app.models.analytics import (
        ActivityMetrics, EmailMetrics, CallMetrics, ContactMetrics, 
        DocumentMetrics
    )
    from sqlalchemy import or_
    
    try:
        # Get all contacts owned by this user first (we need their IDs for cascade)
        user_contacts = db.query(Contact).filter(Contact.owner_id == user_id).all()
        contact_ids = [contact.id for contact in user_contacts]
        
        # 1. Delete analytics metrics (no foreign key constraints on them)
        db.query(ActivityMetrics).filter(ActivityMetrics.user_id == user_id).delete(synchronize_session=False)
        db.query(EmailMetrics).filter(EmailMetrics.user_id == user_id).delete(synchronize_session=False)
        db.query(CallMetrics).filter(CallMetrics.user_id == user_id).delete(synchronize_session=False)
        db.query(ContactMetrics).filter(ContactMetrics.owner_id == user_id).delete(synchronize_session=False)
        db.query(DocumentMetrics).filter(DocumentMetrics.owner_id == user_id).delete(synchronize_session=False)
        
        # 2. Delete quotes owned by user
        db.query(Quote).filter(Quote.owner_id == user_id).delete(synchronize_session=False)
        
        # 3. Delete workflows owned by user
        db.query(Workflow).filter(Workflow.owner_id == user_id).delete(synchronize_session=False)
        
        # 4. Delete email campaigns
        db.query(BulkEmailCampaign).filter(BulkEmailCampaign.user_id == user_id).delete(synchronize_session=False)
        
        # 5. Delete call transcripts
        db.query(CallTranscript).filter(CallTranscript.user_id == user_id).delete(synchronize_session=False)
        
        # 6. Delete user conversations
        db.query(UserConversation).filter(UserConversation.user_id == user_id).delete(synchronize_session=False)
        
        # 7. Delete activities owned by user
        db.query(Activity).filter(Activity.owner_id == user_id).delete(synchronize_session=False)
        
        # 8. Delete calls made by user
        db.query(Call).filter(Call.user_id == user_id).delete(synchronize_session=False)
        
        # 9. Delete emails owned by user
        db.query(Email).filter(Email.owner_id == user_id).delete(synchronize_session=False)
        
        # 10. Delete documents owned by user
        db.query(Document).filter(Document.owner_id == user_id).delete(synchronize_session=False)
        
        # 11. Delete files and folders owned by user
        db.query(File).filter(File.owner_id == user_id).delete(synchronize_session=False)
        db.query(Folder).filter(Folder.owner_id == user_id).delete(synchronize_session=False)
        
        # 12. Delete all deals related to this user (owned by user OR linked to user's contacts)
        if contact_ids:
            db.query(Deal).filter(
                or_(
                    Deal.owner_id == user_id,
                    Deal.contact_id.in_(contact_ids)
                )
            ).delete(synchronize_session=False)
        else:
            db.query(Deal).filter(Deal.owner_id == user_id).delete(synchronize_session=False)
        
        # 13. Delete SMS messages for user's contacts
        if contact_ids:
            db.query(SMSMessage).filter(SMSMessage.contact_id.in_(contact_ids)).delete(synchronize_session=False)
        
        # 14. Delete all contacts owned by this user
        db.query(Contact).filter(Contact.owner_id == user_id).delete(synchronize_session=False)
        
        # 15. Delete all notifications for this user
        db.query(Notification).filter(Notification.user_id == user_id).delete(synchronize_session=False)
        
    except Exception as e:
        print(f"Error during cascade delete: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user's related data: {str(e)}"
        )
    
    # Delete user (cascade delete will handle other related data)
    try:
        deleted_user_name = f"{user_to_delete.first_name} {user_to_delete.last_name}"
        company_id = user_to_delete.company_id
        
        db.delete(user_to_delete)
        db.commit()
        
        # Send deletion notification
        try:
            from app.services.notification_service import NotificationService
            deleter_name = f"{admin_user.first_name} {admin_user.last_name}" if admin_user else "Super Admin"
            
            NotificationService.notify_user_deleted(
                db=db,
                deleted_user_name=deleted_user_name,
                deleter_id=admin_user.id,
                deleter_name=deleter_name,
                company_id=company_id
            )
        except Exception as e:
            print(f"⚠️ Failed to send user deletion notification: {e}")
            
    except Exception as e:
        print(f"Error deleting user: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )
    
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
    if not admin_user or admin_user.user_role != UserRole.SUPER_ADMIN:
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
    if user_to_update.user_role == UserRole.SUPER_ADMIN:
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
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot promote users to Super Admin role"
        )
    
    # Prevent demoting the only Company Admin in a company
    if user_to_update.user_role == UserRole.COMPANY_ADMIN and new_role != UserRole.COMPANY_ADMIN:
        # Check if this is the only Company Admin in the company
        other_admins = db.query(User).filter(
            User.company_id == user_to_update.company_id,
            User.user_role == UserRole.COMPANY_ADMIN,
            User.id != user_to_update.id,
            User.is_deleted == False
        ).count()
        
        if other_admins == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change role. This is the only Company Admin for this company. Please assign another Company Admin first before changing this user's role."
            )
    
    # Check if changing to Company Admin and there's already one
    if new_role == UserRole.COMPANY_ADMIN:
        existing_admin = db.query(User).filter(
            User.company_id == user_to_update.company_id,
            User.user_role == UserRole.COMPANY_ADMIN,
            User.id != user_to_update.id,
            User.is_deleted == False
        ).first()
        
        if existing_admin:
            admin_name = f"{existing_admin.first_name} {existing_admin.last_name}"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This company already has a Company Admin ({admin_name}). Please change their role first or contact support."
            )
    
    # Check if changing to Sales Manager and ensure they have a team
    if new_role == UserRole.SALES_MANAGER and not user_to_update.team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign Sales Manager role. User must be assigned to a team first. Please assign them to a team and try again."
        )
    
    # Store old role for notification
    old_role = user_to_update.user_role.value if user_to_update.user_role else "unknown"
    
    # Update role
    user_to_update.user_role = new_role
    user_to_update.role = new_role.value  # Also update legacy field
    
    db.commit()
    db.refresh(user_to_update)
    
    # Send notifications
    try:
        from app.services.notification_service import NotificationService
        import uuid
        
        changer_name = f"{admin_user.first_name} {admin_user.last_name}" if admin_user else "Super Admin"
        target_user_name = f"{user_to_update.first_name} {user_to_update.last_name}"
        
        NotificationService.notify_user_role_changed(
            db=db,
            target_user_id=user_to_update.id,
            target_user_name=target_user_name,
            old_role=old_role,
            new_role=new_role.value,
            changer_id=admin_user.id,
            changer_name=changer_name,
            company_id=user_to_update.company_id
        )
    except Exception as notification_error:
        # Don't fail the role update if notifications fail
        print(f"Notification error: {notification_error}")
    
    return {"message": "User role updated successfully", "new_role": new_role.value}
