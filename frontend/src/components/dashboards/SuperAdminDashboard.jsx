/**
 * Super Admin Dashboard Component
 * 
 * This component displays the dashboard for Super Admin users,
 * showing system-wide metrics and management options.
 */

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config';
import { FaBuilding, FaUsers, FaCreditCard, FaExclamationTriangle } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Super Admin Dashboard Component
 * @returns {React.Component} Super Admin Dashboard component
 */
function SuperAdminDashboard() {
  // State for dashboard data
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    trialCompanies: 0,
    suspendedCompanies: 0,
    totalUsers: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    recentCompanies: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get super admin dashboard stats
        const response = await axios.get(`${API_URL}/api/analytics/admin-dashboard`);
        
        setStats(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  // Sample subscription data for chart
  const subscriptionData = [
    { name: 'Jan', revenue: 4000 },
    { name: 'Feb', revenue: 4500 },
    { name: 'Mar', revenue: 5000 },
    { name: 'Apr', revenue: 4800 },
    { name: 'May', revenue: 5500 },
    { name: 'Jun', revenue: 6000 },
    { name: 'Jul', revenue: 6500 },
    { name: 'Aug', revenue: 7000 },
    { name: 'Sep', revenue: 7200 },
    { name: 'Oct', revenue: 7800 },
    { name: 'Nov', revenue: 8000 },
    { name: 'Dec', revenue: 8500 }
  ];
  
  if (loading) {
    return <div className="loading">Loading dashboard data...</div>;
  }
  
  if (error) {
    return (
      <div className="error-container">
        <FaExclamationTriangle className="error-icon" />
        <p>{error}</p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <div className="super-admin-dashboard">
      {/* Key Metrics */}
      <Row className="stats-cards">
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body>
              <div className="stat-icon">
                <FaBuilding />
              </div>
              <div className="stat-content">
                <h3>{stats.totalCompanies}</h3>
                <p>Total Companies</p>
              </div>
            </Card.Body>
            <Card.Footer>
              <small>
                Active: {stats.activeCompanies} | Trial: {stats.trialCompanies} | Suspended: {stats.suspendedCompanies}
              </small>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body>
              <div className="stat-icon">
                <FaUsers />
              </div>
              <div className="stat-content">
                <h3>{stats.totalUsers}</h3>
                <p>Total Users</p>
              </div>
            </Card.Body>
            <Card.Footer>
              <small>Across all companies</small>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body>
              <div className="stat-icon">
                <FaCreditCard />
              </div>
              <div className="stat-content">
                <h3>${stats.totalRevenue.toLocaleString()}</h3>
                <p>Total Revenue</p>
              </div>
            </Card.Body>
            <Card.Footer>
              <small>Monthly recurring</small>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="stat-card warning">
            <Card.Body>
              <div className="stat-icon">
                <FaExclamationTriangle />
              </div>
              <div className="stat-content">
                <h3>${stats.pendingPayments.toLocaleString()}</h3>
                <p>Pending Payments</p>
              </div>
            </Card.Body>
            <Card.Footer>
              <small>Requires attention</small>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
      
      {/* Revenue Chart */}
      <Row className="mt-4">
        <Col md={12}>
          <Card>
            <Card.Header>
              <h5>Monthly Subscription Revenue</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subscriptionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#8884d8" name="Monthly Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Recent Companies */}
      <Row className="mt-4">
        <Col md={12}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5>Recently Added Companies</h5>
              <Link to="/companies">
                <Button variant="outline-primary" size="sm">
                  View All Companies
                </Button>
              </Link>
            </Card.Header>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Company Name</th>
                    <th>Status</th>
                    <th>Users</th>
                    <th>Subscription</th>
                    <th>Trial Ends</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentCompanies.map((company) => (
                    <tr key={company.id}>
                      <td>{company.name}</td>
                      <td>
                        <span className={`status-badge ${company.status.toLowerCase()}`}>
                          {company.status}
                        </span>
                      </td>
                      <td>{company.user_count}</td>
                      <td>${company.monthly_price}/mo</td>
                      <td>
                        {company.trial_ends_at ? new Date(company.trial_ends_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td>
                        <Link to={`/companies/${company.id}`}>
                          <Button variant="outline-secondary" size="sm">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Quick Actions */}
      <Row className="mt-4">
        <Col md={12}>
          <Card>
            <Card.Header>
              <h5>Quick Actions</h5>
            </Card.Header>
            <Card.Body>
              <div className="quick-actions">
                <Link to="/companies/new">
                  <Button variant="primary">
                    Add New Company
                  </Button>
                </Link>
                <Link to="/billing/plans">
                  <Button variant="info">
                    Manage Subscription Plans
                  </Button>
                </Link>
                <Link to="/support/tickets">
                  <Button variant="warning">
                    View Support Tickets
                  </Button>
                </Link>
                <Link to="/admin/settings">
                  <Button variant="secondary">
                    System Settings
                  </Button>
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default SuperAdminDashboard;
