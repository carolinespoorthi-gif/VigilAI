import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';

const FilterControls = ({ onFiltersChange, totalResults }) => {
  const [filters, setFilters] = useState({
    piiType: '',
    confidenceLevel: '',
    dataSource: '',
    dateRange: '',
    searchTerm: ''
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const piiTypeOptions = [
    { value: '', label: 'All PII Types' },
    { value: 'SSN', label: 'Social Security Number' },
    { value: 'Email', label: 'Email Address' },
    { value: 'Phone', label: 'Phone Number' },
    { value: 'Credit Card', label: 'Credit Card Number' },
    { value: 'Address', label: 'Physical Address' },
    { value: 'Name', label: 'Personal Name' }
  ];

  const confidenceLevelOptions = [
    { value: '', label: 'All Confidence Levels' },
    { value: 'high', label: 'High (90-100%)' },
    { value: 'medium', label: 'Medium (70-89%)' },
    { value: 'low', label: 'Low (0-69%)' }
  ];

  const dataSourceOptions = [
    { value: '', label: 'All Data Sources' },
    { value: 'slack', label: 'Slack Messages' },
    { value: 'jira', label: 'Jira Tickets' },
    { value: 'email', label: 'Email Communications' },
    { value: 'contracts', label: 'Contract Documents' },
    { value: 'code', label: 'Code Repositories' }
  ];

  const dateRangeOptions = [
    { value: '', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 days' },
    { value: 'month', label: 'Last 30 days' },
    { value: 'quarter', label: 'Last 90 days' }
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      piiType: '',
      confidenceLevel: '',
      dataSource: '',
      dateRange: '',
      searchTerm: ''
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters)?.some(value => value !== '');

  const exportResults = () => {
    console.log('Exporting filtered results...');
    // Implementation would handle CSV/PDF export
  };

  return (
    <div className="bg-card border border-border rounded-lg mb-6">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-foreground">Filter & Search</h3>
            <span className="text-sm text-muted-foreground">
              {totalResults?.toLocaleString()} results
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                Filters Active
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              iconName="Download"
              iconPosition="left"
              onClick={exportResults}
            >
              Export Results
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconName={isExpanded ? 'ChevronUp' : 'ChevronDown'}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'} Filters
            </Button>
          </div>
        </div>
      </div>
      <div className="p-4">
        {/* Search Bar - Always Visible */}
        <div className="mb-4">
          <Input
            type="search"
            placeholder="Search findings by context, location, or source..."
            value={filters?.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e?.target?.value)}
            className="w-full"
          />
        </div>

        {/* Advanced Filters - Collapsible */}
        {isExpanded && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                label="PII Type"
                options={piiTypeOptions}
                value={filters?.piiType}
                onChange={(value) => handleFilterChange('piiType', value)}
              />

              <Select
                label="Confidence Level"
                options={confidenceLevelOptions}
                value={filters?.confidenceLevel}
                onChange={(value) => handleFilterChange('confidenceLevel', value)}
              />

              <Select
                label="Data Source"
                options={dataSourceOptions}
                value={filters?.dataSource}
                onChange={(value) => handleFilterChange('dataSource', value)}
              />

              <Select
                label="Detection Date"
                options={dateRangeOptions}
                value={filters?.dateRange}
                onChange={(value) => handleFilterChange('dateRange', value)}
              />
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center space-x-4">
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="X"
                    iconPosition="left"
                    onClick={clearAllFilters}
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Icon name="Filter" size={16} />
                <span>
                  {Object.values(filters)?.filter(v => v !== '')?.length} active filters
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterControls;