"""
Bulk Email Campaigns API - SendGrid integration for mass email
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.email_campaigns import BulkEmailCampaign, BulkEmailAnalytics

router = APIRouter(prefix="/email-campaigns", tags=["Bulk Email Campaigns"])


# Pydantic Models
class CampaignResponse(BaseModel):
    id: str
    campaign_name: str
    subject: str
    status: str
    scheduled_at: Optional[datetime]
    sent_at: Optional[datetime]
    total_recipients: int
    total_sent: int
    total_delivered: int
    total_opened: int
    total_clicked: int
    total_bounced: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class CreateCampaignRequest(BaseModel):
    campaign_name: str
    subject: str
    body: str
    html_body: Optional[str] = None
    ip_pool: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    recipients: List[EmailStr]


class CampaignAnalyticsResponse(BaseModel):
    campaign_id: str
    recipient_email: str
    sent_at: Optional[datetime]
    delivered_at: Optional[datetime]
    opened_at: Optional[datetime]
    clicked_at: Optional[datetime]
    bounced_at: Optional[datetime]
    opened: bool
    clicked: bool
    bounced: bool
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[CampaignResponse])
async def list_campaigns(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all email campaigns"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    query = db.query(BulkEmailCampaign).filter(
        BulkEmailCampaign.user_id == user_id,
        BulkEmailCampaign.is_deleted == False
    )
    
    if status:
        query = query.filter(BulkEmailCampaign.status == status)
    
    campaigns = query.order_by(
        BulkEmailCampaign.created_at.desc()
    ).offset(offset).limit(limit).all()
    
    return [
        {
            "id": str(c.id),
            "campaign_name": c.campaign_name,
            "subject": c.subject,
            "status": c.status,
            "scheduled_at": c.scheduled_at,
            "sent_at": c.sent_at,
            "total_recipients": c.total_recipients,
            "total_sent": c.total_sent,
            "total_delivered": c.total_delivered,
            "total_opened": c.total_opened,
            "total_clicked": c.total_clicked,
            "total_bounced": c.total_bounced,
            "created_at": c.created_at
        }
        for c in campaigns
    ]


@router.post("/", response_model=CampaignResponse, status_code=201)
async def create_campaign(
    request: CreateCampaignRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new email campaign"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # Determine status
    status = "scheduled" if request.scheduled_at else "draft"
    
    campaign = BulkEmailCampaign(
        user_id=user_id,
        campaign_name=request.campaign_name,
        subject=request.subject,
        body=request.body,
        html_body=request.html_body,
        ip_pool=request.ip_pool,
        scheduled_at=request.scheduled_at,
        status=status,
        total_recipients=len(request.recipients)
    )
    
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    # Create analytics records for each recipient
    for email in request.recipients:
        analytics = BulkEmailAnalytics(
            campaign_id=campaign.id,
            recipient_email=email
        )
        db.add(analytics)
    
    db.commit()
    
    return {
        "id": str(campaign.id),
        "campaign_name": campaign.campaign_name,
        "subject": campaign.subject,
        "status": campaign.status,
        "scheduled_at": campaign.scheduled_at,
        "sent_at": campaign.sent_at,
        "total_recipients": campaign.total_recipients,
        "total_sent": campaign.total_sent,
        "total_delivered": campaign.total_delivered,
        "total_opened": campaign.total_opened,
        "total_clicked": campaign.total_clicked,
        "total_bounced": campaign.total_bounced,
        "created_at": campaign.created_at
    }


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get campaign details"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    campaign = db.query(BulkEmailCampaign).filter(
        BulkEmailCampaign.id == uuid.UUID(campaign_id),
        BulkEmailCampaign.user_id == user_id,
        BulkEmailCampaign.is_deleted == False
    ).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {
        "id": str(campaign.id),
        "campaign_name": campaign.campaign_name,
        "subject": campaign.subject,
        "status": campaign.status,
        "scheduled_at": campaign.scheduled_at,
        "sent_at": campaign.sent_at,
        "total_recipients": campaign.total_recipients,
        "total_sent": campaign.total_sent,
        "total_delivered": campaign.total_delivered,
        "total_opened": campaign.total_opened,
        "total_clicked": campaign.total_clicked,
        "total_bounced": campaign.total_bounced,
        "created_at": campaign.created_at
    }


@router.post("/{campaign_id}/send")
async def send_campaign(
    campaign_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send or schedule campaign"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    campaign = db.query(BulkEmailCampaign).filter(
        BulkEmailCampaign.id == uuid.UUID(campaign_id),
        BulkEmailCampaign.user_id == user_id,
        BulkEmailCampaign.is_deleted == False
    ).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status not in ['draft', 'scheduled']:
        raise HTTPException(status_code=400, detail="Campaign already sent or in progress")
    
    # Update status
    if campaign.scheduled_at and campaign.scheduled_at > datetime.utcnow():
        campaign.status = "scheduled"
    else:
        campaign.status = "sending"
        campaign.sent_at = datetime.utcnow()
        # TODO: Trigger actual SendGrid sending
    
    campaign.updated_at = datetime.utcnow()
    db.commit()
    
    return {
        "message": "Campaign queued for sending" if campaign.status == "sending" else "Campaign scheduled",
        "campaign_id": str(campaign.id),
        "status": campaign.status
    }


@router.get("/{campaign_id}/analytics", response_model=List[CampaignAnalyticsResponse])
async def get_campaign_analytics(
    campaign_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get detailed analytics for a campaign"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # Verify campaign ownership
    campaign = db.query(BulkEmailCampaign).filter(
        BulkEmailCampaign.id == uuid.UUID(campaign_id),
        BulkEmailCampaign.user_id == user_id
    ).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    analytics = db.query(BulkEmailAnalytics).filter(
        BulkEmailAnalytics.campaign_id == uuid.UUID(campaign_id)
    ).all()
    
    return [
        {
            "campaign_id": str(a.campaign_id),
            "recipient_email": a.recipient_email,
            "sent_at": a.sent_at,
            "delivered_at": a.delivered_at,
            "opened_at": a.opened_at,
            "clicked_at": a.clicked_at,
            "bounced_at": a.bounced_at,
            "opened": a.opened,
            "clicked": a.clicked,
            "bounced": a.bounced
        }
        for a in analytics
    ]


@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a campaign"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    campaign = db.query(BulkEmailCampaign).filter(
        BulkEmailCampaign.id == uuid.UUID(campaign_id),
        BulkEmailCampaign.user_id == user_id
    ).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status in ['sending', 'sent']:
        raise HTTPException(status_code=400, detail="Cannot delete sent or sending campaign")
    
    campaign.is_deleted = True
    campaign.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Campaign deleted successfully"}
