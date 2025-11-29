"""
Helper module for analytics permissions
This module provides functions to check analytics permissions based on user role
"""

from app.middleware.tenant import get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission
from fastapi import HTTPException, status

def check_analytics_permissions(current_user, analytics_type, company_id=None, team_id=None):
    """
    Check if user has permission to access analytics
    
    Args:
        current_user: Current user dict
        analytics_type: Type of analytics (pipeline, revenue, user, etc.)
        company_id: Optional company ID to check access for
        team_id: Optional team ID to check access for
        
    Returns:
        tuple: (can_access, access_level)
            - can_access: Boolean indicating if user can access analytics
            - access_level: String indicating access level (all, company, team, own)
    """
    context = get_tenant_context(current_user)
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    # Use is_superuser flag instead of role to match Dashboard logic
    # This ensures consistency across all analytics endpoints
    is_superuser = current_user.get("is_superuser", False)
    
    # Super admin can access all analytics (use is_superuser flag for consistency with Dashboard)
    if is_superuser:
        return True, "all"
    
    # Check company-level access
    if has_permission(current_user, Permission.VIEW_COMPANY_ANALYTICS):
        # If company_id is specified, check if user can access it
        if company_id and not context.can_access_company(str(company_id)):
            return False, None
        return True, "company"
    
    # Check team-level access
    if has_permission(current_user, Permission.VIEW_TEAM_ANALYTICS):
        # If team_id is specified, check if user can access it
        if team_id and str(team_id) != str(user_team_id):
            return False, None
        return True, "team"
    
    # Check personal-level access
    if has_permission(current_user, Permission.VIEW_OWN_ANALYTICS):
        return True, "own"
    
    # No permission
    return False, None

def filter_analytics_by_permission(query, model, current_user, access_level):
    """
    Filter analytics query based on user permissions
    
    Args:
        query: SQLAlchemy query
        model: SQLAlchemy model
        current_user: Current user dict
        access_level: Access level (all, company, team, own)
        
    Returns:
        SQLAlchemy query with appropriate filters
    """
    user_id = current_user.get('id')
    company_id = current_user.get('company_id')
    user_team_id = current_user.get('team_id')
    
    if access_level == "all":
        # No additional filters for super admin
        return query
    
    if access_level == "company":
        # Filter by company
        if hasattr(model, 'company_id'):
            return query.filter(model.company_id == company_id)
    
    if access_level == "team":
        # Filter by team
        if hasattr(model, 'team_id'):
            return query.filter(model.team_id == user_team_id)
        # If no team_id but has owner_id, filter by team members
        elif hasattr(model, 'owner_id'):
            from app.models.users import User
            return query.join(User, model.owner_id == User.id).filter(User.team_id == user_team_id)
    
    if access_level == "own":
        # Filter by owner
        if hasattr(model, 'owner_id'):
            return query.filter(model.owner_id == user_id)
        # If no owner_id but has user_id, filter by user
        elif hasattr(model, 'user_id'):
            return query.filter(model.user_id == user_id)
    
    # Default: return empty query
    return query.filter(False)

def enforce_analytics_permissions(current_user, analytics_type):
    """
    Enforce analytics permissions and return access level
    
    Args:
        current_user: Current user dict
        analytics_type: Type of analytics (pipeline, revenue, user, etc.)
        
    Returns:
        str: Access level (all, company, team, own)
        
    Raises:
        HTTPException: If user doesn't have permission
    """
    can_access, access_level = check_analytics_permissions(current_user, analytics_type)
    
    if not can_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You don't have permission to access {analytics_type} analytics"
        )
    
    return access_level
