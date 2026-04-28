import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const DataSourceCard = ({ dataSource, onTest, onViewLogs, onConfigure, onToggleStatus }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'text-success bg-success/10';
      case 'error': return 'text-error bg-error/10';
      case 'warning': return 'text-warning bg-warning/10';
      case 'disconnected': return 'text-muted-foreground bg-muted';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getHealthIcon = (health) => {
    switch (health) {
      case 'excellent': return { name: 'CheckCircle', color: 'text-success' };
      case 'good': return { name: 'CheckCircle', color: 'text-success' };
      case 'warning': return { name: 'AlertTriangle', color: 'text-warning' };
      case 'critical': return { name: 'AlertCircle', color: 'text-error' };
      default: return { name: 'Circle', color: 'text-muted-foreground' };
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'slack': return 'MessageSquare';
      case 'jira': return 'Ticket';
      case 'email': return 'Mail';
      case 'github': return 'Github';
      case 'gitlab': return 'GitBranch';
      case 'salesforce': return 'Users';
      case 'confluence': return 'FileText';
      case 'sharepoint': return 'Folder';
      default: return 'Database';
    }
  };

  const formatDataVolume = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i))?.toFixed(2)) + ' ' + sizes?.[i];
  };

  const formatLastSync = (timestamp) => {
    const now = new Date();
    const syncTime = new Date(timestamp);
    const diffMs = now - syncTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const healthIcon = getHealthIcon(dataSource?.health);

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
            <Icon name={getTypeIcon(dataSource?.type)} size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{dataSource?.name}</h3>
            <p className="text-sm text-muted-foreground">{dataSource?.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dataSource?.status)}`}>
            {dataSource?.status}
          </span>
          <Icon name={healthIcon?.name} size={16} className={healthIcon?.color} />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Last Sync</p>
          <p className="text-sm font-medium text-foreground">
            {dataSource?.lastSync ? formatLastSync(dataSource?.lastSync) : 'Never'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Data Volume</p>
          <p className="text-sm font-medium text-foreground">
            {formatDataVolume(dataSource?.dataVolume)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Records</p>
          <p className="text-sm font-medium text-foreground">
            {dataSource?.recordCount?.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Error Rate</p>
          <p className={`text-sm font-medium ${dataSource?.errorRate > 5 ? 'text-error' : 'text-success'}`}>
            {dataSource?.errorRate}%
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            iconName="Play"
            iconPosition="left"
            onClick={() => onTest(dataSource?.id)}
            disabled={dataSource?.status === 'disconnected'}
          >
            Test
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconName="FileText"
            iconPosition="left"
            onClick={() => onViewLogs(dataSource?.id)}
          >
            Logs
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconName="Settings"
            iconPosition="left"
            onClick={() => onConfigure(dataSource?.id)}
          >
            Configure
          </Button>
        </div>
        <Button
          variant={dataSource?.status === 'connected' ? 'outline' : 'default'}
          size="sm"
          iconName={dataSource?.status === 'connected' ? 'Pause' : 'Play'}
          iconPosition="left"
          onClick={() => onToggleStatus(dataSource?.id)}
        >
          {dataSource?.status === 'connected' ? 'Disable' : 'Enable'}
        </Button>
      </div>
    </div>
  );
};

export default DataSourceCard;