"""
Permissions middleware for role-based access control
"""

from fastapi import HTTPException, status
from typing import List, Union, Dict, Any
from app.models.permissions import Permission, get_permissions_for_role
from app.models.users import UserRole, User


def has_permission(user: Union[User, Dict[str, Any]], permission: Permission) -> bool:
    """
    Check if user has specific permission
    
    Args:
        user: User object or dict with user data
        permission: Permission to check
        
    Returns:
        bool: True if user has permission, False otherwise
    """
    # Handle both User object and dict
    if isinstance(user, dict):
        user_role = user.get('role', '') or user.get('user_role', '')
    else:
        user_role = user.user_role if hasattr(user, 'user_role') else ''
    
    # Get permissions for role
    user_permissions = get_permissions_for_role(user_role)
    
    # Check if permission exists in user permissions
    return permission in user_permissions


def require_permission(permission: Permission):
    """
    Decorator/dependency to require specific permission
    
    Args:
        permission: Permission required to access endpoint
        
    Returns:
        Function: Decorator function
    """
    def decorator(func):
        async def wrapper(user, *args, **kwargs):
            if not has_permission(user, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: {permission}"
                )
            return await func(user, *args, **kwargs)
        return wrapper
    return decorator


def require_any_permission(permissions: List[Permission]):
    """
    Decorator/dependency to require any of the specified permissions
    
    Args:
        permissions: List of permissions, any of which grants access
        
    Returns:
        Function: Decorator function
    """
    def decorator(func):
        async def wrapper(user, *args, **kwargs):
            for permission in permissions:
                if has_permission(user, permission):
                    return await func(user, *args, **kwargs)
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: requires any of {[p for p in permissions]}"
            )
        return wrapper
    return decorator


def require_all_permissions(permissions: List[Permission]):
    """
    Decorator/dependency to require all specified permissions
    
    Args:
        permissions: List of permissions, all of which are required
        
    Returns:
        Function: Decorator function
    """
    def decorator(func):
        async def wrapper(user, *args, **kwargs):
            for permission in permissions:
                if not has_permission(user, permission):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Permission denied: requires {permission}"
                    )
            return await func(user, *args, **kwargs)
        return wrapper
    return decorator
