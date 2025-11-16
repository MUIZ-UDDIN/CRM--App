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
    Delete a company (soft delete)
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
    
    # Soft delete: mark as deleted instead of actually deleting
    company.status = 'deleted'
    company.subscription_status = 'cancelled'
    
    # Also mark all users as deleted
    db.query(User).filter(User.company_id == company_id).update({
        "is_deleted": True,
        "is_active": False
    })
    
    db.commit()
    
    # Log the action
    audit_log = AuditLog(
        user_id=current_user.get('id'),
        user_email=current_user.get('email'),
        action=AuditAction.DELETE,
        resource_type='company',
        resource_id=company.id,
        details=f"Company '{company.name}' deleted by Super Admin",
        metadata={'company_name': company.name, 'company_id': str(company.id)}
    )
    db.add(audit_log)
    db.commit()
    
    # Invalidate cache
    _platform_cache['data'] = None
    
    return {
        "message": f"Company '{company.name}' has been deleted successfully",
        "company_id": str(company.id)
    }


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
