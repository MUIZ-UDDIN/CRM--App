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
    
    def is_sales_manager(self) -> bool:
        """Check if current user is sales manager"""
        if isinstance(self.user_role, str):
            return self.user_role.lower() in ['sales_manager']
        return self.user_role == UserRole.SALES_MANAGER
    
    def is_sales_rep(self) -> bool:
        """Check if current user is sales rep"""
        if isinstance(self.user_role, str):
            return self.user_role.lower() in ['sales_rep']
        return self.user_role == UserRole.SALES_REP
    
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
        Automatically filter query by company_id and team_id based on user role
        Super admins bypass this filter
        """
        if self.is_super_admin():
            return query  # No filtering for super admin
        
        # Company admins see all company data
        if self.is_company_admin():
            # Check if model has company_id attribute
            if hasattr(model, 'company_id'):
                return query.filter(model.company_id == self.company_id)
            return query
        
        # Sales managers see only their team's data
        if self.is_sales_manager():
            # If model has team_id, filter by team
            if hasattr(model, 'team_id'):
                return query.filter(model.team_id == self.user.team_id)
            # If model has owner_id and owner is in manager's team
            elif hasattr(model, 'owner_id'):
                # This requires a subquery to get team members
                # For simplicity, we'll just filter by company for now
                # In a real implementation, you'd join with users and filter by team_id
                if hasattr(model, 'company_id'):
                    return query.filter(model.company_id == self.company_id)
            return query
        
        # Sales reps and regular users see only their own data
        if hasattr(model, 'owner_id'):
            return query.filter(model.owner_id == self.user_id)
        
        # Default company-level isolation
        if hasattr(model, 'company_id'):
            return query.filter(model.company_id == self.company_id)
        
        return query
    
    def validate_record_access(self, record) -> bool:
        """
        Validate if user can access a specific record
        """
        if self.is_super_admin():
            return True
        
        # Company admins can access all company records
        if self.is_company_admin():
            if hasattr(record, 'company_id'):
                return str(record.company_id) == str(self.company_id)
            return False
        
        # Sales managers can access team records
        if self.is_sales_manager():
            # If record has team_id, check if it matches user's team
            if hasattr(record, 'team_id'):
                return str(record.team_id) == str(self.user.team_id)
            
            # If record has owner_id, check if owner is in manager's team
            # This would require a database query to check team membership
            # For simplicity, we'll just check company_id for now
            if hasattr(record, 'company_id'):
                return str(record.company_id) == str(self.company_id)
        
        # Sales reps and regular users can only access their own records
        if hasattr(record, 'owner_id'):
            return str(record.owner_id) == str(self.user_id)
        
        # Default company-level check
        if hasattr(record, 'company_id'):
            return str(record.company_id) == str(self.company_id)
        
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


def require_sales_manager(user: User):
    """Decorator/dependency to require sales manager role"""
    if isinstance(user, dict):
        user_role = user.get('role', '') or user.get('user_role', '')
    else:
        user_role = user.user_role if hasattr(user, 'user_role') else ''
    
    if user_role.lower() not in ['super_admin', 'company_admin', 'sales_manager']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sales manager access required"
        )
    return user


def validate_team_access(user: User, team_id: str):
    """Validate user can access specific team"""
    # Super admin and company admin can access any team
    if isinstance(user, dict):
        user_role = user.get('role', '') or user.get('user_role', '')
        user_team_id = user.get('team_id')
    else:
        user_role = user.user_role if hasattr(user, 'user_role') else ''
        user_team_id = user.team_id if hasattr(user, 'team_id') else None
    
    if user_role.lower() in ['super_admin', 'company_admin']:
        return user
    
    # Sales manager can only access their own team
    if user_role.lower() == 'sales_manager' and str(user_team_id) == str(team_id):
        return user
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied to this team"
    )
