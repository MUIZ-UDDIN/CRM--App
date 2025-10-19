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

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# Pydantic Models
class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str  # info, success, warning, error
    read: bool
    created_at: str
    link: Optional[str] = None


# Mock notifications for now
MOCK_NOTIFICATIONS = []


@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user: dict = Depends(get_current_active_user)
):
    """Get user notifications"""
    notifications = MOCK_NOTIFICATIONS.copy()
    
    if unread_only:
        notifications = [n for n in notifications if not n.get("read", False)]
    
    return notifications[:limit]


@router.get("/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_active_user)
):
    """Get count of unread notifications"""
    unread = len([n for n in MOCK_NOTIFICATIONS if not n.get("read", False)])
    return {"count": unread}


@router.post("/{notification_id}/mark-read")
async def mark_as_read(
    notification_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Mark notification as read"""
    notification = next((n for n in MOCK_NOTIFICATIONS if n["id"] == notification_id), None)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification["read"] = True
    return {"message": "Notification marked as read"}


@router.post("/mark-all-read")
async def mark_all_read(
    current_user: dict = Depends(get_current_active_user)
):
    """Mark all notifications as read"""
    for notification in MOCK_NOTIFICATIONS:
        notification["read"] = True
    
    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Delete a notification"""
    global MOCK_NOTIFICATIONS
    MOCK_NOTIFICATIONS = [n for n in MOCK_NOTIFICATIONS if n["id"] != notification_id]
    
    return {"message": "Notification deleted"}


@router.delete("/")
async def delete_all_notifications(
    current_user: dict = Depends(get_current_active_user)
):
    """Delete all notifications"""
    global MOCK_NOTIFICATIONS
    MOCK_NOTIFICATIONS = []
    
    return {"message": "All notifications deleted"}
