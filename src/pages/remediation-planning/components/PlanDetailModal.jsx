import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const PlanDetailModal = ({ isOpen, onClose, plan }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen || !plan) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'FileText' },
    { id: 'tasks', label: 'Tasks', icon: 'CheckSquare' },
    { id: 'timeline', label: 'Timeline', icon: 'Calendar' },
    { id: 'resources', label: 'Resources', icon: 'Users' },
    { id: 'approval', label: 'Approval', icon: 'Shield' }
  ];

  const mockTasks = [
    {
      id: 1,
      title: 'Identify PII patterns in Slack messages',
      description: 'Scan historical messages for SSN, credit card numbers, and personal identifiers',
      status: 'completed',
      assignee: 'Sarah Mitchell',
      estimatedHours: 8,
      actualHours: 7,
      dueDate: '2025-10-08',
      completedDate: '2025-10-07'
    },
    {
      id: 2,
      title: 'Implement data anonymization rules',
      description: 'Create automated rules to replace sensitive data with anonymized tokens',
      status: 'in_progress',
      assignee: 'James Wilson',
      estimatedHours: 12,
      actualHours: 8,
      dueDate: '2025-10-12',
      completedDate: null
    },
    {
      id: 3,
      title: 'Update access controls',
      description: 'Review and modify permissions for sensitive data access',
      status: 'pending',
      assignee: 'Emily Chen',
      estimatedHours: 6,
      actualHours: 0,
      dueDate: '2025-10-15',
      completedDate: null
    }
  ];

  const mockTimeline = [
    {
      date: '2025-09-15',
      event: 'Plan Created',
      description: 'Remediation plan initiated by Sarah Mitchell',
      type: 'created'
    },
    {
      date: '2025-09-16',
      event: 'Plan Approved',
      description: 'Approved by compliance team for execution',
      type: 'approved'
    },
    {
      date: '2025-09-20',
      event: 'Task Assignment',
      description: 'Tasks distributed to team members',
      type: 'assigned'
    },
    {
      date: '2025-10-07',
      event: 'Task Completed',
      description: 'PII pattern identification completed',
      type: 'completed'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'in_progress': return 'bg-accent text-accent-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'overdue': return 'bg-error text-error-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-error text-error-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-accent text-accent-foreground';
      case 'low': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-300 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">{plan?.name}</h2>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-sm text-muted-foreground">{plan?.id}</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(plan?.riskLevel)}`}>
                  {plan?.riskLevel?.charAt(0)?.toUpperCase() + plan?.riskLevel?.slice(1)} Risk
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(plan?.status)}`}>
                  {plan?.status?.split('_')?.map(word => word?.charAt(0)?.toUpperCase() + word?.slice(1))?.join(' ')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" iconName="Edit" iconPosition="left">
              Edit Plan
            </Button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-md transition-colors"
            >
              <Icon name="X" size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex space-x-8 px-6">
            {tabs?.map((tab) => (
              <button
                key={tab?.id}
                onClick={() => setActiveTab(tab?.id)}
                className={`
                  flex items-center space-x-2 py-4 border-b-2 text-sm font-medium transition-colors
                  ${activeTab === tab?.id
                    ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
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
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-foreground">{plan?.progress}%</div>
                  <div className="text-sm text-muted-foreground">Progress</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-foreground">{plan?.tasksCompleted}/{plan?.totalTasks}</div>
                  <div className="text-sm text-muted-foreground">Tasks</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-foreground">{plan?.actualHours}h</div>
                  <div className="text-sm text-muted-foreground">Hours Spent</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-foreground">{formatDate(plan?.targetDate)}</div>
                  <div className="text-sm text-muted-foreground">Target Date</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Overall Progress</span>
                  <span className="text-sm text-muted-foreground">{plan?.progress}%</span>
                </div>
                <div className="w-full bg-border rounded-full h-3">
                  <div 
                    className="bg-accent h-3 rounded-full transition-all duration-300"
                    style={{ width: `${plan?.progress}%` }}
                  />
                </div>
              </div>

              {/* Plan Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">Plan Information</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data Source:</span>
                      <span className="text-foreground capitalize">{plan?.dataSource}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="text-foreground">{formatDate(plan?.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estimated Hours:</span>
                      <span className="text-foreground">{plan?.estimatedHours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Actual Hours:</span>
                      <span className="text-foreground">{plan?.actualHours}h</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">Assignment</h4>
                  <div className="flex items-center space-x-3">
                    <img
                      src={plan?.assignee?.avatar}
                      alt={plan?.assignee?.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <div className="font-medium text-foreground">{plan?.assignee?.name}</div>
                      <div className="text-sm text-muted-foreground">Primary Assignee</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-foreground">Remediation Tasks</h4>
                <Button variant="outline" size="sm" iconName="Plus" iconPosition="left">
                  Add Task
                </Button>
              </div>

              <div className="space-y-3">
                {mockTasks?.map((task) => (
                  <div key={task?.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h5 className="font-medium text-foreground mb-1">{task?.title}</h5>
                        <p className="text-sm text-muted-foreground">{task?.description}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task?.status)}`}>
                        {task?.status?.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Assignee:</span>
                        <div className="font-medium text-foreground">{task?.assignee}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Due Date:</span>
                        <div className="font-medium text-foreground">{formatDate(task?.dueDate)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Hours:</span>
                        <div className="font-medium text-foreground">{task?.actualHours}/{task?.estimatedHours}h</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Progress:</span>
                        <div className="font-medium text-foreground">
                          {task?.status === 'completed' ? '100%' : 
                           task?.status === 'in_progress' ? '65%' : '0%'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Plan Timeline</h4>
              
              <div className="space-y-4">
                {mockTimeline?.map((event, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className={`
                      w-3 h-3 rounded-full mt-2 flex-shrink-0
                      ${event?.type === 'completed' ? 'bg-success' :
                        event?.type === 'approved' ? 'bg-accent' :
                        event?.type === 'created'? 'bg-primary' : 'bg-warning'}
                    `} />
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-medium text-foreground">{event?.event}</h5>
                        <span className="text-sm text-muted-foreground">{formatDate(event?.date)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{event?.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-6">
              <h4 className="font-medium text-foreground">Resource Allocation</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h5 className="font-medium text-foreground">Team Members</h5>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <img
                          src="https://randomuser.me/api/portraits/women/32.jpg"
                          alt="Sarah Mitchell"
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <div className="font-medium text-foreground">Sarah Mitchell</div>
                          <div className="text-sm text-muted-foreground">Lead</div>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">38h allocated</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <img
                          src="https://randomuser.me/api/portraits/men/45.jpg"
                          alt="James Wilson"
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <div className="font-medium text-foreground">James Wilson</div>
                          <div className="text-sm text-muted-foreground">Developer</div>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">12h allocated</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="font-medium text-foreground">Resource Summary</h5>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Budget:</span>
                      <span className="text-foreground">$12,500</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Spent:</span>
                      <span className="text-foreground">$8,750</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Remaining:</span>
                      <span className="text-foreground">$3,750</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'approval' && (
            <div className="space-y-6">
              <h4 className="font-medium text-foreground">Approval Workflow</h4>
              
              <div className="space-y-4">
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-foreground">Compliance Review</h5>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success text-success-foreground">
                      Approved
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Plan reviewed and approved by compliance team for regulatory adherence.
                  </p>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-muted-foreground">Approved by:</span>
                    <span className="font-medium text-foreground">Michael Rodriguez</span>
                    <span className="text-muted-foreground">on {formatDate('2025-09-16')}</span>
                  </div>
                </div>

                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-foreground">Security Review</h5>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success text-success-foreground">
                      Approved
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Security implications assessed and mitigation strategies approved.
                  </p>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-muted-foreground">Approved by:</span>
                    <span className="font-medium text-foreground">Lisa Garcia</span>
                    <span className="text-muted-foreground">on {formatDate('2025-09-16')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Last updated: {formatDate(plan?.createdAt)}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" iconName="Download" iconPosition="left">
              Export Plan
            </Button>
            <Button variant="outline" iconName="Share" iconPosition="left">
              Share
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanDetailModal;