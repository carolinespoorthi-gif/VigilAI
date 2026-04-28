import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import ReportCard from './components/ReportCard';
import ReportFilters from './components/ReportFilters';
import ReportGenerationPanel from './components/ReportGenerationPanel';
import ScheduledReportsPanel from './components/ScheduledReportsPanel';
import ReportPreviewModal from './components/ReportPreviewModal';
import CsvMetricsViewer from './components/CsvMetricsViewer';
import AuditLogsPanel from './components/AuditLogsPanel';
import DualReportView from './components/DualReportView';

const API_BASE_RPT = (import.meta?.env?.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

const ComplianceReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [filters, setFilters] = useState({
    search: '', type: 'all', framework: 'all',
    dataSource: 'all', status: 'all',
    dateRange: { start: '', end: '' }
  });
  const [savedFilters, setSavedFilters] = useState([]);
  const [scheduledReports, setScheduledReports] = useState([]);
  const [isGenerationPanelOpen, setIsGenerationPanelOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('reports');
  const [generatingReports, setGeneratingReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dualScans, setDualScans] = useState([]);  // for dual-report comparison

  // ── Build report library from real scan data ──────────────────────────────
  const buildReportsFromScans = (scans) => {
    if (!scans || scans.length === 0) return [];
    return scans.map((scan, i) => ({
      id:             scan.scan_id || i,
      title:          `Scan Report — ${scan.filename}`,
      category:       scan.risk_level === 'LOW' ? 'Low Risk' : scan.risk_level === 'MEDIUM' ? 'Medium Risk' : 'High Risk',
      type:           scan.dataset_type || 'document',
      description:    `PII scan of "${scan.filename}". Found ${scan.risk_items ?? 0} PII instance(s). Risk: ${scan.risk_level} (${scan.risk_score}/100). Compliance: ${scan.compliance_score}/100.`,
      generatedDate:  scan.scanned_at,
      coveragePeriod: new Date(scan.scanned_at).toLocaleString(),
      fileSize:       0,
      formats:        ['pdf', 'docx'],
      status:         'ready',
      isNew:          i === 0,
      _scan:          scan,   // keep raw for downloads
    }));
  };

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const res = await fetch(`${API_BASE_RPT}/scans`);
        if (res.ok) {
          const scans = await res.json();
          const built = buildReportsFromScans(scans);
          setReports(built);
          setFilteredReports(built);
          setDualScans(scans.filter(s => ['HIGH','CRITICAL','MEDIUM'].includes(s.risk_level)));
        }
      } catch { /* silently ignore */ }
      finally { setLoading(false); }
    };
    fetchScans();
    window.addEventListener('dashboard:refresh', fetchScans);
    return () => window.removeEventListener('dashboard:refresh', fetchScans);
  }, []);

  // Filter reports based on current filters
  useEffect(() => {
    let filtered = reports?.filter(report => {
      const matchesSearch = !filters?.search || 
        report?.title?.toLowerCase()?.includes(filters?.search?.toLowerCase()) ||
        report?.description?.toLowerCase()?.includes(filters?.search?.toLowerCase());
      
      const matchesType = filters?.type === 'all' || report?.type === filters?.type;
      const matchesStatus = filters?.status === 'all' || report?.status === filters?.status;
      
      const matchesDateRange = !filters?.dateRange?.start || !filters?.dateRange?.end || 
        (report?.generatedDate && 
         new Date(report.generatedDate) >= new Date(filters.dateRange.start) &&
         new Date(report.generatedDate) <= new Date(filters.dateRange.end));

      return matchesSearch && matchesType && matchesStatus && matchesDateRange;
    });

    setFilteredReports(filtered);
  }, [reports, filters]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      framework: 'all',
      dataSource: 'all',
      status: 'all',
      dateRange: {
        start: '',
        end: ''
      }
    });
  };

  const handleSaveFilters = () => {
    const filterName = prompt('Enter a name for this filter:');
    if (filterName) {
      const newSavedFilter = {
        id: Date.now(),
        name: filterName,
        filters: { ...filters }
      };
      setSavedFilters(prev => [...prev, newSavedFilter]);
    }
  };

  const handleReportGeneration = (config) => {
    const newReport = {
      id: Date.now(),
      title: config?.title,
      category: 'Custom Reports',
      type: config?.reportType,
      description: `Custom generated report covering ${config?.dataSources?.join(', ')} from ${config?.dateRange?.start} to ${config?.dateRange?.end}`,
      generatedDate: new Date()?.toISOString(),
      coveragePeriod: `${config?.dateRange?.start} - ${config?.dateRange?.end}`,
      fileSize: Math.floor(Math.random() * 5000000) + 1000000,
      formats: config?.outputFormats,
      status: 'generating',
      isNew: true
    };

    setReports(prev => [newReport, ...prev]);
    setGeneratingReports(prev => [...prev, newReport?.id]);

    // Simulate report generation
    setTimeout(() => {
      setReports(prev => prev?.map(report => 
        report?.id === newReport?.id 
          ? { ...report, status: 'ready' }
          : report
      ));
      setGeneratingReports(prev => prev?.filter(id => id !== newReport?.id));
    }, 5000);
  };

  const handlePreview = (report) => {
    setSelectedReport(report);
    setIsPreviewOpen(true);
  };

  const handleDownload = async (report, fmt = 'pdf') => {
    if (fmt === 'csv') {
      alert('CSV download is disabled. Use the CSV Metrics View tab to view data in-app.');
      return;
    }
    try {
      const scan = report?._scan || {};
      // Check compliance status — block NON_COMPLIANT
      const compStatus = scan.compliance_status ?? 'NON_COMPLIANT';
      const riskScore = scan.risk_score ?? 100;
      if (compStatus === 'NON_COMPLIANT') {
        const remPlan = scan.remediation_plan || {};
        const actions = remPlan.immediate_actions || scan.remediation_actions || [];
        let msg = `⚠️ Fix Required Before Report Generation\n\n`;
        msg += `This document is NON-COMPLIANT and cannot generate a full report.\n`;
        msg += `Risk Score: ${riskScore}/100 | Compliance: ${scan.compliance_score ?? 0}/100\n`;
        if ((scan.violated_regulations || []).length) {
          msg += `Violations: ${scan.violated_regulations.join(', ')}\n`;
        }
        if (actions.length) {
          msg += `\nRequired Actions:\n${actions.slice(0,3).map((a,i)=>`${i+1}. ${a}`).join('\n')}`;
        }
        msg += '\n\nApply remediation fixes and re-scan the document first.';
        alert(msg);
        return;
      }
      const payload = {
        filename:             report?.title || 'compliance_report',
        risk_score:           scan.risk_score          ?? 50,
        compliance_score:     scan.compliance_score    ?? 50,
        risk_level:           scan.risk_level          ?? 'MEDIUM',
        compliance_status:    scan.compliance_status   ?? 'PARTIALLY_COMPLIANT',
        detailed_findings:    scan.detailed_findings   ?? [],
        violated_regulations: scan.violated_regulations ?? [],
        remediation_plan:     scan.remediation_plan    ?? {},
      };
      const form = new FormData();
      form.append('format', fmt);
      form.append('payload_json', JSON.stringify(payload));
      const resp = await fetch(`${API_BASE_RPT}/reports/generate`, { method: 'POST', body: form });
      if (resp.status === 422) {
        const errData = await resp.json().catch(() => ({}));
        alert(`⚠️ ${errData.detail || 'Fix Required Before Report Generation'}\n\n${errData.message || ''}`);
        return;
      }
      if (!resp.ok) throw new Error(`Report failed (${resp.status})`);
      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(report?.title || 'report').replace(/\s+/g, '_')}.${fmt}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message || 'Download failed');
    }
  };

  const handleScheduleUpdate = (scheduleId, updates) => {
    setScheduledReports(prev => prev?.map(schedule =>
      schedule?.id === scheduleId ? { ...schedule, ...updates } : schedule
    ));
  };

  const handleScheduleDelete = (scheduleId) => {
    if (confirm('Are you sure you want to delete this scheduled report?')) {
      setScheduledReports(prev => prev?.filter(schedule => schedule?.id !== scheduleId));
    }
  };

  const handleScheduleCreate = (newSchedule) => {
    setScheduledReports(prev => [...prev, newSchedule]);
  };

  const tabs = [
    { id: 'reports',   label: 'Reports Library',     icon: 'FileText'   },
    { id: 'dual',      label: 'Dual Report View',     icon: 'Columns'    },
    { id: 'scheduled', label: 'Scheduled Reports',    icon: 'Calendar'   },
    { id: 'csvview',   label: 'CSV Metrics View',     icon: 'Table'      },
    { id: 'auditlogs', label: 'Audit Logs',           icon: 'Clock'      },
  ];

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
                <h1 className="text-3xl font-bold" style={{ color: '#0B2E33' }}>Compliance Reports</h1>
                <p className="text-muted-foreground mt-2">
                  Generate, manage, and distribute comprehensive compliance documentation
                </p>
              </div>
              <Button
                variant="default"
                iconName="Plus"
                iconPosition="left"
                onClick={() => setIsGenerationPanelOpen(true)}
              >
                Generate Report
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-border mb-6">
            <nav className="flex space-x-8">
              {tabs?.map((tab) => (
                <button
                  key={tab?.id}
                  onClick={() => setActiveTab(tab?.id)}
                  className={`
                    flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab?.id
                      ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                    }
                  `}
                >
                  <Icon name={tab?.icon} size={16} />
                  <span>{tab?.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'reports' && (
            <>
              {/* Filters */}
              <ReportFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onClearFilters={handleClearFilters}
                onSaveFilters={handleSaveFilters}
                savedFilters={savedFilters}
              />

              {/* Reports Grid */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    Reports Library ({filteredReports?.length})
                  </h2>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    {generatingReports?.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <Icon name="Loader2" size={16} className="animate-spin" />
                        <span>{generatingReports?.length} generating...</span>
                      </div>
                    )}
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
                  </div>
                ) : filteredReports?.length === 0 ? (
                  <div className="text-center py-16 bg-card border border-border rounded-xl">
                    <Icon name="FileX" size={48} className="text-muted-foreground mx-auto mb-4 opacity-30" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No reports available</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      No data available. Please upload or input data to begin monitoring.
                    </p>
                    <Button variant="default" onClick={() => window.location.href = '/monitoring'}>
                      <Icon name="Upload" size={15} className="mr-2" /> Go to Monitoring
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredReports?.map((report) => (
                      <ReportCard
                        key={report?.id}
                        report={report}
                        onPreview={handlePreview}
                        onGenerate={handleReportGeneration}
                        onDownload={handleDownload}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'dual' && (
            <DualReportView scans={dualScans} apiBase={API_BASE_RPT} />
          )}

          {activeTab === 'scheduled' && (
            <ScheduledReportsPanel
              scheduledReports={scheduledReports}
              onUpdateSchedule={handleScheduleUpdate}
              onDeleteSchedule={handleScheduleDelete}
              onCreateSchedule={handleScheduleCreate}
            />
          )}

          {activeTab === 'csvview' && (
            <CsvMetricsViewer />
          )}

          {activeTab === 'auditlogs' && (
            <AuditLogsPanel />
          )}
        </div>
      </main>
      {/* Modals */}
      <ReportGenerationPanel
        isOpen={isGenerationPanelOpen}
        onClose={() => setIsGenerationPanelOpen(false)}
        onGenerate={handleReportGeneration}
      />
      <ReportPreviewModal
        report={selectedReport}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedReport(null);
        }}
        onDownload={handleDownload}
      />
    </div>
  );
};

export default ComplianceReports;