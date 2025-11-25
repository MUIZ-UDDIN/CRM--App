"""
Email Settings API endpoints
Allows companies to configure SendGrid and Gmail integrations
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.email_settings import EmailSettings as EmailSettingsModel
from app.middleware.tenant import get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

router = APIRouter(prefix="/email-settings", tags=["Email Settings"])


# Pydantic Models
class SendGridSettingsCreate(BaseModel):
    api_key: str = Field(..., description="SendGrid API Key")
    from_email: EmailStr = Field(..., description="Verified sender email")
    from_name: str = Field(..., description="Sender name")


class GmailSettingsUpdate(BaseModel):
    sync_enabled: Optional[bool] = None
    sync_frequency: Optional[str] = Field(None, description="5min, 15min, 30min, 1hour")


class EmailSettingsResponse(BaseModel):
    sendgrid_enabled: bool
    sendgrid_from_email: Optional[str]
    sendgrid_from_name: Optional[str]
    gmail_enabled: bool
    gmail_email: Optional[str]
    gmail_sync_enabled: Optional[bool]
    gmail_sync_frequency: Optional[str]
    default_provider: str

    class Config:
        from_attributes = True


# Get email settings
@router.get("/", response_model=EmailSettingsResponse)
async def get_email_settings(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get email settings for current company"""
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
    
    settings = db.query(EmailSettingsModel).filter(
        EmailSettingsModel.company_id == company_id
    ).first()
    
    if not settings:
        # Return default settings
        return EmailSettingsResponse(
            sendgrid_enabled=False,
            sendgrid_from_email=None,
            sendgrid_from_name=None,
            gmail_enabled=False,
            gmail_email=None,
            gmail_sync_enabled=False,
            gmail_sync_frequency="5min",
            default_provider="sendgrid"
        )
    
    return EmailSettingsResponse(
        sendgrid_enabled=settings.sendgrid_enabled or False,
        sendgrid_from_email=settings.sendgrid_from_email,
        sendgrid_from_name=settings.sendgrid_from_name,
        gmail_enabled=settings.gmail_enabled or False,
        gmail_email=settings.gmail_email,
        gmail_sync_enabled=settings.gmail_sync_enabled,
        gmail_sync_frequency=settings.gmail_sync_frequency,
        default_provider=settings.default_provider or "sendgrid"
    )


# SendGrid endpoints
@router.post("/sendgrid")
async def save_sendgrid_settings(
    settings: SendGridSettingsCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Save SendGrid settings for current company"""
    # Check permission
    if not has_permission(current_user, Permission.MANAGE_COMPANY_INTEGRATIONS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage integrations"
        )
    
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
    
    # Get or create email settings
    email_settings = db.query(EmailSettingsModel).filter(
        EmailSettingsModel.company_id == company_id
    ).first()
    
    if not email_settings:
        email_settings = EmailSettingsModel(
            company_id=company_id,
            sendgrid_api_key=settings.api_key,
            sendgrid_from_email=settings.from_email,
            sendgrid_from_name=settings.from_name,
            sendgrid_enabled=True,
            default_provider="sendgrid"
        )
        db.add(email_settings)
    else:
        email_settings.sendgrid_api_key = settings.api_key
        email_settings.sendgrid_from_email = settings.from_email
        email_settings.sendgrid_from_name = settings.from_name
        email_settings.sendgrid_enabled = True
        email_settings.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(email_settings)
    
    return {"message": "SendGrid settings saved successfully"}


@router.get("/sendgrid")
async def get_sendgrid_settings(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get SendGrid settings for current company"""
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
    
    settings = db.query(EmailSettingsModel).filter(
        EmailSettingsModel.company_id == company_id
    ).first()
    
    if not settings or not settings.sendgrid_enabled:
        return {"enabled": False}
    
    return {
        "enabled": True,
        "from_email": settings.sendgrid_from_email,
        "from_name": settings.sendgrid_from_name
    }


@router.delete("/sendgrid")
async def delete_sendgrid_settings(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Disconnect SendGrid for current company"""
    # Check permission
    if not has_permission(current_user, Permission.MANAGE_COMPANY_INTEGRATIONS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage integrations"
        )
    
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
    
    settings = db.query(EmailSettingsModel).filter(
        EmailSettingsModel.company_id == company_id
    ).first()
    
    if settings:
        settings.sendgrid_api_key = None
        settings.sendgrid_from_email = None
        settings.sendgrid_from_name = None
        settings.sendgrid_enabled = False
        settings.updated_at = datetime.utcnow()
        db.commit()
    
    return {"message": "SendGrid disconnected successfully"}


# Gmail endpoints
@router.get("/gmail/auth-url")
async def get_gmail_auth_url(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get Gmail OAuth authorization URL"""
    # Check permission
    if not has_permission(current_user, Permission.MANAGE_COMPANY_INTEGRATIONS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage integrations"
        )
    
    # TODO: Implement Gmail OAuth flow
    # This will require Google OAuth credentials and redirect URI setup
    return {
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
        "message": "Gmail OAuth integration coming soon"
    }


@router.get("/gmail")
async def get_gmail_settings(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get Gmail settings for current company"""
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
    
    settings = db.query(EmailSettingsModel).filter(
        EmailSettingsModel.company_id == company_id
    ).first()
    
    if not settings or not settings.gmail_enabled:
        return {"enabled": False}
    
    return {
        "enabled": True,
        "email": settings.gmail_email,
        "sync_enabled": settings.gmail_sync_enabled,
        "sync_frequency": settings.gmail_sync_frequency
    }


@router.patch("/gmail")
async def update_gmail_settings(
    settings_update: GmailSettingsUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update Gmail settings for current company"""
    # Check permission
    if not has_permission(current_user, Permission.MANAGE_COMPANY_INTEGRATIONS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage integrations"
        )
    
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
    
    settings = db.query(EmailSettingsModel).filter(
        EmailSettingsModel.company_id == company_id
    ).first()
    
    if not settings or not settings.gmail_enabled:
        raise HTTPException(status_code=404, detail="Gmail not connected")
    
    if settings_update.sync_enabled is not None:
        settings.gmail_sync_enabled = settings_update.sync_enabled
    if settings_update.sync_frequency is not None:
        settings.gmail_sync_frequency = settings_update.sync_frequency
    
    settings.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Gmail settings updated successfully"}


@router.delete("/gmail")
async def disconnect_gmail(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Disconnect Gmail for current company"""
    # Check permission
    if not has_permission(current_user, Permission.MANAGE_COMPANY_INTEGRATIONS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage integrations"
        )
    
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
    
    settings = db.query(EmailSettingsModel).filter(
        EmailSettingsModel.company_id == company_id
    ).first()
    
    if settings:
        settings.gmail_client_id = None
        settings.gmail_client_secret = None
        settings.gmail_refresh_token = None
        settings.gmail_access_token = None
        settings.gmail_token_expires_at = None
        settings.gmail_email = None
        settings.gmail_enabled = False
        settings.gmail_sync_enabled = False
        settings.updated_at = datetime.utcnow()
        db.commit()
    
    return {"message": "Gmail disconnected successfully"}
