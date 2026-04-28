import React, { useState } from 'react';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';

const ScheduledReportsPanel = ({ scheduledReports, onUpdateSchedule, onDeleteSchedule, onCreateSchedule }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    reportType: 'gdpr',
    frequency: 'monthly',
    recipients: '',
    enabled: true
  });

  const frequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' }
  ];

  const reportTypeOptions = [
    { value: 'gdpr', label: 'GDPR Compliance Summary' },
    { value: 'pii', label: 'PII Detection Analytics' },
    { value: 'remediation', label: 'Remediation Progress Report' },
    { value: 'audit', label: 'Audit Trail Documentation' }
  ];

  const handleCreateSchedule = () => {
    if (newSchedule?.name && newSchedule?.recipients) {
      onCreateSchedule({
        ...newSchedule,
        id: Date.now(),
        nextRun: getNextRunDate(newSchedule?.frequency),
        recipients: newSchedule?.recipients?.split(',')?.map(email => email?.trim())
      });
      setNewSchedule({
        name: '',
        reportType: 'gdpr',
        frequency: 'monthly',
        recipients: '',
        enabled: true
      });
      setIsCreating(false);
    }
  };

  const getNextRunDate = (frequency) => {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      case 'quarterly':
        return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  };

  const getFrequencyIcon = (frequency) => {
    switch (frequency) {
      case 'daily': return 'Calendar';
      case 'weekly': return 'CalendarDays';
      case 'monthly': return 'CalendarRange';
      case 'quarterly': return 'CalendarClock';
      default: return 'Calendar';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">Scheduled Reports</h3>
          <p className="text-sm text-muted-foreground">
            Automate report generation and distribution
          </p>
        </div>
        <Button
          variant="default"
          iconName="Plus"
          iconPosition="left"
          onClick={() => setIsCreating(true)}
        >
          New Schedule
        </Button>
      </div>
      {isCreating && (
        <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
          <h4 className="font-medium text-card-foreground mb-4">Create New Schedule</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Schedule Name"
              type="text"
              placeholder="e.g., Monthly GDPR Report"
              value={newSchedule?.name}
              onChange={(e) => setNewSchedule(prev => ({ ...prev, name: e?.target?.value }))}
            />

            <Select
              label="Report Type"
              options={reportTypeOptions}
              value={newSchedule?.reportType}
              onChange={(value) => setNewSchedule(prev => ({ ...prev, reportType: value }))}
            />

            <Select
              label="Frequency"
              options={frequencyOptions}
              value={newSchedule?.frequency}
              onChange={(value) => setNewSchedule(prev => ({ ...prev, frequency: value }))}
            />

            <Input
              label="Recipients"
              type="text"
              placeholder="email1@company.com, email2@company.com"
              value={newSchedule?.recipients}
              onChange={(e) => setNewSchedule(prev => ({ ...prev, recipients: e?.target?.value }))}
              description="Comma-separated email addresses"
            />
          </div>

          <div className="flex items-center justify-between">
            <Checkbox
              label="Enable schedule immediately"
              checked={newSchedule?.enabled}
              onChange={(e) => setNewSchedule(prev => ({ ...prev, enabled: e?.target?.checked }))}
            />
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleCreateSchedule}
                disabled={!newSchedule?.name || !newSchedule?.recipients}
              >
                Create Schedule
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-4">
        {scheduledReports?.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="CalendarX" size={48} className="text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No scheduled reports configured</p>
            <p className="text-sm text-muted-foreground">
              Create automated reports to keep stakeholders informed
            </p>
          </div>
        ) : (
          scheduledReports?.map((schedule) => (
            <div
              key={schedule?.id}
              className="flex items-center justify-between p-4 border border-border rounded-lg"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg ${schedule?.enabled ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                  <Icon name={getFrequencyIcon(schedule?.frequency)} size={20} />
                </div>
                <div>
                  <h4 className="font-medium text-card-foreground">{schedule?.name}</h4>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>{reportTypeOptions?.find(opt => opt?.value === schedule?.reportType)?.label}</span>
                    <span>•</span>
                    <span className="capitalize">{schedule?.frequency}</span>
                    <span>•</span>
                    <span>{schedule?.recipients?.length} recipient{schedule?.recipients?.length !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Next run: {new Date(schedule.nextRun)?.toLocaleDateString()} at {new Date(schedule.nextRun)?.toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  iconName={schedule?.enabled ? 'Pause' : 'Play'}
                  onClick={() => onUpdateSchedule(schedule?.id, { enabled: !schedule?.enabled })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  iconName="Settings"
                  onClick={() => console.log('Edit schedule:', schedule?.id)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  iconName="Trash2"
                  onClick={() => onDeleteSchedule(schedule?.id)}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ScheduledReportsPanel;