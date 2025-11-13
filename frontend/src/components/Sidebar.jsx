/**
 * Sidebar Navigation Component
 * 
 * This component renders a sidebar navigation menu with items based on user permissions.
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { 
  FaHome, 
  FaBuilding, 
  FaUsers, 
  FaCreditCard, 
  FaChartBar, 
  FaEnvelope, 
  FaPhoneAlt, 
  FaRobot, 
  FaCog, 
  FaFileExport, 
  FaHeadset, 
  FaBell, 
  FaSignOutAlt, 
  FaUserShield,
  FaHandshake
} from 'react-icons/fa';

/**
 * Sidebar Navigation Component
 * @returns {React.Component} Sidebar component
 */
function Sidebar() {
  const location = useLocation();
  const { 
    hasPermission, 
    isSuperAdmin, 
    isCompanyAdmin, 
    isSalesManager 
  } = usePermissions();
  
  // Check if a path is active
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>SunStoneCRM</h3>
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          {/* Dashboard - Available to all users */}
          <li className={isActive('/dashboard') ? 'active' : ''}>
            <Link to="/dashboard">
              <FaHome className="icon" />
              <span>Dashboard</span>
            </Link>
          </li>
          
          {/* Companies - Available to super admin */}
          {isSuperAdmin() && (
            <li className={isActive('/companies') ? 'active' : ''}>
              <Link to="/companies">
                <FaBuilding className="icon" />
                <span>Companies</span>
              </Link>
            </li>
          )}
          
          {/* Company Settings - Available to company admins and super admins */}
          {(isCompanyAdmin() || isSuperAdmin()) && (
            <li className={isActive('/company-settings') ? 'active' : ''}>
              <Link to="/company-settings">
                <FaCog className="icon" />
                <span>Company Settings</span>
              </Link>
            </li>
          )}
          
          {/* Users - Available to those who can manage users */}
          {hasPermission('manage_company_users') || hasPermission('manage_team_users') && (
            <li className={isActive('/users') ? 'active' : ''}>
              <Link to="/users">
                <FaUsers className="icon" />
                <span>Users</span>
              </Link>
            </li>
          )}
          
          {/* Leads & Deals - Available to all users */}
          <li className={isActive('/leads') ? 'active' : ''}>
            <Link to="/leads">
              <FaHandshake className="icon" />
              <span>Leads & Deals</span>
            </Link>
          </li>
          
          {/* Billing - Different access levels based on permissions */}
          {hasPermission('manage_billing') && (
            <li className={isActive('/billing') ? 'active' : ''}>
              <Link to="/billing">
                <FaCreditCard className="icon" />
                <span>Billing Management</span>
              </Link>
            </li>
          )}
          
          {hasPermission('view_billing') && !hasPermission('manage_billing') && (
            <li className={isActive('/billing') ? 'active' : ''}>
              <Link to="/billing">
                <FaCreditCard className="icon" />
                <span>Billing Information</span>
              </Link>
            </li>
          )}
          
          {/* Analytics - Different views based on permissions */}
          <li className={isActive('/analytics') ? 'active' : ''}>
            <Link to="/analytics">
              <FaChartBar className="icon" />
              <span>Analytics</span>
            </Link>
          </li>
          
          {/* Integrations - Based on permissions */}
          {hasPermission('manage_global_integrations') || 
           hasPermission('manage_company_integrations') || 
           hasPermission('manage_team_integrations') || 
           hasPermission('use_integrations') && (
            <li className={isActive('/integrations') ? 'active' : ''}>
              <Link to="/integrations">
                <FaEnvelope className="icon" />
                <span>Integrations</span>
              </Link>
            </li>
          )}
          
          {/* Automations - Based on permissions */}
          {hasPermission('manage_global_automations') || 
           hasPermission('manage_company_automations') || 
           hasPermission('manage_team_automations') || 
           hasPermission('use_personal_automations') && (
            <li className={isActive('/automations') ? 'active' : ''}>
              <Link to="/automations">
                <FaRobot className="icon" />
                <span>Automations</span>
              </Link>
            </li>
          )}
          
          {/* CRM Customization - Based on permissions */}
          {hasPermission('customize_global_crm') || 
           hasPermission('customize_company_crm') || 
           hasPermission('view_team_crm_settings') && (
            <li className={isActive('/customization') ? 'active' : ''}>
              <Link to="/customization">
                <FaCog className="icon" />
                <span>CRM Customization</span>
              </Link>
            </li>
          )}
          
          {/* Data Export/Import - Based on permissions */}
          {hasPermission('export_any_data') || 
           hasPermission('export_company_data') || 
           hasPermission('export_team_data') || 
           hasPermission('import_company_data') || 
           hasPermission('import_team_data') && (
            <li className={isActive('/data') ? 'active' : ''}>
              <Link to="/data">
                <FaFileExport className="icon" />
                <span>Data Export/Import</span>
              </Link>
            </li>
          )}
          
          {/* Support - Available to all users */}
          <li className={isActive('/support') ? 'active' : ''}>
            <Link to="/support">
              <FaHeadset className="icon" />
              <span>Support</span>
            </Link>
          </li>
          
          {/* Notifications - Available to all users */}
          <li className={isActive('/notifications') ? 'active' : ''}>
            <Link to="/notifications">
              <FaBell className="icon" />
              <span>Notifications</span>
            </Link>
          </li>
          
          {/* Admin Panel - Super Admin Only */}
          {isSuperAdmin() && (
            <li className={isActive('/admin') ? 'active' : ''}>
              <Link to="/admin">
                <FaUserShield className="icon" />
                <span>Admin Panel</span>
              </Link>
            </li>
          )}
          
          {/* Logout - Available to all users */}
          <li className="logout">
            <Link to="/logout">
              <FaSignOutAlt className="icon" />
              <span>Logout</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default Sidebar;
