"""
Notifications API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, or_
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, UUID4
from datetime import datetime, timedelta
import uuid

from app.core.security import get_current_active_user
from app.core.database import get_db
from app.models.notifications import Notification as NotificationModel, NotificationType
from app.middleware.tenant import get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


# Pydantic Models
class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str  # info, success, warning, error
    read: bool
    created_at: str
    link: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None
    user_id: str
    company_id: Optional[str] = None
    
    class Config:
        from_attributes = True


class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "info"  # info, success, warning, error
    link: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None
    user_id: UUID4  # Target user ID


class BulkNotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "info"  # info, success, warning, error
    link: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None
    user_ids: List[UUID4]  # List of target user IDs
    team_id: Optional[UUID4] = None  # Optional team ID to send to all team members


@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    days: int = 30,  # Get notifications from the last X days
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user notifications"""
    context = get_tenant_context(current_user)
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No company associated with user")
    
    # Calculate date range
    date_from = datetime.utcnow() - timedelta(days=days)
    
    # Base query - user's notifications that aren't deleted
    query = db.query(NotificationModel).filter(
        and_(
            NotificationModel.user_id == user_id,
            NotificationModel.company_id == company_id,
            NotificationModel.is_deleted == False,
            NotificationModel.created_at >= date_from
        )
    )
    
    if unread_only:
        query = query.filter(NotificationModel.read == False)
    
    notifications = query.order_by(desc(NotificationModel.created_at)).limit(limit).all()
    
    return [
        NotificationResponse(
            id=str(n.id),
            title=n.title,
            message=n.message,
            type=n.type.value if n.type else "info",
            read=n.read,
            created_at=n.created_at.isoformat() if n.created_at else "",
            link=n.link,
            extra_data=n.extra_data if n.extra_data else None
        )
        for n in notifications
    ]


@router.get("/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    unread = db.query(NotificationModel).filter(
        and_(
            NotificationModel.user_id == user_id,
            NotificationModel.company_id == company_id,
            NotificationModel.read == False,
            NotificationModel.is_deleted == False
        )
    ).count()
    
    return {"count": unread}


@router.post("/{notification_id}/mark-read")
async def mark_as_read(
    notification_id: UUID4,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark notification as read"""
    context = get_tenant_context(current_user)
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No company associated with user")
    
    notification = db.query(NotificationModel).filter(
        and_(
            NotificationModel.id == uuid.UUID(notification_id),
            NotificationModel.user_id == user_id,
            NotificationModel.company_id == company_id,
            NotificationModel.is_deleted == False
        )
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.read = True
    db.commit()
    return {"message": "Notification marked as read"}


@router.post("/mark-all-read")
async def mark_all_read(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read"""
    context = get_tenant_context(current_user)
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No company associated with user")
    
    db.query(NotificationModel).filter(
        and_(
            NotificationModel.user_id == user_id,
            NotificationModel.company_id == company_id,
            NotificationModel.is_deleted == False
        )
    ).update({"read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: UUID4,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a notification"""
    context = get_tenant_context(current_user)
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No company associated with user")
    
    notification = db.query(NotificationModel).filter(
        and_(
            NotificationModel.id == uuid.UUID(notification_id),
            NotificationModel.user_id == user_id,
            NotificationModel.company_id == company_id,
            NotificationModel.is_deleted == False
        )
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_deleted = True
    db.commit()
    return {"message": "Notification deleted"}


@router.delete("/")
async def delete_all_notifications(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete all notifications"""
    context = get_tenant_context(current_user)
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No company associated with user")
    
    db.query(NotificationModel).filter(
        and_(
            NotificationModel.user_id == user_id,
            NotificationModel.company_id == company_id,
            NotificationModel.is_deleted == False
        )
    ).update({"is_deleted": True})
    db.commit()
    
    return {"message": "All notifications deleted"}


@router.post("/cleanup-old-calls")
async def cleanup_old_call_notifications(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark all old call notifications as ended (remove Answer/Decline buttons)"""
    context = get_tenant_context(current_user)
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No company associated with user")
    
    # Find all call notifications for this user
    call_notifications = db.query(NotificationModel).filter(
        and_(
            NotificationModel.user_id == user_id,
            NotificationModel.company_id == company_id,
            NotificationModel.is_deleted == False,
            NotificationModel.extra_data.isnot(None)
        )
    ).all()
    
    updated_count = 0
    for notification in call_notifications:
        if notification.extra_data and notification.extra_data.get('isCall'):
            # Mark as not a call anymore
            updated_data = dict(notification.extra_data)
            updated_data['isCall'] = False
            updated_data['call_ended'] = True
            updated_data['cleanup_reason'] = 'old_call'
            notification.extra_data = updated_data
            # Flag the column as modified for SQLAlchemy
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(notification, 'extra_data')
            updated_count += 1
    
    db.commit()
    
    return {
        "message": f"Cleaned up {updated_count} old call notifications",
        "updated_count": updated_count
    }


@router.post("/create", response_model=NotificationResponse)
async def create_notification(
    notification: NotificationCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a notification for a specific user"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    
    # Check permissions
    if not context.is_super_admin() and not has_permission(current_user, Permission.MANAGE_NOTIFICATIONS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create notifications"
        )
    
    # Check if target user exists and is in the same company
    from app.models.users import User
    target_user = db.query(User).filter(User.id == notification.user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found"
        )
    
    if str(target_user.company_id) != str(company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create notifications for users outside your company"
        )
    
    # Create notification
    try:
        notification_type = NotificationType(notification.type)
    except ValueError:
        notification_type = NotificationType.INFO
    
    new_notification = NotificationModel(
        title=notification.title,
        message=notification.message,
        type=notification_type,
        link=notification.link,
        extra_data=notification.extra_data,
        user_id=notification.user_id,
        company_id=uuid.UUID(company_id) if isinstance(company_id, str) else company_id
    )
    
    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)
    
    return new_notification


@router.post("/bulk-create")
async def create_bulk_notifications(
    notification: BulkNotificationCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create notifications for multiple users or a team"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    
    # Check permissions
    if not context.is_super_admin() and not has_permission(current_user, Permission.MANAGE_NOTIFICATIONS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create notifications"
        )
    
    # Get target users
    from app.models.users import User
    target_users = []
    
    # If team_id is provided, get all users in that team
    if notification.team_id:
        # Check if team exists and is in the same company
        from app.models.teams import Team
        team = db.query(Team).filter(
            Team.id == notification.team_id,
            Team.company_id == company_id
        ).first()
        
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found or not in your company"
            )
        
        # Get all users in the team
        team_users = db.query(User).filter(
            User.team_id == notification.team_id,
            User.company_id == company_id,
            User.is_deleted == False
        ).all()
        
        target_users.extend(team_users)
    
    # Add individual users
    if notification.user_ids:
        individual_users = db.query(User).filter(
            User.id.in_(notification.user_ids),
            User.company_id == company_id,
            User.is_deleted == False
        ).all()
        
        # Add users not already in the list
        for user in individual_users:
            if user not in target_users:
                target_users.append(user)
    
    if not target_users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid target users found"
        )
    
    # Create notifications
    try:
        notification_type = NotificationType(notification.type)
    except ValueError:
        notification_type = NotificationType.INFO
    
    created_count = 0
    for target_user in target_users:
        new_notification = NotificationModel(
            title=notification.title,
            message=notification.message,
            type=notification_type,
            link=notification.link,
            extra_data=notification.extra_data,
            user_id=target_user.id,
            company_id=uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        )
        
        db.add(new_notification)
        created_count += 1
    
    db.commit()
    
    return {
        "message": f"Created {created_count} notifications",
        "created_count": created_count
    }


@router.get("/admin", response_model=List[NotificationResponse])
async def get_all_company_notifications(
    user_id: Optional[UUID4] = None,
    days: int = 30,
    limit: int = 100,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all notifications for the company (admin only)"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    
    # Check permissions
    if not context.is_super_admin() and not has_permission(current_user, Permission.MANAGE_NOTIFICATIONS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view all company notifications"
        )
    
    # Calculate date range
    date_from = datetime.utcnow() - timedelta(days=days)
    
    # Base query
    query = db.query(NotificationModel).filter(
        and_(
            NotificationModel.company_id == company_id,
            NotificationModel.is_deleted == False,
            NotificationModel.created_at >= date_from
        )
    )
    
    # Filter by user if provided
    if user_id:
        query = query.filter(NotificationModel.user_id == user_id)
    
    # Get notifications
    notifications = query.order_by(desc(NotificationModel.created_at)).limit(limit).all()
    
    return [
        NotificationResponse(
            id=str(n.id),
            title=n.title,
            message=n.message,
            type=n.type.value if n.type else "info",
            read=n.read,
            created_at=n.created_at.isoformat() if n.created_at else "",
            link=n.link,
            extra_data=n.extra_data if n.extra_data else None,
            user_id=str(n.user_id),
            company_id=str(n.company_id) if n.company_id else None
        )
        for n in notifications
    ]
