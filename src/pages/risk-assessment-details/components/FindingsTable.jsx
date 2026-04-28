import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const FindingsTable = ({ findings, onMarkFalsePositive, onApproveRemediation }) => {
  const [selectedFindings, setSelectedFindings] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: 'confidence', direction: 'desc' });

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedFindings(new Set(findings.map(f => f.id)));
    } else {
      setSelectedFindings(new Set());
    }
  };

  const handleSelectFinding = (findingId, checked) => {
    const newSelected = new Set(selectedFindings);
    if (checked) {
      newSelected?.add(findingId);
    } else {
      newSelected?.delete(findingId);
    }
    setSelectedFindings(newSelected);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig?.key === key && sortConfig?.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedFindings = [...findings]?.sort((a, b) => {
    if (sortConfig?.key === 'confidence') {
      return sortConfig?.direction === 'asc' ? a?.confidence - b?.confidence : b?.confidence - a?.confidence;
    }
    if (sortConfig?.key === 'detectedAt') {
      return sortConfig?.direction === 'asc' 
        ? new Date(a.detectedAt) - new Date(b.detectedAt)
        : new Date(b.detectedAt) - new Date(a.detectedAt);
    }
    const aValue = a?.[sortConfig?.key]?.toString()?.toLowerCase() || '';
    const bValue = b?.[sortConfig?.key]?.toString()?.toLowerCase() || '';
    return sortConfig?.direction === 'asc' 
      ? aValue?.localeCompare(bValue)
      : bValue?.localeCompare(aValue);
  });

  const getPiiTypeColor = (type) => {
    const colors = {
      'SSN': 'bg-error/10 text-error border-error/20',
      'Email': 'bg-warning/10 text-warning border-warning/20',
      'Phone': 'bg-accent/10 text-accent border-accent/20',
      'Credit Card': 'bg-error/10 text-error border-error/20',
      'Address': 'bg-warning/10 text-warning border-warning/20',
      'Name': 'bg-success/10 text-success border-success/20'
    };
    return colors?.[type] || 'bg-muted/50 text-muted-foreground border-border';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return 'text-success';
    if (confidence >= 70) return 'text-warning';
    return 'text-error';
  };

  const getSortIcon = (key) => {
    if (sortConfig?.key !== key) return 'ArrowUpDown';
    return sortConfig?.direction === 'asc' ? 'ArrowUp' : 'ArrowDown';
  };

  const handleBulkAction = (action) => {
    const selectedIds = Array.from(selectedFindings);
    if (action === 'false-positive') {
      selectedIds?.forEach(id => onMarkFalsePositive(id));
    } else if (action === 'approve') {
      selectedIds?.forEach(id => onApproveRemediation(id));
    }
    setSelectedFindings(new Set());
  };

  return (
    <div className="bg-card border border-border rounded-lg">
      {/* Table Header with Bulk Actions */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Detailed Findings</h3>
            <p className="text-sm text-muted-foreground">
              {findings?.length} PII instances detected • {selectedFindings?.size} selected
            </p>
          </div>
          {selectedFindings?.size > 0 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                iconName="X"
                iconPosition="left"
                onClick={() => handleBulkAction('false-positive')}
              >
                Mark False Positive
              </Button>
              <Button
                variant="default"
                size="sm"
                iconName="CheckCircle"
                iconPosition="left"
                onClick={() => handleBulkAction('approve')}
              >
                Approve Remediation
              </Button>
            </div>
          )}
        </div>
      </div>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              <th className="w-12 p-4">
                <input
                  type="checkbox"
                  checked={selectedFindings?.size === findings?.length && findings?.length > 0}
                  onChange={(e) => handleSelectAll(e?.target?.checked)}
                  className="rounded border-border"
                />
              </th>
              <th className="text-left p-4 font-medium text-foreground">
                <button
                  onClick={() => handleSort('piiType')}
                  className="flex items-center space-x-1 hover:text-accent transition-colors"
                >
                  <span>PII Type</span>
                  <Icon name={getSortIcon('piiType')} size={14} />
                </button>
              </th>
              <th className="text-left p-4 font-medium text-foreground">Context</th>
              <th className="text-left p-4 font-medium text-foreground">
                <button
                  onClick={() => handleSort('confidence')}
                  className="flex items-center space-x-1 hover:text-accent transition-colors"
                >
                  <span>Confidence</span>
                  <Icon name={getSortIcon('confidence')} size={14} />
                </button>
              </th>
              <th className="text-left p-4 font-medium text-foreground">
                <button
                  onClick={() => handleSort('source')}
                  className="flex items-center space-x-1 hover:text-accent transition-colors"
                >
                  <span>Source</span>
                  <Icon name={getSortIcon('source')} size={14} />
                </button>
              </th>
              <th className="text-left p-4 font-medium text-foreground">
                <button
                  onClick={() => handleSort('detectedAt')}
                  className="flex items-center space-x-1 hover:text-accent transition-colors"
                >
                  <span>Detected</span>
                  <Icon name={getSortIcon('detectedAt')} size={14} />
                </button>
              </th>
              <th className="text-right p-4 font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedFindings?.map((finding) => (
              <tr key={finding?.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={selectedFindings?.has(finding?.id)}
                    onChange={(e) => handleSelectFinding(finding?.id, e?.target?.checked)}
                    className="rounded border-border"
                  />
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPiiTypeColor(finding?.piiType)}`}>
                    {finding?.piiType}
                  </span>
                </td>
                <td className="p-4 max-w-md">
                  <div className="space-y-1">
                    <p className="text-sm text-foreground font-mono bg-muted/50 p-2 rounded">
                      {finding?.context}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Location: {finding?.location}
                    </p>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${getConfidenceColor(finding?.confidence)}`}>
                      {finding?.confidence}%
                    </span>
                    <div className="w-16 bg-border rounded-full h-1">
                      <div
                        className={`h-1 rounded-full ${
                          finding?.confidence >= 90 ? 'bg-success' :
                          finding?.confidence >= 70 ? 'bg-warning' : 'bg-error'
                        }`}
                        style={{ width: `${finding?.confidence}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    <Icon name={finding?.sourceIcon} size={16} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">{finding?.source}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-sm text-muted-foreground">
                    {new Date(finding.detectedAt)?.toLocaleDateString()}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      iconName="X"
                      onClick={() => onMarkFalsePositive(finding?.id)}
                      className="text-error hover:text-error hover:bg-error/10"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      iconName="CheckCircle"
                      onClick={() => onApproveRemediation(finding?.id)}
                      className="text-success hover:text-success hover:bg-success/10"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {findings?.length === 0 && (
        <div className="p-12 text-center">
          <Icon name="Search" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No findings match your criteria</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  );
};

export default FindingsTable;