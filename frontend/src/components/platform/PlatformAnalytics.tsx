import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface CompanyInfo {
  id: string;
  name: string;
  status: string;
  subscription_status: string;
  trial_ends_at: string | null;
  days_remaining: number;
  user_count: number;
  deal_count: number;
  created_at: string;
}

interface PlatformAnalyticsProps {
  companies: CompanyInfo[];
}

const COLORS = {
  active: '#10b981',
  trial: '#3b82f6',
  expired: '#ef4444',
  suspended: '#6b7280'
};

const PlatformAnalytics: React.FC<PlatformAnalyticsProps> = ({ companies }) => {
  // Subscription Status Distribution
  const subscriptionData = [
    {
      name: 'Active',
      value: companies.filter(c => c.subscription_status === 'active').length,
      color: COLORS.active
    },
    {
      name: 'Trial',
      value: companies.filter(c => c.subscription_status === 'trial').length,
      color: COLORS.trial
    },
    {
      name: 'Expired',
      value: companies.filter(c => c.subscription_status === 'expired').length,
      color: COLORS.expired
    },
    {
      name: 'Suspended',
      value: companies.filter(c => c.status === 'suspended').length,
      color: COLORS.suspended
    }
  ].filter(item => item.value > 0);

  // Companies by User Count
  const userDistribution = companies
    .sort((a, b) => b.user_count - a.user_count)
    .slice(0, 10)
    .map(c => ({
      name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
      users: c.user_count
    }));

  // Companies by Deal Count
  const dealDistribution = companies
    .sort((a, b) => b.deal_count - a.deal_count)
    .slice(0, 10)
    .map(c => ({
      name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
      deals: c.deal_count
    }));

  // Growth Over Time (last 30 days)
  const growthData = (() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    return last30Days.map(date => {
      const companiesOnDate = companies.filter(c => {
        const createdDate = new Date(c.created_at).toISOString().split('T')[0];
        return createdDate <= date;
      }).length;

      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        companies: companiesOnDate
      };
    });
  })();

  // Trial Expiration Timeline (next 30 days)
  const trialExpirationData = (() => {
    const next30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      return date.toISOString().split('T')[0];
    });

    return next30Days.map(date => {
      const expiring = companies.filter(c => {
        if (!c.trial_ends_at || c.subscription_status !== 'trial') return false;
        const trialDate = new Date(c.trial_ends_at).toISOString().split('T')[0];
        return trialDate === date;
      }).length;

      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        expiring
      };
    }).filter(d => d.expiring > 0);
  })();

  return (
    <div className="space-y-6">
      {/* Subscription Status Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Status Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={subscriptionData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {subscriptionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Platform Growth */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Growth (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={growthData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="companies"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Total Companies"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Trial Expiration Timeline */}
      {trialExpirationData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Trial Expirations (Next 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trialExpirationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="expiring" fill="#f59e0b" name="Companies Expiring" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Companies by Users */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Companies by Users</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={userDistribution} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={120} />
            <Tooltip />
            <Legend />
            <Bar dataKey="users" fill="#8b5cf6" name="Users" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Companies by Deals */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Companies by Deals</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dealDistribution} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={120} />
            <Tooltip />
            <Legend />
            <Bar dataKey="deals" fill="#10b981" name="Deals" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PlatformAnalytics;
