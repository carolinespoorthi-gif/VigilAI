import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const RiskVisualization = ({ riskData }) => {
  const [activeChart, setActiveChart] = useState('distribution');

  const chartTypes = [
    { id: 'distribution', label: 'Risk Distribution', icon: 'BarChart3' },
    { id: 'trends', label: 'Risk Trends', icon: 'TrendingUp' },
    { id: 'sources', label: 'Source Analysis', icon: 'PieChart' }
  ];

  // Mock data for different chart types
  const riskDistributionData = [
    { category: 'SSN', count: 45, risk: 95 },
    { category: 'Credit Card', count: 23, risk: 90 },
    { category: 'Email', count: 156, risk: 65 },
    { category: 'Phone', count: 89, risk: 70 },
    { category: 'Address', count: 67, risk: 60 },
    { category: 'Name', count: 234, risk: 45 }
  ];

  const riskTrendsData = [
    { date: '2025-10-01', score: 65 },
    { date: '2025-10-02', score: 72 },
    { date: '2025-10-03', score: 68 },
    { date: '2025-10-04', score: 78 },
    { date: '2025-10-05', score: 82 },
    { date: '2025-10-06', score: 85 },
    { date: '2025-10-07', score: 87 }
  ];

  const sourceAnalysisData = [
    { name: 'Slack Messages', value: 35, color: '#0EA5E9' },
    { name: 'Email Communications', value: 28, color: '#D97706' },
    { name: 'Jira Tickets', value: 18, color: '#059669' },
    { name: 'Contract Documents', value: 12, color: '#DC2626' },
    { name: 'Code Repositories', value: 7, color: '#7C3AED' }
  ];

  const contributingFactors = [
    { factor: 'Data Volume', impact: 85, description: 'Large datasets increase exposure risk' },
    { factor: 'Access Controls', impact: 72, description: 'Insufficient access restrictions detected' },
    { factor: 'Encryption Status', impact: 68, description: 'Unencrypted sensitive data found' },
    { factor: 'Retention Policies', impact: 55, description: 'Outdated data retention practices' },
    { factor: 'User Permissions', impact: 45, description: 'Overprivileged user access patterns' }
  ];

  const impactScenarios = [
    {
      scenario: 'Data Breach',
      probability: 'Medium',
      impact: 'High',
      description: 'Unauthorized access to PII data',
      estimatedCost: '$2.4M',
      timeToResolve: '6-12 months'
    },
    {
      scenario: 'Regulatory Fine',
      probability: 'High',
      impact: 'Medium',
      description: 'GDPR/CCPA compliance violations',
      estimatedCost: '$850K',
      timeToResolve: '3-6 months'
    },
    {
      scenario: 'Reputation Damage',
      probability: 'Low',
      impact: 'High',
      description: 'Public disclosure of privacy issues',
      estimatedCost: '$1.2M',
      timeToResolve: '12+ months'
    }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload?.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-popover-foreground">{label}</p>
          {payload?.map((entry, index) => (
            <p key={index} className="text-sm text-muted-foreground">
              {entry?.name}: {entry?.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (activeChart) {
      case 'distribution':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={riskDistributionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="category" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'trends':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={riskTrendsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="var(--color-error)" 
                strokeWidth={3}
                dot={{ fill: 'var(--color-error)', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'sources':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sourceAnalysisData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {sourceAnalysisData?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry?.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  const getProbabilityColor = (probability) => {
    switch (probability?.toLowerCase()) {
      case 'high': return 'text-error';
      case 'medium': return 'text-warning';
      case 'low': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  const getImpactColor = (impact) => {
    switch (impact?.toLowerCase()) {
      case 'high': return 'text-error';
      case 'medium': return 'text-warning';
      case 'low': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Chart Section */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Risk Analysis Visualization</h3>
            <div className="flex items-center space-x-1">
              {chartTypes?.map((chart) => (
                <Button
                  key={chart?.id}
                  variant={activeChart === chart?.id ? 'default' : 'ghost'}
                  size="sm"
                  iconName={chart?.icon}
                  iconPosition="left"
                  onClick={() => setActiveChart(chart?.id)}
                >
                  {chart?.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6">
          {renderChart()}
        </div>
      </div>
      {/* Contributing Factors */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Contributing Risk Factors</h3>
          <p className="text-sm text-muted-foreground">Key elements influencing overall risk assessment</p>
        </div>
        <div className="p-4 space-y-4">
          {contributingFactors?.map((factor, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-foreground">{factor?.factor}</h4>
                  <span className="text-sm font-medium text-foreground">{factor?.impact}%</span>
                </div>
                <p className="text-xs text-muted-foreground">{factor?.description}</p>
                <div className="mt-2 w-full bg-border rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      factor?.impact >= 80 ? 'bg-error' :
                      factor?.impact >= 60 ? 'bg-warning' : 'bg-success'
                    }`}
                    style={{ width: `${factor?.impact}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Impact Scenarios */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Potential Impact Scenarios</h3>
          <p className="text-sm text-muted-foreground">Risk assessment outcomes and business impact analysis</p>
        </div>
        <div className="p-4 space-y-4">
          {impactScenarios?.map((scenario, index) => (
            <div key={index} className="border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{scenario?.scenario}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{scenario?.description}</p>
                </div>
                <div className="flex items-center space-x-4 text-xs">
                  <div className="text-center">
                    <div className="text-muted-foreground">Probability</div>
                    <div className={`font-medium ${getProbabilityColor(scenario?.probability)}`}>
                      {scenario?.probability}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">Impact</div>
                    <div className={`font-medium ${getImpactColor(scenario?.impact)}`}>
                      {scenario?.impact}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex items-center space-x-2">
                  <Icon name="DollarSign" size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Estimated Cost:</span>
                  <span className="font-medium text-foreground">{scenario?.estimatedCost}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Icon name="Clock" size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Resolution Time:</span>
                  <span className="font-medium text-foreground">{scenario?.timeToResolve}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RiskVisualization;