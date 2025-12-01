"""
Performance Alerts API - Automated alerts for underperforming numbers/campaigns
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.performance_alerts import PerformanceAlert

router = APIRouter(prefix="/alerts", tags=["Performance Alerts"])


# Pydantic Models
class AlertResponse(BaseModel):
    id: str
    alert_type: str
    severity: str
    title: str
    message: str
    metric_value: Optional[float]
    threshold_value: Optional[float]
    related_entity_type: Optional[str]
    related_entity_id: Optional[str]
    is_read: bool
    is_resolved: bool
    created_at: datetime
    resolved_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class CreateAlertRequest(BaseModel):
    alert_type: str
    severity: str = "medium"
    title: str
    message: str
    metric_value: Optional[float] = None
    threshold_value: Optional[float] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None


@router.get("/", response_model=List[AlertResponse])
async def list_alerts(
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    is_resolved: Optional[bool] = Query(None, description="Filter by resolved status"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all alerts for current user"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    query = db.query(PerformanceAlert).filter(
        PerformanceAlert.user_id == user_id,
        PerformanceAlert.company_id == company_id,
        PerformanceAlert.is_deleted == False
    )
    
    if is_read is not None:
        query = query.filter(PerformanceAlert.is_read == is_read)
    if is_resolved is not None:
        query = query.filter(PerformanceAlert.is_resolved == is_resolved)
    if severity:
        query = query.filter(PerformanceAlert.severity == severity)
    
    alerts = query.order_by(
        PerformanceAlert.created_at.desc()
    ).offset(offset).limit(limit).all()
    
    return [
        {
            "id": str(a.id),
            "alert_type": a.alert_type,
            "severity": a.severity,
            "title": a.title,
            "message": a.message,
            "metric_value": float(a.metric_value) if a.metric_value else None,
            "threshold_value": float(a.threshold_value) if a.threshold_value else None,
            "related_entity_type": a.related_entity_type,
            "related_entity_id": str(a.related_entity_id) if a.related_entity_id else None,
            "is_read": a.is_read,
            "is_resolved": a.is_resolved,
            "created_at": a.created_at,
            "resolved_at": a.resolved_at
        }
        for a in alerts
    ]


@router.get("/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get count of unread alerts"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    count = db.query(PerformanceAlert).filter(
        PerformanceAlert.user_id == user_id,
        PerformanceAlert.company_id == company_id,
        PerformanceAlert.is_read == False,
        PerformanceAlert.is_deleted == False
    ).count()
    
    return {"unread_count": count}


@router.post("/", response_model=AlertResponse, status_code=201)
async def create_alert(
    request: CreateAlertRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new performance alert"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    alert = PerformanceAlert(
        user_id=user_id,
        company_id=company_id,
        alert_type=request.alert_type,
        severity=request.severity,
        title=request.title,
        message=request.message,
        metric_value=request.metric_value,
        threshold_value=request.threshold_value,
        related_entity_type=request.related_entity_type,
        related_entity_id=uuid.UUID(request.related_entity_id) if request.related_entity_id else None
    )
    
    db.add(alert)
    db.commit()
    db.refresh(alert)
    
    return {
        "id": str(alert.id),
        "alert_type": alert.alert_type,
        "severity": alert.severity,
        "title": alert.title,
        "message": alert.message,
        "metric_value": float(alert.metric_value) if alert.metric_value else None,
        "threshold_value": float(alert.threshold_value) if alert.threshold_value else None,
        "related_entity_type": alert.related_entity_type,
        "related_entity_id": str(alert.related_entity_id) if alert.related_entity_id else None,
        "is_read": alert.is_read,
        "is_resolved": alert.is_resolved,
        "created_at": alert.created_at,
        "resolved_at": alert.resolved_at
    }


@router.patch("/{alert_id}/read")
async def mark_as_read(
    alert_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark alert as read"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    alert = db.query(PerformanceAlert).filter(
        PerformanceAlert.id == uuid.UUID(alert_id),
        PerformanceAlert.user_id == user_id,
        PerformanceAlert.company_id == company_id
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_read = True
    alert.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Alert marked as read"}


@router.patch("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Resolve an alert"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    alert = db.query(PerformanceAlert).filter(
        PerformanceAlert.id == uuid.UUID(alert_id),
        PerformanceAlert.user_id == user_id,
        PerformanceAlert.company_id == company_id
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_resolved = True
    alert.resolved_at = datetime.utcnow()
    alert.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Alert resolved successfully"}


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete an alert"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    alert = db.query(PerformanceAlert).filter(
        PerformanceAlert.id == uuid.UUID(alert_id),
        PerformanceAlert.user_id == user_id,
        PerformanceAlert.company_id == company_id
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Permanent delete
    db.delete(alert)
    db.commit()
    
    return {"message": "Alert deleted successfully"}
