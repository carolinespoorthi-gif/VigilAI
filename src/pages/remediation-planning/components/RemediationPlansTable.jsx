import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const RemediationPlansTable = ({ onPlanSelect, onBulkAction }) => {
  const [selectedPlans, setSelectedPlans] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  const remediationPlans = [
    {
      id: 'RP-2025-001',
      name: 'Slack PII Cleanup - Q4 2024',
      riskLevel: 'critical',
      dataSource: 'slack',
      progress: 85,
      assignee: {
        name: 'Sarah Mitchell',
        avatar: 'https://randomuser.me/api/portraits/women/32.jpg'
      },
      status: 'in_progress',
      targetDate: '2025-10-15',
      createdAt: '2025-09-15',
      tasksCompleted: 17,
      totalTasks: 20,
      estimatedHours: 45,
      actualHours: 38
    },
    {
      id: 'RP-2025-002',
      name: 'Email Archive Anonymization',
      riskLevel: 'high',
      dataSource: 'email',
      progress: 60,
      assignee: {
        name: 'James Wilson',
        avatar: 'https://randomuser.me/api/portraits/men/45.jpg'
      },
      status: 'in_progress',
      targetDate: '2025-10-20',
      createdAt: '2025-09-20',
      tasksCompleted: 12,
      totalTasks: 20,
      estimatedHours: 60,
      actualHours: 35
    },
    {
      id: 'RP-2025-003',
      name: 'Contract Database Remediation',
      riskLevel: 'medium',
      dataSource: 'contracts',
      progress: 100,
      assignee: {
        name: 'Emily Chen',
        avatar: 'https://randomuser.me/api/portraits/women/28.jpg'
      },
      status: 'completed',
      targetDate: '2025-09-30',
      createdAt: '2025-09-01',
      tasksCompleted: 15,
      totalTasks: 15,
      estimatedHours: 30,
      actualHours: 28
    },
    {
      id: 'RP-2025-004',
      name: 'Jira Ticket PII Removal',
      riskLevel: 'high',
      dataSource: 'jira',
      progress: 25,
      assignee: {
        name: 'Michael Brown',
        avatar: 'https://randomuser.me/api/portraits/men/35.jpg'
      },
      status: 'pending_approval',
      targetDate: '2025-11-01',
      createdAt: '2025-10-01',
      tasksCompleted: 5,
      totalTasks: 20,
      estimatedHours: 50,
      actualHours: 12
    },
    {
      id: 'RP-2025-005',
      name: 'Code Repository Scan Results',
      riskLevel: 'critical',
      dataSource: 'code',
      progress: 10,
      assignee: {
        name: 'Lisa Garcia',
        avatar: 'https://randomuser.me/api/portraits/women/42.jpg'
      },
      status: 'overdue',
      targetDate: '2025-10-05',
      createdAt: '2025-09-10',
      tasksCompleted: 2,
      totalTasks: 25,
      estimatedHours: 80,
      actualHours: 8
    },
    {
      id: 'RP-2025-006',
      name: 'Database Records Anonymization',
      riskLevel: 'medium',
      dataSource: 'database',
      progress: 45,
      assignee: {
        name: 'Sarah Mitchell',
        avatar: 'https://randomuser.me/api/portraits/women/32.jpg'
      },
      status: 'in_progress',
      targetDate: '2025-10-25',
      createdAt: '2025-09-25',
      tasksCompleted: 9,
      totalTasks: 20,
      estimatedHours: 40,
      actualHours: 18
    }
  ];

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-error text-error-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-accent text-accent-foreground';
      case 'low': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'in_progress': return 'bg-accent text-accent-foreground';
      case 'pending_approval': return 'bg-warning text-warning-foreground';
      case 'overdue': return 'bg-error text-error-foreground';
      case 'draft': return 'bg-muted text-muted-foreground';
      case 'cancelled': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getDataSourceIcon = (source) => {
    switch (source) {
      case 'slack': return 'MessageSquare';
      case 'email': return 'Mail';
      case 'jira': return 'Bug';
      case 'contracts': return 'FileText';
      case 'code': return 'Code';
      case 'database': return 'Database';
      default: return 'File';
    }
  };

  const formatStatus = (status) => {
    return status?.split('_')?.map(word => 
      word?.charAt(0)?.toUpperCase() + word?.slice(1)
    )?.join(' ');
  };

  const formatDate = (dateString) => {
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOverdue = (targetDate, status) => {
    return new Date(targetDate) < new Date() && status !== 'completed';
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedPlans(new Set(remediationPlans.map(plan => plan.id)));
    } else {
      setSelectedPlans(new Set());
    }
  };

  const handleSelectPlan = (planId, checked) => {
    const newSelected = new Set(selectedPlans);
    if (checked) {
      newSelected?.add(planId);
    } else {
      newSelected?.delete(planId);
    }
    setSelectedPlans(newSelected);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev?.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedPlans = [...remediationPlans]?.sort((a, b) => {
    const { key, direction } = sortConfig;
    let aValue = a?.[key];
    let bValue = b?.[key];

    if (key === 'assignee') {
      aValue = a?.assignee?.name;
      bValue = b?.assignee?.name;
    }

    if (typeof aValue === 'string') {
      return direction === 'asc' 
        ? aValue?.localeCompare(bValue)
        : bValue?.localeCompare(aValue);
    }

    return direction === 'asc' ? aValue - bValue : bValue - aValue;
  });

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Table Header with Bulk Actions */}
      {selectedPlans?.size > 0 && (
        <div className="bg-accent/10 border-b border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {selectedPlans?.size} plan{selectedPlans?.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkAction?.('approve', Array.from(selectedPlans))}
                iconName="Check"
                iconPosition="left"
              >
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkAction?.('reassign', Array.from(selectedPlans))}
                iconName="Users"
                iconPosition="left"
              >
                Reassign
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkAction?.('export', Array.from(selectedPlans))}
                iconName="Download"
                iconPosition="left"
              >
                Export
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="w-12 p-4">
                <input
                  type="checkbox"
                  checked={selectedPlans?.size === remediationPlans?.length}
                  onChange={(e) => handleSelectAll(e?.target?.checked)}
                  className="rounded border-border"
                />
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center space-x-1 text-sm font-medium text-foreground hover:text-accent"
                >
                  <span>Plan Name</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('riskLevel')}
                  className="flex items-center space-x-1 text-sm font-medium text-foreground hover:text-accent"
                >
                  <span>Risk Level</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left p-4">Data Source</th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('progress')}
                  className="flex items-center space-x-1 text-sm font-medium text-foreground hover:text-accent"
                >
                  <span>Progress</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('assignee')}
                  className="flex items-center space-x-1 text-sm font-medium text-foreground hover:text-accent"
                >
                  <span>Assignee</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center space-x-1 text-sm font-medium text-foreground hover:text-accent"
                >
                  <span>Status</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('targetDate')}
                  className="flex items-center space-x-1 text-sm font-medium text-foreground hover:text-accent"
                >
                  <span>Target Date</span>
                  <Icon name="ArrowUpDown" size={14} />
                </button>
              </th>
              <th className="w-24 p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlans?.map((plan) => (
              <tr
                key={plan?.id}
                className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => onPlanSelect?.(plan)}
              >
                <td className="p-4" onClick={(e) => e?.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedPlans?.has(plan?.id)}
                    onChange={(e) => handleSelectPlan(plan?.id, e?.target?.checked)}
                    className="rounded border-border"
                  />
                </td>
                <td className="p-4">
                  <div>
                    <div className="font-medium text-foreground">{plan?.name}</div>
                    <div className="text-sm text-muted-foreground">{plan?.id}</div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(plan?.riskLevel)}`}>
                    {plan?.riskLevel?.charAt(0)?.toUpperCase() + plan?.riskLevel?.slice(1)}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    <Icon name={getDataSourceIcon(plan?.dataSource)} size={16} className="text-muted-foreground" />
                    <span className="text-sm text-foreground capitalize">
                      {plan?.dataSource === 'jira' ? 'Jira' : plan?.dataSource}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{plan?.progress}%</span>
                      <span className="text-muted-foreground">
                        {plan?.tasksCompleted}/{plan?.totalTasks}
                      </span>
                    </div>
                    <div className="w-full bg-border rounded-full h-2">
                      <div 
                        className="bg-accent h-2 rounded-full transition-all duration-300"
                        style={{ width: `${plan?.progress}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    <img
                      src={plan?.assignee?.avatar}
                      alt={plan?.assignee?.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="text-sm text-foreground">{plan?.assignee?.name}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(plan?.status)}`}>
                    {formatStatus(plan?.status)}
                  </span>
                </td>
                <td className="p-4">
                  <div className="text-sm">
                    <div className={`font-medium ${isOverdue(plan?.targetDate, plan?.status) ? 'text-error' : 'text-foreground'}`}>
                      {formatDate(plan?.targetDate)}
                    </div>
                    {isOverdue(plan?.targetDate, plan?.status) && (
                      <div className="text-xs text-error">Overdue</div>
                    )}
                  </div>
                </td>
                <td className="p-4" onClick={(e) => e?.stopPropagation()}>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onPlanSelect?.(plan)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title="View Details"
                    >
                      <Icon name="Eye" size={16} className="text-muted-foreground" />
                    </button>
                    <button
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title="Edit Plan"
                    >
                      <Icon name="Edit" size={16} className="text-muted-foreground" />
                    </button>
                    <button
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title="More Options"
                    >
                      <Icon name="MoreHorizontal" size={16} className="text-muted-foreground" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Table Footer */}
      <div className="bg-muted/30 border-t border-border p-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {sortedPlans?.length} of {sortedPlans?.length} plans</span>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1 border border-border rounded hover:bg-muted transition-colors">
              Previous
            </button>
            <span className="px-3 py-1">1 of 1</span>
            <button className="px-3 py-1 border border-border rounded hover:bg-muted transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemediationPlansTable;