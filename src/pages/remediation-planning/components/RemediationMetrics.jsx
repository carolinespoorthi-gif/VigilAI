import React from 'react';
import Icon from '../../../components/AppIcon';

const RemediationMetrics = () => {
  const metricsData = {
    totalPlans: 47,
    activePlans: 23,
    completedPlans: 18,
    overduePlans: 6,
    completionRate: 78.3,
    averageResolutionTime: 14.2,
    resourceUtilization: 85.7,
    criticalPlansResolved: 12,
    totalRisksRemediated: 342,
    complianceScore: 92.4
  };

  const progressMetrics = [
    {
      label: 'Completion Rate',
      value: metricsData?.completionRate,
      target: 85,
      color: 'bg-success',
      icon: 'CheckCircle'
    },
    {
      label: 'Resource Utilization',
      value: metricsData?.resourceUtilization,
      target: 90,
      color: 'bg-warning',
      icon: 'Users'
    },
    {
      label: 'Compliance Score',
      value: metricsData?.complianceScore,
      target: 95,
      color: 'bg-accent',
      icon: 'Shield'
    }
  ];

  const getStatusColor = (value, target) => {
    if (value >= target) return 'text-success';
    if (value >= target * 0.8) return 'text-warning';
    return 'text-error';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Remediation Metrics</h2>
        <button className="text-sm text-accent hover:text-accent/80 transition-colors">
          View Details
        </button>
      </div>
      {/* Key Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="FileText" size={16} className="text-accent" />
            <span className="text-sm text-muted-foreground">Total Plans</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{metricsData?.totalPlans}</div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Clock" size={16} className="text-warning" />
            <span className="text-sm text-muted-foreground">Active</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{metricsData?.activePlans}</div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="CheckCircle" size={16} className="text-success" />
            <span className="text-sm text-muted-foreground">Completed</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{metricsData?.completedPlans}</div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="AlertTriangle" size={16} className="text-error" />
            <span className="text-sm text-muted-foreground">Overdue</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{metricsData?.overduePlans}</div>
        </div>
      </div>
      {/* Progress Indicators */}
      <div className="space-y-4 mb-6">
        {progressMetrics?.map((metric, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Icon name={metric?.icon} size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{metric?.label}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${getStatusColor(metric?.value, metric?.target)}`}>
                  {metric?.value}%
                </span>
                <span className="text-xs text-muted-foreground">/ {metric?.target}%</span>
              </div>
            </div>
            <div className="w-full bg-border rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${metric?.color}`}
                style={{ width: `${Math.min(metric?.value, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Avg. Resolution Time</span>
          <span className="text-sm font-medium text-foreground">{metricsData?.averageResolutionTime} days</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Critical Resolved</span>
          <span className="text-sm font-medium text-foreground">{metricsData?.criticalPlansResolved}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Risks Fixed</span>
          <span className="text-sm font-medium text-foreground">{metricsData?.totalRisksRemediated}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Last Updated</span>
          <span className="text-sm font-medium text-foreground">2 min ago</span>
        </div>
      </div>
    </div>
  );
};

export default RemediationMetrics;