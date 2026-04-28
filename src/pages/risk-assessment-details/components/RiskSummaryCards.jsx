import React from 'react';
import Icon from '../../../components/AppIcon';

const RiskSummaryCards = ({ riskData }) => {
  const summaryCards = [
    {
      title: 'Overall Risk Score',
      value: riskData?.overallScore,
      maxValue: 100,
      icon: 'Shield',
      color: riskData?.overallScore >= 80 ? 'error' : riskData?.overallScore >= 60 ? 'warning' : 'success',
      trend: '+12%',
      description: 'Composite risk assessment across all data sources'
    },
    {
      title: 'Affected Records',
      value: riskData?.affectedRecords?.toLocaleString(),
      icon: 'Database',
      color: 'accent',
      trend: '+2,847',
      description: 'Total records containing detected PII elements'
    },
    {
      title: 'PII Types Detected',
      value: riskData?.piiTypes,
      icon: 'Eye',
      color: 'warning',
      trend: '+3',
      description: 'Distinct categories of personal information identified'
    },
    {
      title: 'Compliance Impact',
      value: `${riskData?.complianceImpact}%`,
      icon: 'AlertTriangle',
      color: riskData?.complianceImpact >= 70 ? 'error' : riskData?.complianceImpact >= 40 ? 'warning' : 'success',
      trend: '+8%',
      description: 'Potential regulatory compliance exposure assessment'
    }
  ];

  const getColorClasses = (color) => {
    switch (color) {
      case 'error':
        return {
          bg: 'bg-error/10',
          text: 'text-error',
          icon: 'text-error',
          border: 'border-error/20'
        };
      case 'warning':
        return {
          bg: 'bg-warning/10',
          text: 'text-warning',
          icon: 'text-warning',
          border: 'border-warning/20'
        };
      case 'success':
        return {
          bg: 'bg-success/10',
          text: 'text-success',
          icon: 'text-success',
          border: 'border-success/20'
        };
      case 'accent':
        return {
          bg: 'bg-accent/10',
          text: 'text-accent',
          icon: 'text-accent',
          border: 'border-accent/20'
        };
      default:
        return {
          bg: 'bg-muted/50',
          text: 'text-foreground',
          icon: 'text-muted-foreground',
          border: 'border-border'
        };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {summaryCards?.map((card, index) => {
        const colors = getColorClasses(card?.color);
        return (
          <div
            key={index}
            className={`bg-card border ${colors?.border} rounded-lg p-6 hover:shadow-md transition-shadow duration-200`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${colors?.bg}`}>
                <Icon name={card?.icon} size={24} className={colors?.icon} />
              </div>
              <div className={`text-sm font-medium ${colors?.text}`}>
                {card?.trend}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                {card?.title}
              </h3>
              <div className="flex items-baseline space-x-2">
                <span className={`text-2xl font-bold ${colors?.text}`}>
                  {card?.value}
                </span>
                {card?.maxValue && (
                  <span className="text-sm text-muted-foreground">
                    / {card?.maxValue}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {card?.description}
              </p>
            </div>
            {card?.maxValue && (
              <div className="mt-4">
                <div className="w-full bg-border rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      card?.color === 'error' ? 'bg-error' :
                      card?.color === 'warning' ? 'bg-warning' :
                      card?.color === 'success' ? 'bg-success' : 'bg-accent'
                    }`}
                    style={{ width: `${(card?.value / card?.maxValue) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RiskSummaryCards;