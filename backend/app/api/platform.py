"""
Platform Management API for Super Admin
Provides platform-wide metrics and company management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, UUID4
from functools import lru_cache
import hashlib
import json

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models import Company, User, AuditLog, AuditAction
from app.models.deals import Deal
from app.models.contacts import Contact

# Simple in-memory cache for platform metrics
_platform_cache = {
    'data': None,
    'timestamp': None,
    'ttl': 300  # 5 minutes cache
}

router = APIRouter(prefix="/api/platform", tags=["Platform Management"])


class CompanyInfo(BaseModel):
    """Company information for platform dashboard"""
    id: str
    name: str
    status: str
    subscription_status: str
    trial_ends_at: Optional[datetime]
    days_remaining: int
    user_count: int
    deal_count: int
    created_at: datetime


class PlatformDashboardResponse(BaseModel):
    """Platform dashboard metrics"""
    total_companies: int
    active_subscriptions: int
    trial_companies: int
    expired_companies: int
    suspended_companies: int
    total_users: int
    total_deals: int
    total_revenue: float
    companies: List[CompanyInfo]


@router.get("/dashboard", response_model=PlatformDashboardResponse)
async def get_platform_dashboard(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    force_refresh: bool = False
):
    """
    Get platform-wide dashboard metrics
    Only accessible by Super Admin
    Cached for 5 minutes for performance
    """
    # Verify super_admin role
    if current_user.get('role') != 'super_admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only accessible to Super Admins"
        )
    
    # Check cache
    now = datetime.utcnow()
    if (not force_refresh and 
        _platform_cache['data'] is not None and 
        _platform_cache['timestamp'] is not None and
        (now - _platform_cache['timestamp']).total_seconds() < _platform_cache['ttl']):
        return _platform_cache['data']
    
    # Get all companies
    all_companies = db.query(Company).all()
    
    # Count by status
    active_count = sum(1 for c in all_companies if c.subscription_status == 'active')
    trial_count = sum(1 for c in all_companies if c.subscription_status == 'trial')
    expired_count = sum(1 for c in all_companies if c.subscription_status == 'expired')
    suspended_count = sum(1 for c in all_companies if c.status == 'suspended')
    
    # Get total users and deals
    total_users = db.query(func.count(User.id)).filter(User.is_deleted == False).scalar() or 0
    total_deals = db.query(func.count(Deal.id)).filter(Deal.is_deleted == False).scalar() or 0
    
    # Calculate total revenue (sum of monthly_price for active subscriptions)
    total_revenue = sum(
        float(c.monthly_price or 0) 
        for c in all_companies 
        if c.subscription_status == 'active'
    )
    
    # Build company list with details
    companies_info = []
    for company in all_companies:
        user_count = db.query(func.count(User.id)).filter(
            User.company_id == company.id,
            User.is_deleted == False
        ).scalar() or 0
        
        deal_count = db.query(func.count(Deal.id)).filter(
            Deal.company_id == company.id,
            Deal.is_deleted == False
        ).scalar() or 0
        
        # Calculate days remaining for trial
        days_remaining = 0
        if company.subscription_status == 'trial' and company.trial_ends_at:
            delta = company.trial_ends_at - datetime.utcnow()
            days_remaining = max(0, delta.days)
        
        companies_info.append(CompanyInfo(
            id=str(company.id),
            name=company.name,
            status=company.status,
            subscription_status=company.subscription_status,
            trial_ends_at=company.trial_ends_at,
            days_remaining=days_remaining,
            user_count=user_count,
            deal_count=deal_count,
            created_at=company.created_at
        ))
    
    response = PlatformDashboardResponse(
        total_companies=len(all_companies),
        active_subscriptions=active_count,
        trial_companies=trial_count,
        expired_companies=expired_count,
        suspended_companies=suspended_count,
        total_users=total_users,
        total_deals=total_deals,
        total_revenue=total_revenue,
        companies=companies_info
    )
    
    # Update cache
    _platform_cache['data'] = response
    _platform_cache['timestamp'] = now
    
    return response


@router.get("/companies")
async def get_companies_list(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get list of all companies (simple list for filters)
    Only accessible by Super Admin
    """
    user_role = current_user.get('role', 'user')
    
    if user_role != 'super_admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admins can view all companies"
        )
    
    companies = db.query(Company).filter(Company.is_deleted == False).all()
    
    return [
        {
            "id": str(company.id),
            "name": company.name
        }
        for company in companies
    ]


@router.post("/companies/{company_id}/suspend")
async def suspend_company(
    company_id: UUID4,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Suspend a company
    Only accessible by Super Admin
    """
    # Verify super_admin role
    if current_user.get('role') != 'super_admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only accessible to Super Admins"
        )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    company.status = 'suspended'
    company.subscription_status = 'suspended'
    db.commit()
    
    # Log the action
    audit_log = AuditLog(
        user_id=current_user.get('id'),
        user_email=current_user.get('email'),
        action=AuditAction.SUSPEND,
        resource_type='company',
        resource_id=company.id,
        details=f"Company '{company.name}' suspended by Super Admin",
        metadata={'company_name': company.name, 'company_id': str(company.id)}
    )
    db.add(audit_log)
    db.commit()
    
    # Invalidate cache
    _platform_cache['data'] = None
    
    return {
        "message": f"Company '{company.name}' has been suspended successfully",
        "company_id": str(company.id),
        "status": "suspended"
    }


@router.post("/companies/{company_id}/unsuspend")
async def unsuspend_company(
    company_id: UUID4,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Unsuspend a company
    Only accessible by Super Admin
    """
    # Verify super_admin role
    if current_user.get('role') != 'super_admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only accessible to Super Admins"
        )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    company.status = 'active'
    # Restore previous subscription status (trial or active)
    if company.trial_ends_at and company.trial_ends_at > datetime.utcnow():
        company.subscription_status = 'trial'
    else:
        company.subscription_status = 'active'
    
    db.commit()
    
    # Log the action
    audit_log = AuditLog(
        user_id=current_user.get('id'),
        user_email=current_user.get('email'),
        action=AuditAction.UNSUSPEND,
        resource_type='company',
        resource_id=company.id,
        details=f"Company '{company.name}' unsuspended by Super Admin",
        metadata={'company_name': company.name, 'company_id': str(company.id)}
    )
    db.add(audit_log)
    db.commit()
    
    # Invalidate cache
    _platform_cache['data'] = None
    
    return {
        "message": f"Company '{company.name}' has been unsuspended successfully",
        "company_id": str(company.id),
        "status": company.status,
        "subscription_status": company.subscription_status
    }


@router.delete("/companies/{company_id}")
async def delete_company(
    company_id: UUID4,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    PERMANENTLY delete a company and ALL related data
    Only accessible by Super Admin
    
    This will delete:
    - Company record
    - All users
    - All deals
    - All contacts
    - All activities
    - All pipelines and stages
    - All documents
    - All files
    - All teams
    - All email settings
    - All notifications
    - All support tickets
    - All workflows
    - All quotes
    - All SMS messages
    - All calls
    - All email campaigns
    - And ALL other related data
    """
    # Verify super_admin role
    if current_user.get('role') != 'super_admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only accessible to Super Admins"
        )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    company_name = company.name
    
    try:
        # Import all models that need to be deleted
        from ..models.deals import Deal, Pipeline, PipelineStage
        from ..models.contacts import Contact
        from ..models.activities import Activity
        from ..models.documents import Document
        from ..models.files import File
        from ..models.teams import Team
        from ..models.email_settings import EmailSettings
        from ..models.notifications import Notification
        from ..models.support_tickets import SupportTicket
        from ..models.workflows import Workflow
        from ..models.workflow_templates import WorkflowTemplate
        from ..models.quotes import Quote
        from ..models.sms import SMS
        from ..models.calls import Call
        from ..models.email_campaigns import EmailCampaign
        from ..models.scheduled_sms import ScheduledSMS
        from ..models.sms_templates import SMSTemplate
        from ..models.twilio_settings import TwilioSettings
        from ..models.phone_numbers import PhoneNumber
        from ..models.performance_alerts import PerformanceAlert
        from ..models.custom_fields import CustomField
        from ..models.payment_history import PaymentHistory
        
        # Log the action BEFORE deletion
        audit_log = AuditLog(
            user_id=current_user.get('id'),
            user_email=current_user.get('email'),
            action=AuditAction.DELETE,
            resource_type='company',
            resource_id=company.id,
            details=f"Company '{company_name}' and ALL related data permanently deleted by Super Admin",
            metadata={'company_name': company_name, 'company_id': str(company_id)}
        )
        db.add(audit_log)
        db.flush()  # Flush to save audit log before deletions
        
        # PERMANENT CASCADE DELETION - Delete all related data
        # Order matters: delete child records before parent records
        
        # 1. Delete activities (references deals, contacts, users)
        db.query(Activity).filter(Activity.company_id == company_id).delete(synchronize_session=False)
        
        # 2. Delete documents and files (references deals, contacts)
        db.query(Document).filter(Document.company_id == company_id).delete(synchronize_session=False)
        db.query(File).filter(File.company_id == company_id).delete(synchronize_session=False)
        
        # 3. Delete deals (references pipelines, stages, contacts, users)
        db.query(Deal).filter(Deal.company_id == company_id).delete(synchronize_session=False)
        
        # 4. Delete pipeline stages (references pipelines)
        pipeline_ids = [p.id for p in db.query(Pipeline.id).filter(Pipeline.company_id == company_id).all()]
        if pipeline_ids:
            db.query(PipelineStage).filter(PipelineStage.pipeline_id.in_(pipeline_ids)).delete(synchronize_session=False)
        
        # 5. Delete pipelines
        db.query(Pipeline).filter(Pipeline.company_id == company_id).delete(synchronize_session=False)
        
        # 6. Delete contacts
        db.query(Contact).filter(Contact.company_id == company_id).delete(synchronize_session=False)
        
        # 7. Delete quotes
        db.query(Quote).filter(Quote.company_id == company_id).delete(synchronize_session=False)
        
        # 8. Delete workflows and templates
        db.query(Workflow).filter(Workflow.company_id == company_id).delete(synchronize_session=False)
        db.query(WorkflowTemplate).filter(WorkflowTemplate.company_id == company_id).delete(synchronize_session=False)
        
        # 9. Delete communication records
        db.query(SMS).filter(SMS.company_id == company_id).delete(synchronize_session=False)
        db.query(ScheduledSMS).filter(ScheduledSMS.company_id == company_id).delete(synchronize_session=False)
        db.query(SMSTemplate).filter(SMSTemplate.company_id == company_id).delete(synchronize_session=False)
        db.query(Call).filter(Call.company_id == company_id).delete(synchronize_session=False)
        db.query(EmailCampaign).filter(EmailCampaign.company_id == company_id).delete(synchronize_session=False)
        
        # 10. Delete support tickets
        db.query(SupportTicket).filter(SupportTicket.company_id == company_id).delete(synchronize_session=False)
        
        # 11. Delete notifications
        db.query(Notification).filter(Notification.company_id == company_id).delete(synchronize_session=False)
        
        # 12. Delete performance alerts
        db.query(PerformanceAlert).filter(PerformanceAlert.company_id == company_id).delete(synchronize_session=False)
        
        # 13. Delete custom fields
        db.query(CustomField).filter(CustomField.company_id == company_id).delete(synchronize_session=False)
        
        # 14. Delete payment history
        db.query(PaymentHistory).filter(PaymentHistory.company_id == company_id).delete(synchronize_session=False)
        
        # 15. Delete settings
        db.query(TwilioSettings).filter(TwilioSettings.company_id == company_id).delete(synchronize_session=False)
        db.query(PhoneNumber).filter(PhoneNumber.company_id == company_id).delete(synchronize_session=False)
        db.query(EmailSettings).filter(EmailSettings.company_id == company_id).delete(synchronize_session=False)
        
        # 16. Delete teams
        db.query(Team).filter(Team.company_id == company_id).delete(synchronize_session=False)
        
        # 17. Delete users
        db.query(User).filter(User.company_id == company_id).delete(synchronize_session=False)
        
        # 18. Finally, delete the company itself
        db.delete(company)
        
        # Commit all deletions
        db.commit()
        
        # Invalidate cache
        _platform_cache['data'] = None
        
        return {
            "message": f"Company '{company_name}' and all related data have been permanently deleted",
            "company_id": str(company_id)
        }
        
    except Exception as e:
        db.rollback()
        import traceback
        print(f"Error deleting company: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete company: {str(e)}"
        )


@router.get("/audit-logs")
async def get_audit_logs(
    limit: int = 50,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get recent audit logs for platform actions
    Only accessible by Super Admin
    """
    # Verify super_admin role
    if current_user.get('role') != 'super_admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is only accessible to Super Admins"
        )
    
    # Get recent audit logs for company management actions
    logs = db.query(AuditLog).filter(
        AuditLog.resource_type == 'company',
        AuditLog.action.in_([AuditAction.SUSPEND, AuditAction.UNSUSPEND, AuditAction.DELETE])
    ).order_by(AuditLog.created_at.desc()).limit(limit).all()
    
    return [
        {
            "id": str(log.id),
            "action": log.action.value if hasattr(log.action, 'value') else str(log.action),
            "target_company": log.metadata.get('company_name') if log.metadata else 'Unknown',
            "performed_by": log.user_email,
            "timestamp": log.created_at.isoformat(),
            "details": log.details
        }
        for log in logs
    ]
