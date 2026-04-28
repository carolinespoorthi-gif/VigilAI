import React, { useState, useEffect, useRef } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import openai from '../../../utils/openaiClient';

const COLORS = {
  primary: '#0EA5E9',
  secondary: '#06B6D4',
  success: '#059669',
  warning: '#D97706',
  error: '#EF4444',
  purple: '#7C3AED',
  pink: '#EC4899',
  indigo: '#6366F1'
};

const ComplianceUsageAnalytics = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('monthly');
  const [selectedView, setSelectedView] = useState('trends');
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [capacityRecommendations, setCapacityRecommendations] = useState([]);
  const [apiKeyError, setApiKeyError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const chartRef = useRef(null);

  // Mock data for trends
  const [trendData, setTrendData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [resolutionData, setResolutionData] = useState([]);
  const [kpiData, setKpiData] = useState({});

  // Generate mock trend data
  const generateTrendData = (timeRange) => {
    const periods = timeRange === 'daily' ? 30 : timeRange === 'weekly' ? 12 : 6;
    const baseDate = new Date();
    
    return Array.from({ length: periods }, (_, i) => {
      const date = new Date(baseDate);
      if (timeRange === 'daily') {
        date?.setDate(date?.getDate() - (periods - i - 1));
      } else if (timeRange === 'weekly') {
        date?.setDate(date?.getDate() - (periods - i - 1) * 7);
      } else {
        date?.setMonth(date?.getMonth() - (periods - i - 1));
      }
      
      const baseComplaintCount = 45 + Math.sin(i / 3) * 15 + Math.random() * 20;
      const resolutionTime = 3.5 + Math.sin(i / 2) * 1.2 + Math.random() * 1;
      const backlogSize = Math.max(0, 25 + Math.cos(i / 4) * 10 + Math.random() * 15);
      
      return {
        period: timeRange === 'monthly' ? date?.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          : timeRange === 'weekly'
          ? `Week ${i + 1}`
          : date?.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
        complaints: Math.round(baseComplaintCount),
        growthRate: (Math.random() - 0.4) * 20,
        avgResolutionTime: parseFloat(resolutionTime?.toFixed(1)),
        backlogSize: Math.round(backlogSize),
        throughput: Math.round(baseComplaintCount * 0.85 + Math.random() * 8)
      };
    });
  };

  // Generate category distribution data
  const generateCategoryData = () => [
    { category: 'Data Privacy', count: 156, trend: 'increasing', severity: 'high', color: COLORS?.error },
    { category: 'HR Compliance', count: 123, trend: 'stable', severity: 'medium', color: COLORS?.warning },
    { category: 'Governance', count: 98, trend: 'decreasing', severity: 'medium', color: COLORS?.primary },
    { category: 'Security Review', count: 87, trend: 'increasing', severity: 'high', color: COLORS?.purple },
    { category: 'Access Control', count: 76, trend: 'increasing', severity: 'critical', color: COLORS?.pink },
    { category: 'Policy Audit', count: 54, trend: 'stable', severity: 'low', color: COLORS?.success },
    { category: 'Risk Management', count: 43, trend: 'decreasing', severity: 'medium', color: COLORS?.indigo },
    { category: 'Training Issues', count: 32, trend: 'stable', severity: 'low', color: COLORS?.secondary }
  ];

  // Generate department data
  const generateDepartmentData = () => [
    { department: 'IT Security', complaints: 234, capacity: 85, needsAttention: true },
    { department: 'HR', complaints: 187, capacity: 92, needsAttention: true },
    { department: 'Legal', complaints: 145, capacity: 67, needsAttention: false },
    { department: 'Operations', complaints: 98, capacity: 78, needsAttention: false },
    { department: 'Finance', complaints: 76, capacity: 45, needsAttention: false },
    { department: 'Marketing', complaints: 54, capacity: 58, needsAttention: false }
  ];

  // Generate resolution performance data
  const generateResolutionData = () => [
    { metric: 'Avg Resolution Time', current: 4.2, target: 3.0, unit: 'days', status: 'needs_improvement' },
    { metric: 'Backlog Size', current: 23, target: 15, unit: 'items', status: 'needs_improvement' },
    { metric: 'Throughput Rate', current: 45.8, target: 50.0, unit: 'per week', status: 'on_track' },
    { metric: 'First Response Time', current: 0.8, target: 1.0, unit: 'days', status: 'exceeding' }
  ];

  // Calculate KPI data
  const calculateKPIs = (trends, categories) => {
    const latestTrend = trends?.[trends?.length - 1];
    const previousTrend = trends?.[trends?.length - 2];
    
    const fastestGrowingCategory = categories?.reduce((max, cat) => 
      cat?.trend === 'increasing' && cat?.count > (max?.count || 0) ? cat : max, 
      categories?.[0]
    );
    
    const slowestResolvedCategory = categories?.find(cat => 
      ['Data Privacy', 'Security Review', 'Access Control']?.includes(cat?.category)
    ) || categories?.[0];

    return {
      totalComplaints: latestTrend?.complaints || 0,
      growthRate: latestTrend?.growthRate || 0,
      avgResolutionTime: latestTrend?.avgResolutionTime || 0,
      backlogSize: latestTrend?.backlogSize || 0,
      fastestGrowingCategory: fastestGrowingCategory?.category || 'N/A',
      slowestResolvedCategory: slowestResolvedCategory?.category || 'N/A',
      monthOverMonthGrowth: previousTrend ? 
        ((latestTrend?.complaints - previousTrend?.complaints) / previousTrend?.complaints * 100)?.toFixed(1) : 0
    };
  };

  // Check API key validity
  const checkApiKeyValidity = () => {
    const apiKey = import.meta.env?.VITE_OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your-openai-api-key-here' || apiKey?.startsWith('sk-abcde')) {
      return false;
    }
    return true;
  };

  // Generate fallback recommendations when API is unavailable
  const generateFallbackRecommendations = () => [
    {
      title: 'Add 2 analysts to Security Review team',
      description: 'High volume of security-related complaints requires additional specialized staff to reduce resolution time.',
      priority: 'high',
      impact: 'Reduce resolution time by 30%',
      timeline: '2-3 weeks'
    },
    {
      title: 'Automate policy audits in Access Control domain',
      description: 'Implement automated scanning and reporting to handle routine access control compliance checks.',
      priority: 'medium',
      impact: 'Handle 40% more cases with same resources',
      timeline: '1-2 months'
    },
    {
      title: 'Increase data retention training for HR staff',
      description: 'Additional training will reduce HR compliance issues at the source and improve first-time resolution rates.',
      priority: 'medium',
      impact: 'Reduce HR compliance issues by 25%',
      timeline: '3-4 weeks'
    },
    {
      title: 'Deploy compliance monitoring dashboard',
      description: 'Real-time monitoring system will provide early warning signals for potential compliance violations.',
      priority: 'medium',
      impact: 'Proactive issue prevention',
      timeline: '4-6 weeks'
    },
    {
      title: 'Establish cross-department compliance committee',
      description: 'Regular coordination between departments will improve compliance alignment and reduce duplicate efforts.',
      priority: 'low',
      impact: 'Better coordination and knowledge sharing',
      timeline: '2-3 weeks'
    }
  ];

  // Generate AI-powered capacity planning recommendations with proper error handling
  const generateCapacityRecommendations = async () => {
    setLoadingRecommendations(true);
    setErrorMessage('');
    setApiKeyError(false);

    // Check API key validity first
    if (!checkApiKeyValidity()) {
      setApiKeyError(true);
      setErrorMessage('OpenAI API key is invalid or not configured. Using fallback recommendations.');
      setCapacityRecommendations(generateFallbackRecommendations());
      setLoadingRecommendations(false);
      return;
    }
    
    try {
      const analyticsContext = {
        totalComplaints: kpiData?.totalComplaints,
        growthRate: kpiData?.growthRate,
        avgResolutionTime: kpiData?.avgResolutionTime,
        backlogSize: kpiData?.backlogSize,
        topCategories: categoryData?.slice(0, 3)?.map(cat => ({
          category: cat?.category,
          count: cat?.count,
          trend: cat?.trend,
          severity: cat?.severity
        })),
        departmentCapacity: departmentData?.filter(dept => dept?.needsAttention)?.map(dept => ({
          department: dept?.department,
          complaints: dept?.complaints,
          capacity: dept?.capacity
        }))
      };

      const response = await openai?.chat?.completions?.create({
        model: 'gpt-4o-mini', // Use a more stable model
        messages: [
          {
            role: 'system',
            content: 'You are a compliance capacity planning expert. Analyze the provided compliance data and generate 3-5 specific, actionable recommendations for capacity planning and resource optimization. Focus on concrete actions like staff additions, process automation, or training improvements.'
          },
          {
            role: 'user',
            content: `Based on this compliance analytics data, provide capacity planning recommendations:
            
            Current Metrics:
            - Total Complaints: ${analyticsContext?.totalComplaints}
            - Growth Rate: ${analyticsContext?.growthRate}%
            - Average Resolution Time: ${analyticsContext?.avgResolutionTime} days
            - Current Backlog: ${analyticsContext?.backlogSize} items
            
            Top Problem Categories:
            ${analyticsContext?.topCategories?.map(cat => 
              `- ${cat?.category}: ${cat?.count} complaints (${cat?.trend}, ${cat?.severity} severity)`
            )?.join('\n')}
            
            Departments Needing Attention:
            ${analyticsContext?.departmentCapacity?.map(dept => 
              `- ${dept?.department}: ${dept?.complaints} complaints at ${dept?.capacity}% capacity`
            )?.join('\n')}
            
            Generate specific recommendations for capacity planning and optimization.`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'capacity_recommendations',
            schema: {
              type: 'object',
              properties: {
                recommendations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                      impact: { type: 'string' },
                      timeline: { type: 'string' }
                    },
                    required: ['title', 'description', 'priority', 'impact', 'timeline']
                  }
                }
              },
              required: ['recommendations'],
              additionalProperties: false
            }
          }
        }
      });

      const result = JSON.parse(response?.choices?.[0]?.message?.content);
      setCapacityRecommendations(result?.recommendations || generateFallbackRecommendations());
    } catch (error) {
      console.error('Error generating capacity recommendations:', error);
      
      // Handle specific error types
      if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('API key')) {
        setApiKeyError(true);
        setErrorMessage('Invalid OpenAI API key. Please check your API key configuration. Using fallback recommendations.');
      } else if (error?.status === 429) {
        setErrorMessage('API rate limit exceeded. Please try again later. Using fallback recommendations.');
      } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        setErrorMessage('Network error. Please check your internet connection. Using fallback recommendations.');
      } else {
        setErrorMessage('AI service temporarily unavailable. Using fallback recommendations.');
      }
      
      // Always provide fallback recommendations
      setCapacityRecommendations(generateFallbackRecommendations());
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Initialize data
  useEffect(() => {
    const trends = generateTrendData(selectedTimeRange);
    const categories = generateCategoryData();
    const departments = generateDepartmentData();
    const resolution = generateResolutionData();
    
    setTrendData(trends);
    setCategoryData(categories);
    setDepartmentData(departments);
    setResolutionData(resolution);
    setKpiData(calculateKPIs(trends, categories));
  }, [selectedTimeRange]);

  // Load recommendations on component mount
  useEffect(() => {
    if (Object.keys(kpiData)?.length > 0) {
      generateCapacityRecommendations();
    }
  }, [kpiData]);

  const handleExport = () => {
    const svg = chartRef?.current?.querySelector('svg');
    if (svg) {
      const serializer = new XMLSerializer();
      const svgString = serializer?.serializeToString(svg);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `compliance-usage-analytics-${selectedView}-${Date.now()}.svg`;
      link?.click();
      URL.revokeObjectURL(url);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload?.length) return null;
    
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold mb-2 text-foreground">{label}</p>
        {payload?.map((entry, idx) => (
          <p key={idx} className="text-sm" style={{ color: entry?.color }}>
            {entry?.name}: {typeof entry?.value === 'number' ? entry?.value?.toFixed(1) : entry?.value}
            {entry?.name?.includes('Rate') || entry?.name?.includes('Growth') ? '%' : ''}
          </p>
        ))}
      </div>
    );
  };

  const timeRangeOptions = [
    { value: 'daily', label: 'Daily (30 days)' },
    { value: 'weekly', label: 'Weekly (12 weeks)' },
    { value: 'monthly', label: 'Monthly (6 months)' }
  ];

  const viewOptions = [
    { value: 'trends', label: 'Usage Trends', icon: 'TrendingUp' },
    { value: 'categories', label: 'Category Breakdown', icon: 'PieChart' },
    { value: 'departments', label: 'Department Analysis', icon: 'Building' },
    { value: 'performance', label: 'Resolution Performance', icon: 'Clock' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Usage Analytics & Capacity Planning</h2>
          <p className="text-muted-foreground">
            Track compliance trends and optimize resource allocation
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            className="px-3 py-2 border border-border rounded-md text-sm bg-background"
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e?.target?.value)}
          >
            {timeRangeOptions?.map((option) => (
              <option key={option?.value} value={option?.value}>
                {option?.label}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Icon name="Download" size={16} />
          </Button>
        </div>
      </div>

      {/* API Error Notice */}
      {apiKeyError && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Icon name="AlertTriangle" size={20} className="text-warning" />
            <div>
              <h3 className="font-semibold text-warning">API Configuration Notice</h3>
              <p className="text-sm text-muted-foreground mt-1">
                OpenAI API key needs to be configured for AI-powered recommendations. Currently showing fallback recommendations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && !apiKeyError && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Icon name="AlertCircle" size={20} className="text-error" />
            <div>
              <h3 className="font-semibold text-error">Service Notice</h3>
              <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Complaints</p>
              <p className="text-2xl font-bold text-foreground">{kpiData?.totalComplaints}</p>
            </div>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon name="AlertCircle" size={20} className="text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {kpiData?.monthOverMonthGrowth > 0 ? '+' : ''}{kpiData?.monthOverMonthGrowth}% from last period
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Resolution Time</p>
              <p className="text-2xl font-bold text-foreground">{kpiData?.avgResolutionTime} days</p>
            </div>
            <div className="p-2 bg-warning/10 rounded-lg">
              <Icon name="Clock" size={20} className="text-warning" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Target: 3.0 days
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Backlog</p>
              <p className="text-2xl font-bold text-foreground">{kpiData?.backlogSize}</p>
            </div>
            <div className="p-2 bg-error/10 rounded-lg">
              <Icon name="AlertTriangle" size={20} className="text-error" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Target: ≤15 items
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Growth Rate</p>
              <p className="text-2xl font-bold text-foreground">
                {kpiData?.growthRate > 0 ? '+' : ''}{kpiData?.growthRate?.toFixed(1)}%
              </p>
            </div>
            <div className={`p-2 rounded-lg ${kpiData?.growthRate > 0 ? 'bg-error/10' : 'bg-success/10'}`}>
              <Icon 
                name={kpiData?.growthRate > 0 ? "TrendingUp" : "TrendingDown"} 
                size={20} 
                className={kpiData?.growthRate > 0 ? "text-error" : "text-success"} 
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Period over period change
          </p>
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="TrendingUp" size={16} className="text-error" />
            <h3 className="font-semibold text-foreground">Fastest Growing Category</h3>
          </div>
          <p className="text-lg font-medium text-foreground">{kpiData?.fastestGrowingCategory}</p>
          <p className="text-sm text-muted-foreground">Requires immediate attention and resource allocation</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Clock" size={16} className="text-warning" />
            <h3 className="font-semibold text-foreground">Slowest Resolved Category</h3>
          </div>
          <p className="text-lg font-medium text-foreground">{kpiData?.slowestResolvedCategory}</p>
          <p className="text-sm text-muted-foreground">Consider process improvements or additional resources</p>
        </div>
      </div>

      {/* View Selection */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {viewOptions?.map((view) => (
            <button
              key={view?.value}
              onClick={() => setSelectedView(view?.value)}
              className={`
                flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${selectedView === view?.value
                  ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }
              `}
            >
              <Icon name={view?.icon} size={16} />
              <span>{view?.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Charts */}
      <div className="bg-card border border-border rounded-lg p-6" ref={chartRef}>
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            {selectedView === 'trends' && (
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="period" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="complaints"
                  stroke={COLORS?.primary}
                  fill={`${COLORS?.primary}20`}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="throughput"
                  stroke={COLORS?.success}
                  fill={`${COLORS?.success}15`}
                  strokeWidth={2}
                />
              </AreaChart>
            )}

            {selectedView === 'categories' && (
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ category, percent }) => 
                    `${category} ${(percent * 100)?.toFixed(0)}%`
                  }
                >
                  {categoryData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry?.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            )}

            {selectedView === 'departments' && (
              <BarChart data={departmentData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="department" fontSize={12} angle={-45} textAnchor="end" height={60} />
                <YAxis fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="complaints" fill={COLORS?.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="capacity" fill={COLORS?.warning} radius={[4, 4, 0, 0]} />
              </BarChart>
            )}

            {selectedView === 'performance' && (
              <BarChart data={resolutionData} layout="horizontal" margin={{ top: 10, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" fontSize={12} />
                <YAxis dataKey="metric" type="category" fontSize={12} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="current" 
                  fill={COLORS?.primary} 
                  radius={[0, 4, 4, 0]} 
                />
                <Bar 
                  dataKey="target" 
                  fill={COLORS?.success} 
                  radius={[0, 4, 4, 0]} 
                  opacity={0.6}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Chart Description */}
        <div className="text-sm text-muted-foreground border-t border-border pt-4">
          {selectedView === 'trends' && (
            <p>Complaint volume and throughput trends over time. Blue area shows incoming complaints, green shows resolved items.</p>
          )}
          {selectedView === 'categories' && (
            <p>Distribution of complaints by category. Larger segments indicate higher volume categories requiring attention.</p>
          )}
          {selectedView === 'departments' && (
            <p>Complaints by department vs. current capacity utilization. Red departments need immediate capacity adjustments.</p>
          )}
          {selectedView === 'performance' && (
            <p>Current performance metrics vs. targets. Dark bars show current values, light green bars show target values.</p>
          )}
        </div>
      </div>

      {/* AI-Powered Capacity Planning Recommendations */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Icon name="Brain" size={20} className="text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              {apiKeyError ? 'Capacity Planning Recommendations' : 'AI-Powered Capacity Planning'}
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateCapacityRecommendations}
            disabled={loadingRecommendations}
          >
            {loadingRecommendations ? (
              <>
                <Icon name="Loader2" size={16} className="animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Icon name="RefreshCw" size={16} />
                Refresh
              </>
            )}
          </Button>
        </div>

        {loadingRecommendations ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Icon name="Loader2" size={20} className="animate-spin" />
              <span>Generating intelligent recommendations...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {capacityRecommendations?.map((rec, index) => (
              <div key={index} className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-foreground">{rec?.title}</h4>
                  <span className={`
                    px-2 py-1 text-xs font-medium rounded-full
                    ${rec?.priority === 'high' ?'bg-error/10 text-error' 
                      : rec?.priority === 'medium' ?'bg-warning/10 text-warning' :'bg-success/10 text-success'
                    }
                  `}>
                    {rec?.priority?.toUpperCase()} PRIORITY
                  </span>
                </div>
                <p className="text-muted-foreground mb-3">{rec?.description}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Icon name="Target" size={14} className="text-success" />
                    <span className="text-foreground font-medium">Impact:</span>
                    <span className="text-muted-foreground">{rec?.impact}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Icon name="Clock" size={14} className="text-primary" />
                    <span className="text-foreground font-medium">Timeline:</span>
                    <span className="text-muted-foreground">{rec?.timeline}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceUsageAnalytics;