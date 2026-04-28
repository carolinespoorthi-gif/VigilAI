import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const AddIntegrationModal = ({ isOpen, onClose, onAdd }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    type: '',
    name: '',
    description: '',
    serverUrl: '',
    username: '',
    password: '',
    apiKey: '',
    syncFrequency: 'hourly',
    enabledFeatures: []
  });

  const integrationTypes = [
    { value: 'slack', label: 'Slack', description: 'Connect to Slack workspace for message scanning' },
    { value: 'jira', label: 'Jira', description: 'Integrate with Jira for ticket and comment analysis' },
    { value: 'email', label: 'Email Server', description: 'Connect to email server for message scanning' },
    { value: 'github', label: 'GitHub', description: 'Scan GitHub repositories for sensitive data' },
    { value: 'gitlab', label: 'GitLab', description: 'Integrate with GitLab for code repository scanning' },
    { value: 'salesforce', label: 'Salesforce', description: 'Connect to Salesforce for CRM data analysis' },
    { value: 'confluence', label: 'Confluence', description: 'Scan Confluence pages and documents' },
    { value: 'sharepoint', label: 'SharePoint', description: 'Integrate with SharePoint for document scanning' }
  ];

  const syncFrequencyOptions = [
    { value: 'realtime', label: 'Real-time' },
    { value: 'hourly', label: 'Every Hour' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' }
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
    ],
    gitlab: [
      { value: 'code', label: 'Source Code' },
      { value: 'commits', label: 'Commit Messages' },
      { value: 'issues', label: 'Issues & MRs' }
    ],
    salesforce: [
      { value: 'records', label: 'Record Data' },
      { value: 'notes', label: 'Notes & Comments' },
      { value: 'attachments', label: 'Attachments' }
    ],
    confluence: [
      { value: 'pages', label: 'Page Content' },
      { value: 'comments', label: 'Comments' },
      { value: 'attachments', label: 'Attachments' }
    ],
    sharepoint: [
      { value: 'documents', label: 'Documents' },
      { value: 'lists', label: 'Lists & Libraries' },
      { value: 'metadata', label: 'Metadata' }
    ]
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
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

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    onAdd(formData);
    handleClose();
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData({
      type: '',
      name: '',
      description: '',
      serverUrl: '',
      username: '',
      password: '',
      apiKey: '',
      syncFrequency: 'hourly',
      enabledFeatures: []
    });
    onClose();
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData?.type && formData?.name;
      case 2:
        return formData?.serverUrl && (formData?.username || formData?.apiKey);
      case 3:
        return formData?.enabledFeatures?.length > 0;
      default:
        return false;
    }
  };

  const selectedType = integrationTypes?.find(type => type?.value === formData?.type);
  const availableFeatures = featureOptions?.[formData?.type] || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-300 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Add New Integration</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Step {currentStep} of 3: {
                currentStep === 1 ? 'Select Integration Type' :
                currentStep === 2 ? 'Configure Connection': 'Enable Features'
              }
            </p>
          </div>
          <Button variant="ghost" size="sm" iconName="X" onClick={handleClose} />
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center space-x-4">
            {[1, 2, 3]?.map((step) => (
              <div key={step} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                `}>
                  {step < currentStep ? <Icon name="Check" size={16} /> : step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-0.5 ${step < currentStep ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4">Choose Integration Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {integrationTypes?.map((type) => (
                    <button
                      key={type?.value}
                      onClick={() => handleInputChange('type', type?.value)}
                      className={`
                        p-4 border rounded-lg text-left transition-colors duration-200
                        ${formData?.type === type?.value 
                          ? 'border-primary bg-primary/5' :'border-border hover:border-primary/50'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <Icon name="Database" size={20} className="text-primary" />
                        <span className="font-medium text-foreground">{type?.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{type?.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {formData?.type && (
                <div className="space-y-4">
                  <Input
                    label="Integration Name"
                    placeholder="Enter a name for this integration"
                    value={formData?.name}
                    onChange={(e) => handleInputChange('name', e?.target?.value)}
                    required
                  />
                  <Input
                    label="Description"
                    placeholder="Brief description of this integration"
                    value={formData?.description}
                    onChange={(e) => handleInputChange('description', e?.target?.value)}
                  />
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4">
                  Configure {selectedType?.label} Connection
                </h3>
                <div className="space-y-4">
                  <Input
                    label="Server URL"
                    placeholder={`Enter ${selectedType?.label} server URL`}
                    value={formData?.serverUrl}
                    onChange={(e) => handleInputChange('serverUrl', e?.target?.value)}
                    required
                  />
                  
                  {formData?.type !== 'github' && formData?.type !== 'gitlab' && (
                    <>
                      <Input
                        label="Username"
                        placeholder="Enter username"
                        value={formData?.username}
                        onChange={(e) => handleInputChange('username', e?.target?.value)}
                      />
                      <Input
                        label="Password"
                        type="password"
                        placeholder="Enter password"
                        value={formData?.password}
                        onChange={(e) => handleInputChange('password', e?.target?.value)}
                      />
                    </>
                  )}
                  
                  <Input
                    label="API Key"
                    placeholder="Enter API key or token"
                    value={formData?.apiKey}
                    onChange={(e) => handleInputChange('apiKey', e?.target?.value)}
                    description="Required for authentication"
                  />
                  
                  <Select
                    label="Sync Frequency"
                    options={syncFrequencyOptions}
                    value={formData?.syncFrequency}
                    onChange={(value) => handleInputChange('syncFrequency', value)}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4">
                  Enable Scanning Features
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Select which data types to scan for PII and sensitive information.
                </p>
                <div className="space-y-3">
                  {availableFeatures?.map((feature) => (
                    <label
                      key={feature?.value}
                      className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-muted/30 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData?.enabledFeatures?.includes(feature?.value)}
                        onChange={() => handleFeatureToggle(feature?.value)}
                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                      />
                      <div>
                        <span className="font-medium text-foreground">{feature?.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            iconName="ChevronLeft"
            iconPosition="left"
          >
            Previous
          </Button>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                disabled={!isStepValid()}
                iconName="ChevronRight"
                iconPosition="right"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!isStepValid()}
                iconName="Plus"
                iconPosition="left"
              >
                Add Integration
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddIntegrationModal;