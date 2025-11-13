/**
 * Role-based Dashboard Page
 * 
 * This component renders different dashboard views based on the user's role.
 */

import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import SuperAdminDashboard from '../components/dashboards/SuperAdminDashboard';
import CompanyAdminDashboard from '../components/dashboards/CompanyAdminDashboard';
import SalesManagerDashboard from '../components/dashboards/SalesManagerDashboard';
import SalesRepDashboard from '../components/dashboards/SalesRepDashboard';

/**
 * Dashboard Page Component
 * @returns {React.Component} Dashboard component
 */
function Dashboard() {
  const { isSuperAdmin, isCompanyAdmin, isSalesManager } = usePermissions();
  
  // Render different dashboard based on user role
  const renderDashboard = () => {
    if (isSuperAdmin()) {
      return <SuperAdminDashboard />;
    }
    
    if (isCompanyAdmin()) {
      return <CompanyAdminDashboard />;
    }
    
    if (isSalesManager()) {
      return <SalesManagerDashboard />;
    }
    
    // Default to sales rep dashboard
    return <SalesRepDashboard />;
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      {renderDashboard()}
    </div>
  );
}

export default Dashboard;
