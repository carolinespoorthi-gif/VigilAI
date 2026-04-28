import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/ui/Header';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import RiskSummaryCards from './components/RiskSummaryCards';
import FindingsTable from './components/FindingsTable';
import FilterControls from './components/FilterControls';
import RemediationPanel from './components/RemediationPanel';
import RiskVisualization from './components/RiskVisualization';
import PredictiveComplianceInsights from './components/PredictiveComplianceInsights';
import LiveRiskPanel from './components/LiveRiskPanel';

const API_BASE = (import.meta?.env?.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

const RiskAssessmentDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('findings');
  const [filteredFindings, setFilteredFindings] = useState([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allScans, setAllScans] = useState([]);

  useEffect(() => {
    console.log("RiskAssessmentDetails state:", location.state);
  }, [location.state]);

  // ── Pull real scan data ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [latestRes, allRes] = await Promise.all([
          fetch(`${API_BASE}/scans/latest`),
          fetch(`${API_BASE}/scans`),
        ]);
        
        const allScansData = allRes.ok ? await allRes.json() : [];
        setAllScans(allScansData);

        if (location.state?.alertData) {
          // If we have alertData, find the corresponding scan or use it directly
          const passedAlert = location.state.alertData;
          const scanId = passedAlert.id || passedAlert.scan_id;
          const found = allScansData.find(s => s.scan_id === scanId);
          if (found) {
            setScan(found);
          } else if (latestRes.ok) {
            setScan(await latestRes.json());
          }
        } else if (latestRes.ok) {
          setScan(await latestRes.json());
        }
      } catch (err) {
        console.error("Failed to fetch scan details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    window.addEventListener('dashboard:refresh', fetchData);
    return () => window.removeEventListener('dashboard:refresh', fetchData);
  }, [location.state]);

  // ── Derived risk data (real) ──────────────────────────────────────────────
  const riskData = scan ? {
    overallScore:     scan.risk_score      ?? 0,
    affectedRecords:  scan.risk_items      ?? 0,
    piiTypes:         Object.keys(scan.pii_detected || {}).filter(k => (scan.pii_detected[k] || 0) > 0).length,
    complianceImpact: scan.compliance_score ?? 0,
  } : { overallScore: 0, affectedRecords: 0, piiTypes: 0, complianceImpact: 0 };

  // ── Real findings + recommendations from latest scan ─────────────────────
  const realFindings = (scan?.detailed_findings || []).map((f, i) => ({
    id: i + 1,
    piiType: f.type || 'UNKNOWN',
    context: `${f.type}: ${f.value}`,
    confidence: f.severity === 'Critical' ? 95 : f.severity === 'High' ? 85 : f.severity === 'Medium' ? 72 : 60,
    source: scan?.dataset_type || 'Document',
    sourceIcon: 'FileText',
    location: scan?.filename || 'uploaded file',
    detectedAt: scan?.scanned_at || new Date().toISOString(),
    severity: f.severity,
    category: f.category,
  }));

  const realRecommendations = (() => {
    const plan = scan?.remediation_plan || {};
    const recs = [];
    const sections = [
      { key: 'immediate_actions',  priority: 'Critical', label: 'Immediate Actions' },
      { key: 'short_term_actions', priority: 'High',     label: 'Short-term Actions' },
      { key: 'technical_controls', priority: 'Medium',   label: 'Technical Controls' },
      { key: 'compliance_notes',   priority: 'Low',      label: 'Compliance Notes' },
    ];
    sections.forEach(({ key, priority, label }, si) => {
      (plan[key] || []).forEach((item, i) => {
        recs.push({
          id: si * 100 + i,
          title: label,
          strategy: label,
          priority,
          description: item,
          affectedRecords: scan?.risk_items || 0,
          estimatedTime: priority === 'Critical' ? '1-2 days' : priority === 'High' ? '1 week' : '2-4 weeks',
          riskReduction: priority === 'Critical' ? 80 : priority === 'High' ? 65 : 50,
          steps: [item],
          complianceImpact: scan?.violated_regulations || [],
        });
      });
    });
    // flat fallback
    if (!recs.length) {
      (scan?.remediation_actions || []).forEach((item, i) => {
        recs.push({
          id: i, title: 'Remediation Action', strategy: 'Remediation',
          priority: 'Medium', description: item, affectedRecords: scan?.risk_items || 0,
          estimatedTime: '1-2 weeks', riskReduction: 60,
          steps: [item], complianceImpact: scan?.violated_regulations || [],
        });
      });
    }
    return recs;
  })();

  const violatedRegs = scan?.violated_regulations || [];

  const tabs = [
    { id: 'findings',      label: 'Detailed Findings',   icon: 'Search',      count: realFindings.length },
    { id: 'visualization', label: 'Risk Analysis',        icon: 'BarChart3' },
    { id: 'predictive',    label: 'Predictive Insights',  icon: 'TrendingUp' },
    { id: 'remediation',   label: 'Recommendations',      icon: 'CheckCircle', count: realRecommendations.length },
  ];

  useEffect(() => {
    setFilteredFindings(realFindings);
  }, [scan]);

  const handleFiltersChange = (filters) => {
    let filtered = [...realFindings];

    if (filters?.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(f =>
        f.context?.toLowerCase().includes(searchTerm) ||
        f.source?.toLowerCase().includes(searchTerm) ||
        f.piiType?.toLowerCase().includes(searchTerm)
      );
    }
    if (filters?.piiType) {
      filtered = filtered.filter(f => f.piiType === filters.piiType);
    }
    if (filters?.confidenceLevel) {
      if (filters.confidenceLevel === 'high')   filtered = filtered.filter(f => f.confidence >= 90);
      if (filters.confidenceLevel === 'medium') filtered = filtered.filter(f => f.confidence >= 70 && f.confidence < 90);
      if (filters.confidenceLevel === 'low')    filtered = filtered.filter(f => f.confidence < 70);
    }
    setFilteredFindings(filtered);
  };

  const handleMarkFalsePositive = (findingId) => {
    console.log(`Marking finding ${findingId} as false positive`);
    // Implementation would update finding status
  };

  const handleApproveRemediation = (findingId) => {
    console.log(`Approving remediation for finding ${findingId}`);
    // Implementation would approve remediation plan
  };

  const handleApproveRecommendation = (recommendationId) => {
    console.log(`Approving recommendation ${recommendationId}`);
    navigate('/remediation-planning');
  };

  const handleCustomizeRemediation = (recommendationId) => {
    console.log(`Customizing recommendation ${recommendationId}`);
    navigate('/remediation-planning');
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setTimeout(() => { setIsGeneratingReport(false); navigate('/compliance-reports'); }, 1000);
  };

  const renderTabContent = () => {
    if (loading) return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
      </div>
    );

    if (!scan) return (
      <div className="text-center py-16">
        <Icon name="ShieldOff" size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No scan data available</h3>
        <p className="text-sm text-muted-foreground mb-6">
          No data available. Please upload or input data to begin monitoring.
        </p>
        <Button onClick={() => navigate('/monitoring')}>
          <Icon name="Upload" size={15} className="mr-2" /> Go to Monitoring
        </Button>
      </div>
    );

    switch (activeTab) {
      case 'findings':
        return (
          <div className="space-y-6">
            <FilterControls onFiltersChange={handleFiltersChange} totalResults={filteredFindings.length} />
            <FindingsTable findings={filteredFindings} onMarkFalsePositive={handleMarkFalsePositive} onApproveRemediation={handleApproveRemediation} />
          </div>
        );
      case 'visualization':
        return <RiskVisualization riskData={riskData} />;
      case 'predictive':
        return <PredictiveComplianceInsights />;
      case 'remediation':
        return (
          <RemediationPanel
            recommendations={realRecommendations}
            onApproveRecommendation={handleApproveRecommendation}
            onCustomizeRemediation={handleCustomizeRemediation}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <BreadcrumbNavigation />
            <div className="flex items-center justify-between mt-4">
              <div>
                <h1 className="text-3xl font-bold" style={{ color: '#0B2E33' }}>Risk Assessment Details</h1>
                <p className="text-muted-foreground mt-2">
                  Comprehensive analysis of detected PII risks with detailed findings and remediation strategies
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  iconName="Download"
                  iconPosition="left"
                  onClick={handleGenerateReport}
                  loading={isGeneratingReport}
                >
                  Generate Report
                </Button>
                <Button
                  variant="default"
                  iconName="ArrowRight"
                  iconPosition="right"
                  onClick={() => navigate('/remediation-planning')}
                >
                  Plan Remediation
                </Button>
              </div>
            </div>
          </div>

          {/* Risk Summary Cards */}
          <LiveRiskPanel />
          <RiskSummaryCards riskData={riskData} />

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Content - 3 columns */}
            <div className="lg:col-span-3">
              {/* Tab Navigation */}
              <div className="bg-card border border-border rounded-lg mb-6">
                <div className="border-b border-border">
                  <nav className="flex space-x-8 px-6" aria-label="Tabs">
                    {tabs?.map((tab) => (
                      <button
                        key={tab?.id}
                        onClick={() => setActiveTab(tab?.id)}
                        className={`
                          flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                          ${activeTab === tab?.id
                            ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                          }
                        `}
                      >
                        <Icon name={tab?.icon} size={16} />
                        <span>{tab?.label}</span>
                        {tab?.count && (
                          <span className={`
                            inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                            ${activeTab === tab?.id
                              ? 'bg-primary/10 text-primary' :'bg-muted text-muted-foreground'
                            }
                          `}>
                            {tab?.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Tab Content */}
              <div className="min-h-96">
                {renderTabContent()}
              </div>
            </div>

            {/* Right Sidebar - 1 column */}
            <div className="lg:col-span-1 space-y-6">
              {/* Quick Actions */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    fullWidth
                    iconName="AlertTriangle"
                    iconPosition="left"
                    onClick={() => navigate('/compliance-dashboard')}
                  >
                    View Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    iconName="Database"
                    iconPosition="left"
                    onClick={() => navigate('/data-source-management')}
                  >
                    Manage Sources
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    iconName="FileText"
                    iconPosition="left"
                    onClick={() => navigate('/compliance-reports')}
                  >
                    View Reports
                  </Button>
                </div>
              </div>

              {/* Assessment Summary — real data */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Assessment Summary</h3>
                {scan ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Scan Completed</span>
                      <span className="text-sm font-medium text-foreground">
                        {new Date(scan.scanned_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Source File</span>
                      <span className="text-sm font-medium text-foreground truncate max-w-[120px]" title={scan.filename}>
                        {scan.filename}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Dataset Type</span>
                      <span className="text-sm font-medium text-foreground capitalize">{scan.dataset_type}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total PII Found</span>
                      <span className="text-sm font-bold text-red-600">{scan.risk_items ?? 0}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No scan data yet.</p>
                )}
              </div>

              {/* Compliance Status — real violated regulations */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Violated Regulations</h3>
                {violatedRegs.length > 0 ? (
                  <div className="space-y-2">
                    {violatedRegs.map((reg, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{reg}</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                          Violated
                        </span>
                      </div>
                    ))}
                  </div>
                ) : scan ? (
                  <p className="text-sm text-green-600 font-medium">✓ No violations detected</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No data yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RiskAssessmentDetails;