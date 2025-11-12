"""
Integrations API endpoints for email, SMS, and call services
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, UUID4, EmailStr, validator, Field
from datetime import datetime
import uuid
import json

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.middleware.tenant import get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


# Pydantic models
class IntegrationBase(BaseModel):
    name: str
    provider: str
    is_active: bool = True
    config: Dict[str, Any] = {}


class IntegrationCreate(IntegrationBase):
    integration_type: str  # email, sms, call, etc.
    scope: str  # company, team, user
    team_id: Optional[UUID4] = None  # Required if scope is team


class IntegrationUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None


class IntegrationResponse(IntegrationBase):
    id: UUID4
    integration_type: str
    scope: str
    team_id: Optional[UUID4] = None
    user_id: Optional[UUID4] = None
    company_id: UUID4
    created_at: datetime
    updated_at: datetime
    created_by: UUID4

    @validator('id', 'team_id', 'user_id', 'company_id', 'created_by', pre=True)
    def convert_uuid(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v

    class Config:
        from_attributes = True


# Email provider configuration models
class EmailProviderConfig(BaseModel):
    api_key: str
    from_email: EmailStr
    from_name: Optional[str] = None
    reply_to: Optional[EmailStr] = None
    custom_domain: Optional[str] = None


# SMS provider configuration models
class SMSProviderConfig(BaseModel):
    account_sid: str
    auth_token: str
    from_number: str
    messaging_service_sid: Optional[str] = None


# Call provider configuration models
class CallProviderConfig(BaseModel):
    account_sid: str
    auth_token: str
    from_number: str
    callback_url: Optional[str] = None


# Create Integration model if it doesn't exist
def create_integration_model(db: Session):
    """Create Integration model if it doesn't exist"""
    from sqlalchemy import Column, String, Boolean, JSON, ForeignKey, DateTime
    from sqlalchemy.dialects.postgresql import UUID
    from app.models.base import Base, BaseModel
    
    # Check if model already exists
    if hasattr(Base.metadata.tables, 'integrations'):
        return
    
    # Create model
    class Integration(BaseModel):
        __tablename__ = 'integrations'
        
        name = Column(String(255), nullable=False)
        provider = Column(String(100), nullable=False)
        integration_type = Column(String(50), nullable=False)  # email, sms, call, etc.
        scope = Column(String(50), nullable=False)  # company, team, user
        is_active = Column(Boolean, default=True)
        config = Column(JSON, nullable=False, default={})
        
        company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False)
        team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id', ondelete='CASCADE'), nullable=True)
        user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
        created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
        
        def __repr__(self):
            return f"<Integration {self.name} ({self.provider})>"
    
    # Create table
    Base.metadata.create_all(bind=db.bind, tables=[Integration.__table__])
    
    return Integration


@router.post("/", response_model=IntegrationResponse)
async def create_integration(
    integration: IntegrationCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new integration"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    # Check permissions based on integration scope
    if integration.scope == "company":
        if not has_permission(current_user, Permission.MANAGE_COMPANY_INTEGRATIONS) and not context.is_super_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to create company-wide integrations"
            )
    elif integration.scope == "team":
        if not has_permission(current_user, Permission.MANAGE_TEAM_INTEGRATIONS) and not context.is_super_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to create team integrations"
            )
        
        # Check if team_id is provided
        if not integration.team_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="team_id is required for team scope integrations"
            )
        
        # Check if team exists and user has access to it
        from app.models import Team
        team = db.query(Team).filter(Team.id == integration.team_id).first()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found"
            )
        
        # Check if team belongs to user's company
        if str(team.company_id) != str(company_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this team"
            )
        
        # Check if user is in the team or has company-level permissions
        if not has_permission(current_user, Permission.MANAGE_COMPANY_INTEGRATIONS) and str(user_team_id) != str(integration.team_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create integrations for your own team"
            )
    elif integration.scope == "user":
        # Users can create their own integrations
        pass
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid scope. Must be one of: company, team, user"
        )
    
    # Validate configuration based on integration type
    try:
        if integration.integration_type == "email":
            if integration.provider == "sendgrid":
                EmailProviderConfig(**integration.config)
            elif integration.provider == "mailchimp":
                # Add specific validation for Mailchimp
                pass
        elif integration.integration_type == "sms":
            if integration.provider == "twilio":
                SMSProviderConfig(**integration.config)
        elif integration.integration_type == "call":
            if integration.provider == "twilio":
                CallProviderConfig(**integration.config)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid configuration for {integration.provider}: {str(e)}"
        )
    
    # Create Integration model if it doesn't exist
    Integration = create_integration_model(db)
    
    # Create integration
    new_integration = Integration(
        name=integration.name,
        provider=integration.provider,
        integration_type=integration.integration_type,
        scope=integration.scope,
        is_active=integration.is_active,
        config=integration.config,
        company_id=uuid.UUID(company_id) if isinstance(company_id, str) else company_id,
        team_id=integration.team_id if integration.scope == "team" else None,
        user_id=uuid.UUID(user_id) if integration.scope == "user" else None,
        created_by=uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    )
    
    db.add(new_integration)
    db.commit()
    db.refresh(new_integration)
    
    return new_integration


@router.get("/", response_model=List[IntegrationResponse])
async def list_integrations(
    integration_type: Optional[str] = None,
    provider: Optional[str] = None,
    scope: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """List integrations based on user permissions"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    # Create Integration model if it doesn't exist
    Integration = create_integration_model(db)
    
    # Base query - filter by company
    query = db.query(Integration).filter(Integration.company_id == company_id)
    
    # Apply filters
    if integration_type:
        query = query.filter(Integration.integration_type == integration_type)
    if provider:
        query = query.filter(Integration.provider == provider)
    if scope:
        query = query.filter(Integration.scope == scope)
    
    # Apply permission-based filters
    if context.is_super_admin() or has_permission(current_user, Permission.MANAGE_COMPANY_INTEGRATIONS):
        # Can see all integrations in the company
        pass
    elif has_permission(current_user, Permission.MANAGE_TEAM_INTEGRATIONS):
        # Can see team and personal integrations
        if user_team_id:
            query = query.filter(
                (Integration.scope == "team" & (Integration.team_id == user_team_id)) |
                (Integration.scope == "user" & (Integration.user_id == user_id)) |
                (Integration.scope == "company")
            )
        else:
            query = query.filter(
                (Integration.scope == "user" & (Integration.user_id == user_id)) |
                (Integration.scope == "company")
            )
    elif has_permission(current_user, Permission.USE_INTEGRATIONS):
        # Can see company, team (if in a team), and personal integrations
        if user_team_id:
            query = query.filter(
                (Integration.scope == "company") |
                (Integration.scope == "team" & (Integration.team_id == user_team_id)) |
                (Integration.scope == "user" & (Integration.user_id == user_id))
            )
        else:
            query = query.filter(
                (Integration.scope == "company") |
                (Integration.scope == "user" & (Integration.user_id == user_id))
            )
    else:
        # No permissions to view integrations
        return []
    
    integrations = query.all()
    return integrations


@router.get("/{integration_id}", response_model=IntegrationResponse)
async def get_integration(
    integration_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get integration details"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    # Create Integration model if it doesn't exist
    Integration = create_integration_model(db)
    
    # Get integration
    integration = db.query(Integration).filter(
        Integration.id == integration_id,
        Integration.company_id == company_id
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    # Check permissions
    can_view = False
    
    if context.is_super_admin() or has_permission(current_user, Permission.MANAGE_COMPANY_INTEGRATIONS):
        can_view = True
    elif integration.scope == "company" and has_permission(current_user, Permission.USE_INTEGRATIONS):
        can_view = True
    elif integration.scope == "team" and str(integration.team_id) == str(user_team_id) and has_permission(current_user, Permission.USE_INTEGRATIONS):
        can_view = True
    elif integration.scope == "user" and str(integration.user_id) == str(user_id):
        can_view = True
    
    if not can_view:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this integration"
        )
    
    return integration


@router.put("/{integration_id}", response_model=IntegrationResponse)
async def update_integration(
    integration_id: UUID4,
    integration_update: IntegrationUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Update integration"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    # Create Integration model if it doesn't exist
    Integration = create_integration_model(db)
    
    # Get integration
    integration = db.query(Integration).filter(
        Integration.id == integration_id,
        Integration.company_id == company_id
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    # Check permissions
    can_update = False
    
    if context.is_super_admin():
        can_update = True
    elif integration.scope == "company" and has_permission(current_user, Permission.MANAGE_COMPANY_INTEGRATIONS):
        can_update = True
    elif integration.scope == "team" and str(integration.team_id) == str(user_team_id) and has_permission(current_user, Permission.MANAGE_TEAM_INTEGRATIONS):
        can_update = True
    elif integration.scope == "user" and str(integration.user_id) == str(user_id):
        can_update = True
    
    if not can_update:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this integration"
        )
    
    # Update fields
    update_data = integration_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(integration, field, value)
    
    integration.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(integration)
    
    return integration


@router.delete("/{integration_id}")
async def delete_integration(
    integration_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Delete integration"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    # Create Integration model if it doesn't exist
    Integration = create_integration_model(db)
    
    # Get integration
    integration = db.query(Integration).filter(
        Integration.id == integration_id,
        Integration.company_id == company_id
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    # Check permissions
    can_delete = False
    
    if context.is_super_admin():
        can_delete = True
    elif integration.scope == "company" and has_permission(current_user, Permission.MANAGE_COMPANY_INTEGRATIONS):
        can_delete = True
    elif integration.scope == "team" and str(integration.team_id) == str(user_team_id) and has_permission(current_user, Permission.MANAGE_TEAM_INTEGRATIONS):
        can_delete = True
    elif integration.scope == "user" and str(integration.user_id) == str(user_id):
        can_delete = True
    
    if not can_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this integration"
        )
    
    # Delete integration
    db.delete(integration)
    db.commit()
    
    return {"message": "Integration deleted successfully"}


@router.post("/{integration_id}/test")
async def test_integration(
    integration_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Test integration connection"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    # Create Integration model if it doesn't exist
    Integration = create_integration_model(db)
    
    # Get integration
    integration = db.query(Integration).filter(
        Integration.id == integration_id,
        Integration.company_id == company_id
    ).first()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    # Check permissions
    can_test = False
    
    if context.is_super_admin():
        can_test = True
    elif integration.scope == "company" and has_permission(current_user, Permission.USE_INTEGRATIONS):
        can_test = True
    elif integration.scope == "team" and str(integration.team_id) == str(user_team_id) and has_permission(current_user, Permission.USE_INTEGRATIONS):
        can_test = True
    elif integration.scope == "user" and str(integration.user_id) == str(user_id):
        can_test = True
    
    if not can_test:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to test this integration"
        )
    
    # Test integration based on type and provider
    result = {"success": False, "message": "Integration test not implemented for this provider"}
    
    try:
        if integration.integration_type == "email":
            if integration.provider == "sendgrid":
                # Test SendGrid connection
                import requests
                headers = {
                    "Authorization": f"Bearer {integration.config.get('api_key')}",
                    "Content-Type": "application/json"
                }
                response = requests.get("https://api.sendgrid.com/v3/user/profile", headers=headers)
                if response.status_code == 200:
                    result = {"success": True, "message": "Successfully connected to SendGrid API"}
                else:
                    result = {"success": False, "message": f"Failed to connect to SendGrid API: {response.text}"}
        
        elif integration.integration_type == "sms":
            if integration.provider == "twilio":
                # Test Twilio connection
                from twilio.rest import Client
                from twilio.base.exceptions import TwilioRestException
                
                try:
                    client = Client(
                        integration.config.get("account_sid"),
                        integration.config.get("auth_token")
                    )
                    # Just fetch account info to verify credentials
                    account = client.api.accounts(integration.config.get("account_sid")).fetch()
                    result = {"success": True, "message": f"Successfully connected to Twilio API. Account: {account.friendly_name}"}
                except TwilioRestException as e:
                    result = {"success": False, "message": f"Failed to connect to Twilio API: {str(e)}"}
        
        elif integration.integration_type == "call":
            if integration.provider == "twilio":
                # Test Twilio connection (same as SMS)
                from twilio.rest import Client
                from twilio.base.exceptions import TwilioRestException
                
                try:
                    client = Client(
                        integration.config.get("account_sid"),
                        integration.config.get("auth_token")
                    )
                    # Just fetch account info to verify credentials
                    account = client.api.accounts(integration.config.get("account_sid")).fetch()
                    result = {"success": True, "message": f"Successfully connected to Twilio API. Account: {account.friendly_name}"}
                except TwilioRestException as e:
                    result = {"success": False, "message": f"Failed to connect to Twilio API: {str(e)}"}
    
    except Exception as e:
        result = {"success": False, "message": f"Error testing integration: {str(e)}"}
    
    return result


@router.get("/providers")
async def list_integration_providers(
    integration_type: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """List available integration providers"""
    # Define available providers by type
    providers = {
        "email": [
            {"id": "sendgrid", "name": "SendGrid", "description": "Email delivery service by Twilio"},
            {"id": "mailchimp", "name": "Mailchimp", "description": "Email marketing platform"},
            {"id": "gmail", "name": "Gmail", "description": "Google's email service"}
        ],
        "sms": [
            {"id": "twilio", "name": "Twilio", "description": "Cloud communications platform"},
            {"id": "messagebird", "name": "MessageBird", "description": "Global communications platform"}
        ],
        "call": [
            {"id": "twilio", "name": "Twilio", "description": "Cloud communications platform"},
            {"id": "aircall", "name": "Aircall", "description": "Cloud-based call center software"}
        ]
    }
    
    if integration_type:
        return providers.get(integration_type, [])
    
    return providers
