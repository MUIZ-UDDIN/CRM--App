/**
 * Company Admin Dashboard Component
 * 
 * This component displays the dashboard for Company Admin users,
 * showing company-wide metrics and management options.
 */

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Table, ProgressBar } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config';
import { FaUsers, FaHandshake, FaPhoneAlt, FaEnvelope, FaExclamationTriangle } from 'react-icons/fa';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

/**
 * Company Admin Dashboard Component
 * @returns {React.Component} Company Admin Dashboard component
 */
function CompanyAdminDashboard() {
  // State for dashboard data
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDeals: 0,
    totalContacts: 0,
    dealsByStage: [],
    recentDeals: [],
    topPerformers: [],
    subscriptionStatus: {
      status: 'active',
      trialEndsAt: null,
      nextBillingDate: null,
      monthlyPrice: 0
    },
    activityStats: {
      calls: 0,
      emails: 0,
      meetings: 0,
      tasks: 0
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get company admin dashboard stats
        const response = await axios.get(`${API_URL}/api/analytics/company-dashboard`);
        
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
  
  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
  
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
    <div className="company-admin-dashboard">
      {/* Subscription Status */}
      <Row className="mb-4">
        <Col md={12}>
          <Card className={`subscription-card ${stats.subscriptionStatus.status}`}>
            <Card.Body>
              <Row>
                <Col md={8}>
                  <h4>Subscription Status: {stats.subscriptionStatus.status.toUpperCase()}</h4>
                  {stats.subscriptionStatus.status === 'trial' && (
                    <p>
                      Your trial ends on {new Date(stats.subscriptionStatus.trialEndsAt).toLocaleDateString()}.
                      {' '}
                      <Link to="/billing">Upgrade now</Link> to continue using all features.
                    </p>
                  )}
                  {stats.subscriptionStatus.status === 'active' && (
                    <p>
                      Your next billing date is {new Date(stats.subscriptionStatus.nextBillingDate).toLocaleDateString()}.
                      Monthly subscription: ${stats.subscriptionStatus.monthlyPrice}/month.
                    </p>
                  )}
                </Col>
                <Col md={4} className="text-right">
                  <Link to="/billing">
                    <Button variant="outline-light">Manage Subscription</Button>
                  </Link>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Key Metrics */}
      <Row className="stats-cards">
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body>
              <div className="stat-icon">
                <FaUsers />
              </div>
              <div className="stat-content">
                <h3>{stats.totalUsers}</h3>
                <p>Team Members</p>
              </div>
            </Card.Body>
            <Card.Footer>
              <Link to="/users">Manage Users</Link>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body>
              <div className="stat-icon">
                <FaHandshake />
              </div>
              <div className="stat-content">
                <h3>{stats.totalDeals}</h3>
                <p>Active Deals</p>
              </div>
            </Card.Body>
            <Card.Footer>
              <Link to="/deals">View All Deals</Link>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body>
              <div className="stat-icon">
                <FaEnvelope />
              </div>
              <div className="stat-content">
                <h3>{stats.totalContacts}</h3>
                <p>Contacts</p>
              </div>
            </Card.Body>
            <Card.Footer>
              <Link to="/contacts">Manage Contacts</Link>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="stat-card">
            <Card.Body>
              <div className="stat-icon">
                <FaPhoneAlt />
              </div>
              <div className="stat-content">
                <h3>{stats.activityStats.calls + stats.activityStats.emails}</h3>
                <p>Communications</p>
              </div>
            </Card.Body>
            <Card.Footer>
              <small>Calls: {stats.activityStats.calls} | Emails: {stats.activityStats.emails}</small>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
      
      {/* Deals by Stage */}
      <Row className="mt-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Deals by Stage</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.dealsByStage}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.dealsByStage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`$${value.toLocaleString()}`, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        
        {/* Top Performers */}
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Top Performers</h5>
            </Card.Header>
            <Card.Body>
              {stats.topPerformers.map((performer, index) => (
                <div key={performer.id} className="performer-item">
                  <div className="performer-info">
                    <span className="performer-rank">{index + 1}</span>
                    <span className="performer-name">{performer.name}</span>
                    <span className="performer-value">${performer.value.toLocaleString()}</span>
                  </div>
                  <ProgressBar 
                    now={performer.progress} 
                    variant={index === 0 ? 'success' : index === 1 ? 'info' : 'primary'} 
                  />
                </div>
              ))}
            </Card.Body>
            <Card.Footer>
              <Link to="/analytics/performance">View Full Performance Report</Link>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
      
      {/* Recent Deals */}
      <Row className="mt-4">
        <Col md={12}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5>Recent Deals</h5>
              <Link to="/deals">
                <Button variant="outline-primary" size="sm">
                  View All Deals
                </Button>
              </Link>
            </Card.Header>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Deal Name</th>
                    <th>Client</th>
                    <th>Stage</th>
                    <th>Value</th>
                    <th>Owner</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentDeals.map((deal) => (
                    <tr key={deal.id}>
                      <td>{deal.name}</td>
                      <td>{deal.client}</td>
                      <td>
                        <span className={`stage-badge ${deal.stage.toLowerCase().replace(' ', '-')}`}>
                          {deal.stage}
                        </span>
                      </td>
                      <td>${deal.value.toLocaleString()}</td>
                      <td>{deal.owner}</td>
                      <td>
                        <Link to={`/deals/${deal.id}`}>
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
                <Link to="/users/new">
                  <Button variant="primary">
                    Add Team Member
                  </Button>
                </Link>
                <Link to="/deals/new">
                  <Button variant="success">
                    Create Deal
                  </Button>
                </Link>
                <Link to="/contacts/import">
                  <Button variant="info">
                    Import Contacts
                  </Button>
                </Link>
                <Link to="/company-settings">
                  <Button variant="secondary">
                    Company Settings
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

export default CompanyAdminDashboard;
