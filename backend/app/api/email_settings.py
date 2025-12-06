"""
Email Settings API endpoints
Allows companies to configure SendGrid and Gmail integrations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import RedirectResponse, HTMLResponse
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
import uuid
from datetime import datetime, timedelta
import os
import urllib.parse
import httpx
import secrets

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
    company_id_filter: Optional[str] = Query(None, description="Filter by company ID (Super Admin only)"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get email settings for current company"""
    # Super Admin can view specific company's settings
    user_role = current_user.get("role") or current_user.get("user_role")
    if company_id_filter and user_role and user_role.lower() == "super_admin":
        company_id = company_id_filter
    else:
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
    """Get Gmail OAuth authorization URL for multi-tenant setup"""
    # Check permission
    if not has_permission(current_user, Permission.MANAGE_COMPANY_INTEGRATIONS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage integrations"
        )
    
    company_id = current_user.get("company_id")
    user_id = current_user.get("user_id")
    
    if not company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
    
    # Get OAuth credentials from environment
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "https://sunstonecrm.com/api/email-settings/gmail/callback")
    
    if not client_id:
        raise HTTPException(
            status_code=500,
            detail="Gmail OAuth not configured. Please contact administrator."
        )
    
    # Generate state token with company_id and user_id for security
    state = f"{company_id}:{user_id}:{secrets.token_urlsafe(32)}"
    
    # Build OAuth URL
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email",
        "access_type": "offline",
        "prompt": "consent",
        "state": state
    }
    
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    
    return {
        "auth_url": auth_url,
        "state": state
    }


@router.get("/gmail/callback")
async def gmail_oauth_callback(
    code: str,
    state: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle Gmail OAuth callback and exchange code for tokens"""
    try:
        # Parse state to get company_id and user_id
        state_parts = state.split(":")
        if len(state_parts) < 3:
            raise HTTPException(status_code=400, detail="Invalid state parameter")
        
        company_id = state_parts[0]
        user_id = state_parts[1]
        
        # Get OAuth credentials
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "https://sunstonecrm.com/api/email-settings/gmail/callback")
        
        if not client_id or not client_secret:
            raise HTTPException(status_code=500, detail="OAuth credentials not configured")
        
        # Exchange authorization code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(token_url, data=token_data)
            
            if token_response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to exchange code for tokens: {token_response.text}"
                )
            
            tokens = token_response.json()
            access_token = tokens.get("access_token")
            refresh_token = tokens.get("refresh_token")
            expires_in = tokens.get("expires_in", 3600)
            
            # Get user's Gmail email address
            userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
            headers = {"Authorization": f"Bearer {access_token}"}
            userinfo_response = await client.get(userinfo_url, headers=headers)
            
            if userinfo_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to get user info")
            
            userinfo = userinfo_response.json()
            gmail_email = userinfo.get("email")
        
        # Save tokens to database for this company
        settings = db.query(EmailSettingsModel).filter(
            EmailSettingsModel.company_id == company_id
        ).first()
        
        if not settings:
            settings = EmailSettingsModel(
                company_id=company_id,
                gmail_access_token=access_token,
                gmail_refresh_token=refresh_token,
                gmail_token_expires_at=datetime.utcnow() + timedelta(seconds=expires_in),
                gmail_email=gmail_email,
                gmail_enabled=True,
                gmail_sync_enabled=True,
                gmail_sync_frequency="5min"
            )
            db.add(settings)
        else:
            settings.gmail_access_token = access_token
            settings.gmail_refresh_token = refresh_token
            settings.gmail_token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            settings.gmail_email = gmail_email
            settings.gmail_enabled = True
            settings.gmail_sync_enabled = True
            settings.updated_at = datetime.utcnow()
        
        db.commit()
        
        # Return success page that closes popup and notifies parent
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Gmail Connected</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                .container {
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    text-align: center;
                    max-width: 400px;
                }
                .success-icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                }
                h1 {
                    color: #333;
                    margin: 0 0 10px 0;
                    font-size: 24px;
                }
                p {
                    color: #666;
                    margin: 0 0 20px 0;
                }
                .email {
                    background: #f3f4f6;
                    padding: 10px;
                    border-radius: 6px;
                    color: #4f46e5;
                    font-weight: 500;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">✅</div>
                <h1>Gmail Connected!</h1>
                <p>Your Gmail account has been successfully connected.</p>
                <div class="email">""" + gmail_email + """</div>
                <p style="margin-top: 20px; font-size: 14px; color: #999;">This window will close automatically...</p>
            </div>
            <script>
                // Notify parent window
                if (window.opener) {
                    window.opener.postMessage({
                        type: 'gmail-oauth-success',
                        email: '""" + gmail_email + """'
                    }, '*');
                }
                // Close popup after 2 seconds
                setTimeout(() => {
                    window.close();
                }, 2000);
            </script>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        # Return error page
        error_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Connection Failed</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                }}
                .container {{
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    text-align: center;
                    max-width: 400px;
                }}
                .error-icon {{
                    font-size: 64px;
                    margin-bottom: 20px;
                }}
                h1 {{
                    color: #333;
                    margin: 0 0 10px 0;
                    font-size: 24px;
                }}
                p {{
                    color: #666;
                    margin: 0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="error-icon">❌</div>
                <h1>Connection Failed</h1>
                <p>{str(e)}</p>
                <p style="margin-top: 20px; font-size: 14px; color: #999;">This window will close automatically...</p>
            </div>
            <script>
                if (window.opener) {{
                    window.opener.postMessage({{
                        type: 'gmail-oauth-error',
                        error: '{str(e)}'
                    }}, '*');
                }}
                setTimeout(() => {{
                    window.close();
                }}, 3000);
            </script>
        </body>
        </html>
        """
        return HTMLResponse(content=error_html, status_code=400)


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
