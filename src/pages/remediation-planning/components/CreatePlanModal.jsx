import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';

const CreatePlanModal = ({ isOpen, onClose, onCreatePlan }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [planData, setPlanData] = useState({
    name: '',
    description: '',
    riskLevel: '',
    dataSource: '',
    assignee: '',
    targetDate: '',
    estimatedHours: '',
    priority: 'medium',
    autoGenerate: true,
    includeAIRecommendations: true,
    notifyStakeholders: true
  });

  const [aiRecommendations, setAiRecommendations] = useState([
    {
      id: 1,
      title: 'Automated PII Detection',
      description: 'Implement regex patterns and ML models to identify SSN, credit card numbers, and email addresses',
      estimatedHours: 8,
      priority: 'high',
      selected: true
    },
    {
      id: 2,
      title: 'Data Anonymization',
      description: 'Replace sensitive data with anonymized tokens while maintaining data utility',
      estimatedHours: 12,
      priority: 'high',
      selected: true
    },
    {
      id: 3,
      title: 'Access Control Review',
      description: 'Audit and update permissions for data sources containing sensitive information',
      estimatedHours: 6,
      priority: 'medium',
      selected: false
    },
    {
      id: 4,
      title: 'Compliance Documentation',
      description: 'Generate audit trails and compliance reports for regulatory requirements',
      estimatedHours: 4,
      priority: 'medium',
      selected: true
    }
  ]);

  const riskLevelOptions = [
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

  const dataSourceOptions = [
    { value: 'slack', label: 'Slack Messages' },
    { value: 'email', label: 'Email Data' },
    { value: 'jira', label: 'Jira Tickets' },
    { value: 'contracts', label: 'Contracts' },
    { value: 'code', label: 'Code Repositories' },
    { value: 'database', label: 'Database Records' }
  ];

  const assigneeOptions = [
    { value: 'sarah_mitchell', label: 'Sarah Mitchell' },
    { value: 'james_wilson', label: 'James Wilson' },
    { value: 'emily_chen', label: 'Emily Chen' },
    { value: 'michael_brown', label: 'Michael Brown' },
    { value: 'lisa_garcia', label: 'Lisa Garcia' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'high', label: 'High Priority' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const handleInputChange = (field, value) => {
    setPlanData(prev => ({ ...prev, [field]: value }));
  };

  const handleRecommendationToggle = (id, selected) => {
    setAiRecommendations(prev =>
      prev?.map(rec => rec?.id === id ? { ...rec, selected } : rec)
    );
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

  const handleCreatePlan = () => {
    const selectedRecommendations = aiRecommendations?.filter(rec => rec?.selected);
    const totalEstimatedHours = selectedRecommendations?.reduce((sum, rec) => sum + rec?.estimatedHours, 0);
    
    const newPlan = {
      ...planData,
      id: `RP-2025-${String(Date.now())?.slice(-3)}`,
      recommendations: selectedRecommendations,
      totalEstimatedHours,
      status: 'draft',
      createdAt: new Date()?.toISOString(),
      progress: 0,
      tasksCompleted: 0,
      totalTasks: selectedRecommendations?.length
    };

    onCreatePlan?.(newPlan);
    onClose();
    
    // Reset form
    setPlanData({
      name: '',
      description: '',
      riskLevel: '',
      dataSource: '',
      assignee: '',
      targetDate: '',
      estimatedHours: '',
      priority: 'medium',
      autoGenerate: true,
      includeAIRecommendations: true,
      notifyStakeholders: true
    });
    setCurrentStep(1);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return planData?.name && planData?.riskLevel && planData?.dataSource;
      case 2:
        return planData?.assignee && planData?.targetDate;
      case 3:
        return aiRecommendations?.some(rec => rec?.selected);
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-300 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Create Remediation Plan</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Step {currentStep} of 3: {
                currentStep === 1 ? 'Basic Information' :
                currentStep === 2 ? 'Assignment & Timeline': 'AI Recommendations'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-muted/30">
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
                  <div className={`w-16 h-1 mx-2 ${step < currentStep ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Input
                    label="Plan Name"
                    type="text"
                    placeholder="Enter a descriptive name for the remediation plan"
                    value={planData?.name}
                    onChange={(e) => handleInputChange('name', e?.target?.value)}
                    required
                  />
                </div>

                <Select
                  label="Risk Level"
                  options={riskLevelOptions}
                  value={planData?.riskLevel}
                  onChange={(value) => handleInputChange('riskLevel', value)}
                  placeholder="Select risk level"
                  required
                />

                <Select
                  label="Data Source"
                  options={dataSourceOptions}
                  value={planData?.dataSource}
                  onChange={(value) => handleInputChange('dataSource', value)}
                  placeholder="Select data source"
                  required
                />

                <div className="md:col-span-2">
                  <Input
                    label="Description"
                    type="text"
                    placeholder="Describe the scope and objectives of this remediation plan"
                    value={planData?.description}
                    onChange={(e) => handleInputChange('description', e?.target?.value)}
                  />
                </div>

                <Select
                  label="Priority"
                  options={priorityOptions}
                  value={planData?.priority}
                  onChange={(value) => handleInputChange('priority', value)}
                  placeholder="Select priority level"
                />

                <Input
                  label="Estimated Hours"
                  type="number"
                  placeholder="Total estimated hours"
                  value={planData?.estimatedHours}
                  onChange={(e) => handleInputChange('estimatedHours', e?.target?.value)}
                />
              </div>

              <div className="space-y-3">
                <Checkbox
                  label="Auto-generate tasks based on risk assessment"
                  checked={planData?.autoGenerate}
                  onChange={(e) => handleInputChange('autoGenerate', e?.target?.checked)}
                />
                <Checkbox
                  label="Include AI-powered recommendations"
                  checked={planData?.includeAIRecommendations}
                  onChange={(e) => handleInputChange('includeAIRecommendations', e?.target?.checked)}
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Assignee"
                  options={assigneeOptions}
                  value={planData?.assignee}
                  onChange={(value) => handleInputChange('assignee', value)}
                  placeholder="Select team member"
                  required
                />

                <Input
                  label="Target Completion Date"
                  type="date"
                  value={planData?.targetDate}
                  onChange={(e) => handleInputChange('targetDate', e?.target?.value)}
                  required
                />
              </div>

              <div className="space-y-3">
                <Checkbox
                  label="Notify stakeholders when plan is created"
                  checked={planData?.notifyStakeholders}
                  onChange={(e) => handleInputChange('notifyStakeholders', e?.target?.checked)}
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-2">Plan Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Risk Level:</span>
                    <span className="ml-2 font-medium text-foreground capitalize">{planData?.riskLevel}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data Source:</span>
                    <span className="ml-2 font-medium text-foreground capitalize">{planData?.dataSource}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Priority:</span>
                    <span className="ml-2 font-medium text-foreground capitalize">{planData?.priority}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estimated Hours:</span>
                    <span className="ml-2 font-medium text-foreground">{planData?.estimatedHours || 'TBD'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-foreground mb-2">AI-Generated Recommendations</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Select the recommended tasks to include in your remediation plan:
                </p>
              </div>

              <div className="space-y-4">
                {aiRecommendations?.map((recommendation) => (
                  <div
                    key={recommendation?.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      recommendation?.selected ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={recommendation?.selected}
                        onChange={(e) => handleRecommendationToggle(recommendation?.id, e?.target?.checked)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-foreground">{recommendation?.title}</h5>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              recommendation?.priority === 'high' ? 'bg-error/10 text-error' :
                              recommendation?.priority === 'medium'? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                            }`}>
                              {recommendation?.priority} priority
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {recommendation?.estimatedHours}h
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{recommendation?.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Total Selected Tasks:</span>
                  <span className="text-foreground">
                    {aiRecommendations?.filter(rec => rec?.selected)?.length} tasks
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-medium text-foreground">Total Estimated Hours:</span>
                  <span className="text-foreground">
                    {aiRecommendations?.filter(rec => rec?.selected)?.reduce((sum, rec) => sum + rec?.estimatedHours, 0)}h
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <div className="flex items-center space-x-2">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                iconName="ChevronLeft"
                iconPosition="left"
              >
                Previous
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" onClick={onClose}>
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
                onClick={handleCreatePlan}
                disabled={!isStepValid()}
                iconName="Plus"
                iconPosition="left"
              >
                Create Plan
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePlanModal;