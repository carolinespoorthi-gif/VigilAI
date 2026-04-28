import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const RemediationPanel = ({ recommendations, onApproveRecommendation, onCustomizeRemediation }) => {
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'bg-error/10 text-error border-error/20';
      case 'high':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'medium':
        return 'bg-accent/10 text-accent border-accent/20';
      case 'low':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-muted/50 text-muted-foreground border-border';
    }
  };

  const getStrategyIcon = (strategy) => {
    switch (strategy?.toLowerCase()) {
      case 'anonymization':
        return 'Eye';
      case 'encryption':
        return 'Lock';
      case 'deletion':
        return 'Trash2';
      case 'masking':
        return 'EyeOff';
      case 'tokenization':
        return 'Key';
      default:
        return 'Shield';
    }
  };

  const handleRecommendationClick = (recommendation) => {
    setSelectedRecommendation(
      selectedRecommendation?.id === recommendation?.id ? null : recommendation
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg h-fit">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">AI Remediation Recommendations</h3>
            <p className="text-sm text-muted-foreground">
              {recommendations?.length} strategies generated
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName={isExpanded ? 'ChevronUp' : 'ChevronDown'}
            onClick={() => setIsExpanded(!isExpanded)}
          />
        </div>
      </div>
      {isExpanded && (
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {recommendations?.map((recommendation) => (
            <div
              key={recommendation?.id}
              className={`border rounded-lg transition-all duration-200 cursor-pointer ${
                selectedRecommendation?.id === recommendation?.id
                  ? 'border-accent bg-accent/5' :'border-border hover:border-accent/50'
              }`}
              onClick={() => handleRecommendationClick(recommendation)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <Icon 
                        name={getStrategyIcon(recommendation?.strategy)} 
                        size={20} 
                        className="text-accent" 
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {recommendation?.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {recommendation?.strategy} Strategy
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(recommendation?.priority)}`}>
                    {recommendation?.priority}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground mb-3">
                  {recommendation?.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span className="flex items-center space-x-1">
                      <Icon name="Target" size={12} />
                      <span>{recommendation?.affectedRecords} records</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Icon name="Clock" size={12} />
                      <span>{recommendation?.estimatedTime}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Icon name="TrendingUp" size={12} />
                      <span>{recommendation?.riskReduction}% risk reduction</span>
                    </span>
                  </div>
                  <Icon 
                    name={selectedRecommendation?.id === recommendation?.id ? 'ChevronUp' : 'ChevronDown'} 
                    size={16} 
                    className="text-muted-foreground" 
                  />
                </div>
              </div>

              {/* Expanded Details */}
              {selectedRecommendation?.id === recommendation?.id && (
                <div className="border-t border-border p-4 bg-muted/20">
                  <div className="space-y-4">
                    {/* Implementation Steps */}
                    <div>
                      <h5 className="text-sm font-medium text-foreground mb-2">Implementation Steps</h5>
                      <ol className="space-y-2">
                        {recommendation?.steps?.map((step, index) => (
                          <li key={index} className="flex items-start space-x-2 text-sm">
                            <span className="flex-shrink-0 w-5 h-5 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </span>
                            <span className="text-muted-foreground">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Compliance Impact */}
                    <div>
                      <h5 className="text-sm font-medium text-foreground mb-2">Compliance Impact</h5>
                      <div className="grid grid-cols-2 gap-3">
                        {recommendation?.complianceImpact?.map((impact, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Icon name="CheckCircle" size={14} className="text-success" />
                            <span className="text-xs text-muted-foreground">{impact}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 pt-2">
                      <Button
                        variant="default"
                        size="sm"
                        iconName="CheckCircle"
                        iconPosition="left"
                        onClick={() => onApproveRecommendation(recommendation?.id)}
                      >
                        Approve & Execute
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        iconName="Settings"
                        iconPosition="left"
                        onClick={() => onCustomizeRemediation(recommendation?.id)}
                      >
                        Customize
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {recommendations?.length === 0 && (
            <div className="text-center py-8">
              <Icon name="Lightbulb" size={48} className="text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-medium text-foreground mb-2">No Recommendations Available</h4>
              <p className="text-muted-foreground">
                Recommendations will appear here once risk analysis is complete
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RemediationPanel;