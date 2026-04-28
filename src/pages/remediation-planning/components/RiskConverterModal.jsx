import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';

const RiskConverterModal = ({ isOpen, onClose, onConvertRisks }) => {
  const [selectedRisks, setSelectedRisks] = useState([]);
  const [conversionOptions, setConversionOptions] = useState({
    assignee: '',
    targetDate: '',
    priority: 'medium',
    includeAIRecommendations: true,
    autoAssignTasks: true,
    generateTimeline: true,
    notifyAssignee: true,
    createMilestones: true
  });
  const [isConverting, setIsConverting] = useState(false);
  const [conversionResults, setConversionResults] = useState(null);

  // Mock risks data - in real app, this would come from props or API
  const [availableRisks] = useState([
    {
      id: 'RISK-001',
      title: 'Unencrypted PII in customer database',
      severity: 'critical',
      category: 'Data Protection',
      description: 'Customer database contains unencrypted personally identifiable information including SSNs and credit card numbers.',
      affectedSystems: 5,
      estimatedImpact: 'High',
      complianceFrameworks: ['GDPR', 'CCPA', 'PCI DSS'],
      discoveredDate: '2025-01-15',
      dataSource: 'Security Audit'
    },
    {
      id: 'RISK-002',
      title: 'Inadequate access controls on file shares',
      severity: 'high',
      category: 'Access Control',
      description: 'File shares containing sensitive documents lack proper access restrictions and monitoring.',
      affectedSystems: 3,
      estimatedImpact: 'Medium',
      complianceFrameworks: ['SOX', 'HIPAA'],
      discoveredDate: '2025-01-14',
      dataSource: 'Compliance Scan'
    },
    {
      id: 'RISK-003',
      title: 'Missing data retention policies',
      severity: 'medium',
      category: 'Compliance',
      description: 'Organization lacks comprehensive data retention policies for customer and employee records.',
      affectedSystems: 8,
      estimatedImpact: 'Medium',
      complianceFrameworks: ['GDPR', 'SOX'],
      discoveredDate: '2025-01-13',
      dataSource: 'Policy Review'
    },
    {
      id: 'RISK-004',
      title: 'Weak password requirements',
      severity: 'medium',
      category: 'Authentication',
      description: 'Current password policies do not meet industry standards for complexity and rotation.',
      affectedSystems: 12,
      estimatedImpact: 'Medium',
      complianceFrameworks: ['ISO 27001', 'NIST'],
      discoveredDate: '2025-01-12',
      dataSource: 'Security Assessment'
    },
    {
      id: 'RISK-005',
      title: 'Unmonitored data transfers',
      severity: 'high',
      category: 'Data Protection',
      description: 'Data transfers to third-party vendors lack encryption and monitoring mechanisms.',
      affectedSystems: 2,
      estimatedImpact: 'High',
      complianceFrameworks: ['GDPR', 'CCPA'],
      discoveredDate: '2025-01-11',
      dataSource: 'Data Flow Analysis'
    },
    {
      id: 'RISK-006',
      title: 'Insufficient audit trails',
      severity: 'medium',
      category: 'Monitoring',
      description: 'Critical systems lack comprehensive audit logging for compliance requirements.',
      affectedSystems: 6,
      estimatedImpact: 'Low',
      complianceFrameworks: ['SOX', 'PCI DSS'],
      discoveredDate: '2025-01-10',
      dataSource: 'Audit Review'
    }
  ]);

  const assigneeOptions = [
    { value: 'sarah_mitchell', label: 'Sarah Mitchell - Compliance Lead' },
    { value: 'james_wilson', label: 'James Wilson - Security Analyst' },
    { value: 'emily_chen', label: 'Emily Chen - Risk Manager' },
    { value: 'michael_brown', label: 'Michael Brown - Data Protection Officer' },
    { value: 'lisa_garcia', label: 'Lisa Garcia - IT Security Manager' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'high', label: 'High Priority' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleRiskToggle = (riskId, selected) => {
    if (selected) {
      setSelectedRisks(prev => [...prev, riskId]);
    } else {
      setSelectedRisks(prev => prev?.filter(id => id !== riskId));
    }
  };

  const handleSelectAll = () => {
    if (selectedRisks?.length === availableRisks?.length) {
      setSelectedRisks([]);
    } else {
      setSelectedRisks(availableRisks?.map(risk => risk?.id));
    }
  };

  const handleOptionChange = (field, value) => {
    setConversionOptions(prev => ({ ...prev, [field]: value }));
  };

  const generateRemediationPlan = (risk) => {
    const baseActions = {
      'Data Protection': [
        'Conduct data inventory and classification',
        'Implement encryption for sensitive data',
        'Establish data access controls',
        'Create data handling procedures',
        'Implement data loss prevention (DLP)',
        'Set up monitoring and alerting'
      ],
      'Access Control': [
        'Review current access permissions',
        'Implement role-based access control (RBAC)',
        'Set up privileged access management (PAM)',
        'Enable multi-factor authentication',
        'Conduct access certification',
        'Monitor access patterns'
      ],
      'Compliance': [
        'Review regulatory requirements',
        'Develop compliance policies',
        'Implement compliance controls',
        'Train staff on requirements',
        'Set up compliance monitoring',
        'Prepare for audits'
      ],
      'Authentication': [
        'Review password policies',
        'Implement strong authentication',
        'Deploy password management tools',
        'Enable account monitoring',
        'Set up privileged account controls',
        'Conduct security awareness training'
      ],
      'Monitoring': [
        'Implement logging infrastructure',
        'Set up security monitoring',
        'Create alerting mechanisms',
        'Establish incident response',
        'Deploy audit trail systems',
        'Configure compliance reporting'
      ]
    };

    const actions = baseActions?.[risk?.category] || baseActions?.['Compliance'];
    const selectedActions = actions?.slice(0, Math.floor(Math.random() * 3) + 3);

    const priorityMapping = {
      'critical': 'urgent',
      'high': 'high',
      'medium': 'medium',
      'low': 'low'
    };

    const hoursMapping = {
      'critical': { min: 40, max: 80 },
      'high': { min: 20, max: 40 },
      'medium': { min: 10, max: 20 },
      'low': { min: 5, max: 10 }
    };

    const hours = hoursMapping?.[risk?.severity];
    const estimatedHours = Math.floor(Math.random() * (hours?.max - hours?.min + 1)) + hours?.min;

    return {
      id: `RP-${risk?.id}-${Date.now()}`,
      riskId: risk?.id,
      title: `Remediation Plan: ${risk?.title}`,
      description: `Comprehensive remediation plan to address ${risk?.category?.toLowerCase()} risk: ${risk?.title}`,
      priority: priorityMapping?.[risk?.severity] || conversionOptions?.priority,
      severity: risk?.severity,
      category: risk?.category,
      assignee: conversionOptions?.assignee,
      targetDate: conversionOptions?.targetDate,
      estimatedHours,
      actions: selectedActions,
      complianceFrameworks: risk?.complianceFrameworks || [],
      affectedSystems: risk?.affectedSystems,
      status: 'draft',
      progress: 0,
      createdAt: new Date()?.toISOString(),
      milestones: conversionOptions?.createMilestones ? [
        { name: 'Planning Complete', targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)?.toISOString()?.split('T')?.[0] },
        { name: 'Implementation 50%', targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)?.toISOString()?.split('T')?.[0] },
        { name: 'Testing Complete', targetDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)?.toISOString()?.split('T')?.[0] },
        { name: 'Final Review', targetDate: conversionOptions?.targetDate }
      ] : []
    };
  };

  const handleConvertRisks = async () => {
    if (selectedRisks?.length === 0) return;

    setIsConverting(true);

    // Simulate conversion process
    await new Promise(resolve => setTimeout(resolve, 2000));

    const selectedRiskObjects = availableRisks?.filter(risk => selectedRisks?.includes(risk?.id));
    const remediationPlans = selectedRiskObjects?.map(generateRemediationPlan);

    const results = {
      totalRisks: selectedRisks?.length,
      totalPlans: remediationPlans?.length,
      riskBreakdown: {
        critical: selectedRiskObjects?.filter(r => r?.severity === 'critical')?.length,
        high: selectedRiskObjects?.filter(r => r?.severity === 'high')?.length,
        medium: selectedRiskObjects?.filter(r => r?.severity === 'medium')?.length,
        low: selectedRiskObjects?.filter(r => r?.severity === 'low')?.length
      },
      totalEstimatedHours: remediationPlans?.reduce((sum, plan) => sum + plan?.estimatedHours, 0),
      plans: remediationPlans
    };

    setConversionResults(results);
    setIsConverting(false);
  };

  const handleCreatePlans = () => {
    if (conversionResults) {
      onConvertRisks?.(conversionResults);
      onClose();
      
      // Reset state
      setSelectedRisks([]);
      setConversionResults(null);
      setConversionOptions({
        assignee: '',
        targetDate: '',
        priority: 'medium',
        includeAIRecommendations: true,
        autoAssignTasks: true,
        generateTimeline: true,
        notifyAssignee: true,
        createMilestones: true
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-300 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Convert Risks to Remediation Plans</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select risks to automatically generate comprehensive remediation plans
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Risk Selection */}
            <div className="lg:col-span-2 space-y-6">
              {/* Selection Controls */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground">Available Risks</h3>
                  <p className="text-sm text-muted-foreground">
                    Select risks to convert into actionable remediation plans
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  iconName={selectedRisks?.length === availableRisks?.length ? "Square" : "CheckSquare"}
                  iconPosition="left"
                >
                  {selectedRisks?.length === availableRisks?.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              {/* Risk List */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {availableRisks?.map((risk) => (
                  <div
                    key={risk?.id}
                    className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                      selectedRisks?.includes(risk?.id) 
                        ? 'border-primary bg-primary/5' :'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleRiskToggle(risk?.id, !selectedRisks?.includes(risk?.id))}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selectedRisks?.includes(risk?.id)}
                        onChange={(e) => handleRiskToggle(risk?.id, e?.target?.checked)}
                        className="mt-1"
                        onClick={(e) => e?.stopPropagation()}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm text-muted-foreground">{risk?.id}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(risk?.severity)}`}>
                              {risk?.severity}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">{risk?.discoveredDate}</span>
                        </div>
                        
                        <h4 className="font-medium text-foreground mb-1">{risk?.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{risk?.description}</p>
                        
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-4">
                            <span className="text-muted-foreground">
                              Category: <span className="text-foreground">{risk?.category}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Systems: <span className="text-foreground">{risk?.affectedSystems}</span>
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {risk?.complianceFrameworks?.slice(0, 2)?.map((framework) => (
                              <span key={framework} className="px-1 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                                {framework}
                              </span>
                            ))}
                            {risk?.complianceFrameworks?.length > 2 && (
                              <span className="text-muted-foreground">+{risk?.complianceFrameworks?.length - 2}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Selection Summary */}
              {selectedRisks?.length > 0 && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-foreground">
                        {selectedRisks?.length} Risk{selectedRisks?.length === 1 ? '' : 's'} Selected
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Ready to generate {selectedRisks?.length} remediation plan{selectedRisks?.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{selectedRisks?.length}</div>
                      <div className="text-xs text-muted-foreground">Plans to Create</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Conversion Options */}
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-foreground mb-4">Conversion Options</h3>
                
                <div className="space-y-4">
                  <Select
                    label="Default Assignee"
                    options={assigneeOptions}
                    value={conversionOptions?.assignee}
                    onChange={(value) => handleOptionChange('assignee', value)}
                    placeholder="Select assignee for plans"
                  />

                  <Input
                    label="Target Completion Date"
                    type="date"
                    value={conversionOptions?.targetDate}
                    onChange={(e) => handleOptionChange('targetDate', e?.target?.value)}
                  />

                  <Select
                    label="Default Priority"
                    options={priorityOptions}
                    value={conversionOptions?.priority}
                    onChange={(value) => handleOptionChange('priority', value)}
                    placeholder="Select priority level"
                  />
                </div>

                <div className="mt-6 space-y-3">
                  <Checkbox
                    label="Include AI-powered recommendations"
                    checked={conversionOptions?.includeAIRecommendations}
                    onChange={(e) => handleOptionChange('includeAIRecommendations', e?.target?.checked)}
                  />
                  <Checkbox
                    label="Auto-assign tasks based on risk type"
                    checked={conversionOptions?.autoAssignTasks}
                    onChange={(e) => handleOptionChange('autoAssignTasks', e?.target?.checked)}
                  />
                  <Checkbox
                    label="Generate project timeline"
                    checked={conversionOptions?.generateTimeline}
                    onChange={(e) => handleOptionChange('generateTimeline', e?.target?.checked)}
                  />
                  <Checkbox
                    label="Create progress milestones"
                    checked={conversionOptions?.createMilestones}
                    onChange={(e) => handleOptionChange('createMilestones', e?.target?.checked)}
                  />
                  <Checkbox
                    label="Notify assignee when plans are created"
                    checked={conversionOptions?.notifyAssignee}
                    onChange={(e) => handleOptionChange('notifyAssignee', e?.target?.checked)}
                  />
                </div>
              </div>

              {/* Conversion Results */}
              {conversionResults && (
                <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Icon name="CheckCircle" size={20} className="text-success" />
                    <h4 className="font-medium text-success">Conversion Complete!</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center">
                        <div className="text-xl font-bold text-success">{conversionResults?.totalPlans}</div>
                        <div className="text-xs text-success/80">Plans Created</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-success">{conversionResults?.totalEstimatedHours}h</div>
                        <div className="text-xs text-success/80">Total Hours</div>
                      </div>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Critical Risks:</span>
                        <span className="font-medium">{conversionResults?.riskBreakdown?.critical}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>High Risks:</span>
                        <span className="font-medium">{conversionResults?.riskBreakdown?.high}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Medium Risks:</span>
                        <span className="font-medium">{conversionResults?.riskBreakdown?.medium}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Low Risks:</span>
                        <span className="font-medium">{conversionResults?.riskBreakdown?.low}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              {selectedRisks?.length > 0 && !conversionResults && (
                <Button
                  onClick={handleConvertRisks}
                  disabled={isConverting}
                  className="w-full"
                  iconName={isConverting ? "Loader" : "Zap"}
                  iconPosition="left"
                >
                  {isConverting ? 'Converting Risks...' : `Convert ${selectedRisks?.length} Risk${selectedRisks?.length === 1 ? '' : 's'}`}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <div className="text-sm text-muted-foreground">
            {isConverting ? (
              <span className="flex items-center space-x-2">
                <Icon name="Loader" size={16} className="animate-spin" />
                <span>Converting risks to remediation plans...</span>
              </span>
            ) : conversionResults ? (
              `Ready to create ${conversionResults?.totalPlans} remediation plans`
            ) : selectedRisks?.length > 0 ? (
              `${selectedRisks?.length} risk${selectedRisks?.length === 1 ? '' : 's'} selected for conversion`
            ) : (
              'Select risks to convert into remediation plans'
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            {conversionResults && (
              <Button
                onClick={handleCreatePlans}
                iconName="ArrowRight"
                iconPosition="right"
              >
                Create Remediation Plans
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskConverterModal;