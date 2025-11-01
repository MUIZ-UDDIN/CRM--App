"""
Twilio Settings API endpoints
Allows users to configure their own Twilio accounts for SMS and voice calls
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, Field
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.twilio_settings import TwilioSettings as TwilioSettingsModel

router = APIRouter(prefix="/twilio-settings", tags=["Twilio Settings"])


# Pydantic Models
class TwilioSettingsBase(BaseModel):
    account_sid: str = Field(..., min_length=34, max_length=34, description="Twilio Account SID")
    auth_token: str = Field(..., min_length=32, description="Twilio Auth Token")
    phone_number: Optional[str] = Field(None, description="Twilio phone number (E.164 format)")
    sendgrid_api_key: Optional[str] = Field(None, description="SendGrid API key for emails")
    sendgrid_from_email: Optional[str] = Field(None, description="Verified sender email address")
    sms_enabled: bool = Field(True, description="Enable SMS functionality")
    voice_enabled: bool = Field(True, description="Enable voice call functionality")
    email_enabled: bool = Field(False, description="Enable email functionality")


class TwilioSettingsCreate(TwilioSettingsBase):
    pass


class TwilioSettingsUpdate(BaseModel):
    account_sid: Optional[str] = Field(None, min_length=34, max_length=34)
    auth_token: Optional[str] = Field(None, min_length=32)
    phone_number: Optional[str] = None
    sendgrid_api_key: Optional[str] = None
    sendgrid_from_email: Optional[str] = None
    sms_enabled: Optional[bool] = None
    voice_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    is_active: Optional[bool] = None


class TwilioSettingsResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    account_sid: str
    phone_number: Optional[str]
    sendgrid_api_key: Optional[str]
    sendgrid_from_email: Optional[str]
    sms_enabled: bool
    voice_enabled: bool
    email_enabled: bool
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    last_verified_at: Optional[datetime]

    class Config:
        from_attributes = True


# Helper function to verify Twilio credentials
def verify_twilio_credentials(account_sid: str, auth_token: str) -> bool:
    """
    Verify Twilio credentials by making a test API call
    Returns True if credentials are valid, False otherwise
    """
    try:
        from twilio.rest import Client
        from loguru import logger
        
        logger.info(f"🔐 Verifying Twilio credentials for Account SID: {account_sid[:10]}...")
        client = Client(account_sid, auth_token)
        # Test by fetching account info
        account = client.api.accounts(account_sid).fetch()
        logger.info(f"✅ Twilio credentials verified! Account status: {account.status}")
        return account.status == 'active'
    except Exception as e:
        from loguru import logger
        logger.error(f"❌ Twilio verification failed: {str(e)}")
        print(f"Twilio verification failed: {str(e)}")
        return False


@router.get("/")
async def get_twilio_settings(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current company's Twilio settings"""
    try:
        company_id = current_user.get("company_id")
        if not company_id:
            return None
        
        if isinstance(company_id, str):
            company_id = uuid.UUID(company_id)
        
        settings = db.query(TwilioSettingsModel).filter(
            TwilioSettingsModel.company_id == company_id
        ).first()
        
        # Return None if no settings exist
        if not settings:
            return None
        
        # Manually serialize to avoid Pydantic issues
        return {
            "id": str(settings.id),
            "user_id": str(settings.user_id),
            "account_sid": settings.account_sid,
            "phone_number": settings.phone_number,
            "sendgrid_api_key": settings.sendgrid_api_key,
            "sendgrid_from_email": settings.sendgrid_from_email,
            "sms_enabled": settings.sms_enabled,
            "voice_enabled": settings.voice_enabled,
            "email_enabled": settings.email_enabled,
            "is_active": settings.is_active,
            "is_verified": settings.is_verified,
            "created_at": settings.created_at.isoformat() if settings.created_at else None,
            "updated_at": settings.updated_at.isoformat() if settings.updated_at else None,
            "last_verified_at": settings.last_verified_at.isoformat() if settings.last_verified_at else None
        }
    except Exception as e:
        # Log the error for debugging
        print(f"Error fetching Twilio settings: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching Twilio settings: {str(e)}")


@router.post("/", response_model=TwilioSettingsResponse, status_code=201)
async def create_twilio_settings(
    settings_data: TwilioSettingsCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create Twilio settings for current company"""
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
    
    if isinstance(company_id, str):
        company_id = uuid.UUID(company_id)
    
    # Check if settings already exist
    existing = db.query(TwilioSettingsModel).filter(
        TwilioSettingsModel.company_id == company_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Twilio settings already exist. Use PUT to update."
        )
    
    # Verify credentials
    is_verified = verify_twilio_credentials(
        settings_data.account_sid,
        settings_data.auth_token
    )
    
    # Create new settings
    db_settings = TwilioSettingsModel(
        company_id=company_id,
        user_id=uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"],
        account_sid=settings_data.account_sid,
        auth_token=settings_data.auth_token,  # TODO: Encrypt this in production
        phone_number=settings_data.phone_number,
        sms_enabled=settings_data.sms_enabled,
        voice_enabled=settings_data.voice_enabled,
        is_verified=is_verified,
        last_verified_at=datetime.utcnow() if is_verified else None
    )
    
    db.add(db_settings)
    db.commit()
    db.refresh(db_settings)
    
    return db_settings


@router.put("/", response_model=TwilioSettingsResponse)
async def update_twilio_settings(
    settings_data: TwilioSettingsUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current company's Twilio settings"""
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
    
    if isinstance(company_id, str):
        company_id = uuid.UUID(company_id)
    
    settings = db.query(TwilioSettingsModel).filter(
        TwilioSettingsModel.company_id == company_id
    ).first()
    
    if not settings:
        raise HTTPException(status_code=404, detail="Twilio settings not found")
    
    # Update fields
    update_data = settings_data.dict(exclude_unset=True)
    
    # If credentials are being updated, verify them
    if 'account_sid' in update_data or 'auth_token' in update_data:
        account_sid = update_data.get('account_sid', settings.account_sid)
        auth_token = update_data.get('auth_token', settings.auth_token)
        
        is_verified = verify_twilio_credentials(account_sid, auth_token)
        update_data['is_verified'] = is_verified
        if is_verified:
            update_data['last_verified_at'] = datetime.utcnow()
    
    for key, value in update_data.items():
        setattr(settings, key, value)
    
    settings.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(settings)
    
    return settings


@router.delete("/")
async def delete_twilio_settings(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete current company's Twilio settings"""
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
    
    if isinstance(company_id, str):
        company_id = uuid.UUID(company_id)
    
    settings = db.query(TwilioSettingsModel).filter(
        TwilioSettingsModel.company_id == company_id
    ).first()
    
    if not settings:
        raise HTTPException(status_code=404, detail="Twilio settings not found")
    
    db.delete(settings)
    db.commit()
    
    return {"message": "Twilio settings deleted successfully"}


@router.post("/verify")
async def verify_settings(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Verify current company's Twilio credentials"""
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
    
    if isinstance(company_id, str):
        company_id = uuid.UUID(company_id)
    
    settings = db.query(TwilioSettingsModel).filter(
        TwilioSettingsModel.company_id == company_id
    ).first()
    
    if not settings:
        raise HTTPException(status_code=404, detail="Twilio settings not found")
    
    is_verified = verify_twilio_credentials(
        settings.account_sid,
        settings.auth_token
    )
    
    settings.is_verified = is_verified
    if is_verified:
        settings.last_verified_at = datetime.utcnow()
    settings.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "verified": is_verified,
        "message": "Credentials verified successfully" if is_verified else "Verification failed"
    }


@router.get("/phone-numbers")
async def get_available_phone_numbers(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get available phone numbers from company's Twilio account"""
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
    
    if isinstance(company_id, str):
        company_id = uuid.UUID(company_id)
    
    settings = db.query(TwilioSettingsModel).filter(
        TwilioSettingsModel.company_id == company_id
    ).first()
    
    if not settings:
        raise HTTPException(status_code=404, detail="Twilio settings not configured")
    
    if not settings.is_verified:
        raise HTTPException(status_code=400, detail="Twilio credentials not verified")
    
    try:
        from twilio.rest import Client
        client = Client(settings.account_sid, settings.auth_token)
        
        # Fetch incoming phone numbers
        phone_numbers = client.incoming_phone_numbers.list(limit=50)
        
        return {
            "phone_numbers": [
                {
                    "sid": pn.sid,
                    "phone_number": pn.phone_number,
                    "friendly_name": pn.friendly_name,
                    "capabilities": {
                        "sms": pn.capabilities.get('sms', False),
                        "voice": pn.capabilities.get('voice', False)
                    }
                }
                for pn in phone_numbers
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch phone numbers: {str(e)}"
        )
