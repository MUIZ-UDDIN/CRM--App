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
    VIEW_BILLING = "view_billing"
    MANAGE_COMPANIES = "manage_companies"
    
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
    MANAGE_OWN_LEADS = "manage_own_leads"
    
    # Integrations
    MANAGE_GLOBAL_INTEGRATIONS = "manage_global_integrations"
    MANAGE_COMPANY_INTEGRATIONS = "manage_company_integrations"
    MANAGE_TEAM_INTEGRATIONS = "manage_team_integrations"
    USE_INTEGRATIONS = "use_integrations"
    
    # Automations
    MANAGE_GLOBAL_AUTOMATIONS = "manage_global_automations"
    MANAGE_COMPANY_AUTOMATIONS = "manage_company_automations"
    MANAGE_TEAM_AUTOMATIONS = "manage_team_automations"
    USE_PERSONAL_AUTOMATIONS = "use_personal_automations"
    
    # CRM Customization
    CUSTOMIZE_GLOBAL_CRM = "customize_global_crm"
    CUSTOMIZE_COMPANY_CRM = "customize_company_crm"
    VIEW_TEAM_CRM_SETTINGS = "view_team_crm_settings"
    
    # Data Export/Import
    EXPORT_ANY_DATA = "export_any_data"
    EXPORT_COMPANY_DATA = "export_company_data"
    EXPORT_TEAM_DATA = "export_team_data"
    IMPORT_COMPANY_DATA = "import_company_data"
    IMPORT_TEAM_DATA = "import_team_data"
    
    # Support and Notifications
    MANAGE_SYSTEM_SUPPORT = "manage_system_support"
    MANAGE_COMPANY_SUPPORT = "manage_company_support"
    MANAGE_TEAM_SUPPORT = "manage_team_support"
    VIEW_USER_SUPPORT = "view_user_support"
    CREATE_SUPPORT_TICKETS = "create_support_tickets"
    VIEW_SUPPORT_TICKETS = "view_support_tickets"
    MANAGE_SUPPORT_TICKETS = "manage_support_tickets"
    MANAGE_SUPPORT = "manage_support"
    
    # Notifications
    MANAGE_NOTIFICATIONS = "manage_notifications"
    VIEW_COMPANY_NOTIFICATIONS = "view_company_notifications"
    VIEW_TEAM_NOTIFICATIONS = "view_team_notifications"
    VIEW_OWN_NOTIFICATIONS = "view_own_notifications"


# Define role permissions mapping
ROLE_PERMISSIONS = {
    UserRole.SUPER_ADMIN: [
        # Platform Management (Super Admin exclusive)
        Permission.VIEW_ALL_COMPANIES,
        Permission.MANAGE_COMPANIES,
        Permission.CREATE_COMPANY,
        Permission.DELETE_COMPANY,
        Permission.SUSPEND_COMPANY,
        Permission.MANAGE_BILLING,  # Platform-level billing management
        
        # Global Platform Defaults (Super Admin exclusive)
        Permission.MANAGE_GLOBAL_INTEGRATIONS,
        Permission.MANAGE_GLOBAL_AUTOMATIONS,
        Permission.CUSTOMIZE_GLOBAL_CRM,
        Permission.EXPORT_ANY_DATA,
        Permission.VIEW_ALL_ANALYTICS,
        Permission.ASSIGN_ANY_LEADS,
        
        # Own Company Management (same as Company Admin for their company)
        Permission.EDIT_COMPANY,
        Permission.VIEW_BILLING,
        Permission.MANAGE_COMPANY_ADMINS,
        Permission.MANAGE_COMPANY_USERS,
        Permission.MANAGE_TEAM_USERS,
        Permission.VIEW_COMPANY_DATA,
        Permission.VIEW_TEAM_DATA,
        Permission.VIEW_OWN_DATA,
        Permission.VIEW_COMPANY_ANALYTICS,
        Permission.VIEW_TEAM_ANALYTICS,
        Permission.VIEW_OWN_ANALYTICS,
        Permission.ASSIGN_COMPANY_LEADS,
        Permission.ASSIGN_TEAM_LEADS,
        Permission.MANAGE_OWN_LEADS,
        Permission.MANAGE_COMPANY_INTEGRATIONS,
        Permission.MANAGE_TEAM_INTEGRATIONS,
        Permission.USE_INTEGRATIONS,
        Permission.MANAGE_COMPANY_AUTOMATIONS,
        Permission.MANAGE_TEAM_AUTOMATIONS,
        Permission.USE_PERSONAL_AUTOMATIONS,
        Permission.CUSTOMIZE_COMPANY_CRM,
        Permission.VIEW_TEAM_CRM_SETTINGS,
        Permission.EXPORT_COMPANY_DATA,
        Permission.EXPORT_TEAM_DATA,
        Permission.IMPORT_COMPANY_DATA,
        Permission.IMPORT_TEAM_DATA,
        Permission.MANAGE_SYSTEM_SUPPORT,
        Permission.MANAGE_COMPANY_SUPPORT,
        Permission.MANAGE_TEAM_SUPPORT,
        Permission.VIEW_USER_SUPPORT,
        Permission.CREATE_SUPPORT_TICKETS,
        Permission.VIEW_SUPPORT_TICKETS,
        Permission.MANAGE_SUPPORT_TICKETS,
        Permission.MANAGE_SUPPORT,
        Permission.MANAGE_NOTIFICATIONS,
        Permission.VIEW_COMPANY_NOTIFICATIONS,
        Permission.VIEW_TEAM_NOTIFICATIONS,
        Permission.VIEW_OWN_NOTIFICATIONS
    ],
    
    UserRole.COMPANY_ADMIN: [
        # Company Management (Admin + Sales Manager combined)
        Permission.EDIT_COMPANY, 
        Permission.VIEW_BILLING,
        Permission.MANAGE_BILLING,  # Company admins can manage their own billing
        
        # User Management (Full company + team access)
        Permission.MANAGE_COMPANY_USERS, 
        Permission.MANAGE_TEAM_USERS,
        
        # Data Access (Full company access)
        Permission.VIEW_COMPANY_DATA, 
        Permission.VIEW_TEAM_DATA, 
        Permission.VIEW_OWN_DATA,
        
        # Analytics (Full company analytics)
        Permission.VIEW_COMPANY_ANALYTICS, 
        Permission.VIEW_TEAM_ANALYTICS, 
        Permission.VIEW_OWN_ANALYTICS,
        
        # Lead/Deal Management (Full company access)
        Permission.ASSIGN_COMPANY_LEADS, 
        Permission.ASSIGN_TEAM_LEADS,
        Permission.MANAGE_OWN_LEADS,
        
        # Integrations (Full company access)
        Permission.MANAGE_COMPANY_INTEGRATIONS,
        Permission.MANAGE_TEAM_INTEGRATIONS,
        Permission.USE_INTEGRATIONS,
        
        # Automations (Full company access)
        Permission.MANAGE_COMPANY_AUTOMATIONS, 
        Permission.MANAGE_TEAM_AUTOMATIONS,
        Permission.USE_PERSONAL_AUTOMATIONS,
        
        # CRM Customization (Full company access)
        Permission.CUSTOMIZE_COMPANY_CRM,
        Permission.VIEW_TEAM_CRM_SETTINGS,
        
        # Data Export/Import (Full company access)
        Permission.EXPORT_COMPANY_DATA, 
        Permission.EXPORT_TEAM_DATA,
        Permission.IMPORT_COMPANY_DATA,
        Permission.IMPORT_TEAM_DATA,
        
        # Support and Notifications (Full company access)
        Permission.MANAGE_COMPANY_SUPPORT,
        Permission.MANAGE_TEAM_SUPPORT,
        Permission.VIEW_USER_SUPPORT,
        Permission.CREATE_SUPPORT_TICKETS,
        Permission.VIEW_SUPPORT_TICKETS,
        Permission.MANAGE_SUPPORT_TICKETS,
        
        # Notifications (Full company access)
        Permission.MANAGE_NOTIFICATIONS,
        Permission.VIEW_COMPANY_NOTIFICATIONS,
        Permission.VIEW_TEAM_NOTIFICATIONS,
        Permission.VIEW_OWN_NOTIFICATIONS
    ],
    
    UserRole.REGULAR_USER: [
        # Data Access (Own data only - Sales Rep/Employee)
        Permission.VIEW_OWN_DATA,
        
        # Analytics (Own analytics only)
        Permission.VIEW_OWN_ANALYTICS,
        
        # Lead/Deal Management (Own leads only)
        Permission.MANAGE_OWN_LEADS,
        
        # Integrations (Can use integrations)
        Permission.USE_INTEGRATIONS,
        
        # Automations (Personal automations only)
        Permission.USE_PERSONAL_AUTOMATIONS,
        
        # Support and Notifications (Basic access)
        Permission.VIEW_USER_SUPPORT,
        Permission.CREATE_SUPPORT_TICKETS,
        
        # Notifications (Own notifications only)
        Permission.VIEW_OWN_NOTIFICATIONS
    ]
}


def get_permissions_for_role(role: str) -> list:
    """Get permissions for a specific role - Simplified to 3 roles"""
    if isinstance(role, str):
        role_lower = role.lower()
        role_lower = role_lower.replace(' ', '_')  # Handle spaces in role names
        
        if role_lower == "super_admin":
            return ROLE_PERMISSIONS[UserRole.SUPER_ADMIN]
        elif role_lower in ["company_admin", "admin", "sales_manager"]:
            # Map old sales_manager to company_admin
            return ROLE_PERMISSIONS[UserRole.COMPANY_ADMIN]
        elif role_lower in ["regular_user", "sales_rep", "company_user", "user", "employee"]:
            # Map all user types to regular_user
            return ROLE_PERMISSIONS[UserRole.REGULAR_USER]
    
    # Default to regular_user if role not found
    return ROLE_PERMISSIONS.get(role, ROLE_PERMISSIONS[UserRole.REGULAR_USER])
