"""
Company management API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import Company, User, UserRole, UserStatus, PlanType, CompanyStatus
from app.middleware.tenant import require_super_admin, require_company_admin, get_tenant_context
from app.middleware.permissions import has_permission, require_permission
from app.models.permissions import Permission

router = APIRouter(prefix="/api/companies", tags=["companies"])


# Pydantic models
class CompanyCreate(BaseModel):
    name: str
    admin_first_name: str
    admin_last_name: str
    admin_email: EmailStr
    plan: PlanType = PlanType.FREE
    domain: Optional[str] = None
    timezone: str = "UTC"
    currency: str = "USD"


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    plan: Optional[PlanType] = None
    status: Optional[CompanyStatus] = None
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    sendgrid_api_key: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None


class CompanyResponse(BaseModel):
    id: str
    name: str
    plan: str
    status: str
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    timezone: str
    currency: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    created_at: datetime
    user_count: Optional[int] = 0
    subscription_status: Optional[str] = None
    trial_ends_at: Optional[datetime] = None
    days_remaining: Optional[int] = None
    
    @field_validator('id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v
    
    class Config:
        from_attributes = True


class CompanyCreateResponse(BaseModel):
    id: str
    name: str
    plan: str
    status: str
    admin_email: str
    admin_password: str
    trial_ends_at: Optional[datetime] = None
    
    @field_validator('id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v
    
    class Config:
        from_attributes = True


class CompanyUserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    password: str
    user_role: UserRole = UserRole.REGULAR_USER


# Super Admin endpoints
@router.post("/", response_model=CompanyCreateResponse)
def create_company(
    company: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new company (Super Admin only)"""
    # Check if user has permission to create companies
    if not has_permission(current_user, Permission.CREATE_COMPANY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot create companies"
        )
    
    # Check if company name already exists (case-insensitive)
    existing_company = db.query(Company).filter(Company.name.ilike(company.name)).first()
    if existing_company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Company name '{company.name}' already exists. Please choose a different company name."
        )
    
    # Check if domain already exists
    if company.domain:
        existing = db.query(Company).filter(Company.domain == company.domain).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Domain already exists"
            )
    
    # Create company with 14-day trial
    from datetime import datetime, timedelta
    import secrets
    from app.core.security import get_password_hash
    
    # Check if admin email already exists as a Company Admin in another company (case-insensitive)
    # Note: Same email can exist in different companies (multi-tenant), but not as Company Admin
    existing_company_admin = db.query(User).filter(
        User.email.ilike(company.admin_email),
        User.user_role == UserRole.COMPANY_ADMIN.value
    ).first()
    if existing_company_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{company.admin_email}' is already registered as a Company Admin. Please use a different email."
        )
    
    db_company = Company(
        name=company.name,
        plan=PlanType.FREE.value,  # Always start with free plan
        domain=company.domain,
        timezone=company.timezone or "UTC",
        currency=company.currency or "USD",
        created_by=current_user.get('id'),
        status=CompanyStatus.ACTIVE.value,
        trial_ends_at=datetime.utcnow() + timedelta(days=14)  # 14-day trial
    )
    
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    
    # Generate random password for admin
    temp_password = secrets.token_urlsafe(12)
    
    # Create company admin user
    admin_user = User(
        email=company.admin_email,
        first_name=company.admin_first_name,
        last_name=company.admin_last_name,
        hashed_password=get_password_hash(temp_password),
        company_id=db_company.id,
        user_role=UserRole.COMPANY_ADMIN.value,
        status=UserStatus.ACTIVE.value
    )
    
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    
    # Create default pipeline and stages for the new company (same as registration.py)
    from app.models.deals import Pipeline, PipelineStage
    
    default_pipeline = Pipeline(
        name='Sales Pipeline',
        description='Default sales pipeline',
        is_default=True,
        company_id=db_company.id,
        order_index=0
    )
    db.add(default_pipeline)
    db.flush()  # Get pipeline ID
    
    # Create default stages (matching the stage names expected by the system)
    default_stages = [
        {'name': 'Qualification', 'order_index': 0, 'probability': 25.0},
        {'name': 'Proposal', 'order_index': 1, 'probability': 50.0},
        {'name': 'Negotiation', 'order_index': 2, 'probability': 75.0},
        {'name': 'Closed Won', 'order_index': 3, 'probability': 100.0, 'is_closed': True, 'is_won': True},
        {'name': 'Closed Lost', 'order_index': 4, 'probability': 0.0, 'is_closed': True, 'is_won': False},
    ]
    
    for stage_data in default_stages:
        stage = PipelineStage(
            pipeline_id=default_pipeline.id,
            name=stage_data['name'],
            order_index=stage_data['order_index'],
            probability=stage_data['probability'],
            is_closed=stage_data.get('is_closed', False),
            is_won=stage_data.get('is_won', False)
        )
        db.add(stage)
    
    db.commit()
    
    # Log credentials (for now, until email sending is implemented)
    print(f"Company created: {db_company.name}")
    print(f"Admin email: {company.admin_email}")
    print(f"Temporary password: {temp_password}")
    
    # Send notifications to all super admins
    try:
        from app.services.notification_service import NotificationService
        import uuid
        
        creator_id = uuid.UUID(current_user.get('id')) if current_user.get('id') else None
        creator = db.query(User).filter(User.id == creator_id).first() if creator_id else None
        creator_name = f"{creator.first_name} {creator.last_name}" if creator else "Super Admin"
        
        NotificationService.notify_company_created(
            db=db,
            company_id=db_company.id,
            company_name=db_company.name,
            creator_id=creator_id,
            creator_name=creator_name
        )
    except Exception as notification_error:
        print(f"Notification error: {notification_error}")
    
    # Return company with admin credentials
    return CompanyCreateResponse(
        id=str(db_company.id),
        name=db_company.name,
        plan=db_company.plan,  # Already a string
        status=db_company.status,  # Already a string
        admin_email=company.admin_email,
        admin_password=temp_password,
        trial_ends_at=db_company.trial_ends_at
    )


@router.get("/", response_model=List[CompanyResponse])
def list_companies(
    skip: int = 0,
    limit: int = 100,
    status: Optional[CompanyStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all companies (Super Admin only)"""
    # Check if user has permission to view all companies
    if not has_permission(current_user, Permission.VIEW_ALL_COMPANIES):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot view all companies"
        )
    
    query = db.query(Company)
    
    # Exclude super admin's own company from the list
    # Handle both dict and User object
    company_id = current_user.company_id if hasattr(current_user, 'company_id') else current_user.get('company_id')
    if company_id:
        query = query.filter(Company.id != company_id)
    
    if status:
        query = query.filter(Company.status == status)
    
    companies = query.offset(skip).limit(limit).all()
    
    # Add user count and calculate days_remaining
    from datetime import datetime
    for company in companies:
        company.user_count = db.query(User).filter(User.company_id == company.id).count()
        
        # Set defaults for NULL values
        if not company.plan or company.plan == '':
            company.plan = 'free'
        if not company.subscription_status or company.subscription_status == '':
            company.subscription_status = 'trial'
        
        # Calculate days remaining for trial accounts
        if company.subscription_status == 'trial' and company.trial_ends_at:
            now = datetime.utcnow()
            trial_end = company.trial_ends_at
            # Remove timezone info for comparison if present
            if trial_end.tzinfo is not None:
                trial_end = trial_end.replace(tzinfo=None)
            days_left = (trial_end - now).days
            company.days_remaining = max(0, days_left)
        else:
            company.days_remaining = None
    
    return companies


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get company details"""
    context = get_tenant_context(current_user)
    
    # Super admin can access any company, others only their own
    if not context.can_access_company(company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company"
        )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    company.user_count = db.query(User).filter(User.company_id == company.id).count()
    
    # Calculate days remaining if on trial
    if company.subscription_status == 'trial' and company.trial_ends_at:
        from datetime import datetime
        days_remaining = (company.trial_ends_at - datetime.utcnow()).days
        company.days_remaining = max(0, days_remaining)
    
    return company


@router.put("/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: str,
    company_update: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update company (Super Admin or Company Admin)"""
    context = get_tenant_context(current_user)
    
    # Validate access
    if not context.can_access_company(company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company"
        )
    
    # Check if user has permission to edit company
    if not has_permission(current_user, Permission.EDIT_COMPANY) and not context.is_super_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot edit company"
        )
    
    # Only super admin can change status and plan
    if not context.is_super_admin():
        if company_update.status or company_update.plan:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only super admin can change status or plan"
            )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Update fields
    update_data = company_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)
    
    db.commit()
    db.refresh(company)
    
    return company


@router.delete("/{company_id}")
def delete_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete company (Super Admin only) - Cascades to delete all users"""
    # Check if user has permission to delete companies
    if not has_permission(current_user, Permission.DELETE_COMPANY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot delete companies"
        )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Delete all related data in correct order to avoid foreign key violations
    from app.models.support_tickets import SupportTicket
    from app.models import (
        Contact, Deal, Activity, Email, SMSMessage, Call, Document, 
        Workflow, File, Notification, Quote, AuditLog, SecurityLog,
        Pipeline, PipelineStage, EmailTemplate, SMSTemplate, PhoneNumber,
        Subscription, Invoice, Payment, TwilioSettings, PaymentHistory
    )
    
    # Get all user IDs in the company
    user_ids = [u.id for u in db.query(User).filter(User.company_id == company.id).all()]
    
    if user_ids:
        # Delete user-related data (with error handling for field name variations)
        try:
            db.query(Contact).filter(Contact.owner_id.in_(user_ids)).delete(synchronize_session=False)
            db.commit()
        except Exception as e:
            print(f"Error deleting contacts by owner_id: {e}")
            db.rollback()
        
        try:
            db.query(Deal).filter(Deal.owner_id.in_(user_ids)).delete(synchronize_session=False)
            db.commit()
        except Exception as e:
            print(f"Error deleting deals by owner_id: {e}")
            db.rollback()
    
    # Delete contacts by company_id - CRITICAL
    try:
        company_contact_count = db.query(Contact).filter(Contact.company_id == company.id).count()
        if company_contact_count > 0:
            deleted_company_contacts = db.query(Contact).filter(Contact.company_id == company.id).delete(synchronize_session=False)
            db.commit()
            print(f"✅ Successfully deleted {deleted_company_contacts} contacts by company_id")
    except Exception as e:
        print(f"❌ CRITICAL ERROR deleting contacts by company_id: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete contacts by company_id: {str(e)}"
        )
    
    # Delete deals by company_id - CRITICAL
    try:
        company_deal_count = db.query(Deal).filter(Deal.company_id == company.id).count()
        if company_deal_count > 0:
            deleted_company_deals = db.query(Deal).filter(Deal.company_id == company.id).delete(synchronize_session=False)
            db.commit()
            print(f"✅ Successfully deleted {deleted_company_deals} deals by company_id")
    except Exception as e:
        print(f"❌ CRITICAL ERROR deleting deals by company_id: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete deals by company_id: {str(e)}"
        )
    
    if user_ids:
        
        # Delete activities (owner_id -> users.id) - CRITICAL
        try:
            activity_count = db.query(Activity).filter(Activity.owner_id.in_(user_ids)).count()
            if activity_count > 0:
                deleted_activities = db.query(Activity).filter(Activity.owner_id.in_(user_ids)).delete(synchronize_session=False)
                db.commit()
                print(f"✅ Successfully deleted {deleted_activities} activities by owner_id")
        except Exception as e:
            print(f"❌ CRITICAL ERROR deleting activities by owner_id: {e}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete activities by owner_id: {str(e)}"
            )
    
    # Delete activities by company_id (in case some activities don't have owner_id) - CRITICAL
    try:
        company_activity_count = db.query(Activity).filter(Activity.company_id == company.id).count()
        if company_activity_count > 0:
            deleted_company_activities = db.query(Activity).filter(Activity.company_id == company.id).delete(synchronize_session=False)
            db.commit()
            print(f"✅ Successfully deleted {deleted_company_activities} activities by company_id")
    except Exception as e:
        print(f"❌ CRITICAL ERROR deleting activities by company_id: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete activities by company_id: {str(e)}"
        )
    
    if user_ids:
        
        try:
            db.query(Email).filter(Email.owner_id.in_(user_ids)).delete(synchronize_session=False)
        except Exception:
            db.rollback()
        
        try:
            db.query(SMSMessage).filter(SMSMessage.user_id.in_(user_ids)).delete(synchronize_session=False)
        except Exception:
            db.rollback()
        
        try:
            db.query(Call).filter(Call.user_id.in_(user_ids)).delete(synchronize_session=False)
        except Exception:
            db.rollback()
        
        try:
            db.query(Document).filter(Document.created_by.in_(user_ids)).delete(synchronize_session=False)
        except Exception:
            db.rollback()
        
        # NOTE: Workflows use owner_id, not created_by - this is handled later at line ~580
        # Don't delete workflows here to avoid duplicate deletion attempts
        
        # Delete files by owner_id
        try:
            db.query(File).filter(File.owner_id.in_(user_ids)).delete(synchronize_session=False)
        except Exception as e:
            print(f"Error deleting files by owner_id: {e}")
            db.rollback()
        
        # Delete folders by owner_id
        try:
            from app.models.files import Folder
            db.query(Folder).filter(Folder.owner_id.in_(user_ids)).delete(synchronize_session=False)
        except Exception as e:
            print(f"Error deleting folders by owner_id: {e}")
            db.rollback()
        
        # Delete notifications (user_id -> users.id) - CRITICAL
        try:
            notif_count = db.query(Notification).filter(Notification.user_id.in_(user_ids)).count()
            if notif_count > 0:
                deleted_notifs = db.query(Notification).filter(Notification.user_id.in_(user_ids)).delete(synchronize_session=False)
                db.commit()
                print(f"✅ Successfully deleted {deleted_notifs} user notifications")
        except Exception as e:
            print(f"❌ CRITICAL ERROR deleting notifications: {e}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete notifications: {str(e)}"
            )
    
    # Delete company-level notifications (company_id -> companies.id) - CRITICAL
    try:
        company_notif_count = db.query(Notification).filter(Notification.company_id == company.id).count()
        if company_notif_count > 0:
            deleted_company_notifs = db.query(Notification).filter(Notification.company_id == company.id).delete(synchronize_session=False)
            db.commit()
            print(f"✅ Successfully deleted {deleted_company_notifs} company notifications")
    except Exception as e:
        print(f"❌ CRITICAL ERROR deleting company notifications: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete company notifications: {str(e)}"
        )
    
    if user_ids:
        try:
            db.query(Quote).filter(Quote.created_by.in_(user_ids)).delete(synchronize_session=False)
        except Exception:
            db.rollback()
        
        try:
            db.query(SupportTicket).filter(SupportTicket.created_by.in_(user_ids)).delete(synchronize_session=False)
        except Exception:
            db.rollback()
        
        try:
            db.query(AuditLog).filter(AuditLog.user_id.in_(user_ids)).delete(synchronize_session=False)
        except Exception:
            db.rollback()
        
        try:
            db.query(SecurityLog).filter(SecurityLog.user_id.in_(user_ids)).delete(synchronize_session=False)
        except Exception:
            db.rollback()
    
    # Delete company-level data (skip pipelines for now - delete after deals)
    
    try:
        db.query(EmailTemplate).filter(EmailTemplate.company_id == company.id).delete(synchronize_session=False)
    except Exception:
        db.rollback()
    
    try:
        db.query(SMSTemplate).filter(SMSTemplate.company_id == company.id).delete(synchronize_session=False)
    except Exception:
        db.rollback()
    
    try:
        db.query(PhoneNumber).filter(PhoneNumber.company_id == company.id).delete(synchronize_session=False)
    except Exception:
        db.rollback()
    
    try:
        db.query(TwilioSettings).filter(TwilioSettings.company_id == company.id).delete(synchronize_session=False)
    except Exception:
        db.rollback()
    
    # Delete files and folders by company_id
    try:
        from app.models.files import Folder
        db.query(File).filter(File.company_id == company.id).delete(synchronize_session=False)
        print(f"Deleted files for company {company.id}")
    except Exception as e:
        print(f"Error deleting files by company_id: {e}")
        db.rollback()
    
    try:
        from app.models.files import Folder
        db.query(Folder).filter(Folder.company_id == company.id).delete(synchronize_session=False)
        print(f"Deleted folders for company {company.id}")
    except Exception as e:
        print(f"Error deleting folders by company_id: {e}")
        db.rollback()
    
    # Delete quotes by company_id
    try:
        db.query(Quote).filter(Quote.company_id == company.id).delete(synchronize_session=False)
        print(f"Deleted quotes for company {company.id}")
    except Exception as e:
        print(f"Error deleting quotes by company_id: {e}")
        db.rollback()
    
    # Use the user_ids we already got at the beginning (line 436)
    # Delete all tables with foreign keys to users (MUST be before deleting users)
    if user_ids:
        # Delete workflows (owner_id -> users.id) - CRITICAL: Must happen before user deletion
        try:
            from app.models.workflows import Workflow
            # First check how many workflows exist
            workflow_count = db.query(Workflow).filter(Workflow.owner_id.in_(user_ids)).count()
            print(f"Found {workflow_count} workflows to delete for company {company.id}")
            
            if workflow_count > 0:
                deleted_workflows = db.query(Workflow).filter(Workflow.owner_id.in_(user_ids)).delete(synchronize_session=False)
                db.commit()  # Commit immediately to ensure deletion
                print(f"✅ Successfully deleted {deleted_workflows} workflows")
        except Exception as e:
            print(f"❌ CRITICAL ERROR deleting workflows: {e}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete workflows: {str(e)}"
            )
        
        # Delete workflow templates (created_by_id -> users.id)
        try:
            from app.models.workflow_templates import WorkflowTemplate
            db.query(WorkflowTemplate).filter(WorkflowTemplate.created_by_id.in_(user_ids)).delete(synchronize_session=False)
        except Exception as e:
            print(f"Error deleting workflow templates: {e}")
            db.rollback()
        
        # Delete support tickets (created_by_id, assigned_to_id -> users.id)
        try:
            from app.models.support_tickets import SupportTicket
            db.query(SupportTicket).filter(
                (SupportTicket.created_by_id.in_(user_ids)) |
                (SupportTicket.assigned_to_id.in_(user_ids))
            ).delete(synchronize_session=False)
        except Exception as e:
            print(f"Error deleting support tickets: {e}")
            db.rollback()
        
        # Delete SMS templates (user_id -> users.id)
        try:
            from app.models.sms_templates import SMSTemplate
            db.query(SMSTemplate).filter(SMSTemplate.user_id.in_(user_ids)).delete(synchronize_session=False)
        except Exception as e:
            print(f"Error deleting SMS templates: {e}")
            db.rollback()
        
        # Delete scheduled SMS (user_id -> users.id)
        try:
            from app.models.scheduled_sms import ScheduledSMS
            db.query(ScheduledSMS).filter(ScheduledSMS.user_id.in_(user_ids)).delete(synchronize_session=False)
        except Exception as e:
            print(f"Error deleting scheduled SMS: {e}")
            db.rollback()
        
        # Delete phone numbers (user_id -> users.id)
        try:
            from app.models.phone_numbers import PhoneNumber
            db.query(PhoneNumber).filter(PhoneNumber.user_id.in_(user_ids)).delete(synchronize_session=False)
        except Exception as e:
            print(f"Error deleting phone numbers: {e}")
            db.rollback()
        
        # Delete performance alerts (user_id -> users.id)
        try:
            from app.models.performance_alerts import PerformanceAlert
            db.query(PerformanceAlert).filter(PerformanceAlert.user_id.in_(user_ids)).delete(synchronize_session=False)
        except Exception as e:
            print(f"Error deleting performance alerts: {e}")
            db.rollback()
        
        # Delete inbox messages (user_id -> users.id)
        try:
            from app.models.inbox import InboxMessage
            db.query(InboxMessage).filter(InboxMessage.user_id.in_(user_ids)).delete(synchronize_session=False)
        except Exception as e:
            print(f"Error deleting inbox messages: {e}")
            db.rollback()
        
        # Delete sessions (user_id -> users.id)
        try:
            from app.models.security import Session
            db.query(Session).filter(Session.user_id.in_(user_ids)).delete(synchronize_session=False)
        except Exception as e:
            print(f"Error deleting sessions: {e}")
            db.rollback()
        
        # Delete email campaigns (user_id -> users.id)
        try:
            from app.models.email_campaigns import EmailCampaign
            db.query(EmailCampaign).filter(EmailCampaign.user_id.in_(user_ids)).delete(synchronize_session=False)
        except Exception as e:
            print(f"Error deleting email campaigns: {e}")
            db.rollback()
        
        # Delete CRM defaults (created_by_id -> users.id)
        try:
            from app.models.crm_defaults import DealStageDefault, PipelineDefault, ActivityTypeDefault
            db.query(DealStageDefault).filter(DealStageDefault.created_by_id.in_(user_ids)).delete(synchronize_session=False)
            db.query(PipelineDefault).filter(PipelineDefault.created_by_id.in_(user_ids)).delete(synchronize_session=False)
            db.query(ActivityTypeDefault).filter(ActivityTypeDefault.created_by_id.in_(user_ids)).delete(synchronize_session=False)
        except Exception as e:
            print(f"Error deleting CRM defaults: {e}")
            db.rollback()
        
        # Delete custom fields (created_by_id -> users.id)
        try:
            from app.models.custom_fields import CustomField
            db.query(CustomField).filter(CustomField.created_by_id.in_(user_ids)).delete(synchronize_session=False)
        except Exception as e:
            print(f"Error deleting custom fields: {e}")
            db.rollback()
        
        # Delete call transcripts (user_id -> users.id)
        try:
            from app.models.call_transcripts import CallTranscript
            db.query(CallTranscript).filter(CallTranscript.user_id.in_(user_ids)).delete(synchronize_session=False)
        except Exception as e:
            print(f"Error deleting call transcripts: {e}")
            db.rollback()
        
        # Delete conversations (user_id -> users.id)
        try:
            from app.models.conversations import Conversation
            db.query(Conversation).filter(Conversation.user_id.in_(user_ids)).delete(synchronize_session=False)
        except Exception as e:
            print(f"Error deleting conversations: {e}")
            db.rollback()
    
    # Delete company-level data
    
    # Delete email settings (company_id -> companies.id)
    try:
        from app.models.email_settings import EmailSettings
        db.query(EmailSettings).filter(EmailSettings.company_id == company.id).delete(synchronize_session=False)
    except Exception as e:
        print(f"Error deleting email settings: {e}")
        db.rollback()
    
    # Delete custom fields by company (company_id -> companies.id)
    try:
        from app.models.custom_fields import CustomField
        db.query(CustomField).filter(CustomField.company_id == company.id).delete(synchronize_session=False)
    except Exception as e:
        print(f"Error deleting custom fields by company: {e}")
        db.rollback()
    
    # Delete workflow executions (company_id -> companies.id)
    try:
        from app.models.workflows import WorkflowExecution
        db.query(WorkflowExecution).filter(WorkflowExecution.company_id == company.id).delete(synchronize_session=False)
    except Exception as e:
        print(f"Error deleting workflow executions: {e}")
        db.rollback()
    
    # Delete template usage (company_id -> companies.id)
    try:
        from app.models.workflow_templates import TemplateUsage
        db.query(TemplateUsage).filter(TemplateUsage.company_id == company.id).delete(synchronize_session=False)
    except Exception as e:
        print(f"Error deleting template usage: {e}")
        db.rollback()
    
    # Delete email campaigns by company (company_id -> companies.id)
    try:
        from app.models.email_campaigns import EmailCampaign
        db.query(EmailCampaign).filter(EmailCampaign.company_id == company.id).delete(synchronize_session=False)
    except Exception as e:
        print(f"Error deleting email campaigns by company: {e}")
        db.rollback()
    
    # Delete billing data
    try:
        db.query(PaymentHistory).filter(PaymentHistory.company_id == company.id).delete(synchronize_session=False)
    except Exception as e:
        print(f"Error deleting payment history: {e}")
        db.rollback()
    
    try:
        db.query(Subscription).filter(Subscription.company_id == company.id).delete(synchronize_session=False)
    except Exception as e:
        print(f"Error deleting subscriptions: {e}")
        db.rollback()
    
    try:
        db.query(Invoice).filter(Invoice.company_id == company.id).delete(synchronize_session=False)
    except Exception as e:
        print(f"Error deleting invoices: {e}")
        db.rollback()
    
    try:
        db.query(Payment).filter(Payment.company_id == company.id).delete(synchronize_session=False)
    except Exception as e:
        print(f"Error deleting payments: {e}")
        db.rollback()
    
    # Import models needed for cascade delete
    from app.models.deals import Deal, Pipeline, PipelineStage
    from app.models.contacts import Contact
    
    # Get all user IDs in this company first
    company_user_ids = [user.id for user in db.query(User.id).filter(User.company_id == company.id).all()]
    
    # Get all pipeline IDs for this company
    company_pipeline_ids = [p.id for p in db.query(Pipeline.id).filter(Pipeline.company_id == company.id).all()]
    
    # Delete analytics data BEFORE deals/pipelines (they reference them)
    try:
        from app.models.analytics import DealMetrics, PipelineMetrics
        # Delete deal metrics
        if company_pipeline_ids:
            db.query(DealMetrics).filter(DealMetrics.pipeline_id.in_(company_pipeline_ids)).delete(synchronize_session=False)
        # Delete pipeline metrics
        if company_pipeline_ids:
            db.query(PipelineMetrics).filter(PipelineMetrics.pipeline_id.in_(company_pipeline_ids)).delete(synchronize_session=False)
        print(f"✅ Deleted analytics data for company {company.id}")
    except Exception as e:
        print(f"Error deleting analytics: {e}")
        db.rollback()
    
    # Delete all deals (by owner_id, company_id, and pipeline_id to catch all)
    try:
        # Count deals first for debugging
        deals_count = db.query(Deal).filter(
            (Deal.owner_id.in_(company_user_ids) if company_user_ids else False) |
            (Deal.pipeline_id.in_(company_pipeline_ids) if company_pipeline_ids else False) |
            (Deal.company_id == company.id)
        ).count()
        print(f"Found {deals_count} deals to delete for company {company.id}")
        
        # Delete by owner_id
        if company_user_ids:
            deleted = db.query(Deal).filter(Deal.owner_id.in_(company_user_ids)).delete(synchronize_session=False)
            print(f"Deleted {deleted} deals by owner_id")
        
        # Delete by pipeline_id
        if company_pipeline_ids:
            deleted = db.query(Deal).filter(Deal.pipeline_id.in_(company_pipeline_ids)).delete(synchronize_session=False)
            print(f"Deleted {deleted} deals by pipeline_id")
        
        # Delete by company_id
        deleted = db.query(Deal).filter(Deal.company_id == company.id).delete(synchronize_session=False)
        print(f"Deleted {deleted} deals by company_id")
        
    except Exception as e:
        print(f"Error deleting deals: {e}")
        db.rollback()
    
    # Delete all contacts in the company (to avoid user foreign key constraint)
    try:
        db.query(Contact).filter(Contact.company_id == company.id).delete(synchronize_session=False)
    except Exception as e:
        print(f"Error deleting contacts: {e}")
        db.rollback()
    
    # Now delete pipeline stages and pipelines (after deals are deleted)
    # Delete stages first (they reference pipelines)
    try:
        if company_pipeline_ids:
            db.query(PipelineStage).filter(PipelineStage.pipeline_id.in_(company_pipeline_ids)).delete(synchronize_session=False)
    except Exception as e:
        print(f"Error deleting pipeline stages: {e}")
        db.rollback()
    
    # Then delete pipelines
    try:
        db.query(Pipeline).filter(Pipeline.company_id == company.id).delete(synchronize_session=False)
    except Exception as e:
        print(f"Error deleting pipelines: {e}")
        db.rollback()
    
    # CRITICAL STEP 1: NULL out users.team_id FIRST (users.team_id -> teams.id)
    # Must happen BEFORE deleting teams because users reference teams!
    try:
        team_member_count = db.query(User).filter(
            User.company_id == company.id,
            User.team_id.isnot(None)
        ).count()
        if team_member_count > 0:
            db.query(User).filter(User.company_id == company.id).update(
                {User.team_id: None},
                synchronize_session=False
            )
            db.commit()
            print(f"✅ Successfully nulled team_id for {team_member_count} users")
    except Exception as e:
        print(f"❌ CRITICAL ERROR nulling team_id: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to null team_id: {str(e)}"
        )
    
    # CRITICAL STEP 2: NOW delete teams (after users.team_id is nulled)
    try:
        from app.models.users import Team
        team_count = db.query(Team).filter(Team.company_id == company.id).count()
        if team_count > 0:
            deleted_teams = db.query(Team).filter(Team.company_id == company.id).delete(synchronize_session=False)
            db.commit()
            print(f"✅ Successfully deleted {deleted_teams} teams")
    except Exception as e:
        print(f"❌ CRITICAL ERROR deleting teams: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete teams: {str(e)}"
        )
    
    # CRITICAL STEP 3: NULL out users.manager_id (self-referencing FK)
    try:
        manager_count = db.query(User).filter(
            User.company_id == company.id,
            User.manager_id.isnot(None)
        ).count()
        if manager_count > 0:
            db.query(User).filter(User.company_id == company.id).update(
                {User.manager_id: None},
                synchronize_session=False
            )
            db.commit()
            print(f"✅ Successfully nulled manager_id for {manager_count} users")
    except Exception as e:
        print(f"❌ CRITICAL ERROR nulling manager_id: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to null manager_id: {str(e)}"
        )
    
    # Delete all users in the company
    try:
        user_count = db.query(User).filter(User.company_id == company.id).count()
        if user_count > 0:
            deleted_users = db.query(User).filter(User.company_id == company.id).delete(synchronize_session=False)
            db.commit()
            print(f"✅ Successfully deleted {deleted_users} users")
    except Exception as e:
        print(f"❌ CRITICAL ERROR deleting users: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete users: {str(e)}"
        )
    
    # Store company info for notification
    company_name = company.name
    company_id_for_notif = company.id
    
    # Expunge the company to avoid lazy loading relationships
    db.expunge(company)
    
    # Finally delete the company using raw delete
    try:
        db.query(Company).filter(Company.id == company_id_for_notif).delete(synchronize_session=False)
        db.commit()
        
        # Send deletion notification to super admins
        try:
            from app.services.notification_service import NotificationService
            deleter = db.query(User).filter(User.id == current_user.get("id")).first()
            deleter_name = f"{deleter.first_name} {deleter.last_name}" if deleter else "Super Admin"
            
            NotificationService.notify_company_deleted(
                db=db,
                company_name=company_name,
                deleter_id=deleter.id,
                deleter_name=deleter_name
            )
        except Exception as e:
            print(f"⚠️ Failed to send company deletion notification: {e}")
            
    except Exception as e:
        print(f"Error deleting company: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete company: {str(e)}"
        )
    
    return {"message": "Company and all associated data deleted successfully"}


@router.post("/{company_id}/suspend")
def suspend_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Suspend a company (Super Admin only)"""
    # Check if user has permission to manage companies
    if not has_permission(current_user, Permission.MANAGE_COMPANIES):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot manage companies"
        )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Check if company is already suspended
    if company.status == CompanyStatus.SUSPENDED.value:
        return {"message": "Company is already suspended"}
    
    # Suspend company
    company.status = CompanyStatus.SUSPENDED.value
    
    # Also suspend all users in the company
    users = db.query(User).filter(User.company_id == company.id).all()
    for user in users:
        user.status = UserStatus.SUSPENDED.value
    
    db.commit()
    db.refresh(company)
    
    return {"message": "Company suspended successfully"}


@router.post("/{company_id}/activate")
def activate_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Activate a suspended company (Super Admin only)"""
    # Check if user has permission to manage companies
    if not has_permission(current_user, Permission.MANAGE_COMPANIES):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot manage companies"
        )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Check if company is already active
    if company.status == CompanyStatus.ACTIVE.value:
        return {"message": "Company is already active"}
    
    # Activate company
    company.status = CompanyStatus.ACTIVE.value
    
    # Also activate all users in the company
    users = db.query(User).filter(User.company_id == company.id).all()
    for user in users:
        user.status = UserStatus.ACTIVE.value
    
    db.commit()
    db.refresh(company)
    
    return {"message": "Company activated successfully"}


# Company user management
@router.get("/{company_id}/users", response_model=List[dict])
def list_company_users(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List users in a company - role-based filtering"""
    from ..middleware.permissions import has_permission
    from ..models.permissions import Permission
    
    context = get_tenant_context(current_user)
    user_team_id = current_user.team_id if hasattr(current_user, 'team_id') else current_user.get('team_id')
    
    if not context.can_access_company(company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company"
        )
    
    # Role-based filtering
    if context.is_super_admin() or has_permission(current_user, Permission.VIEW_COMPANY_DATA):
        # Super Admin and Company Admin see all company users
        users = db.query(User).filter(
            User.company_id == company_id,
            User.is_deleted == False
        ).all()
    elif has_permission(current_user, Permission.VIEW_TEAM_DATA) and user_team_id:
        # Sales Manager sees only team members
        users = db.query(User).filter(
            User.company_id == company_id,
            User.team_id == user_team_id,
            User.is_deleted == False
        ).all()
    else:
        # Sales Reps and regular users see only themselves
        user_id = current_user.id if hasattr(current_user, 'id') else current_user.get('id')
        users = db.query(User).filter(
            User.company_id == company_id,
            User.id == user_id,
            User.is_deleted == False
        ).all()
    
    return [
        {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "user_role": user.user_role.value if hasattr(user.user_role, 'value') else user.user_role,
            "status": user.status.value if hasattr(user.status, 'value') else user.status,
            "created_at": user.created_at
        }
        for user in users
    ]


@router.post("/{company_id}/users")
def add_company_user(
    company_id: str,
    user_data: CompanyUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new user to company (Company Admin or Super Admin)"""
    context = get_tenant_context(current_user)
    
    # Check if user has permission to manage company users
    has_manage_permission = False
    
    # Super admin can manage any company's users
    if context.is_super_admin():
        has_manage_permission = True
    # Company admin can manage their own company's users
    elif has_permission(current_user, Permission.MANAGE_COMPANY_USERS) and context.can_access_company(company_id):
        has_manage_permission = True
    # Company admins can add any role within their company
    elif has_permission(current_user, Permission.MANAGE_TEAM_USERS) and context.can_access_company(company_id):
        if user_data.user_role not in [UserRole.REGULAR_USER, UserRole.COMPANY_ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only add regular users or company admins"
            )
        has_manage_permission = True
    
    if not has_manage_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot manage users"
        )
    
    if not context.can_access_company(company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company"
        )
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    from app.core.security import get_password_hash
    
    new_user = User(
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        hashed_password=get_password_hash(user_data.password),
        company_id=company_id,
        user_role=user_data.user_role.value if hasattr(user_data.user_role, 'value') else user_data.user_role,
        status=UserStatus.ACTIVE.value
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "id": str(new_user.id),
        "email": new_user.email,
        "message": "User created successfully"
    }
