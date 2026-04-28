import React from 'react';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const ReportFilters = ({ 
  filters, 
  onFiltersChange, 
  onClearFilters, 
  onSaveFilters,
  savedFilters 
}) => {
  const reportTypeOptions = [
    { value: 'all', label: 'All Report Types' },
    { value: 'gdpr', label: 'GDPR Compliance' },
    { value: 'pii', label: 'PII Detection Analytics' },
    { value: 'remediation', label: 'Remediation Progress' },
    { value: 'audit', label: 'Audit Trail' },
    { value: 'custom', label: 'Custom Reports' }
  ];

  const complianceFrameworkOptions = [
    { value: 'all', label: 'All Frameworks' },
    { value: 'gdpr', label: 'GDPR' },
    { value: 'ccpa', label: 'CCPA' },
    { value: 'hipaa', label: 'HIPAA' },
    { value: 'sox', label: 'SOX' },
    { value: 'pci', label: 'PCI DSS' }
  ];

  const dataSourceOptions = [
    { value: 'all', label: 'All Data Sources' },
    { value: 'slack', label: 'Slack Messages' },
    { value: 'jira', label: 'Jira Tickets' },
    { value: 'contracts', label: 'Contracts' },
    { value: 'code', label: 'Code Repositories' },
    { value: 'email', label: 'Email Data' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'ready', label: 'Ready to Download' },
    { value: 'generating', label: 'Generating' },
    { value: 'template', label: 'Templates' },
    { value: 'scheduled', label: 'Scheduled' }
  ];

  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleDateRangeChange = (field, value) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters?.dateRange,
        [field]: value
      }
    });
  };

  const hasActiveFilters = () => {
    return filters?.search || 
           filters?.type !== 'all' || 
           filters?.framework !== 'all' || 
           filters?.dataSource !== 'all' || 
           filters?.status !== 'all' ||
           filters?.dateRange?.start ||
           filters?.dateRange?.end;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-card-foreground">Filter Reports</h3>
        <div className="flex items-center space-x-2">
          {savedFilters?.length > 0 && (
            <Select
              placeholder="Load saved filter"
              options={savedFilters?.map(filter => ({
                value: filter?.id,
                label: filter?.name
              }))}
              value=""
              onChange={(value) => {
                const savedFilter = savedFilters?.find(f => f?.id === value);
                if (savedFilter) {
                  onFiltersChange(savedFilter?.filters);
                }
              }}
              className="w-48"
            />
          )}
          <Button
            variant="outline"
            size="sm"
            iconName="Save"
            iconPosition="left"
            onClick={onSaveFilters}
            disabled={!hasActiveFilters()}
          >
            Save Filter
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
        <Input
          type="search"
          placeholder="Search reports..."
          value={filters?.search}
          onChange={(e) => handleFilterChange('search', e?.target?.value)}
          className="col-span-full md:col-span-2"
        />

        <Select
          label="Report Type"
          options={reportTypeOptions}
          value={filters?.type}
          onChange={(value) => handleFilterChange('type', value)}
        />

        <Select
          label="Compliance Framework"
          options={complianceFrameworkOptions}
          value={filters?.framework}
          onChange={(value) => handleFilterChange('framework', value)}
        />

        <Select
          label="Data Source"
          options={dataSourceOptions}
          value={filters?.dataSource}
          onChange={(value) => handleFilterChange('dataSource', value)}
        />

        <Select
          label="Status"
          options={statusOptions}
          value={filters?.status}
          onChange={(value) => handleFilterChange('status', value)}
        />

        <Input
          type="date"
          label="Start Date"
          value={filters?.dateRange?.start}
          onChange={(e) => handleDateRangeChange('start', e?.target?.value)}
        />

        <Input
          type="date"
          label="End Date"
          value={filters?.dateRange?.end}
          onChange={(e) => handleDateRangeChange('end', e?.target?.value)}
        />
      </div>
      {hasActiveFilters() && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Icon name="Filter" size={16} />
            <span>Active filters applied</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName="X"
            iconPosition="left"
            onClick={onClearFilters}
          >
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReportFilters;