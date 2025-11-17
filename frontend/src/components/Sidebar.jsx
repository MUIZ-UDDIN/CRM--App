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
    <div className="w-64 h-screen bg-gray-800 text-white fixed left-0 top-0 overflow-y-auto">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-xl font-bold">SunStoneCRM</h3>
      </div>
      
      <nav className="mt-4">
        <ul className="space-y-1">
          {/* Dashboard - Available to all users */}
          <li>
            <Link to="/dashboard" className={`flex items-center px-4 py-3 ${isActive('/dashboard') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
              <FaHome className="mr-3 text-lg" />
              <span>Dashboard</span>
            </Link>
          </li>
          
          {/* Companies - Available to super admin */}
          {isSuperAdmin() && (
            <li>
              <Link to="/companies" className={`flex items-center px-4 py-3 ${isActive('/companies') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                <FaBuilding className="mr-3 text-lg" />
                <span>Companies</span>
              </Link>
            </li>
          )}
          
          {/* Company Settings - Available to company admins and super admins */}
          {(isCompanyAdmin() || isSuperAdmin()) && (
            <li>
              <Link to="/company-settings" className={`flex items-center px-4 py-3 ${isActive('/company-settings') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                <FaCog className="mr-3 text-lg" />
                <span>Company Settings</span>
              </Link>
            </li>
          )}
          
          {/* Users - Available to those who can manage users */}
          {hasPermission('manage_company_users') || hasPermission('manage_team_users') && (
            <li>
              <Link to="/users" className={`flex items-center px-4 py-3 ${isActive('/users') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                <FaUsers className="mr-3 text-lg" />
                <span>Users</span>
              </Link>
            </li>
          )}
          
          {/* Leads & Deals - Available to all users */}
          <li>
            <Link to="/leads" className={`flex items-center px-4 py-3 ${isActive('/leads') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
              <FaHandshake className="mr-3 text-lg" />
              <span>Leads & Deals</span>
            </Link>
          </li>
          
          {/* Billing - Different access levels based on permissions (hide for Super Admins) */}
          {hasPermission('manage_billing') && !isSuperAdmin() && (
            <li>
              <Link to="/billing" className={`flex items-center px-4 py-3 ${isActive('/billing') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                <FaCreditCard className="mr-3 text-lg" />
                <span>Billing Management</span>
              </Link>
            </li>
          )}
          
          {hasPermission('view_billing') && !hasPermission('manage_billing') && !isSuperAdmin() && (
            <li>
              <Link to="/billing" className={`flex items-center px-4 py-3 ${isActive('/billing') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                <FaCreditCard className="mr-3 text-lg" />
                <span>Billing Information</span>
              </Link>
            </li>
          )}
          
          {/* Analytics - Different views based on permissions */}
          <li>
            <Link to="/analytics" className={`flex items-center px-4 py-3 ${isActive('/analytics') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
              <FaChartBar className="mr-3 text-lg" />
              <span>Analytics</span>
            </Link>
          </li>
          
          {/* Integrations - Based on permissions */}
          {hasPermission('manage_global_integrations') || 
           hasPermission('manage_company_integrations') || 
           hasPermission('manage_team_integrations') || 
           hasPermission('use_integrations') && (
            <li>
              <Link to="/integrations" className={`flex items-center px-4 py-3 ${isActive('/integrations') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                <FaEnvelope className="mr-3 text-lg" />
                <span>Integrations</span>
              </Link>
            </li>
          )}
          
          {/* Automations - Based on permissions */}
          {hasPermission('manage_global_automations') || 
           hasPermission('manage_company_automations') || 
           hasPermission('manage_team_automations') || 
           hasPermission('use_personal_automations') && (
            <li>
              <Link to="/automations" className={`flex items-center px-4 py-3 ${isActive('/automations') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                <FaRobot className="mr-3 text-lg" />
                <span>Automations</span>
              </Link>
            </li>
          )}
          
          {/* CRM Customization - Based on permissions */}
          {hasPermission('customize_global_crm') || 
           hasPermission('customize_company_crm') || 
           hasPermission('view_team_crm_settings') && (
            <li>
              <Link to="/customization" className={`flex items-center px-4 py-3 ${isActive('/customization') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                <FaCog className="mr-3 text-lg" />
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
            <li>
              <Link to="/data" className={`flex items-center px-4 py-3 ${isActive('/data') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                <FaFileExport className="mr-3 text-lg" />
                <span>Data Export/Import</span>
              </Link>
            </li>
          )}
          
          {/* Support - Available to all users */}
          <li>
            <Link to="/support" className={`flex items-center px-4 py-3 ${isActive('/support') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
              <FaHeadset className="mr-3 text-lg" />
              <span>Support</span>
            </Link>
          </li>
          
          {/* Notifications - Available to all users */}
          <li>
            <Link to="/notifications" className={`flex items-center px-4 py-3 ${isActive('/notifications') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
              <FaBell className="mr-3 text-lg" />
              <span>Notifications</span>
            </Link>
          </li>
          
          {/* Admin Panel - Super Admin Only */}
          {isSuperAdmin() && (
            <li>
              <Link to="/admin" className={`flex items-center px-4 py-3 ${isActive('/admin') ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                <FaUserShield className="mr-3 text-lg" />
                <span>Admin Panel</span>
              </Link>
            </li>
          )}
          
          {/* Logout - Available to all users */}
          <li className="mt-8">
            <Link to="/logout" className="flex items-center px-4 py-3 text-red-300 hover:bg-red-800 hover:text-white">
              <FaSignOutAlt className="mr-3 text-lg" />
              <span>Logout</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default Sidebar;
