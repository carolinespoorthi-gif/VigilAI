import React from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';

const FilterControls = ({ 
  searchTerm, 
  onSearchChange, 
  selectedType, 
  onTypeChange, 
  selectedStatus, 
  onStatusChange, 
  selectedHealth, 
  onHealthChange,
  onClearFilters,
  onRefresh
}) => {
  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'slack', label: 'Slack' },
    { value: 'jira', label: 'Jira' },
    { value: 'email', label: 'Email' },
    { value: 'github', label: 'GitHub' },
    { value: 'gitlab', label: 'GitLab' },
    { value: 'salesforce', label: 'Salesforce' },
    { value: 'confluence', label: 'Confluence' },
    { value: 'sharepoint', label: 'SharePoint' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'connected', label: 'Connected' },
    { value: 'disconnected', label: 'Disconnected' },
    { value: 'error', label: 'Error' },
    { value: 'warning', label: 'Warning' }
  ];

  const healthOptions = [
    { value: 'all', label: 'All Health' },
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'warning', label: 'Warning' },
    { value: 'critical', label: 'Critical' }
  ];

  const hasActiveFilters = selectedType !== 'all' || selectedStatus !== 'all' || selectedHealth !== 'all' || searchTerm?.length > 0;

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Filter & Search</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            iconName="RotateCcw"
            iconPosition="left"
            onClick={onRefresh}
          >
            Refresh
          </Button>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              iconName="X"
              iconPosition="left"
              onClick={onClearFilters}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="lg:col-span-1">
          <Input
            type="search"
            placeholder="Search data sources..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e?.target?.value)}
            className="w-full"
          />
        </div>

        {/* Type Filter */}
        <div>
          <Select
            placeholder="Filter by type"
            options={typeOptions}
            value={selectedType}
            onChange={onTypeChange}
          />
        </div>

        {/* Status Filter */}
        <div>
          <Select
            placeholder="Filter by status"
            options={statusOptions}
            value={selectedStatus}
            onChange={onStatusChange}
          />
        </div>

        {/* Health Filter */}
        <div>
          <Select
            placeholder="Filter by health"
            options={healthOptions}
            value={selectedHealth}
            onChange={onHealthChange}
          />
        </div>
      </div>
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center space-x-2">
            <Icon name="Filter" size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Active filters:</span>
            <div className="flex items-center space-x-2">
              {searchTerm && (
                <span className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full">
                  Search: "{searchTerm}"
                </span>
              )}
              {selectedType !== 'all' && (
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                  Type: {typeOptions?.find(opt => opt?.value === selectedType)?.label}
                </span>
              )}
              {selectedStatus !== 'all' && (
                <span className="px-2 py-1 bg-secondary/10 text-secondary text-xs rounded-full">
                  Status: {statusOptions?.find(opt => opt?.value === selectedStatus)?.label}
                </span>
              )}
              {selectedHealth !== 'all' && (
                <span className="px-2 py-1 bg-warning/10 text-warning text-xs rounded-full">
                  Health: {healthOptions?.find(opt => opt?.value === selectedHealth)?.label}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterControls;