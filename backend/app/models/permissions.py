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
    UserRole.SUPER_ADMIN: [p for p in Permission],  # Super Admin has all permissions
    
    UserRole.COMPANY_ADMIN: [
        # Company Management
        Permission.EDIT_COMPANY, 
        Permission.VIEW_BILLING,
        
        # User Management
        Permission.MANAGE_COMPANY_USERS, 
        Permission.MANAGE_TEAM_USERS,
        
        # Data Access
        Permission.VIEW_COMPANY_DATA, 
        Permission.VIEW_TEAM_DATA, 
        Permission.VIEW_OWN_DATA,
        
        # Analytics
        Permission.VIEW_COMPANY_ANALYTICS, 
        Permission.VIEW_TEAM_ANALYTICS, 
        Permission.VIEW_OWN_ANALYTICS,
        
        # Lead/Deal Management
        Permission.ASSIGN_COMPANY_LEADS, 
        Permission.ASSIGN_TEAM_LEADS,
        Permission.MANAGE_OWN_LEADS,
        
        # Integrations
        Permission.MANAGE_COMPANY_INTEGRATIONS,
        Permission.MANAGE_TEAM_INTEGRATIONS,
        Permission.USE_INTEGRATIONS,
        
        # Automations
        Permission.MANAGE_COMPANY_AUTOMATIONS, 
        Permission.MANAGE_TEAM_AUTOMATIONS,
        Permission.USE_PERSONAL_AUTOMATIONS,
        
        # CRM Customization
        Permission.CUSTOMIZE_COMPANY_CRM,
        Permission.VIEW_TEAM_CRM_SETTINGS,
        
        # Data Export/Import
        Permission.EXPORT_COMPANY_DATA, 
        Permission.EXPORT_TEAM_DATA,
        Permission.IMPORT_COMPANY_DATA,
        Permission.IMPORT_TEAM_DATA,
        
        # Support and Notifications
        Permission.MANAGE_COMPANY_SUPPORT,
        Permission.MANAGE_TEAM_SUPPORT,
        Permission.VIEW_USER_SUPPORT,
        Permission.CREATE_SUPPORT_TICKETS,
        Permission.VIEW_SUPPORT_TICKETS,
        Permission.MANAGE_SUPPORT_TICKETS,
        
        # Notifications
        Permission.MANAGE_NOTIFICATIONS,
        Permission.VIEW_COMPANY_NOTIFICATIONS,
        Permission.VIEW_TEAM_NOTIFICATIONS,
        Permission.VIEW_OWN_NOTIFICATIONS
    ],
    
    UserRole.SALES_MANAGER: [
        # User Management
        Permission.MANAGE_TEAM_USERS,
        
        # Data Access
        Permission.VIEW_TEAM_DATA, 
        Permission.VIEW_OWN_DATA,
        
        # Analytics
        Permission.VIEW_TEAM_ANALYTICS, 
        Permission.VIEW_OWN_ANALYTICS,
        
        # Lead/Deal Management
        Permission.ASSIGN_TEAM_LEADS,
        Permission.MANAGE_OWN_LEADS,
        
        # Integrations
        Permission.MANAGE_TEAM_INTEGRATIONS,
        Permission.USE_INTEGRATIONS,
        
        # Automations
        Permission.MANAGE_TEAM_AUTOMATIONS,
        Permission.USE_PERSONAL_AUTOMATIONS,
        
        # CRM Customization
        Permission.VIEW_TEAM_CRM_SETTINGS,
        
        # Data Export/Import
        Permission.EXPORT_TEAM_DATA,
        Permission.IMPORT_TEAM_DATA,
        
        # Support and Notifications
        Permission.MANAGE_TEAM_SUPPORT,
        Permission.VIEW_USER_SUPPORT,
        Permission.CREATE_SUPPORT_TICKETS,
        Permission.VIEW_SUPPORT_TICKETS,
        
        # Notifications
        Permission.VIEW_TEAM_NOTIFICATIONS,
        Permission.VIEW_OWN_NOTIFICATIONS
    ],
    
    UserRole.SALES_REP: [
        # Data Access
        Permission.VIEW_OWN_DATA,
        
        # Analytics
        Permission.VIEW_OWN_ANALYTICS,
        
        # Lead/Deal Management
        Permission.MANAGE_OWN_LEADS,
        
        # Integrations
        Permission.USE_INTEGRATIONS,
        
        # Automations
        Permission.USE_PERSONAL_AUTOMATIONS,
        
        # Support and Notifications
        Permission.VIEW_USER_SUPPORT,
        Permission.CREATE_SUPPORT_TICKETS,
        
        # Notifications
        Permission.VIEW_OWN_NOTIFICATIONS
    ],
    
    UserRole.COMPANY_USER: [
        # Data Access
        Permission.VIEW_OWN_DATA,
        
        # Analytics
        Permission.VIEW_OWN_ANALYTICS,
        
        # Integrations
        Permission.USE_INTEGRATIONS,
        
        # Support and Notifications
        Permission.VIEW_USER_SUPPORT,
        Permission.CREATE_SUPPORT_TICKETS,
        
        # Notifications
        Permission.VIEW_OWN_NOTIFICATIONS
    ]
}


def get_permissions_for_role(role: str) -> list:
    """Get permissions for a specific role"""
    if isinstance(role, str):
        role_lower = role.lower()
        role_lower = role_lower.replace(' ', '_')  # Handle spaces in role names
        
        if role_lower == "super_admin":
            return ROLE_PERMISSIONS[UserRole.SUPER_ADMIN]
        elif role_lower in ["company_admin", "admin"]:
            return ROLE_PERMISSIONS[UserRole.COMPANY_ADMIN]
        elif role_lower == "sales_manager":
            return ROLE_PERMISSIONS[UserRole.SALES_MANAGER]
        elif role_lower in ["sales_rep", "regular_user"]:
            return ROLE_PERMISSIONS[UserRole.SALES_REP]
        elif role_lower == "company_user":
            return ROLE_PERMISSIONS[UserRole.COMPANY_USER]
    
    # Default to empty list if role not found
    return ROLE_PERMISSIONS.get(role, [])
