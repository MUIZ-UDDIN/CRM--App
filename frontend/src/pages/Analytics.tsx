import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  XMarkIcon, 
  DocumentChartBarIcon, 
  ChartPieIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';
import * as analyticsService from '../services/analyticsService';

export default function Analytics() {
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState('last30days');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedPipeline, setSelectedPipeline] = useState('all');
  const [users, setUsers] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showPipelineDropdown, setShowPipelineDropdown] = useState(false);
  
  // State for API data
  const [loading, setLoading] = useState(false);
  const [pipelineAnalytics, setPipelineAnalytics] = useState<any>(null);
  const [activityAnalytics, setActivityAnalytics] = useState<any>(null);
  const [emailAnalytics, setEmailAnalytics] = useState<any>(null);
  const [callAnalytics, setCallAnalytics] = useState<any>(null);
  const [contactAnalytics, setContactAnalytics] = useState<any>(null);
  const [documentAnalytics, setDocumentAnalytics] = useState<any>(null);
  const [revenueAnalytics, setRevenueAnalytics] = useState<any>(null);
  const [dashboardKPIs, setDashboardKPIs] = useState<any>(null);
  
  // Fetch users and pipelines on mount
  useEffect(() => {
    fetchUsersAndPipelines();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-dropdown-container')) {
        setShowUserDropdown(false);
      }
      if (!target.closest('.pipeline-dropdown-container')) {
        setShowPipelineDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch analytics data from backend - don't auto-fetch on custom date changes
  useEffect(() => {
    // Only fetch if not in custom date mode, or if custom dates are applied
    if (dateRange !== 'custom' || (customDateFrom && customDateTo)) {
      fetchAllAnalytics();
    }
  }, [dateRange, selectedUser, selectedPipeline]);

  const fetchUsersAndPipelines = async () => {
    try {
      // Fetch users
      const usersResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData);
      }

      // Fetch pipelines
      const pipelinesResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/pipelines`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (pipelinesResponse.ok) {
        const pipelinesData = await pipelinesResponse.json();
        setPipelines(pipelinesData);
      }
    } catch (error) {
      console.error('Error fetching users/pipelines:', error);
    }
  };
  
  const fetchAllAnalytics = async () => {
    setLoading(true);
    try {
      // Build filters object, only including defined values
      const filters: any = {
        date_from: getDateFrom(dateRange),
        date_to: getDateTo(),
      };
      
      // Only add filter if it's not 'all' and is a valid number
      if (selectedUser !== 'all') {
        filters.user_id = selectedUser;
      }
      if (selectedPipeline !== 'all') {
        filters.pipeline_id = selectedPipeline;
      };
      
      // Fetch all analytics in parallel
      const [pipeline, activity, email, call, contact, document, revenue, dashboard] = await Promise.all([
        analyticsService.getPipelineAnalytics(filters),
        analyticsService.getActivityAnalytics(filters),
        analyticsService.getEmailAnalytics(filters),
        analyticsService.getCallAnalytics(filters),
        analyticsService.getContactAnalytics(filters),
        analyticsService.getDocumentAnalytics(filters),
        analyticsService.getRevenueAnalytics(),
        analyticsService.getDashboardAnalytics(filters), // Now passing filters to dashboard
      ]);
      
      setPipelineAnalytics(pipeline);
      setActivityAnalytics(activity);
      setEmailAnalytics(email);
      setCallAnalytics(call);
      setContactAnalytics(contact);
      setDocumentAnalytics(document);
      setRevenueAnalytics(revenue);
      setDashboardKPIs(dashboard);
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };
  
  const getDateFrom = (range: string) => {
    if (range === 'custom' && customDateFrom) {
      return customDateFrom;
    }
    switch (range) {
      case 'last7days': {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().split('T')[0];
      }
      case 'last30days': {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
      }
      case 'last90days': {
        const date = new Date();
        date.setDate(date.getDate() - 90);
        return date.toISOString().split('T')[0];
      }
      case 'thisyear':
        return `${new Date().getFullYear()}-01-01`;
      default: {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
      }
    }
  };

  const getDateTo = () => {
    if (dateRange === 'custom' && customDateTo) {
      return customDateTo;
    }
    return new Date().toISOString().split('T')[0];
  };

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    if (value === 'custom') {
      setShowCustomDatePicker(true);
    } else {
      setShowCustomDatePicker(false);
      // Reset custom dates when switching away from custom
      setCustomDateFrom('');
      setCustomDateTo('');
    }
  };

  const applyCustomDateRange = () => {
    if (customDateFrom && customDateTo) {
      if (new Date(customDateFrom) > new Date(customDateTo)) {
        toast.error('Start date cannot be after end date');
        return;
      }
      setShowCustomDatePicker(false);
      // Manually trigger fetch when Apply is clicked
      fetchAllAnalytics();
    } else {
      toast.error('Please select both start and end dates');
    }
  };

  // Revenue data from API - always show chart even with no data
  const revenueData = Array.isArray(revenueAnalytics?.monthly_revenue) && revenueAnalytics.monthly_revenue.length > 0
    ? revenueAnalytics.monthly_revenue.map((item: any) => ({
        month: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
        revenue: item.revenue,
        deals: item.deal_count,
        target: item.revenue * 1.1 // 10% above actual as target
      }))
    : [
        { month: 'Jan', revenue: 0, deals: 0, target: 0 },
        { month: 'Feb', revenue: 0, deals: 0, target: 0 },
        { month: 'Mar', revenue: 0, deals: 0, target: 0 },
        { month: 'Apr', revenue: 0, deals: 0, target: 0 },
        { month: 'May', revenue: 0, deals: 0, target: 0 },
        { month: 'Jun', revenue: 0, deals: 0, target: 0 },
      ];

  // Pipeline data from API - show empty state if no data
  const pipelineData = Array.isArray(pipelineAnalytics?.pipeline_analytics) && pipelineAnalytics.pipeline_analytics.length > 0
    ? pipelineAnalytics.pipeline_analytics.map((stage: any, index: number) => ({
        name: stage.stage_name,
        value: stage.total_value,
        deals: stage.deal_count,
        color: ['#3B82F6', '#EAB308', '#F97316', '#10B981', '#8B5CF6'][index % 5]
      }))
    : [{ name: 'No Data', value: 0, deals: 0, color: '#E5E7EB' }];

  // Activity data from API - show zeros if no data
  const activityData = Array.isArray(activityAnalytics?.activities_by_user) && activityAnalytics.activities_by_user.length > 0 
    ? activityAnalytics.activities_by_user.slice(0, 5).map((item: any) => ({
        day: item.user_name || 'User',
        calls: item.calls || 0,
        emails: item.emails || 0,
        meetings: item.meetings || 0
      }))
    : [
        { day: 'Mon', calls: 0, emails: 0, meetings: 0 },
        { day: 'Tue', calls: 0, emails: 0, meetings: 0 },
        { day: 'Wed', calls: 0, emails: 0, meetings: 0 },
        { day: 'Thu', calls: 0, emails: 0, meetings: 0 },
        { day: 'Fri', calls: 0, emails: 0, meetings: 0 },
      ];

  // Lead source data from API
  const leadSourceData = Array.isArray(contactAnalytics?.contacts_by_source) && contactAnalytics.contacts_by_source.length > 0
    ? contactAnalytics.contacts_by_source.map((item: any, index: number) => ({
        name: item.source || 'Unknown',
        value: item.count || 0,
        color: ['#3B82F6', '#10B981', '#0EA5E9', '#8B5CF6', '#6B7280'][index % 5]
      }))
    : [{ name: 'No Data', value: 0, color: '#E5E7EB' }];

  // Conversion funnel from pipeline data
  const conversionData = Array.isArray(pipelineAnalytics?.pipeline_analytics)
    ? pipelineAnalytics.pipeline_analytics.map((stage: any, index: number, arr: any[]) => ({
        stage: stage.stage_name,
        count: stage.deal_count || 0,
        rate: arr[0]?.deal_count ? Math.round((stage.deal_count / arr[0].deal_count) * 100) : 0
      }))
    : [];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // Pipeline Analytics Data from API
  const pipelineConversionData = Array.isArray(pipelineAnalytics?.pipeline_analytics)
    ? pipelineAnalytics.pipeline_analytics.map((stage: any) => ({
        stage: stage.stage_name,
        conversion: stage.conversion_rate || 0,
        avgDuration: stage.avg_duration || 0,
        deals: stage.deal_count || 0
      }))
    : [];

  // Deals by owner from API
  const dealsByOwnerData = Array.isArray(pipelineAnalytics?.deals_by_owner)
    ? pipelineAnalytics.deals_by_owner.map((item: any) => ({
        owner: item.owner_name || 'Unknown',
        deals: item.deal_count || 0,
        value: item.total_value || 0
      }))
    : [];

  // Activity completion data from API
  const activityCompletionData = Array.isArray(activityAnalytics?.activity_distribution)
    ? activityAnalytics.activity_distribution.map((item: any) => ({
        type: item.activity_type || 'Activity',
        completed: item.completed || 0,
        overdue: item.overdue || 0
      }))
    : [];

  // Activity by user from API
  const activityByUserData = Array.isArray(activityAnalytics?.activities_by_user)
    ? activityAnalytics.activities_by_user.map((item: any) => ({
        user: item.user_name || 'Unknown',
        calls: item.calls || 0,
        meetings: item.meetings || 0,
        emails: item.emails || 0,
        tasks: item.tasks || 0
      }))
    : [];

  // Email metrics from API
  const emailMetricsData = emailAnalytics?.email_summary ? [
    { metric: 'Sent', count: emailAnalytics.email_summary.total_sent || 0 },
    { metric: 'Opens', count: emailAnalytics.email_summary.total_opened || 0 },
    { metric: 'Clicks', count: emailAnalytics.email_summary.total_clicked || 0 },
    { metric: 'Bounces', count: emailAnalytics.email_summary.total_bounced || 0 },
  ] : [];

  // Call metrics from API
  const callMetricsData = Array.isArray(callAnalytics?.daily_calls)
    ? callAnalytics.daily_calls.map((item: any) => ({
        day: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
        answered: item.answered || 0,
        missed: item.missed || 0,
        avgDuration: item.avg_duration || 0
      }))
    : [];

  // Contact status data from API
  const leadsByStatusData = Array.isArray(contactAnalytics?.contacts_by_status)
    ? contactAnalytics.contacts_by_status.map((item: any, index: number) => ({
        status: item.status || 'Unknown',
        count: item.count || 0,
        color: ['#3B82F6', '#8B5CF6', '#10B981', '#EF4444'][index % 4]
      }))
    : [];

  // Lead scoring from API - placeholder for now
  const leadScoringData = Array.isArray(contactAnalytics?.lead_scoring) ? contactAnalytics.lead_scoring : [];

  // Conversion by source from API
  const conversionBySourceData = Array.isArray(contactAnalytics?.conversion_by_source)
    ? contactAnalytics.conversion_by_source.map((item: any) => ({
        source: item.source || 'Unknown',
        leads: item.total_leads || 0,
        converted: item.converted || 0,
        rate: item.conversion_rate || 0
      }))
    : [];

  // Document stats from API
  const documentStatsData = documentAnalytics?.document_summary ? [
    { status: 'Signed', count: documentAnalytics.document_summary.signed || 0, color: '#10B981' },
    { status: 'Pending', count: documentAnalytics.document_summary.pending || 0, color: '#F59E0B' },
    { status: 'Viewed', count: documentAnalytics.document_summary.viewed || 0, color: '#3B82F6' },
    { status: 'Expired', count: documentAnalytics.document_summary.expired || 0, color: '#EF4444' },
  ] : [];

  // Time to signature from API
  const timeToSignatureData = Array.isArray(documentAnalytics?.time_to_signature) ? documentAnalytics.time_to_signature : [];

  const handleViewPipeline = () => {
    setShowPipelineModal(true);
  };

  const handleCreateReport = () => {
    setShowReportModal(true);
  };

  const handleGenerateReport = async () => {
    try {
      // Build filters for the report
      const reportFilters: any = {
        date_from: getDateFrom(dateRange),
        date_to: getDateTo(),
        report_type: reportType
      };
      
      if (selectedUser !== 'all') {
        reportFilters.user_id = selectedUser;
      }
      if (selectedPipeline !== 'all') {
        reportFilters.pipeline_id = selectedPipeline;
      }
      
      // Call the export PDF endpoint
      await handleExportToPDF();
      
      toast.success(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generated successfully!`);
      setShowReportModal(false);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    }
  };

  const handleExportData = (format: string) => {
    toast.success(`Exporting data as ${format.toUpperCase()}...`);
  };

  const handleExportToPDF = async () => {
    try {
      const filters: any = {
        date_from: getDateFrom(dateRange),
        date_to: new Date().toISOString().split('T')[0],
      };
      
      // Only add filter if it's not 'all'
      if (selectedUser !== 'all') {
        filters.user_id = selectedUser;
      }
      if (selectedPipeline !== 'all') {
        filters.pipeline_id = selectedPipeline;
      }
      
      const blob = await analyticsService.exportAnalyticsToPDF(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  const handleExportToCSV = async () => {
    try {
      const filters: any = {
        date_from: getDateFrom(dateRange),
        date_to: new Date().toISOString().split('T')[0],
      };
      
      // Only add filter if it's not 'all'
      if (selectedUser !== 'all') {
        filters.user_id = selectedUser;
      }
      if (selectedPipeline !== 'all') {
        filters.pipeline_id = selectedPipeline;
      }
      
      const blob = await analyticsService.exportAnalyticsToCSV(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-data-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('CSV exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="min-h-full">
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold leading-7 text-gray-900">Analytics & Reports</h1>
            <p className="mt-1 text-sm text-gray-500">
              Comprehensive analytics and reporting for your sales performance
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8 py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600">Loading analytics...</span>
          </div>
        )}
        
        {/* Action Bar with Filters */}
        {!loading && (
        <>
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400 flex-shrink-0" />
                <select
                  value={dateRange}
                  onChange={(e) => handleDateRangeChange(e.target.value)}
                  className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs sm:text-sm"
                >
                  <option value="last7days">Last 7 days</option>
                  <option value="last30days">Last 30 days</option>
                  <option value="last90days">Last 90 days</option>
                  <option value="thisyear">This year</option>
                  <option value="custom">Custom Range</option>
                </select>
                {showCustomDatePicker && (
                  <div className="absolute z-50 mt-2 p-4 bg-white border border-gray-300 rounded-lg shadow-lg">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                        <div className="relative">
                          <input
                            type="date"
                            value={customDateFrom}
                            onChange={(e) => setCustomDateFrom(e.target.value)}
                            onClick={(e) => e.currentTarget.showPicker()}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                        <div className="relative">
                          <input
                            type="date"
                            value={customDateTo}
                            onChange={(e) => setCustomDateTo(e.target.value)}
                            onClick={(e) => e.currentTarget.showPicker()}
                            min={customDateFrom || undefined}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={applyCustomDateRange}
                          className="flex-1 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => {
                            setShowCustomDatePicker(false);
                            setDateRange('last30days');
                          }}
                          className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="relative user-dropdown-container w-full sm:w-auto">
                <input
                  type="text"
                  value={showUserDropdown ? userSearch : (selectedUser === 'all' ? 'All Users' : users.find(u => u.id === selectedUser)?.first_name + ' ' + users.find(u => u.id === selectedUser)?.last_name || '')}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    if (!showUserDropdown) setShowUserDropdown(true);
                  }}
                  onFocus={() => {
                    setShowUserDropdown(true);
                    setUserSearch('');
                  }}
                  placeholder="Search users..."
                  className="w-full sm:w-48 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs sm:text-sm"
                />
                {showUserDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedUser('all');
                        setUserSearch('');
                        setShowUserDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm border-b"
                    >
                      All Users
                    </button>
                    {users
                      .filter(user => 
                        `${user.first_name} ${user.last_name}`.toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .map(user => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setSelectedUser(user.id);
                            setUserSearch('');
                            setShowUserDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm border-b last:border-b-0"
                        >
                          {user.first_name} {user.last_name}
                        </button>
                      ))}
                  </div>
                )}
              </div>
              
              <div className="relative pipeline-dropdown-container w-full sm:w-auto">
                <input
                  type="text"
                  value={showPipelineDropdown ? pipelineSearch : (selectedPipeline === 'all' ? 'All Pipelines' : pipelines.find(p => p.id === selectedPipeline)?.name || '')}
                  onChange={(e) => {
                    setPipelineSearch(e.target.value);
                    if (!showPipelineDropdown) setShowPipelineDropdown(true);
                  }}
                  onFocus={() => {
                    setShowPipelineDropdown(true);
                    setPipelineSearch('');
                  }}
                  placeholder="Search pipelines..."
                  className="w-full sm:w-48 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs sm:text-sm"
                />
                {showPipelineDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedPipeline('all');
                        setPipelineSearch('');
                        setShowPipelineDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm border-b"
                    >
                      All Pipelines
                    </button>
                    {pipelines
                      .filter(pipeline => 
                        pipeline.name.toLowerCase().includes(pipelineSearch.toLowerCase())
                      )
                      .map(pipeline => (
                        <button
                          key={pipeline.id}
                          onClick={() => {
                            setSelectedPipeline(pipeline.id);
                            setPipelineSearch('');
                            setShowPipelineDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm border-b last:border-b-0"
                        >
                          {pipeline.name}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportToPDF}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export PDF
              </button>
              <button
                onClick={handleExportToCSV}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 border border-transparent shadow-sm text-xs sm:text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
              >
                <DocumentChartBarIcon className="h-4 sm:h-5 w-4 sm:w-5 mr-2" />
                <span className="whitespace-nowrap">Generate Report</span>
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  ${dashboardKPIs?.kpis?.total_revenue ? (dashboardKPIs.kpis.total_revenue / 1000).toFixed(1) : '0'}K
                </p>
                <p className={`text-sm mt-1 ${dashboardKPIs?.kpis?.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {dashboardKPIs?.kpis?.revenue_growth >= 0 ? '↑' : '↓'} {Math.abs(dashboardKPIs?.kpis?.revenue_growth || 0)}%
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Deals Won</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{dashboardKPIs?.kpis?.deals_won || 0}</p>
                <p className={`text-sm mt-1 ${dashboardKPIs?.kpis?.deals_won_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {dashboardKPIs?.kpis?.deals_won_growth >= 0 ? '↑' : '↓'} {Math.abs(dashboardKPIs?.kpis?.deals_won_growth || 0)}%
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <ChartPieIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{dashboardKPIs?.kpis?.win_rate || 0}%</p>
                <p className={`text-sm mt-1 ${dashboardKPIs?.kpis?.win_rate_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {dashboardKPIs?.kpis?.win_rate_change >= 0 ? '↑' : '↓'} {Math.abs(dashboardKPIs?.kpis?.win_rate_change || 0)}%
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <FunnelIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Deal Size</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  ${dashboardKPIs?.kpis?.avg_deal_size ? (dashboardKPIs.kpis.avg_deal_size / 1000).toFixed(1) : '0'}K
                </p>
                <p className={`text-sm mt-1 ${dashboardKPIs?.kpis?.avg_deal_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {dashboardKPIs?.kpis?.avg_deal_growth >= 0 ? '↑' : '↓'} {Math.abs(dashboardKPIs?.kpis?.avg_deal_growth || 0)}%
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <DocumentChartBarIcon className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Revenue Trend</h3>
          </div>
          <div className="p-4 sm:p-6">
            <ResponsiveContainer width="100%" height={250} key={`revenue-${dateRange}-${selectedUser}-${selectedPipeline}`}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 10 }} />
                <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="target" stroke="#10B981" fillOpacity={0} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline & Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
          {/* Pipeline Distribution */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Pipeline by Stage</h3>
            </div>
            <div className="p-4 sm:p-6">
              <ResponsiveContainer width="100%" height={250} key={`pipeline-${dateRange}-${selectedUser}-${selectedPipeline}`}>
                <PieChart>
                  <Pie
                    data={pipelineData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pipelineData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Metrics */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Weekly Activities</h3>
            </div>
            <div className="p-4 sm:p-6">
              <ResponsiveContainer width="100%" height={250} key={`activity-${dateRange}-${selectedUser}-${selectedPipeline}`}>
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="day" stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="calls" fill="#10B981" />
                  <Bar dataKey="emails" fill="#3B82F6" />
                  <Bar dataKey="meetings" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Lead Sources & Conversion Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
          {/* Lead Sources */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Lead Sources</h3>
            </div>
            <div className="p-4 sm:p-6">
              <ResponsiveContainer width="100%" height={250} key={`leadsource-${dateRange}-${selectedUser}-${selectedPipeline}`}>
                <PieChart>
                  <Pie
                    data={leadSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label
                  >
                    {leadSourceData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Lead Scoring Distribution (AI)</h3>
            </div>
            <div className="p-4 sm:p-6">
              <ResponsiveContainer width="100%" height={250} key={`leadscoring-${dateRange}-${selectedUser}-${selectedPipeline}`}>
                <BarChart data={leadScoringData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="score" stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="count" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Conversion by Source */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Conversion Rates by Lead Source</h3>
          </div>
          <div className="p-4 sm:p-6">
            <ResponsiveContainer width="100%" height={250} key={`conversion-${dateRange}-${selectedUser}-${selectedPipeline}`}>
              <BarChart data={conversionBySourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="source" stroke="#6B7280" tick={{ fontSize: 10 }} />
                <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="leads" fill="#3B82F6" name="Total Leads" />
                <Bar dataKey="converted" fill="#10B981" name="Converted" />
                <Bar dataKey="rate" fill="#F59E0B" name="Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Document & E-Sign Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Document Status</h3>
            </div>
            <div className="p-4 sm:p-6">
              <ResponsiveContainer width="100%" height={250} key={`docstats-${dateRange}-${selectedUser}-${selectedPipeline}`}>
                <PieChart>
                  <Pie
                    data={documentStatsData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label
                  >
                    {documentStatsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Time to Signature</h3>
            </div>
            <div className="p-4 sm:p-6">
              <ResponsiveContainer width="100%" height={250} key={`timetosig-${dateRange}-${selectedUser}-${selectedPipeline}`}>
                <BarChart data={timeToSignatureData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="range" stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="count" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      {/* Pipeline Analytics Modal */}
      {showPipelineModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Pipeline Analytics Dashboard</h3>
              <button
                onClick={() => setShowPipelineModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Pipeline Data from API */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {pipelineAnalytics?.pipeline_analytics?.slice(0, 3).map((stage: any, index: number) => (
                  <div key={stage.stage_name} className={`p-4 rounded-lg ${
                    index === 0 ? 'bg-blue-50' : index === 1 ? 'bg-yellow-50' : 'bg-green-50'
                  }`}>
                    <h4 className={`text-sm font-medium ${
                      index === 0 ? 'text-blue-900' : index === 1 ? 'text-yellow-900' : 'text-green-900'
                    }`}>{stage.stage_name}</h4>
                    <p className={`text-2xl font-bold ${
                      index === 0 ? 'text-blue-600' : index === 1 ? 'text-yellow-600' : 'text-green-600'
                    }`}>${(stage.total_value || 0).toLocaleString()}</p>
                    <p className={`text-sm ${
                      index === 0 ? 'text-blue-700' : index === 1 ? 'text-yellow-700' : 'text-green-700'
                    }`}>{stage.deal_count || 0} deals</p>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Pipeline Performance Metrics</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{dashboardKPIs?.kpis?.win_rate || 0}%</p>
                      <p className="text-sm text-gray-600">Win Rate</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{pipelineAnalytics?.avg_deal_duration || 0}</p>
                      <p className="text-sm text-gray-600">Avg. Days</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">${((dashboardKPIs?.kpis?.total_pipeline || 0) / 1000).toFixed(0)}K</p>
                      <p className="text-sm text-gray-600">Total Pipeline</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{dashboardKPIs?.kpis?.active_deals || 0}</p>
                      <p className="text-sm text-gray-600">Active Deals</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowPipelineModal(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create Custom Report</h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-1">
                  Report Type
                </label>
                <select
                  id="reportType"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="sales">Sales Performance</option>
                  <option value="pipeline">Pipeline Analysis</option>
                  <option value="activity">Activity Summary</option>
                  <option value="contacts">Contact Report</option>
                  <option value="revenue">Revenue Forecast</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <select
                  id="dateRange"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="last7days">Last 7 days</option>
                  <option value="last30days">Last 30 days</option>
                  <option value="last90days">Last 90 days</option>
                  <option value="thisquarter">This quarter</option>
                  <option value="thisyear">This year</option>
                  <option value="custom">Custom range</option>
                </select>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Report will include:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Data visualization charts</li>
                  <li>• Detailed metrics and KPIs</li>
                  <li>• Trend analysis</li>
                  <li>• Exportable PDF format</li>
                </ul>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateReport}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
