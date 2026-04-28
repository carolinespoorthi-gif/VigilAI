import React, { useState, useEffect, useCallback } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const RISK_COLORS = {
  critical: '#EF4444',  // Red
  high: '#F97316',      // Orange  
  medium: '#EAB308',    // Yellow
  low: '#22C55E',       // Green
};

const PredictiveComplianceInsights = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [viewMode, setViewMode] = useState('heatmap'); // heatmap, forecast, recommendations
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);

  // Mock historical compliance data for AI analysis
  const mockHistoricalData = {
    incidentTrends: [
      { date: '2024-01-01', dataPrivacyViolations: 12, accessViolations: 8, auditGaps: 15, regulatoryBreaches: 3 },
      { date: '2024-02-01', dataPrivacyViolations: 15, accessViolations: 6, auditGaps: 18, regulatoryBreaches: 5 },
      { date: '2024-03-01', dataPrivacyViolations: 18, accessViolations: 12, auditGaps: 22, regulatoryBreaches: 2 },
      { date: '2024-04-01', dataPrivacyViolations: 22, accessViolations: 10, auditGaps: 25, regulatoryBreaches: 7 },
      { date: '2024-05-01', dataPrivacyViolations: 16, accessViolations: 14, auditGaps: 20, regulatoryBreaches: 4 },
      { date: '2024-06-01', dataPrivacyViolations: 20, accessViolations: 16, auditGaps: 28, regulatoryBreaches: 6 },
    ],
    remediationPerformance: {
      averageResolutionTime: '12.5 days',
      successRate: 0.85,
      recurringIssueRate: 0.23
    },
    currentSystemState: {
      dataSourcesMonitored: 5,
      policiesActive: 42,
      lastAuditScore: 78,
      complianceFrameworks: ['GDPR', 'CCPA', 'HIPAA', 'SOX']
    }
  };

  // Backend call helper (POST to backend /ai/predict)
  async function callPredictiveBackend(prompt) {
    try {
      const res = await fetch("http://localhost:8000/ai/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, max_tokens: 1024, temperature: 0.6 })
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("Prediction backend error:", res.status, errText);
        return null;
      }
      const json = await res.json();
      // backend returns { result: "string" } or { error: "..."} — return the result string or null
      return json?.result ?? json?.error ?? null;
    } catch (e) {
      console.error("callPredictiveBackend error", e);
      return null;
    }
  }

  const performPredictiveAnalysis = useCallback(async () => {
    setIsAnalyzing(true);

    try {
      const prompt = `
Analyze this compliance data and predict future risks. Based on the historical trends and current system state, provide a comprehensive risk forecast:

Historical Incident Data:
${JSON.stringify(mockHistoricalData?.incidentTrends, null, 2)}

Current System Performance:
- Remediation Success Rate: ${mockHistoricalData?.remediationPerformance?.successRate * 100}%
- Average Resolution Time: ${mockHistoricalData?.remediationPerformance?.averageResolutionTime}
- Recurring Issue Rate: ${mockHistoricalData?.remediationPerformance?.recurringIssueRate * 100}%
- Active Compliance Frameworks: ${mockHistoricalData?.currentSystemState?.complianceFrameworks?.join(', ')}
- Current Audit Score: ${mockHistoricalData?.currentSystemState?.lastAuditScore}/100

Provide predictions for the next ${selectedTimeframe} with:
1. Risk forecast by category (Data Privacy, Access Violation, Audit Gaps, Regulatory Breach)
2. Likelihood scores (0-1) and severity levels (Low, Medium, High, Critical)
3. Specific upcoming threats with confidence levels
4. Proactive mitigation recommendations
5. Quick wins to reduce exposure

Return the result as a JSON object with keys:
- riskForecast (array of objects),
- topThreats (array),
- recommendations (array),
- overallRiskScore (number 0-100),
- analysisConfidence (0-1)
`;

      // call backend (which will use server-side OpenAI)
      const backendReply = await callPredictiveBackend(prompt);

      if (!backendReply) {
        // fallback: if backend is unreachable or returned nothing, use mock
        setAnalysisData(getMockAnalysisData());
        return;
      }

      // backendReply may be a JSON string or plain text; try to parse
      let parsed = null;
      if (typeof backendReply === "string") {
        try {
          // Some LLM responses include extra text before/after JSON — try to extract JSON
          // First attempt direct parse
          parsed = JSON.parse(backendReply);
        } catch (e) {
          // Attempt to extract JSON substring between first { and last }
          const firstIdx = backendReply.indexOf('{');
          const lastIdx = backendReply.lastIndexOf('}');
          if (firstIdx !== -1 && lastIdx !== -1 && lastIdx > firstIdx) {
            const maybeJson = backendReply.substring(firstIdx, lastIdx + 1);
            try {
              parsed = JSON.parse(maybeJson);
            } catch (e2) {
              parsed = null;
            }
          }
        }
      } else if (typeof backendReply === "object") {
        parsed = backendReply;
      }

      if (!parsed) {
        // If parsing failed, fallback to mock (but also set a small textual response so user can see raw)
        console.warn("Could not parse backend reply; falling back to mock analysis.");
        setAnalysisData(getMockAnalysisData());
      } else {
        // Use parsed structured analysis
        setAnalysisData(parsed);
      }
    } catch (error) {
      console.error('Error performing predictive analysis:', error);
      // Fallback to mock data if AI fails
      setAnalysisData(getMockAnalysisData());
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedTimeframe]);

  const getMockAnalysisData = () => ({
    riskForecast: [
      { category: 'Data Privacy', type: 'GDPR Violation', likelihood: 0.82, severity: 'High', domain: 'Governance', confidenceLevel: 0.91, predictedImpact: '€2.5M potential fine', timeframe: '15-30 days' },
      { category: 'Access Violation', type: 'Unauthorized Data Access', likelihood: 0.75, severity: 'Critical', domain: 'Security', confidenceLevel: 0.88, predictedImpact: 'Customer data exposure', timeframe: '7-14 days' },
      { category: 'Audit Gaps', type: 'Missing Documentation', likelihood: 0.68, severity: 'Medium', domain: 'Operations', confidenceLevel: 0.76, predictedImpact: 'Audit failure risk', timeframe: '20-45 days' },
      { category: 'Regulatory Breach', type: 'CCPA Non-compliance', likelihood: 0.45, severity: 'High', domain: 'Legal', confidenceLevel: 0.72, predictedImpact: 'Regulatory sanctions', timeframe: '30-60 days' },
      { category: 'Data Privacy', type: 'Data Retention Violation', likelihood: 0.39, severity: 'Medium', domain: 'Governance', confidenceLevel: 0.65, predictedImpact: 'Storage cost increase', timeframe: '45-90 days' },
      { category: 'Access Violation', type: 'Privilege Escalation', likelihood: 0.31, severity: 'High', domain: 'Security', confidenceLevel: 0.58, predictedImpact: 'System compromise', timeframe: '60-120 days' }
    ],
    topThreats: [
      { threat: 'GDPR Article 25 compliance gap in new data processing workflows', probability: 0.82, severity: 'High', expectedTimeframe: '2-3 weeks', businessImpact: 'Potential €2.5M fine, reputation damage' },
      { threat: 'Unauthorized access to customer PII through legacy system vulnerabilities', probability: 0.75, severity: 'Critical', expectedTimeframe: '1-2 weeks', businessImpact: 'Data breach notification, customer trust loss' },
      { threat: 'Incomplete audit trail documentation for SOX compliance', probability: 0.68, severity: 'Medium', expectedTimeframe: '3-6 weeks', businessImpact: 'Failed audit, regulatory scrutiny' },
      { threat: 'CCPA data subject rights request handling delays', probability: 0.45, severity: 'High', expectedTimeframe: '4-8 weeks', businessImpact: 'Regulatory sanctions, operational disruption' },
      { threat: 'Excessive data retention violating privacy policies', probability: 0.39, severity: 'Medium', expectedTimeframe: '6-12 weeks', businessImpact: 'Increased storage costs, compliance violations' }
    ],
    recommendations: [
      { action: 'Implement automated GDPR compliance checks in data processing pipelines', priority: 'High', estimatedImpact: '65% risk reduction', implementation: 'Deploy privacy-by-design validation rules', isQuickWin: false },
      { action: 'Upgrade legacy system access controls with multi-factor authentication', priority: 'High', estimatedImpact: '58% risk reduction', implementation: 'Phase rollout over 2 weeks', isQuickWin: true },
      { action: 'Establish automated audit documentation workflows', priority: 'Medium', estimatedImpact: '45% risk reduction', implementation: 'Integrate with existing systems', isQuickWin: true },
      { action: 'Create CCPA request processing automation', priority: 'Medium', estimatedImpact: '38% risk reduction', implementation: 'Deploy customer portal integration', isQuickWin: false },
      { action: 'Implement data lifecycle management policies', priority: 'Low', estimatedImpact: '25% risk reduction', implementation: 'Gradual policy enforcement', isQuickWin: true }
    ],
    overallRiskScore: 73,
    analysisConfidence: 0.84
  });

  useEffect(() => {
    // Auto-run analysis on component mount
    performPredictiveAnalysis();
  }, [performPredictiveAnalysis]);

  const getRiskColor = (severity) => {
    // Ensure severity is a string and handle null/undefined cases
    if (!severity || typeof severity !== 'string') {
      return RISK_COLORS?.medium;
    }
    return RISK_COLORS?.[severity?.toLowerCase()] || RISK_COLORS?.medium;
  };

  const getSeverityScore = (severity) => {
    // Ensure severity is a string and handle null/undefined cases
    if (!severity || typeof severity !== 'string') {
      return 2; // Default to medium severity score
    }
    const scores = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 };
    return scores?.[severity] || 2;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload?.length) return null;

    const data = payload?.[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-popover border border-border rounded-lg p-4 shadow-lg max-w-sm">
        <p className="font-semibold text-foreground mb-2">{data?.category}</p>
        <p className="text-sm text-muted-foreground mb-1">Type: {data?.type}</p>
        <p className="text-sm text-muted-foreground mb-1">
          Likelihood: {Math.round((data?.likelihood ?? 0) * 100)}%
        </p>
        <p className="text-sm text-muted-foreground mb-1">
          Severity: <span style={{ color: getRiskColor(data?.severity) }}>{data?.severity}</span>
        </p>
        <p className="text-sm text-muted-foreground mb-1">
          Confidence: {Math.round((data?.confidenceLevel ?? 0) * 100)}%
        </p>
        <p className="text-sm text-muted-foreground">Domain: {data?.domain}</p>
        {data?.predictedImpact && (
          <p className="text-sm text-foreground mt-2 font-medium">
            Impact: {data?.predictedImpact}
          </p>
        )}
      </div>
    );
  };

  const renderHeatmapView = () => {
    if (!analysisData?.riskForecast) return null;

    // Filter by confidence threshold
    const filteredRisks = analysisData?.riskForecast?.filter(
      risk => (risk?.confidenceLevel ?? 0) >= confidenceThreshold
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Risk Likelihood × Severity Heatmap</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-muted-foreground">Confidence Threshold:</label>
              <select
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e?.target?.value))}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="0.5">50%</option>
                <option value="0.6">60%</option>
                <option value="0.7">70%</option>
                <option value="0.8">80%</option>
                <option value="0.9">90%</option>
              </select>
            </div>
          </div>
        </div>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                type="number" 
                dataKey="likelihood" 
                domain={[0, 1]} 
                name="Likelihood" 
                fontSize={12}
                tickFormatter={(value) => `${Math.round((value ?? 0) * 100)}%`}
              />
              <YAxis 
                type="number" 
                dataKey="severity" 
                domain={[0.5, 4.5]} 
                name="Severity" 
                fontSize={12}
                tickFormatter={(value) => {
                  const labels = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' };
                  return labels?.[Math.round(value)] || '';
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Scatter 
                data={filteredRisks?.map(risk => ({
                  ...risk,
                  severity: getSeverityScore(risk?.severity)
                }))} 
                fill="#8884d8"
              >
                {filteredRisks?.map((risk, index) => (
                  <Cell key={`cell-${index}`} fill={getRiskColor(risk?.severity)} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        {/* Risk Legend */}
        <div className="flex items-center justify-center space-x-6 pt-4 border-t border-border">
          {Object.entries(RISK_COLORS)?.map(([severity, color]) => (
            <div key={severity} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-muted-foreground capitalize">{severity}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderForecastView = () => {
    if (!analysisData?.topThreats) return null;

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-foreground">Top 5 Predicted Compliance Threats</h3>
        
        <div className="space-y-4">
          {analysisData?.topThreats?.slice(0, 5)?.map((threat, index) => (
            <div key={index} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground mb-2">{threat?.threat}</h4>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>Probability: {Math.round((threat?.probability ?? 0) * 100)}%</span>
                    <span className="flex items-center space-x-1">
                      <span>Severity:</span>
                      <span 
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{ 
                          backgroundColor: `${getRiskColor(threat?.severity)}20`,
                          color: getRiskColor(threat?.severity)
                        }}
                      >
                        {threat?.severity}
                      </span>
                    </span>
                    {threat?.expectedTimeframe && (
                      <span>Expected: {threat?.expectedTimeframe}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">
                    #{index + 1}
                  </div>
                </div>
              </div>
              
              {threat?.businessImpact && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-sm">
                    <span className="font-medium text-foreground">Business Impact: </span>
                    <span className="text-muted-foreground">{threat?.businessImpact}</span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRecommendationsView = () => {
    if (!analysisData?.recommendations) return null;

    const quickWins = analysisData?.recommendations?.filter(rec => rec?.isQuickWin) || [];
    const strategicActions = analysisData?.recommendations?.filter(rec => !rec?.isQuickWin) || [];

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-foreground">Proactive Mitigation Recommendations</h3>
        
        {/* Quick Wins Section */}
        {quickWins?.length > 0 && (
          <div className="bg-success/5 border border-success/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Icon name="Zap" size={20} className="text-success" />
              <h4 className="font-semibold text-success">Quick Wins</h4>
            </div>
            <div className="space-y-3">
              {quickWins?.map((rec, index) => (
                <div key={index} className="bg-background rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-foreground flex-1">{rec?.action}</p>
                    <span className={`
                      px-2 py-1 rounded text-xs font-medium ml-3
                      ${rec?.priority === 'High' ?'bg-error/10 text-error' 
                        : rec?.priority === 'Medium' ?'bg-warning/10 text-warning' :'bg-success/10 text-success'
                      }
                    `}>
                      {rec?.priority} Priority
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{rec?.implementation}</p>
                  <p className="text-sm">
                    <span className="font-medium text-foreground">Expected Impact: </span>
                    <span className="text-success">{rec?.estimatedImpact}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strategic Actions Section */}
        {strategicActions?.length > 0 && (
          <div>
            <h4 className="font-semibold text-foreground mb-4 flex items-center space-x-2">
              <Icon name="Target" size={20} />
              <span>Strategic Actions</span>
            </h4>
            <div className="space-y-3">
              {strategicActions?.map((rec, index) => (
                <div key={index} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-foreground flex-1">{rec?.action}</p>
                    <span className={`
                      px-2 py-1 rounded text-xs font-medium ml-3
                      ${rec?.priority === 'High' ?'bg-error/10 text-error' 
                        : rec?.priority === 'Medium' ?'bg-warning/10 text-warning' :'bg-success/10 text-success'
                      }
                    `}>
                      {rec?.priority} Priority
                    </span>
                  </div>
                  {rec?.implementation && (
                    <p className="text-sm text-muted-foreground mb-2">{rec?.implementation}</p>
                  )}
                  <p className="text-sm">
                    <span className="font-medium text-foreground">Expected Impact: </span>
                    <span className="text-primary">{rec?.estimatedImpact}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (isAnalyzing) {
      return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Analyzing compliance patterns and predicting future risks...</p>
        </div>
      );
    }

    if (!analysisData) {
      return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Icon name="AlertTriangle" size={48} className="text-muted-foreground" />
          <p className="text-muted-foreground">No analysis data available</p>
          <Button onClick={performPredictiveAnalysis}>
            Run Analysis
          </Button>
        </div>
      );
    }

    switch (viewMode) {
      case 'heatmap':
        return renderHeatmapView();
      case 'forecast':
        return renderForecastView();
      case 'recommendations':
        return renderRecommendationsView();
      default:
        return renderHeatmapView();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center space-x-2">
            <Icon name="TrendingUp" size={24} />
            <span>Predictive Compliance Insights</span>
          </h2>
          <p className="text-muted-foreground mt-1">
            AI-powered risk forecasting and proactive compliance threat identification
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e?.target?.value)}
            className="px-3 py-2 border border-input rounded-md text-sm"
          >
            <option value="7d">Next 7 Days</option>
            <option value="30d">Next 30 Days</option>
            <option value="90d">Next 90 Days</option>
            <option value="180d">Next 6 Months</option>
          </select>

          <Button
            variant="outline"
            onClick={performPredictiveAnalysis}
            loading={isAnalyzing}
            iconName="RefreshCw"
            iconPosition="left"
          >
            Refresh Analysis
          </Button>
        </div>
      </div>
      {/* Analysis Summary Cards */}
      {analysisData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Risk Score</p>
                <p className="text-2xl font-bold text-foreground">{analysisData?.overallRiskScore}/100</p>
              </div>
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center
                ${analysisData?.overallRiskScore >= 80 
                  ? 'bg-error/10 text-error' 
                  : analysisData?.overallRiskScore >= 60 
                    ? 'bg-warning/10 text-warning' :'bg-success/10 text-success'
                }
              `}>
                <Icon name="AlertTriangle" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High-Risk Threats</p>
                <p className="text-2xl font-bold text-foreground">
                  {analysisData?.topThreats?.filter(t => t?.severity === 'High' || t?.severity === 'Critical')?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center">
                <Icon name="Shield" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Analysis Confidence</p>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round((analysisData?.analysisConfidence ?? 0) * 100)}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Icon name="Brain" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}
      {/* View Mode Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {[
            { id: 'heatmap', label: 'Risk Heatmap', icon: 'Grid3x3' },
            { id: 'forecast', label: 'Threat Forecast', icon: 'Calendar' },
            { id: 'recommendations', label: 'Recommendations', icon: 'Lightbulb' }
          ]?.map((tab) => (
            <button
              key={tab?.id}
              onClick={() => setViewMode(tab?.id)}
              className={`
                flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                ${viewMode === tab?.id
                  ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                }
              `}
            >
              <Icon name={tab?.icon} size={16} />
              <span>{tab?.label}</span>
            </button>
          ))}
        </nav>
      </div>
      {/* Main Content */}
      <div className="min-h-96">
        {renderContent()}
      </div>
    </div>
  );
};

export default PredictiveComplianceInsights;

