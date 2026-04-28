import React, { useState } from 'react';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';


const ReportGenerationPanel = ({ isOpen, onClose, onGenerate }) => {
  const [generationConfig, setGenerationConfig] = useState({
    reportType: 'gdpr',
    title: '',
    dateRange: {
      start: '',
      end: ''
    },
    dataSources: [],
    riskThreshold: 'medium',
    outputFormats: ['pdf'],
    includeCharts: true,
    includeRawData: false,
    includeRecommendations: true,
    scheduledGeneration: false,
    recipients: []
  });

  const reportTypeOptions = [
    { value: 'gdpr', label: 'GDPR Compliance Summary' },
    { value: 'pii', label: 'PII Detection Analytics' },
    { value: 'remediation', label: 'Remediation Progress Report' },
    { value: 'audit', label: 'Audit Trail Documentation' },
    { value: 'custom', label: 'Custom Report' }
  ];

  const dataSourceOptions = [
    { value: 'slack', label: 'Slack Messages' },
    { value: 'jira', label: 'Jira Tickets' },
    { value: 'contracts', label: 'Contracts' },
    { value: 'code', label: 'Code Repositories' },
    { value: 'email', label: 'Email Data' }
  ];

  const riskThresholdOptions = [
    { value: 'low', label: 'Low Risk and Above' },
    { value: 'medium', label: 'Medium Risk and Above' },
    { value: 'high', label: 'High Risk Only' },
    { value: 'critical', label: 'Critical Risk Only' }
  ];

  const outputFormatOptions = [
    { value: 'pdf', label: 'PDF Document' },
    { value: 'excel', label: 'Excel Spreadsheet' },
    { value: 'csv', label: 'CSV Data Export' },
    { value: 'json', label: 'JSON Data Export' }
  ];

  const handleConfigChange = (key, value) => {
    setGenerationConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleDateRangeChange = (field, value) => {
    setGenerationConfig(prev => ({
      ...prev,
      dateRange: {
        ...prev?.dateRange,
        [field]: value
      }
    }));
  };

  const handleDataSourceChange = (sourceId, checked) => {
    setGenerationConfig(prev => ({
      ...prev,
      dataSources: checked
        ? [...prev?.dataSources, sourceId]
        : prev?.dataSources?.filter(id => id !== sourceId)
    }));
  };

  const handleOutputFormatChange = (format, checked) => {
    setGenerationConfig(prev => ({
      ...prev,
      outputFormats: checked
        ? [...prev?.outputFormats, format]
        : prev?.outputFormats?.filter(f => f !== format)
    }));
  };

  const handleGenerate = () => {
    onGenerate(generationConfig);
    onClose();
  };

  const isConfigValid = () => {
    return generationConfig?.title?.trim() &&
           generationConfig?.dateRange?.start &&
           generationConfig?.dateRange?.end &&
           generationConfig?.dataSources?.length > 0 &&
           generationConfig?.outputFormats?.length > 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-300 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-card-foreground">Generate Custom Report</h2>
          <Button
            variant="ghost"
            size="sm"
            iconName="X"
            onClick={onClose}
          />
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Report Type"
              options={reportTypeOptions}
              value={generationConfig?.reportType}
              onChange={(value) => handleConfigChange('reportType', value)}
              required
            />

            <Input
              label="Report Title"
              type="text"
              placeholder="Enter report title"
              value={generationConfig?.title}
              onChange={(e) => handleConfigChange('title', e?.target?.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={generationConfig?.dateRange?.start}
              onChange={(e) => handleDateRangeChange('start', e?.target?.value)}
              required
            />

            <Input
              label="End Date"
              type="date"
              value={generationConfig?.dateRange?.end}
              onChange={(e) => handleDateRangeChange('end', e?.target?.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-3">
              Data Sources <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {dataSourceOptions?.map((source) => (
                <Checkbox
                  key={source?.value}
                  label={source?.label}
                  checked={generationConfig?.dataSources?.includes(source?.value)}
                  onChange={(e) => handleDataSourceChange(source?.value, e?.target?.checked)}
                />
              ))}
            </div>
          </div>

          <Select
            label="Risk Threshold"
            description="Include risks at or above this level"
            options={riskThresholdOptions}
            value={generationConfig?.riskThreshold}
            onChange={(value) => handleConfigChange('riskThreshold', value)}
          />

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-3">
              Output Formats <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {outputFormatOptions?.map((format) => (
                <Checkbox
                  key={format?.value}
                  label={format?.label}
                  checked={generationConfig?.outputFormats?.includes(format?.value)}
                  onChange={(e) => handleOutputFormatChange(format?.value, e?.target?.checked)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-card-foreground">
              Report Options
            </label>
            <div className="space-y-2">
              <Checkbox
                label="Include Charts and Visualizations"
                checked={generationConfig?.includeCharts}
                onChange={(e) => handleConfigChange('includeCharts', e?.target?.checked)}
              />
              <Checkbox
                label="Include Raw Data Tables"
                checked={generationConfig?.includeRawData}
                onChange={(e) => handleConfigChange('includeRawData', e?.target?.checked)}
              />
              <Checkbox
                label="Include Remediation Recommendations"
                checked={generationConfig?.includeRecommendations}
                onChange={(e) => handleConfigChange('includeRecommendations', e?.target?.checked)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Estimated generation time: 2-5 minutes
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              iconName="Play"
              iconPosition="left"
              onClick={handleGenerate}
              disabled={!isConfigValid()}
            >
              Generate Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerationPanel;