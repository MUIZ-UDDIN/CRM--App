"""
Notifications API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.core.security import get_current_active_user
from app.core.database import get_db
from app.models.notifications import Notification as NotificationModel

router = APIRouter(tags=["Notifications"])


# Pydantic Models
class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str  # info, success, warning, error
    read: bool
    created_at: str
    link: Optional[str] = None
    extra_data: Optional[dict] = None
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user notifications"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    query = db.query(NotificationModel).filter(
        and_(
            NotificationModel.user_id == user_id,
            NotificationModel.company_id == company_id,
            NotificationModel.is_deleted == False
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
    notification_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark notification as read"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
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
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
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
    notification_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a notification"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
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
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
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
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
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
            notification.extra_data['isCall'] = False
            notification.extra_data['call_ended'] = True
            notification.extra_data['cleanup_reason'] = 'old_call'
            updated_count += 1
    
    db.commit()
    
    return {
        "message": f"Cleaned up {updated_count} old call notifications",
        "updated_count": updated_count
    }
