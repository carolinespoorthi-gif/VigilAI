import React from 'react';
import Icon from '../../../components/AppIcon';

const IntegrationStatsPanel = ({ stats }) => {
  const getHealthColor = (percentage) => {
    if (percentage >= 90) return 'text-success';
    if (percentage >= 70) return 'text-warning';
    return 'text-error';
  };

  const getHealthBg = (percentage) => {
    if (percentage >= 90) return 'bg-success/10';
    if (percentage >= 70) return 'bg-warning/10';
    return 'bg-error/10';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Integration Overview</h2>
        <Icon name="BarChart3" size={20} className="text-muted-foreground" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Sources */}
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-3">
            <Icon name="Database" size={24} className="text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats?.totalSources}</div>
          <div className="text-sm text-muted-foreground">Total Sources</div>
        </div>

        {/* Connected Sources */}
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-success/10 rounded-lg mx-auto mb-3">
            <Icon name="CheckCircle" size={24} className="text-success" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats?.connectedSources}</div>
          <div className="text-sm text-muted-foreground">Connected</div>
        </div>

        {/* Health Score */}
        <div className="text-center">
          <div className={`flex items-center justify-center w-12 h-12 rounded-lg mx-auto mb-3 ${getHealthBg(stats?.healthScore)}`}>
            <Icon name="Activity" size={24} className={getHealthColor(stats?.healthScore)} />
          </div>
          <div className={`text-2xl font-bold ${getHealthColor(stats?.healthScore)}`}>
            {stats?.healthScore}%
          </div>
          <div className="text-sm text-muted-foreground">Health Score</div>
        </div>

        {/* Data Volume */}
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg mx-auto mb-3">
            <Icon name="HardDrive" size={24} className="text-accent" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats?.totalDataVolume}</div>
          <div className="text-sm text-muted-foreground">Total Data</div>
        </div>
      </div>
      <div className="mt-6 pt-6 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sync Frequency */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Sync Frequency</span>
              <Icon name="Clock" size={16} className="text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Real-time</span>
                <span className="font-medium text-foreground">{stats?.syncFrequency?.realtime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hourly</span>
                <span className="font-medium text-foreground">{stats?.syncFrequency?.hourly}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Daily</span>
                <span className="font-medium text-foreground">{stats?.syncFrequency?.daily}</span>
              </div>
            </div>
          </div>

          {/* Error Rates */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Error Rates</span>
              <Icon name="AlertTriangle" size={16} className="text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Low (&lt;1%)</span>
                <span className="font-medium text-success">{stats?.errorRates?.low}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Medium (1-5%)</span>
                <span className="font-medium text-warning">{stats?.errorRates?.medium}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">High (&gt;5%)</span>
                <span className="font-medium text-error">{stats?.errorRates?.high}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Recent Activity</span>
              <Icon name="Activity" size={16} className="text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Hour</span>
                <span className="font-medium text-foreground">{stats?.recentActivity?.lastHour}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last 24h</span>
                <span className="font-medium text-foreground">{stats?.recentActivity?.last24h}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Week</span>
                <span className="font-medium text-foreground">{stats?.recentActivity?.lastWeek}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationStatsPanel;