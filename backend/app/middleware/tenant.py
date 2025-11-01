"""
Multi-tenant middleware for tenant isolation
"""

from fastapi import Request, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from app.models import User, UserRole


class TenantContext:
    """
    Tenant context manager
    Ensures all database queries are scoped to the current user's company
    """
    
    def __init__(self, user):
        self.user = user
        # Handle both dict and User object
        if isinstance(user, dict):
            self.company_id = user.get('company_id')
            self.user_role = user.get('role')
            self.user_id = user.get('id')
        else:
            self.company_id = user.company_id
            self.user_role = user.user_role
            self.user_id = user.id
    
    def is_super_admin(self) -> bool:
        """Check if current user is super admin"""
        if isinstance(self.user_role, str):
            return self.user_role.lower() in ['super_admin', 'super admin']
        return self.user_role == UserRole.SUPER_ADMIN
    
    def is_company_admin(self) -> bool:
        """Check if current user is company admin"""
        if isinstance(self.user_role, str):
            return self.user_role.lower() in ['company_admin', 'company admin']
        return self.user_role == UserRole.COMPANY_ADMIN
    
    def can_manage_company(self) -> bool:
        """Check if user can manage company settings"""
        return self.is_super_admin() or self.is_company_admin()
    
    def can_access_company(self, company_id: str) -> bool:
        """Check if user can access a specific company"""
        if self.is_super_admin():
            return True  # Super admin can access all companies
        return str(self.company_id) == str(company_id)
    
    def enforce_tenant_isolation(self, query, model):
        """
        Automatically filter query by company_id
        Super admins bypass this filter
        """
        if self.is_super_admin():
            return query  # No filtering for super admin
        
        # Check if model has company_id attribute
        if hasattr(model, 'company_id'):
            return query.filter(model.company_id == self.company_id)
        
        return query
    
    def validate_record_access(self, record) -> bool:
        """
        Validate if user can access a specific record
        """
        if self.is_super_admin():
            return True
        
        # Check if record belongs to user's company
        if hasattr(record, 'company_id'):
            return str(record.company_id) == str(self.company_id)
        
        # Check if record is owned by user
        if hasattr(record, 'owner_id'):
            return str(record.owner_id) == str(self.user.id)
        
        return False


def get_tenant_context(user: User) -> TenantContext:
    """Get tenant context for current user"""
    return TenantContext(user)


def require_company_admin(user: User):
    """Decorator/dependency to require company admin role"""
    if user.user_role not in [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company admin access required"
        )
    return user


def require_super_admin(user):
    """Decorator/dependency to require super admin role"""
    # Handle both dict and User object
    if isinstance(user, dict):
        user_role = user.get('role', '')
    else:
        user_role = user.user_role if hasattr(user, 'user_role') else ''
    
    if user_role not in ['super_admin', 'Super Admin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return user


def validate_company_access(user: User, company_id: str):
    """Validate user can access specific company"""
    context = TenantContext(user)
    if not context.can_access_company(company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this company"
        )
