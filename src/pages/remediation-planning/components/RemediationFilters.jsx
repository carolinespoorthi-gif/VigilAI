import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const RemediationFilters = ({ onFiltersChange }) => {
  const [filters, setFilters] = useState({
    status: '',
    riskLevel: '',
    dataSource: '',
    assignee: '',
    dateRange: '',
    searchQuery: ''
  });

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const riskLevelOptions = [
    { value: '', label: 'All Risk Levels' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

  const dataSourceOptions = [
    { value: '', label: 'All Data Sources' },
    { value: 'slack', label: 'Slack Messages' },
    { value: 'jira', label: 'Jira Tickets' },
    { value: 'email', label: 'Email Data' },
    { value: 'contracts', label: 'Contracts' },
    { value: 'code', label: 'Code Repositories' },
    { value: 'database', label: 'Database Records' }
  ];

  const assigneeOptions = [
    { value: '', label: 'All Assignees' },
    { value: 'sarah_mitchell', label: 'Sarah Mitchell' },
    { value: 'james_wilson', label: 'James Wilson' },
    { value: 'emily_chen', label: 'Emily Chen' },
    { value: 'michael_brown', label: 'Michael Brown' },
    { value: 'lisa_garcia', label: 'Lisa Garcia' },
    { value: 'unassigned', label: 'Unassigned' }
  ];

  const dateRangeOptions = [
    { value: '', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      status: '',
      riskLevel: '',
      dataSource: '',
      assignee: '',
      dateRange: '',
      searchQuery: ''
    };
    setFilters(clearedFilters);
    onFiltersChange?.(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters)?.some(value => value !== '');

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Filter Plans</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            iconName="X"
            iconPosition="left"
          >
            Clear All
          </Button>
        )}
      </div>
      {/* Search Bar */}
      <div className="mb-4">
        <Input
          type="search"
          placeholder="Search plans by name, description, or task..."
          value={filters?.searchQuery}
          onChange={(e) => handleFilterChange('searchQuery', e?.target?.value)}
          className="w-full"
        />
      </div>
      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Select
          label="Status"
          options={statusOptions}
          value={filters?.status}
          onChange={(value) => handleFilterChange('status', value)}
          placeholder="Select status"
        />

        <Select
          label="Risk Level"
          options={riskLevelOptions}
          value={filters?.riskLevel}
          onChange={(value) => handleFilterChange('riskLevel', value)}
          placeholder="Select risk level"
        />

        <Select
          label="Data Source"
          options={dataSourceOptions}
          value={filters?.dataSource}
          onChange={(value) => handleFilterChange('dataSource', value)}
          placeholder="Select data source"
        />

        <Select
          label="Assignee"
          options={assigneeOptions}
          value={filters?.assignee}
          onChange={(value) => handleFilterChange('assignee', value)}
          placeholder="Select assignee"
        />

        <Select
          label="Date Range"
          options={dateRangeOptions}
          value={filters?.dateRange}
          onChange={(value) => handleFilterChange('dateRange', value)}
          placeholder="Select date range"
        />
      </div>
      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Icon name="Filter" size={16} />
            <span>Active filters:</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(filters)?.map(([key, value]) => {
                if (!value) return null;
                
                let displayValue = value;
                if (key === 'status') displayValue = statusOptions?.find(opt => opt?.value === value)?.label || value;
                if (key === 'riskLevel') displayValue = riskLevelOptions?.find(opt => opt?.value === value)?.label || value;
                if (key === 'dataSource') displayValue = dataSourceOptions?.find(opt => opt?.value === value)?.label || value;
                if (key === 'assignee') displayValue = assigneeOptions?.find(opt => opt?.value === value)?.label || value;
                if (key === 'dateRange') displayValue = dateRangeOptions?.find(opt => opt?.value === value)?.label || value;

                return (
                  <span
                    key={key}
                    className="inline-flex items-center space-x-1 bg-accent/10 text-accent px-2 py-1 rounded-md text-xs"
                  >
                    <span>{displayValue}</span>
                    <button
                      onClick={() => handleFilterChange(key, '')}
                      className="hover:text-accent/80"
                    >
                      <Icon name="X" size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemediationFilters;