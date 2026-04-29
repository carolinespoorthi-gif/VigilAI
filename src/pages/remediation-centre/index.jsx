import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/ui/Header';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const API_BASE = (import.meta?.env?.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

// ── UI Styles & Options ──────────────────────────────────────────────────────
const RISK_BADGE = {
  CRITICAL: { bg: '#FEF2F2', text: '#DC2626' },
  HIGH:     { bg: '#FFF7ED', text: '#EA580C' },
  MEDIUM:   { bg: '#EEF7F9', text: '#4F7C82' },
};

const STATUS_STYLES = {
  Pending:     { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' },
  'In Progress': { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' },
  Resolved:    { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' },
};

const SEV_COLOR = {
  Critical: '#DC2626',
  High:     '#EA580C',
  Medium:   '#4F7C82',
};

const FIX_OPTIONS = [
  { id: 'mask_pii',     label: 'Mask Persistent Identifiers', severity: 'Critical', desc: 'Anonymize Names, Emails, SSNs, and Phone Numbers.' },
  { id: 'rem_creds',    label: 'Remove Credentials',         severity: 'Critical', desc: 'Securely extract API keys, Secrets, and Auth tokens.' },
  { id: 'sanitize_inst',label: 'Institutional Sanitization',  severity: 'High',     desc: 'Replace sensitive org phrases with generic terms.' },
  { id: 'clear_metadata',label: 'Clear Hidden Metadata',      severity: 'Medium',   desc: 'Remove EXIF, author info, and hidden revision history.' },
];

export default function RemediationCentre() {
  const navigate = useNavigate();
  const location = useLocation();
  const [scans,        setScans]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [statuses,     setStatuses]     = useState({});
  const [expanded,     setExpanded]     = useState({});
  const [selectedFixes,setSelectedFixes]= useState({});  // scan_id → Set<fixId>
  const [fixing,       setFixing]       = useState({});   // scan_id → bool
  const [fixed,        setFixed]        = useState({});   // scan_id → reanalysis result
  const [fixStep,      setFixStep]      = useState({});   // scan_id → step string
  const [remediatedContent, setRemediatedContent] = useState({}); // scan_id → string
  const [reanalysisResult,  setReanalysisResult]  = useState({}); // scan_id → object
  const [showRemDoc,        setShowRemDoc]        = useState({}); // scan_id → bool

  useEffect(() => {
    console.log("RemediationCentre state:", location.state);
  }, [location.state]);

  useEffect(() => {
    const init = async () => {
      await fetchScans();
      
      // Auto-expand if alertData is passed
      if (location.state?.alertData) {
        const id = location.state.alertData.id || location.state.alertData.scan_id;
        if (id) {
          console.log("Auto-expanding scan:", id);
          setExpanded(prev => ({ ...prev, [id]: true }));
        }
      }
    };
    init();

    const h = () => fetchScans();
    window.addEventListener('dashboard:refresh', h);
    return () => window.removeEventListener('dashboard:refresh', h);
  }, [location.state]);

  const fetchScans = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/scans`);
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter(s => ['MEDIUM','HIGH','CRITICAL'].includes(s.risk_level));
        setScans(filtered);
        const initFixes = {};
        filtered.forEach(s => { initFixes[s.scan_id] = new Set(); });
        setSelectedFixes(prev => ({ ...initFixes, ...prev }));
      }
    } catch (e) {
      console.error('Failed to fetch scans', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand  = id => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const setStatus     = (id, s) => setStatuses(prev => ({ ...prev, [id]: s }));

  const toggleFix = (scanId, fixId) => {
    setSelectedFixes(prev => {
      const set = new Set(prev[scanId] || []);
      set.has(fixId) ? set.delete(fixId) : set.add(fixId);
      return { ...prev, [scanId]: set };
    });
  };

  const selectAllFixes = scanId => {
    setSelectedFixes(prev => ({
      ...prev,
      [scanId]: new Set(FIX_OPTIONS.map(f => f.id)),
    }));
  };

  // ── REAL Backend Remediation ──────────────────────────────────────────────
  const applyFixes = async (scan) => {
    const fixes = Array.from(selectedFixes[scan.scan_id] || []);
    if (!fixes.length) return;
    setFixing(prev => ({ ...prev, [scan.scan_id]: true }));

    const steps = [
      'Connecting to remediation engine…',
      'Masking sensitive data fields…',
      'Removing credentials & secrets…',
      'Preserving document structure…',
      'Generating remediated document…',
    ];

    for (const step of steps) {
      setFixStep(prev => ({ ...prev, [scan.scan_id]: step }));
      await new Promise(r => setTimeout(r, 500));
    }

    try {
      // Call real backend remediation
      const remResp = await fetch(`${API_BASE}/remediate/${scan.scan_id}`, {
        method: 'POST',
      });
      const remData = await remResp.json();

      if (!remResp.ok) throw new Error(remData?.detail || 'Remediation failed');

      setRemediatedContent(prev => ({ ...prev, [scan.scan_id]: remData.remediated_content }));

      // Step 2: Re-analyze
      setFixStep(prev => ({ ...prev, [scan.scan_id]: 'Re-running compliance pipeline on fixed document…' }));
      await new Promise(r => setTimeout(r, 600));

      const reResp = await fetch(`${API_BASE}/remediate/${scan.scan_id}/reanalyze`, {
        method: 'POST',
      });
      const reData = await reResp.json();

      if (!reResp.ok) throw new Error(reData?.detail || 'Re-analysis failed');

      const result = {
        newRiskScore: reData.after.risk_score,
        newComplianceScore: reData.after.compliance_score,
        newRiskLevel: reData.after.risk_level,
        newStatus: reData.after.compliance_status,
      };

      setFixed(prev => ({ ...prev, [scan.scan_id]: result }));
      setReanalysisResult(prev => ({ ...prev, [scan.scan_id]: reData }));
      setStatus(scan.scan_id, result.newStatus === 'COMPLIANT' ? 'Resolved' : 'In Progress');

    } catch (e) {
      console.error('Remediation error:', e);
      alert('Remediation failed: ' + e.message);
    } finally {
      setFixing(prev => ({ ...prev, [scan.scan_id]: false }));
      setFixStep(prev => ({ ...prev, [scan.scan_id]: null }));
    }
  };

  // ── Download remediated document from backend ─────────────────────────────
  const downloadRemediated = async (scanId) => {
    try {
      const resp = await fetch(`${API_BASE}/remediate/${scanId}/download`);
      if (!resp.ok) throw new Error('Download failed');
      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const disp = resp.headers.get('Content-Disposition') || '';
      const match = disp.match(/filename="?([^"]+)"?/);
      a.href = url;
      a.download = match ? match[1] : `remediated_document.txt`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    }
  };

  const downloadReport = async (scan) => {
    try {
      const form = new FormData();
      form.append('original_scan_id', scan.scan_id);
      form.append('format', 'pdf');

      const resp = await fetch(`${API_BASE}/reports/compliance-remediation`, {
        method: 'POST',
        body: form,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || err.detail || 'Report generation failed');
      }

      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `Vigil_AI_Report_${scan.filename}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Report Error: ' + e.message);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
          <BreadcrumbNavigation />

          {/* ── Page Header ── */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#0B2E33' }}>
                Remediation Centre
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Fix flagged documents, apply data masking, and verify compliance through re-analysis.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/monitoring')}>
              <Icon name="Upload" size={15} className="mr-2" />Upload New File
            </Button>
          </div>

          {/* ── Workflow guide bar ── */}
          <div className="rounded-2xl p-5 mb-8 flex items-center overflow-x-auto gap-0"
               style={{ background: '#0B2E33' }}>
            {[
              { icon: 'Search',      label: 'Review Scan'     },
              { icon: 'CheckSquare', label: 'Select Fixes'    },
              { icon: 'Wrench',      label: 'Apply Fixes'     },
              { icon: 'RefreshCw',   label: 'Re-analysis'     },
              { icon: 'BarChart2',   label: 'Compare Results' },
              { icon: 'FileDown',    label: 'Download Fixed'  },
            ].map((step, i, arr) => (
              <React.Fragment key={step.label}>
                <div className="flex flex-col items-center gap-1 flex-shrink-0 px-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center"
                       style={{ background: 'rgba(184,227,233,0.15)' }}>
                    <Icon name={step.icon} size={14} color="#B8E3E9" />
                  </div>
                  <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: '#93B1B5' }}>
                    {step.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex-1 h-px" style={{ background: 'rgba(184,227,233,0.15)', minWidth: 12 }} />
                )}
              </React.Fragment>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"
                   style={{ borderColor: '#4F7C82' }} />
            </div>
          ) : scans.length === 0 ? (
            <div className="bg-white border border-border rounded-2xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                   style={{ background: '#F0FDF4' }}>
                <Icon name="CheckCircle" size={32} style={{ color: '#16A34A' }} />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: '#0B2E33' }}>No flagged documents</h3>
              <p className="text-muted-foreground text-sm mb-4">
                No Medium+ risk scans found. Upload a file to start screening.
              </p>
              <Button onClick={() => navigate('/monitoring')}>Go to Monitoring</Button>
            </div>
          ) : (
            <div className="space-y-5">

              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Flagged', value: scans.length,
                    color: '#EA580C', icon: 'AlertTriangle' },
                  { label: 'Critical',       value: scans.filter(s => s.risk_level === 'CRITICAL').length,
                    color: '#DC2626', icon: 'AlertOctagon'  },
                  { label: 'Fixed',          value: Object.keys(fixed).length,
                    color: '#4F7C82', icon: 'Wrench'        },
                  { label: 'Resolved',       value: Object.values(statuses).filter(s => s === 'Resolved').length,
                    color: '#16A34A', icon: 'CheckCircle'   },
                ].map((c, i) => (
                  <div key={i} className="bg-white border border-border rounded-xl p-4 text-center shadow-sm">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-1"
                         style={{ background: `${c.color}18` }}>
                      <Icon name={c.icon} size={18} style={{ color: c.color }} />
                    </div>
                    <div className="text-3xl font-black" style={{ color: c.color }}>{c.value}</div>
                    <div className="text-xs text-muted-foreground uppercase mt-0.5">{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Scan cards */}
              {scans.map(scan => {
                const isOpen  = expanded[scan.scan_id];
                const status  = statuses[scan.scan_id] || 'Pending';
                const plan    = scan.remediation_plan   || {};
                const regs    = scan.violated_regulations || [];
                const remFlat = scan.remediation_actions  || [];
                const fixes   = selectedFixes[scan.scan_id] || new Set();
                const isFix   = fixing[scan.scan_id];
                const fixR    = fixed[scan.scan_id];
                const rb      = RISK_BADGE[scan.risk_level] || { bg: '#93B1B5', text: '#fff' };
                const ss      = STATUS_STYLES[status] || STATUS_STYLES.Pending;
                const remContent = remediatedContent[scan.scan_id];
                const showDoc = showRemDoc[scan.scan_id];

                return (
                  <div key={scan.scan_id}
                       className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">

                    {/* Card header */}
                    <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-muted/10 transition-colors"
                         onClick={() => toggleExpand(scan.scan_id)}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                             style={{ background: '#EEF7F9' }}>
                          <Icon name="FileText" size={20} style={{ color: '#4F7C82' }} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold truncate" style={{ color: '#0B2E33' }}>
                            {scan.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {scan.scanned_at ? new Date(scan.scanned_at).toLocaleString() : ''}
                            {fixR && (
                              <span className="ml-2 font-semibold" style={{ color: '#16A34A' }}>
                                ✓ Fixed &amp; Re-analyzed
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 ml-4 shrink-0">
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase"
                              style={{ background: rb.bg, color: rb.text }}>
                          {scan.risk_level}
                        </span>
                        <div className="hidden sm:flex flex-col items-center min-w-[48px]">
                          <span className="text-sm font-bold" style={{ color: '#0B2E33' }}>
                            {fixR ? fixR.newRiskScore : scan.risk_score}/100
                          </span>
                          <span className="text-[10px] text-muted-foreground">Risk</span>
                        </div>
                        <div className="hidden sm:flex flex-col items-center min-w-[60px]">
                          <span className="text-sm font-bold" style={{ color: '#0B2E33' }}>
                            {fixR ? fixR.newComplianceScore : scan.compliance_score}/100
                          </span>
                          <span className="text-[10px] text-muted-foreground">Compliance</span>
                        </div>
                        <select
                          value={status}
                          onChange={e => { e.stopPropagation(); setStatus(scan.scan_id, e.target.value); }}
                          onClick={e => e.stopPropagation()}
                          className="text-xs font-semibold border rounded-full px-3 py-1 cursor-pointer outline-none"
                          style={{ background: ss.bg, color: ss.text, borderColor: ss.border }}
                        >
                          <option>Pending</option>
                          <option>In Progress</option>
                          <option>Resolved</option>
                        </select>
                        <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size={16}
                              className="text-muted-foreground" />
                      </div>
                    </div>

                    {/* Expanded panel */}
                    {isOpen && (
                      <div className="border-t border-border" style={{ background: '#FAFEFF' }}>

                        {/* ── Before vs After (shown only after fix) ── */}
                        {fixR && (
                          <div className="p-5 border-b border-border">
                            <h4 className="text-sm font-bold mb-4 flex items-center gap-2"
                                style={{ color: '#0B2E33' }}>
                              <Icon name="ArrowLeftRight" size={15} style={{ color: '#4F7C82' }} />
                              Before vs After Remediation
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="rounded-xl p-4"
                                   style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                                <p className="text-xs font-bold uppercase tracking-wide mb-3"
                                   style={{ color: '#DC2626' }}>📋 Before Fix</p>
                                {[
                                  ['Risk Score',   `${scan.risk_score}/100`],
                                  ['Compliance',   `${scan.compliance_score}/100`],
                                  ['Risk Level',   scan.risk_level],
                                  ['Status',       'NON-COMPLIANT'],
                                ].map(([k, v]) => (
                                  <div key={k} className="flex justify-between text-xs mb-1">
                                    <span className="text-muted-foreground">{k}</span>
                                    <span className="font-bold" style={{ color: '#DC2626' }}>{v}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="rounded-xl p-4"
                                   style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                                <p className="text-xs font-bold uppercase tracking-wide mb-3"
                                   style={{ color: '#16A34A' }}>✅ After Fix</p>
                                {[
                                  ['Risk Score',  `${fixR.newRiskScore}/100  (↓${scan.risk_score - fixR.newRiskScore})`],
                                  ['Compliance',  `${fixR.newComplianceScore}/100  (↑${fixR.newComplianceScore - scan.compliance_score})`],
                                  ['Risk Level',  fixR.newRiskLevel],
                                  ['Status',      fixR.newStatus === 'COMPLIANT' ? 'COMPLIANT' : 'NON-COMPLIANT'],
                                ].map(([k, v]) => (
                                  <div key={k} className="flex justify-between text-xs mb-1">
                                    <span className="text-muted-foreground">{k}</span>
                                    <span className="font-bold" style={{ color: '#16A34A' }}>{v}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Post-Fix Analysis */}
                            <div className="mt-4 p-4 rounded-xl"
                                 style={{
                                   background: fixR.newStatus === 'COMPLIANT' ? '#F0FDF4' : '#FFFBEB',
                                   border: `1px solid ${fixR.newStatus === 'COMPLIANT' ? '#BBF7D0' : '#FDE68A'}`,
                                 }}>
                              <p className="text-xs font-bold uppercase tracking-wide mb-1"
                                 style={{ color: fixR.newStatus === 'COMPLIANT' ? '#16A34A' : '#CA8A04' }}>
                                Post-Fix Analysis
                              </p>
                              <p className="text-xs leading-relaxed" style={{ color: '#0B2E33' }}>
                                {fixR.newStatus === 'COMPLIANT'
                                  ? `After applying remediation fixes, this document is now COMPLIANT. Risk dropped from ${scan.risk_score} → ${fixR.newRiskScore}/100 and compliance improved from ${scan.compliance_score} → ${fixR.newComplianceScore}/100. The document is safe for use and can be downloaded below.`
                                  : `After applying fixes, risk has been reduced from ${scan.risk_score} → ${fixR.newRiskScore}/100. Additional fixes may still be required to achieve full compliance (target: Risk ≤ 10, Compliance ≥ 85).`
                                }
                              </p>
                            </div>

                            {/* Download Remediated Document + View */}
                            <div className="mt-4 flex flex-wrap gap-3">
                              <button
                                onClick={() => downloadRemediated(scan.scan_id)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-all"
                                style={{ background: '#16A34A' }}>
                                <Icon name="Download" size={14} />
                                Download Remediated Document
                              </button>
                              <button
                                onClick={() => setShowRemDoc(prev => ({ ...prev, [scan.scan_id]: !prev[scan.scan_id] }))}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all"
                                style={{ borderColor: '#4F7C82', color: '#0B2E33', background: '#EEF7F9' }}>
                                <Icon name={showDoc ? 'EyeOff' : 'Eye'} size={14} />
                                {showDoc ? 'Hide' : 'View'} Remediated Document
                              </button>
                            </div>

                            {/* Remediated document content */}
                            {showDoc && remContent && (
                              <div className="mt-4 rounded-xl overflow-hidden"
                                   style={{ border: '1px solid #BBF7D0' }}>
                                <div className="px-4 py-2 flex items-center gap-2"
                                     style={{ background: '#F0FDF4' }}>
                                  <Icon name="FileCheck" size={14} style={{ color: '#16A34A' }} />
                                  <span className="text-xs font-bold" style={{ color: '#16A34A' }}>
                                    Remediated Document Content
                                  </span>
                                </div>
                                <pre className="p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words overflow-auto max-h-64"
                                     style={{ background: '#FAFEFF', color: '#0B2E33' }}>
                                  {remContent}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="p-5 space-y-5">

                          {/* Violated regulations */}
                          <div>
                            <h4 className="text-sm font-bold mb-2" style={{ color: '#0B2E33' }}>
                              Regulatory Violations
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {regs.length > 0
                                ? regs.map((r, i) => (
                                    <span key={i} className="px-2 py-1 text-xs font-bold rounded-full"
                                          style={{ background: '#FEF2F2', color: '#DC2626',
                                                   border: '1px solid #FECACA' }}>
                                      {r}
                                    </span>
                                  ))
                                : <span className="text-xs text-muted-foreground">None detected</span>
                              }
                            </div>
                          </div>

                          {/* PII Summary */}
                          <div>
                            <h4 className="text-sm font-bold mb-2" style={{ color: '#0B2E33' }}>
                              PII Summary — {scan.risk_items || 0} instances
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(scan.pii_detected || {})
                                .filter(([, v]) => v > 0)
                                .map(([k, v]) => (
                                  <span key={k} className="px-2 py-1 text-xs rounded-lg font-medium"
                                        style={{ background: '#EEF7F9', color: '#4F7C82',
                                                 border: '1px solid #B8E3E9' }}>
                                    {k.replace(/_/g, ' ')}: <strong>{v}</strong>
                                  </span>
                                ))}
                            </div>
                          </div>

                          {/* ── Document Fixing Engine (shown before fix is applied) ── */}
                          {!fixR && (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-bold flex items-center gap-2"
                                    style={{ color: '#0B2E33' }}>
                                  <Icon name="Wrench" size={15} style={{ color: '#4F7C82' }} />
                                  Document Fixing Engine
                                </h4>
                                <button
                                  className="text-xs font-medium underline"
                                  style={{ color: '#4F7C82' }}
                                  onClick={() => selectAllFixes(scan.scan_id)}>
                                  Select All
                                </button>
                              </div>
                              <p className="text-xs text-muted-foreground mb-3">
                                Choose which fixes to apply. Credentials will be <strong>completely removed</strong>,
                                while identifiers will be <strong>masked</strong>. Document structure is preserved.
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                                {FIX_OPTIONS.map(opt => {
                                  const checked = fixes.has(opt.id);
                                  return (
                                    <button
                                      key={opt.id}
                                      onClick={() => toggleFix(scan.scan_id, opt.id)}
                                      className="flex items-start gap-3 p-3 rounded-xl border text-left transition-all"
                                      style={{
                                        background:   checked ? '#EEF7F9' : 'white',
                                        borderColor:  checked ? '#4F7C82' : '#D4EDF1',
                                        boxShadow:    checked ? '0 0 0 1px #4F7C82' : 'none',
                                      }}>
                                      <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5"
                                           style={{
                                             background:  checked ? '#4F7C82' : 'white',
                                             border:      `2px solid ${checked ? '#4F7C82' : '#D1D5DB'}`,
                                           }}>
                                        {checked && <Icon name="Check" size={11} color="white" />}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <span className="text-xs font-bold" style={{ color: '#0B2E33' }}>
                                            {opt.label}
                                          </span>
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                                style={{
                                                  background: `${SEV_COLOR[opt.severity]}18`,
                                                  color: SEV_COLOR[opt.severity],
                                                }}>
                                            {opt.severity}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground leading-tight">
                                          {opt.desc}
                                        </p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Fix progress indicator */}
                              {isFix && (
                                <div className="mb-4 p-4 rounded-xl flex items-center gap-3"
                                     style={{ background: '#EEF7F9', border: '1px solid #B8E3E9' }}>
                                  <Icon name="Loader2" size={18} className="animate-spin shrink-0"
                                        style={{ color: '#4F7C82' }} />
                                  <div>
                                    <p className="text-xs font-bold" style={{ color: '#0B2E33' }}>
                                      Applying fixes…
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {fixStep[scan.scan_id]}
                                    </p>
                                  </div>
                                </div>
                              )}

                              <button
                                onClick={() => applyFixes(scan)}
                                disabled={fixes.size === 0 || isFix}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-40"
                                style={{ background: '#0B2E33' }}>
                                {isFix
                                  ? <><Icon name="Loader2" size={14} className="animate-spin" />Fixing…</>
                                  : <><Icon name="Wrench" size={14} />
                                      Apply {fixes.size > 0
                                        ? `${fixes.size} Fix${fixes.size > 1 ? 'es' : ''}`
                                        : 'Fixes'}
                                    </>
                                }
                              </button>
                              {fixes.size === 0 && !isFix && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  ↑ Select at least one fix to enable
                                </p>
                              )}
                            </div>
                          )}

                          {/* Mitigation plan */}
                          <div>
                            <h4 className="text-sm font-bold mb-3" style={{ color: '#0B2E33' }}>
                              AI Remediation Plan
                            </h4>
                            <div className="space-y-2">
                              {[
                                { key:'immediate_actions',  label:'⚡ Immediate Actions',     bg:'#FEF2F2', border:'#FECACA', text:'#991B1B' },
                                { key:'short_term_actions', label:'📅 Short-term (30 days)',  bg:'#FFF7ED', border:'#FED7AA', text:'#9A3412' },
                                { key:'technical_controls', label:'🔧 Technical Controls',    bg:'#EEF7F9', border:'#B8E3E9', text:'#164E63' },
                                { key:'compliance_notes',   label:'📋 Compliance Notes',      bg:'#F5F3FF', border:'#DDD6FE', text:'#5B21B6' },
                              ].map(({ key, label, bg, border, text }) => {
                                const items = plan[key] || [];
                                if (!items.length) return null;
                                return (
                                  <div key={key} className="p-3 rounded-xl"
                                       style={{ background: bg, border: `1px solid ${border}` }}>
                                    <p className="text-[10px] font-bold uppercase mb-1.5" style={{ color: text }}>
                                      {label}
                                    </p>
                                    <ul className="list-disc ml-4 space-y-0.5">
                                      {items.map((item, i) => (
                                        <li key={i} className="text-xs" style={{ color: '#0B2E33' }}>{item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                );
                              })}
                              {!plan.immediate_actions?.length && remFlat.length > 0 && (
                                <div className="p-3 rounded-xl"
                                     style={{ background: '#EEF7F9', border: '1px solid #B8E3E9' }}>
                                  <ul className="list-disc ml-4 space-y-0.5">
                                    {remFlat.map((r, i) => (
                                      <li key={i} className="text-xs" style={{ color: '#0B2E33' }}>{r}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
                            <button
                              onClick={() => downloadReport(scan)}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                              style={{ background: '#0B2E33' }}>
                              <Icon name="Download" size={14} />
                              {fixR ? 'Download Post-Fix Report (PDF)' : 'Download Report (PDF)'}
                            </button>
                            <button
                              onClick={() => navigate('/risk-assessment-details')}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border"
                              style={{ borderColor: '#93B1B5', color: '#4F7C82', background: 'white' }}>
                              <Icon name="Shield" size={14} />Risk Details
                            </button>
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}