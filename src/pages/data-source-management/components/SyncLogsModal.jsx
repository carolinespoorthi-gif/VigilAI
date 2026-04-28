import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';

const SyncLogsModal = ({ isOpen, onClose, dataSource }) => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');

  // Mock log data
  useEffect(() => {
    if (dataSource) {
      const mockLogs = [
        {
          id: 1,
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
          level: 'info',
          message: 'Sync completed successfully',
          details: `Processed 1,247 records from ${dataSource?.name}. Found 23 potential PII matches for review.`,
          recordsProcessed: 1247,
          duration: '2.3s'
        },
        {
          id: 2,
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          level: 'warning',
          message: 'Rate limit encountered',
          details: `API rate limit reached for ${dataSource?.name}. Sync will resume in 15 minutes.`,
          recordsProcessed: 856,
          duration: '1.8s'
        },
        {
          id: 3,
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          level: 'error',
          message: 'Authentication failed',
          details: `Failed to authenticate with ${dataSource?.name}. Please check credentials and try again.`,
          recordsProcessed: 0,
          duration: '0.5s'
        },
        {
          id: 4,
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
          level: 'info',
          message: 'Sync started',
          details: `Beginning scheduled sync for ${dataSource?.name}. Scanning for new and updated content.`,
          recordsProcessed: 0,
          duration: '0.1s'
        },
        {
          id: 5,
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          level: 'success',
          message: 'Full scan completed',
          details: `Completed full data scan for ${dataSource?.name}. Identified 156 sensitive data points across 2,891 records.`,
          recordsProcessed: 2891,
          duration: '45.2s'
        },
        {
          id: 6,
          timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000),
          level: 'warning',
          message: 'Large dataset detected',
          details: `Dataset size exceeds normal threshold. Consider adjusting sync frequency to optimize performance.`,
          recordsProcessed: 2891,
          duration: '1.2s'
        }
      ];
      setLogs(mockLogs);
    }
  }, [dataSource]);

  // Filter logs based on selected criteria
  useEffect(() => {
    let filtered = logs;

    // Filter by level
    if (selectedLevel !== 'all') {
      filtered = filtered?.filter(log => log?.level === selectedLevel);
    }

    // Filter by time range
    const now = new Date();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    if (selectedTimeRange !== 'all') {
      const cutoff = now - timeRanges?.[selectedTimeRange];
      filtered = filtered?.filter(log => log?.timestamp >= cutoff);
    }

    setFilteredLogs(filtered);
  }, [logs, selectedLevel, selectedTimeRange]);

  const levelOptions = [
    { value: 'all', label: 'All Levels' },
    { value: 'success', label: 'Success' },
    { value: 'info', label: 'Info' },
    { value: 'warning', label: 'Warning' },
    { value: 'error', label: 'Error' }
  ];

  const timeRangeOptions = [
    { value: '1h', label: 'Last Hour' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: 'all', label: 'All Time' }
  ];

  const getLevelIcon = (level) => {
    switch (level) {
      case 'success': return { name: 'CheckCircle', color: 'text-success' };
      case 'info': return { name: 'Info', color: 'text-accent' };
      case 'warning': return { name: 'AlertTriangle', color: 'text-warning' };
      case 'error': return { name: 'AlertCircle', color: 'text-error' };
      default: return { name: 'Circle', color: 'text-muted-foreground' };
    }
  };

  const getLevelBg = (level) => {
    switch (level) {
      case 'success': return 'bg-success/5 border-l-success';
      case 'info': return 'bg-accent/5 border-l-accent';
      case 'warning': return 'bg-warning/5 border-l-warning';
      case 'error': return 'bg-error/5 border-l-error';
      default: return 'bg-muted/30 border-l-muted';
    }
  };

  const formatTimestamp = (timestamp) => {
    return timestamp?.toLocaleString();
  };

  const formatDuration = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleExportLogs = () => {
    console.log('Exporting logs for:', dataSource?.name);
    // Mock export functionality
  };

  const handleClearLogs = () => {
    console.log('Clearing logs for:', dataSource?.name);
    setLogs([]);
  };

  if (!isOpen || !dataSource) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-300 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Sync Logs</h2>
            <p className="text-sm text-muted-foreground mt-1">{dataSource?.name}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              iconName="Download"
              iconPosition="left"
              onClick={handleExportLogs}
            >
              Export
            </Button>
            <Button variant="ghost" size="sm" iconName="X" onClick={onClose} />
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">Filter Logs</h3>
            <span className="text-sm text-muted-foreground">
              Showing {filteredLogs?.length} of {logs?.length} entries
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              placeholder="Filter by level"
              options={levelOptions}
              value={selectedLevel}
              onChange={setSelectedLevel}
            />
            <Select
              placeholder="Filter by time"
              options={timeRangeOptions}
              value={selectedTimeRange}
              onChange={setSelectedTimeRange}
            />
            <Button
              variant="outline"
              size="sm"
              iconName="RotateCcw"
              iconPosition="left"
              onClick={() => {
                setSelectedLevel('all');
                setSelectedTimeRange('24h');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {filteredLogs?.length === 0 ? (
            <div className="p-8 text-center">
              <Icon name="FileText" size={32} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No logs found for the selected criteria</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {filteredLogs?.map((log) => {
                const levelIcon = getLevelIcon(log?.level);
                return (
                  <div
                    key={log?.id}
                    className={`border-l-4 rounded-lg p-4 ${getLevelBg(log?.level)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Icon name={levelIcon?.name} size={16} className={levelIcon?.color} />
                        <span className="font-medium text-foreground">{log?.message}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          {formatTimestamp(log?.timestamp)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDuration(log?.timestamp)}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                      {log?.details}
                    </p>
                    <div className="flex items-center space-x-6 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Icon name="Database" size={12} />
                        <span>{log?.recordsProcessed?.toLocaleString()} records</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Icon name="Clock" size={12} />
                        <span>{log?.duration}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            iconName="Trash2"
            iconPosition="left"
            onClick={handleClearLogs}
            disabled={logs?.length === 0}
          >
            Clear All Logs
          </Button>
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SyncLogsModal;