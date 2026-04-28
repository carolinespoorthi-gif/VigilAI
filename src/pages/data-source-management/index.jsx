import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import DataSourceCard from './components/DataSourceCard';
import IntegrationStatsPanel from './components/IntegrationStatsPanel';
import FilterControls from './components/FilterControls';
import AddIntegrationModal from './components/AddIntegrationModal';
import ConfigurationModal from './components/ConfigurationModal';
import SyncLogsModal from './components/SyncLogsModal';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const DataSourceManagement = () => {
  const [dataSources, setDataSources] = useState([]);
  const [filteredDataSources, setFilteredDataSources] = useState([]);
  const [integrationStats, setIntegrationStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedHealth, setSelectedHealth] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data sources
  useEffect(() => {
    const mockDataSources = [
      {
        id: 1,
        name: 'Corporate Slack Workspace',
        description: 'Main company communication platform',
        type: 'slack',
        status: 'connected',
        health: 'excellent',
        lastSync: new Date(Date.now() - 10 * 60 * 1000),
        dataVolume: 2147483648, // 2GB
        recordCount: 45678,
        errorRate: 0.2,
        syncFrequency: 'realtime',
        enabledFeatures: ['messages', 'files', 'threads'],
        serverUrl: 'https://company.slack.com',
        username: 'compliance-bot'
      },
      {
        id: 2,
        name: 'Jira Project Management',
        description: 'Issue tracking and project management',
        type: 'jira',
        status: 'connected',
        health: 'good',
        lastSync: new Date(Date.now() - 30 * 60 * 1000),
        dataVolume: 1073741824, // 1GB
        recordCount: 12345,
        errorRate: 1.8,
        syncFrequency: 'hourly',
        enabledFeatures: ['tickets', 'comments', 'attachments'],
        serverUrl: 'https://company.atlassian.net',
        username: 'compliance-service'
      },
      {
        id: 3,
        name: 'Exchange Email Server',
        description: 'Corporate email system',
        type: 'email',
        status: 'warning',
        health: 'warning',
        lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000),
        dataVolume: 5368709120, // 5GB
        recordCount: 89012,
        errorRate: 3.5,
        syncFrequency: 'daily',
        enabledFeatures: ['content', 'attachments', 'metadata'],
        serverUrl: 'https://mail.company.com',
        username: 'compliance@company.com'
      },
      {
        id: 4,
        name: 'GitHub Enterprise',
        description: 'Source code repositories',
        type: 'github',
        status: 'connected',
        health: 'excellent',
        lastSync: new Date(Date.now() - 45 * 60 * 1000),
        dataVolume: 3221225472, // 3GB
        recordCount: 23456,
        errorRate: 0.1,
        syncFrequency: 'hourly',
        enabledFeatures: ['code', 'commits', 'issues'],
        serverUrl: 'https://github.company.com',
        username: 'compliance-scanner'
      },
      {
        id: 5,
        name: 'Salesforce CRM',
        description: 'Customer relationship management',
        type: 'salesforce',
        status: 'error',
        health: 'critical',
        lastSync: new Date(Date.now() - 6 * 60 * 60 * 1000),
        dataVolume: 4294967296, // 4GB
        recordCount: 67890,
        errorRate: 8.2,
        syncFrequency: 'daily',
        enabledFeatures: ['records', 'notes'],
        serverUrl: 'https://company.salesforce.com',
        username: 'compliance.user@company.com'
      },
      {
        id: 6,
        name: 'Confluence Wiki',
        description: 'Knowledge base and documentation',
        type: 'confluence',
        status: 'disconnected',
        health: 'critical',
        lastSync: null,
        dataVolume: 0,
        recordCount: 0,
        errorRate: 0,
        syncFrequency: 'weekly',
        enabledFeatures: [],
        serverUrl: 'https://company.atlassian.net/wiki',
        username: 'compliance-service'
      }
    ];

    setDataSources(mockDataSources);
    setIsLoading(false);
  }, []);

  // Calculate integration stats
  useEffect(() => {
    const stats = {
      totalSources: dataSources?.length,
      connectedSources: dataSources?.filter(ds => ds?.status === 'connected')?.length,
      healthScore: Math.round(
        dataSources?.reduce((acc, ds) => {
          const healthScores = { excellent: 100, good: 80, warning: 60, critical: 20 };
          return acc + (healthScores?.[ds?.health] || 0);
        }, 0) / dataSources?.length
      ),
      totalDataVolume: formatDataVolume(
        dataSources?.reduce((acc, ds) => acc + ds?.dataVolume, 0)
      ),
      syncFrequency: {
        realtime: dataSources?.filter(ds => ds?.syncFrequency === 'realtime')?.length,
        hourly: dataSources?.filter(ds => ds?.syncFrequency === 'hourly')?.length,
        daily: dataSources?.filter(ds => ds?.syncFrequency === 'daily')?.length
      },
      errorRates: {
        low: dataSources?.filter(ds => ds?.errorRate < 1)?.length,
        medium: dataSources?.filter(ds => ds?.errorRate >= 1 && ds?.errorRate <= 5)?.length,
        high: dataSources?.filter(ds => ds?.errorRate > 5)?.length
      },
      recentActivity: {
        lastHour: dataSources?.filter(ds => 
          ds?.lastSync && (Date.now() - ds?.lastSync) < 60 * 60 * 1000
        )?.length,
        last24h: dataSources?.filter(ds => 
          ds?.lastSync && (Date.now() - ds?.lastSync) < 24 * 60 * 60 * 1000
        )?.length,
        lastWeek: dataSources?.filter(ds => 
          ds?.lastSync && (Date.now() - ds?.lastSync) < 7 * 24 * 60 * 60 * 1000
        )?.length
      }
    };

    setIntegrationStats(stats);
  }, [dataSources]);

  // Filter data sources
  useEffect(() => {
    let filtered = dataSources;

    // Search filter
    if (searchTerm) {
      filtered = filtered?.filter(ds =>
        ds?.name?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
        ds?.description?.toLowerCase()?.includes(searchTerm?.toLowerCase())
      );
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered?.filter(ds => ds?.type === selectedType);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered?.filter(ds => ds?.status === selectedStatus);
    }

    // Health filter
    if (selectedHealth !== 'all') {
      filtered = filtered?.filter(ds => ds?.health === selectedHealth);
    }

    setFilteredDataSources(filtered);
  }, [dataSources, searchTerm, selectedType, selectedStatus, selectedHealth]);

  const formatDataVolume = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i))?.toFixed(1)) + ' ' + sizes?.[i];
  };

  const handleAddIntegration = (integrationData) => {
    const newIntegration = {
      id: Date.now(),
      ...integrationData,
      status: 'disconnected',
      health: 'critical',
      lastSync: null,
      dataVolume: 0,
      recordCount: 0,
      errorRate: 0
    };

    setDataSources(prev => [...prev, newIntegration]);
  };

  const handleTestConnection = (id) => {
    console.log('Testing connection for data source:', id);
    // Mock test connection - update status after delay
    setTimeout(() => {
      setDataSources(prev => prev?.map(ds => 
        ds?.id === id 
          ? { ...ds, status: 'connected', health: 'good', lastSync: new Date() }
          : ds
      ));
    }, 2000);
  };

  const handleViewLogs = (id) => {
    const dataSource = dataSources?.find(ds => ds?.id === id);
    setSelectedDataSource(dataSource);
    setIsLogsModalOpen(true);
  };

  const handleConfigure = (id) => {
    const dataSource = dataSources?.find(ds => ds?.id === id);
    setSelectedDataSource(dataSource);
    setIsConfigModalOpen(true);
  };

  const handleToggleStatus = (id) => {
    setDataSources(prev => prev?.map(ds => 
      ds?.id === id 
        ? { 
            ...ds, 
            status: ds?.status === 'connected' ? 'disconnected' : 'connected',
            health: ds?.status === 'connected' ? 'critical' : 'good'
          }
        : ds
    ));
  };

  const handleSaveConfiguration = (id, configData) => {
    setDataSources(prev => prev?.map(ds => 
      ds?.id === id ? { ...ds, ...configData } : ds
    ));
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedStatus('all');
    setSelectedHealth('all');
  };

  const handleRefresh = () => {
    setIsLoading(true);
    // Mock refresh delay
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const handleBulkAction = (action) => {
    console.log('Bulk action:', action);
    // Mock bulk operations
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-3">
                <Icon name="Loader2" size={24} className="text-primary animate-spin" />
                <span className="text-lg text-muted-foreground">Loading data sources...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <BreadcrumbNavigation />
          </div>

          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#0B2E33' }}>Data Source Management</h1>
              <p className="text-muted-foreground mt-2">
                Configure and monitor integrations with enterprise systems for PII scanning and compliance monitoring.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                iconName="Download"
                iconPosition="left"
                onClick={() => handleBulkAction('export')}
              >
                Export Config
              </Button>
              <Button
                iconName="Plus"
                iconPosition="left"
                onClick={() => setIsAddModalOpen(true)}
              >
                Add Integration
              </Button>
            </div>
          </div>

          {/* Integration Stats */}
          <div className="mb-8">
            <IntegrationStatsPanel stats={integrationStats} />
          </div>

          {/* Filter Controls */}
          <FilterControls
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            selectedHealth={selectedHealth}
            onHealthChange={setSelectedHealth}
            onClearFilters={handleClearFilters}
            onRefresh={handleRefresh}
          />

          {/* Bulk Actions */}
          {filteredDataSources?.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {filteredDataSources?.length} data source{filteredDataSources?.length !== 1 ? 's' : ''} found
                </span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="Play"
                    iconPosition="left"
                    onClick={() => handleBulkAction('test-all')}
                  >
                    Test All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="RotateCcw"
                    iconPosition="left"
                    onClick={() => handleBulkAction('sync-all')}
                  >
                    Sync All
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Data Sources Grid */}
          {filteredDataSources?.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Icon name="Database" size={48} className="text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Data Sources Found</h3>
              <p className="text-muted-foreground mb-6">
                {dataSources?.length === 0 
                  ? "Get started by adding your first integration to begin scanning for PII and sensitive data."
                  : "No data sources match your current filter criteria. Try adjusting your search or filters."
                }
              </p>
              {dataSources?.length === 0 ? (
                <Button
                  iconName="Plus"
                  iconPosition="left"
                  onClick={() => setIsAddModalOpen(true)}
                >
                  Add Your First Integration
                </Button>
              ) : (
                <Button
                  variant="outline"
                  iconName="RotateCcw"
                  iconPosition="left"
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredDataSources?.map((dataSource) => (
                <DataSourceCard
                  key={dataSource?.id}
                  dataSource={dataSource}
                  onTest={handleTestConnection}
                  onViewLogs={handleViewLogs}
                  onConfigure={handleConfigure}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Modals */}
      <AddIntegrationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddIntegration}
      />
      <ConfigurationModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        dataSource={selectedDataSource}
        onSave={handleSaveConfiguration}
      />
      <SyncLogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        dataSource={selectedDataSource}
      />
    </div>
  );
};

export default DataSourceManagement;