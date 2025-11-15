/**
 * Role-based Dashboard Page
 * 
 * This component renders different dashboard views based on the user's role.
 */

import React from 'react';
// @ts-ignore - JS file without type definitions
import { usePermissions } from '../hooks/usePermissions';
// @ts-ignore - JSX components without type definitions
import SuperAdminDashboard from '../components/dashboards/SuperAdminDashboard';
// @ts-ignore
import CompanyAdminDashboard from '../components/dashboards/CompanyAdminDashboard';
// @ts-ignore
import SalesManagerDashboard from '../components/dashboards/SalesManagerDashboard';
// @ts-ignore
import SalesRepDashboard from '../components/dashboards/SalesRepDashboard';

/**
 * Dashboard Page Component
 * @returns Dashboard component
 */
function Dashboard(): JSX.Element {
  const { isSuperAdmin, isCompanyAdmin, isSalesManager } = usePermissions();
  
  // Render different dashboard based on user role
  const renderDashboard = (): JSX.Element => {
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
