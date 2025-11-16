"""
User-friendly error handler middleware for permission and access control errors
Converts technical errors into user-friendly messages for a SaaS CRM application
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
import logging

logger = logging.getLogger(__name__)


class UserFriendlyError:
    """User-friendly error messages for common permission scenarios"""
    
    # Permission Errors
    PERMISSION_DENIED = {
        "title": "Access Denied",
        "message": "You don't have permission to perform this action.",
        "suggestion": "Please contact your administrator if you need access to this feature."
    }
    
    VIEW_COMPANY_DATA = {
        "title": "Company Data Access Required",
        "message": "You can only view data within your team or assigned to you.",
        "suggestion": "Contact your Company Admin to request broader access permissions."
    }
    
    VIEW_TEAM_DATA = {
        "title": "Team Access Required",
        "message": "You can only view your own data and tasks.",
        "suggestion": "Ask your Sales Manager to assign you to a team for team-level access."
    }
    
    MANAGE_USERS = {
        "title": "User Management Restricted",
        "message": "Only administrators can add or manage users.",
        "suggestion": "Contact your Company Admin to add new team members."
    }
    
    MANAGE_BILLING = {
        "title": "Billing Access Restricted",
        "message": "Only Company Admins can manage billing and subscriptions.",
        "suggestion": "Contact your Company Admin for billing-related requests."
    }
    
    MANAGE_COMPANY = {
        "title": "Company Settings Restricted",
        "message": "Only Company Admins can modify company settings.",
        "suggestion": "Contact your administrator to update company information."
    }
    
    ASSIGN_LEADS = {
        "title": "Lead Assignment Restricted",
        "message": "You don't have permission to assign leads to other users.",
        "suggestion": "Contact your Sales Manager to reassign leads or deals."
    }
    
    EXPORT_DATA = {
        "title": "Data Export Restricted",
        "message": "You don't have permission to export company data.",
        "suggestion": "Contact your Company Admin to request a data export."
    }
    
    MANAGE_INTEGRATIONS = {
        "title": "Integration Management Restricted",
        "message": "Only administrators can configure integrations.",
        "suggestion": "Contact your Company Admin to set up or modify integrations."
    }
    
    CUSTOMIZE_CRM = {
        "title": "CRM Customization Restricted",
        "message": "Only administrators can customize CRM fields and settings.",
        "suggestion": "Contact your Company Admin to request custom fields or pipeline changes."
    }
    
    # Team Errors
    NO_TEAM_ASSIGNED = {
        "title": "No Team Assigned",
        "message": "You are not currently assigned to any team.",
        "suggestion": "Contact your administrator to be added to a team."
    }
    
    TEAM_ACCESS_DENIED = {
        "title": "Team Access Denied",
        "message": "You can only access your own team's data.",
        "suggestion": "Contact your Sales Manager if you need access to other teams."
    }
    
    # Resource Errors
    RESOURCE_NOT_FOUND = {
        "title": "Not Found",
        "message": "The requested resource could not be found.",
        "suggestion": "The item may have been deleted or you may not have access to it."
    }
    
    CONTACT_NOT_FOUND = {
        "title": "Contact Not Found",
        "message": "This contact doesn't exist or you don't have access to it.",
        "suggestion": "Check if the contact was deleted or contact your team lead."
    }
    
    DEAL_NOT_FOUND = {
        "title": "Deal Not Found",
        "message": "This deal doesn't exist or you don't have access to it.",
        "suggestion": "Check if the deal was deleted or contact your team lead."
    }
    
    # Company Errors
    COMPANY_NOT_FOUND = {
        "title": "Company Not Found",
        "message": "The requested company could not be found.",
        "suggestion": "Please check the company ID or contact support."
    }
    
    SUBSCRIPTION_EXPIRED = {
        "title": "Subscription Expired",
        "message": "Your company's subscription has expired.",
        "suggestion": "Contact your Company Admin to renew the subscription."
    }
    
    TRIAL_EXPIRED = {
        "title": "Trial Period Ended",
        "message": "Your free trial has ended.",
        "suggestion": "Upgrade to a paid plan to continue using all features."
    }
    
    # Authentication Errors
    INVALID_TOKEN = {
        "title": "Session Expired",
        "message": "Your session has expired. Please log in again.",
        "suggestion": "Click here to return to the login page."
    }
    
    ACCOUNT_DISABLED = {
        "title": "Account Disabled",
        "message": "Your account has been disabled.",
        "suggestion": "Contact your administrator or support for assistance."
    }


def get_user_friendly_error(error_detail: str, status_code: int) -> dict:
    """
    Convert technical error messages to user-friendly format
    """
    error_lower = error_detail.lower()
    
    # Permission-related errors
    if "permission" in error_lower or "forbidden" in error_lower:
        if "company data" in error_lower or "company" in error_lower:
            return UserFriendlyError.VIEW_COMPANY_DATA
        elif "team" in error_lower:
            if "access denied to this team" in error_lower:
                return UserFriendlyError.TEAM_ACCESS_DENIED
            return UserFriendlyError.VIEW_TEAM_DATA
        elif "user" in error_lower or "member" in error_lower:
            return UserFriendlyError.MANAGE_USERS
        elif "billing" in error_lower or "subscription" in error_lower:
            return UserFriendlyError.MANAGE_BILLING
        elif "assign" in error_lower or "lead" in error_lower:
            return UserFriendlyError.ASSIGN_LEADS
        elif "export" in error_lower or "import" in error_lower:
            return UserFriendlyError.EXPORT_DATA
        elif "integration" in error_lower:
            return UserFriendlyError.MANAGE_INTEGRATIONS
        elif "customize" in error_lower or "field" in error_lower:
            return UserFriendlyError.CUSTOMIZE_CRM
        else:
            return UserFriendlyError.PERMISSION_DENIED
    
    # Team-related errors
    if "no team" in error_lower or "not assigned to" in error_lower:
        return UserFriendlyError.NO_TEAM_ASSIGNED
    
    # Resource not found errors
    if status_code == 404:
        if "contact" in error_lower:
            return UserFriendlyError.CONTACT_NOT_FOUND
        elif "deal" in error_lower:
            return UserFriendlyError.DEAL_NOT_FOUND
        elif "company" in error_lower:
            return UserFriendlyError.COMPANY_NOT_FOUND
        else:
            return UserFriendlyError.RESOURCE_NOT_FOUND
    
    # Subscription errors
    if "subscription" in error_lower and "expired" in error_lower:
        return UserFriendlyError.SUBSCRIPTION_EXPIRED
    
    if "trial" in error_lower and "expired" in error_lower:
        return UserFriendlyError.TRIAL_EXPIRED
    
    # Authentication errors
    if status_code == 401:
        if "disabled" in error_lower:
            return UserFriendlyError.ACCOUNT_DISABLED
        return UserFriendlyError.INVALID_TOKEN
    
    # Default error
    return {
        "title": "Error",
        "message": error_detail,
        "suggestion": "Please try again or contact support if the problem persists."
    }


async def error_handler_middleware(request: Request, call_next):
    """
    Middleware to catch errors and convert them to user-friendly messages
    """
    try:
        response = await call_next(request)
        return response
    except HTTPException as exc:
        # Convert to user-friendly error
        friendly_error = get_user_friendly_error(exc.detail, exc.status_code)
        
        # Log the original error for debugging
        logger.warning(
            f"HTTP {exc.status_code} - {exc.detail} - "
            f"Path: {request.url.path} - User: {request.state.user if hasattr(request.state, 'user') else 'Unknown'}"
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "title": friendly_error["title"],
                    "message": friendly_error["message"],
                    "suggestion": friendly_error["suggestion"],
                    "status_code": exc.status_code,
                    "technical_detail": exc.detail if request.state.get("is_admin", False) else None
                }
            }
        )
    except Exception as exc:
        # Log unexpected errors
        logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "title": "Something Went Wrong",
                    "message": "An unexpected error occurred. Our team has been notified.",
                    "suggestion": "Please try again in a few moments or contact support if the issue persists.",
                    "status_code": 500
                }
            }
        )
