import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';

const ConfigurationModal = ({ isOpen, onClose, dataSource, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    serverUrl: '',
    username: '',
    password: '',
    apiKey: '',
    syncFrequency: 'hourly',
    enabledFeatures: [],
    scanSettings: {
      includeArchived: false,
      scanDepth: 'full',
      excludePatterns: '',
      customRules: false
    }
  });

  const [activeTab, setActiveTab] = useState('connection');

  useEffect(() => {
    if (dataSource) {
      setFormData({
        name: dataSource?.name || '',
        description: dataSource?.description || '',
        serverUrl: dataSource?.serverUrl || '',
        username: dataSource?.username || '',
        password: '', // Don't populate password for security
        apiKey: dataSource?.apiKey ? '••••••••••••' : '',
        syncFrequency: dataSource?.syncFrequency || 'hourly',
        enabledFeatures: dataSource?.enabledFeatures || [],
        scanSettings: {
          includeArchived: dataSource?.scanSettings?.includeArchived || false,
          scanDepth: dataSource?.scanSettings?.scanDepth || 'full',
          excludePatterns: dataSource?.scanSettings?.excludePatterns || '',
          customRules: dataSource?.scanSettings?.customRules || false
        }
      });
    }
  }, [dataSource]);

  const syncFrequencyOptions = [
    { value: 'realtime', label: 'Real-time' },
    { value: 'hourly', label: 'Every Hour' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' }
  ];

  const scanDepthOptions = [
    { value: 'surface', label: 'Surface Level' },
    { value: 'standard', label: 'Standard' },
    { value: 'full', label: 'Full Deep Scan' }
  ];

  const featureOptions = {
    slack: [
      { value: 'messages', label: 'Message Scanning' },
      { value: 'files', label: 'File Attachments' },
      { value: 'threads', label: 'Thread Analysis' }
    ],
    jira: [
      { value: 'tickets', label: 'Ticket Content' },
      { value: 'comments', label: 'Comments' },
      { value: 'attachments', label: 'Attachments' }
    ],
    email: [
      { value: 'content', label: 'Email Content' },
      { value: 'attachments', label: 'Attachments' },
      { value: 'metadata', label: 'Metadata' }
    ],
    github: [
      { value: 'code', label: 'Source Code' },
      { value: 'commits', label: 'Commit Messages' },
      { value: 'issues', label: 'Issues & PRs' }
    ]
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleScanSettingChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      scanSettings: {
        ...prev?.scanSettings,
        [field]: value
      }
    }));
  };

  const handleFeatureToggle = (feature) => {
    setFormData(prev => ({
      ...prev,
      enabledFeatures: prev?.enabledFeatures?.includes(feature)
        ? prev?.enabledFeatures?.filter(f => f !== feature)
        : [...prev?.enabledFeatures, feature]
    }));
  };

  const handleSave = () => {
    onSave(dataSource?.id, formData);
    onClose();
  };

  const handleTestConnection = () => {
    console.log('Testing connection for:', dataSource?.name);
    // Mock test connection logic
  };

  const tabs = [
    { id: 'connection', label: 'Connection', icon: 'Settings' },
    { id: 'features', label: 'Features', icon: 'Layers' },
    { id: 'scanning', label: 'Scanning', icon: 'Search' },
    { id: 'advanced', label: 'Advanced', icon: 'Cog' }
  ];

  const availableFeatures = featureOptions?.[dataSource?.type] || [];

  if (!isOpen || !dataSource) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-300 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Configure Integration</h2>
            <p className="text-sm text-muted-foreground mt-1">{dataSource?.name}</p>
          </div>
          <Button variant="ghost" size="sm" iconName="X" onClick={onClose} />
        </div>

        <div className="flex h-[600px]">
          {/* Sidebar Tabs */}
          <div className="w-64 border-r border-border bg-muted/30">
            <nav className="p-4 space-y-2">
              {tabs?.map((tab) => (
                <button
                  key={tab?.id}
                  onClick={() => setActiveTab(tab?.id)}
                  className={`
                    w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${activeTab === tab?.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                >
                  <Icon name={tab?.icon} size={16} />
                  <span>{tab?.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {activeTab === 'connection' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-4">Connection Settings</h3>
                    <div className="space-y-4">
                      <Input
                        label="Integration Name"
                        value={formData?.name}
                        onChange={(e) => handleInputChange('name', e?.target?.value)}
                        required
                      />
                      <Input
                        label="Description"
                        value={formData?.description}
                        onChange={(e) => handleInputChange('description', e?.target?.value)}
                      />
                      <Input
                        label="Server URL"
                        value={formData?.serverUrl}
                        onChange={(e) => handleInputChange('serverUrl', e?.target?.value)}
                        required
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Username"
                          value={formData?.username}
                          onChange={(e) => handleInputChange('username', e?.target?.value)}
                        />
                        <Input
                          label="Password"
                          type="password"
                          placeholder="Enter new password"
                          value={formData?.password}
                          onChange={(e) => handleInputChange('password', e?.target?.value)}
                        />
                      </div>
                      <Input
                        label="API Key"
                        value={formData?.apiKey}
                        onChange={(e) => handleInputChange('apiKey', e?.target?.value)}
                        description="Leave unchanged to keep existing key"
                      />
                      <Select
                        label="Sync Frequency"
                        options={syncFrequencyOptions}
                        value={formData?.syncFrequency}
                        onChange={(value) => handleInputChange('syncFrequency', value)}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      iconName="Zap"
                      iconPosition="left"
                      onClick={handleTestConnection}
                    >
                      Test Connection
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'features' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-4">Scanning Features</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Select which data types to scan for PII and sensitive information.
                    </p>
                    <div className="space-y-3">
                      {availableFeatures?.map((feature) => (
                        <Checkbox
                          key={feature?.value}
                          label={feature?.label}
                          checked={formData?.enabledFeatures?.includes(feature?.value)}
                          onChange={() => handleFeatureToggle(feature?.value)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'scanning' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-4">Scanning Configuration</h3>
                    <div className="space-y-4">
                      <Select
                        label="Scan Depth"
                        description="Choose how thoroughly to scan the data"
                        options={scanDepthOptions}
                        value={formData?.scanSettings?.scanDepth}
                        onChange={(value) => handleScanSettingChange('scanDepth', value)}
                      />
                      
                      <Input
                        label="Exclude Patterns"
                        placeholder="Enter patterns to exclude (comma-separated)"
                        value={formData?.scanSettings?.excludePatterns}
                        onChange={(e) => handleScanSettingChange('excludePatterns', e?.target?.value)}
                        description="Use regex patterns to exclude specific content"
                      />

                      <div className="space-y-3">
                        <Checkbox
                          label="Include Archived Content"
                          description="Scan archived or deleted content if available"
                          checked={formData?.scanSettings?.includeArchived}
                          onChange={(e) => handleScanSettingChange('includeArchived', e?.target?.checked)}
                        />
                        
                        <Checkbox
                          label="Enable Custom Rules"
                          description="Apply organization-specific scanning rules"
                          checked={formData?.scanSettings?.customRules}
                          onChange={(e) => handleScanSettingChange('customRules', e?.target?.checked)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'advanced' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-4">Advanced Settings</h3>
                    <div className="space-y-4">
                      <div className="bg-muted/30 rounded-lg p-4">
                        <h4 className="font-medium text-foreground mb-2">Connection Status</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <span className={`font-medium ${
                              dataSource?.status === 'connected' ? 'text-success' : 'text-error'
                            }`}>
                              {dataSource?.status}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last Sync:</span>
                            <span className="font-medium text-foreground">
                              {dataSource?.lastSync ? new Date(dataSource.lastSync)?.toLocaleString() : 'Never'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Records Processed:</span>
                            <span className="font-medium text-foreground">
                              {dataSource?.recordCount?.toLocaleString() || '0'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <Icon name="AlertTriangle" size={20} className="text-warning mt-0.5" />
                          <div>
                            <h4 className="font-medium text-foreground mb-1">Danger Zone</h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              These actions cannot be undone. Please proceed with caution.
                            </p>
                            <div className="space-y-2">
                              <Button variant="outline" size="sm" iconName="RotateCcw">
                                Reset Configuration
                              </Button>
                              <Button variant="destructive" size="sm" iconName="Trash2">
                                Delete Integration
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} iconName="Save" iconPosition="left">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationModal;