"""
Permissions model for role-based access control
"""

import enum
from .users import UserRole


class Permission(str, enum.Enum):
    """Permission types for RBAC"""
    # Company Management
    MANAGE_BILLING = "manage_billing"
    CREATE_COMPANY = "create_company"
    DELETE_COMPANY = "delete_company"
    EDIT_COMPANY = "edit_company"
    SUSPEND_COMPANY = "suspend_company"
    
    # User Management
    MANAGE_COMPANY_ADMINS = "manage_company_admins"
    MANAGE_COMPANY_USERS = "manage_company_users"
    MANAGE_TEAM_USERS = "manage_team_users"
    
    # Data Access
    VIEW_ALL_COMPANIES = "view_all_companies"
    VIEW_COMPANY_DATA = "view_company_data"
    VIEW_TEAM_DATA = "view_team_data"
    VIEW_OWN_DATA = "view_own_data"
    
    # Analytics
    VIEW_ALL_ANALYTICS = "view_all_analytics"
    VIEW_COMPANY_ANALYTICS = "view_company_analytics"
    VIEW_TEAM_ANALYTICS = "view_team_analytics"
    VIEW_OWN_ANALYTICS = "view_own_analytics"
    
    # Lead/Deal Management
    ASSIGN_ANY_LEADS = "assign_any_leads"
    ASSIGN_COMPANY_LEADS = "assign_company_leads"
    ASSIGN_TEAM_LEADS = "assign_team_leads"
    
    # Integrations
    MANAGE_GLOBAL_INTEGRATIONS = "manage_global_integrations"
    MANAGE_COMPANY_INTEGRATIONS = "manage_company_integrations"
    USE_INTEGRATIONS = "use_integrations"
    
    # Automations
    MANAGE_GLOBAL_AUTOMATIONS = "manage_global_automations"
    MANAGE_COMPANY_AUTOMATIONS = "manage_company_automations"
    MANAGE_TEAM_AUTOMATIONS = "manage_team_automations"
    
    # Data Export/Import
    EXPORT_ANY_DATA = "export_any_data"
    EXPORT_COMPANY_DATA = "export_company_data"
    EXPORT_TEAM_DATA = "export_team_data"


# Define role permissions mapping
ROLE_PERMISSIONS = {
    UserRole.SUPER_ADMIN: [p for p in Permission],
    UserRole.COMPANY_ADMIN: [
        Permission.EDIT_COMPANY, Permission.MANAGE_COMPANY_USERS, Permission.MANAGE_TEAM_USERS,
        Permission.VIEW_COMPANY_DATA, Permission.VIEW_TEAM_DATA, Permission.VIEW_OWN_DATA,
        Permission.VIEW_COMPANY_ANALYTICS, Permission.VIEW_TEAM_ANALYTICS, Permission.VIEW_OWN_ANALYTICS,
        Permission.ASSIGN_COMPANY_LEADS, Permission.ASSIGN_TEAM_LEADS, Permission.MANAGE_COMPANY_INTEGRATIONS,
        Permission.USE_INTEGRATIONS, Permission.MANAGE_COMPANY_AUTOMATIONS, Permission.MANAGE_TEAM_AUTOMATIONS,
        Permission.EXPORT_COMPANY_DATA, Permission.EXPORT_TEAM_DATA
    ],
    "sales_manager": [
        Permission.MANAGE_TEAM_USERS, Permission.VIEW_TEAM_DATA, Permission.VIEW_OWN_DATA,
        Permission.VIEW_TEAM_ANALYTICS, Permission.VIEW_OWN_ANALYTICS, Permission.ASSIGN_TEAM_LEADS,
        Permission.USE_INTEGRATIONS, Permission.MANAGE_TEAM_AUTOMATIONS, Permission.EXPORT_TEAM_DATA
    ],
    "sales_rep": [
        Permission.VIEW_OWN_DATA, Permission.VIEW_OWN_ANALYTICS, Permission.USE_INTEGRATIONS
    ],
    UserRole.COMPANY_USER: [
        Permission.VIEW_OWN_DATA, Permission.VIEW_OWN_ANALYTICS, Permission.USE_INTEGRATIONS
    ]
}


def get_permissions_for_role(role: str) -> list:
    """Get permissions for a specific role"""
    if isinstance(role, str):
        role_lower = role.lower()
        if role_lower == "super_admin":
            return ROLE_PERMISSIONS[UserRole.SUPER_ADMIN]
        elif role_lower == "company_admin":
            return ROLE_PERMISSIONS[UserRole.COMPANY_ADMIN]
        elif role_lower == "sales_manager":
            return ROLE_PERMISSIONS["sales_manager"]
        elif role_lower == "sales_rep":
            return ROLE_PERMISSIONS["sales_rep"]
        elif role_lower == "company_user":
            return ROLE_PERMISSIONS[UserRole.COMPANY_USER]
    return ROLE_PERMISSIONS.get(role, [])
