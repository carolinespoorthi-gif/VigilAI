// src/pages/monitoring/index.jsx
// ─────────────────────────────────────────────────────────────────────────────
// MONITORING PAGE — Full Vigil AI Pipeline
// STEP 1: Detection  →  STEP 2: AI Analysis (before scores)  →  STEP 3: Scoring
// STEP 4: Report  →  STEP 5: Remediation Plan
// High-Risk Overlay when risk_score >= 90
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

const API_BASE   = (import.meta?.env?.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
const UPLOAD_URL = `${API_BASE}/chat/upload`;
const TEXT_URL   = `${API_BASE}/scan/text`;
const URL_SCAN   = `${API_BASE}/scan/url`;
const SIM_URL    = `${API_BASE}/scan/simulate`;

const ALLOWED_EXT = ['.json', '.txt', '.pdf', '.docx'];
const MAX_BYTES   = 1 * 1024 * 1024 * 1024;

// ── Risk colour helpers ───────────────────────────────────────────────────────
const RISK_COLORS = {
  CRITICAL: { bg: '#DC2626', text: '#fff', light: '#FEF2F2', border: '#FECACA' },
  HIGH:     { bg: '#EA580C', text: '#fff', light: '#FFF7ED', border: '#FED7AA' },
  MEDIUM:   { bg: '#CA8A04', text: '#fff', light: '#FEFCE8', border: '#FEF08A' },
  LOW:      { bg: '#16A34A', text: '#fff', light: '#F0FDF4', border: '#BBF7D0' },
  'NO RISK':{ bg: '#059669', text: '#fff', light: '#ECFDF5', border: '#A7F3D0' },
  NONE:     { bg: '#4F7C82', text: '#fff', light: '#EEF7F9', border: '#B8E3E9' },
};

function riskColor(level) {
  const key = level?.toUpperCase()?.replace(/_/g, ' ') || 'NONE';
  return RISK_COLORS[key] || RISK_COLORS.NONE;
}

// ── Severity badge for findings table ────────────────────────────────────────
const SEV_BADGE = {
  Critical: { bg: '#DC2626', text: '#fff' },
  High:     { bg: '#EA580C', text: '#fff' },
  Medium:   { bg: '#CA8A04', text: '#fff' },
  Low:      { bg: '#16A34A', text: '#fff' },
};

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'upload',   label: 'Upload File',    icon: 'Upload'        },
  { id: 'url',      label: 'URL Feed',       icon: 'Globe'         },
  { id: 'paste',    label: 'Paste Text',     icon: 'ClipboardList' },
  { id: 'simulate', label: 'Simulate Data',  icon: 'FlaskConical'  },
];

// ── Pipeline steps ────────────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  { id: 1, label: 'Detection',       icon: 'ScanLine'    },
  { id: 2, label: 'AI Analysis',     icon: 'Brain'       },
  { id: 3, label: 'Scoring',         icon: 'BarChart2'   },
  { id: 4, label: 'Report',          icon: 'FileText'    },
  { id: 5, label: 'Remediation',     icon: 'Wrench'      },
];

// ── AI-generated natural language explanation builder ────────────────────────
// The natural language explanation is now generated exclusively by the backend's
// Live AI Analysis module to ensure 100% strict adherence to scoring logic 
// and regulatory mapping constraints.
// ─────────────────────────────────────────────────────────────────────────────
export default function MonitoringPage() {
  const navigate = useNavigate();
  const fileRef  = useRef(null);
  const { user } = useAuth();

  // Helper: get auth headers for fetch calls
  const getAuthHeaders = () => {
    const token = user?.token || localStorage.getItem('token') || sessionStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const [activeTab,    setActiveTab]    = useState('upload');
  const [processing,   setProcessing]   = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [result,       setResult]       = useState(null);
  const [error,        setError]        = useState(null);
  const [showOverlay,  setShowOverlay]  = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);   // 0 = idle, 1-5 = active step

  // original document modal states
  const [showOriginal,    setShowOriginal]    = useState(false);
  const [originalContent, setOriginalContent] = useState('');
  const [loadingOriginal, setLoadingOriginal] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // input states
  const [dragActive,   setDragActive]   = useState(false);
  const [urlValue,     setUrlValue]     = useState('');
  const [pasteText,    setPasteText]    = useState('');
  const [pasteFormat,  setPasteFormat]  = useState('plain');
  const [simDataType,  setSimDataType]  = useState('personal');
  const [simRiskLevel, setSimRiskLevel] = useState('medium');
  const [simFormat,    setSimFormat]    = useState('text');
  const [simPreview,   setSimPreview]   = useState('');
  const [clearingHistory, setClearingHistory] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const reset = () => {
    setError(null);
    setResult(null);
    setProgress(0);
    setShowOverlay(false);
    setSimPreview('');
    setPipelineStep(0);
    setShowOriginal(false);
    setOriginalContent('');
  };

  // ── Fetch original document content ────────────────────────────────────
  const fetchOriginalDoc = async (scanId) => {
    setLoadingOriginal(true);
    try {
      const resp = await fetch(`${API_BASE}/scans/${scanId}/content`);
      const data = await resp.json();
      if (resp.ok) {
        setOriginalContent(data.content || '');
        setShowOriginal(true);
      } else {
        setError(data?.detail || 'Failed to load document');
      }
    } catch (e) {
      setError(e.message || 'Failed to load document');
    } finally {
      setLoadingOriginal(false);
    }
  };

  const runPipelineAnimation = async () => {
    for (let s = 1; s <= 5; s++) {
      setPipelineStep(s);
      await new Promise(r => setTimeout(r, s === 2 ? 900 : 500));
    }
  };

  const handleResult = async (res, sourceName) => {
    await runPipelineAnimation();
    const ai    = res?.report?.ai_analysis || {};
    const score = ai?.risk_score ?? 0;
    setResult({ ...res, filename: sourceName });
    // Trigger overlay safely and clear stale state
    if (score >= 90) setShowOverlay(true);
    else setShowOverlay(false);
    window.dispatchEvent(new Event('dashboard:refresh'));
  };

  // ── TAB 1 — File Upload ────────────────────────────────────────────────────
  const onDragOver  = useCallback(e => { e.preventDefault(); setDragActive(true);  }, []);
  const onDragLeave = useCallback(e => { e.preventDefault(); setDragActive(false); }, []);
  const onDrop      = useCallback(e => {
    e.preventDefault(); setDragActive(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) handleFiles(files);
  }, []);

  const onFileInput = e => {
    const files = Array.from(e.target.files || []);
    if (files.length) handleFiles(files);
    e.target.value = null;
  };

  const validateFile = file => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext))
      return `Unsupported type. Allowed: ${ALLOWED_EXT.join(', ')}`;
    if (file.size > MAX_BYTES) return 'File too large (max 1 GB).';
    return null;
  };

  const uploadFile = file => new Promise((resolve, reject) => {
    const xr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append('file', file);
    xr.open('POST', UPLOAD_URL, true);
    // Add auth header to XHR
    const token = user?.token || localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) xr.setRequestHeader('Authorization', `Bearer ${token}`);
    xr.upload.onprogress = ev => {
      if (ev.lengthComputable) setProgress(Math.round(ev.loaded / ev.total * 100));
    };
    xr.onload = () => {
      if (xr.status >= 200 && xr.status < 300) {
        try { resolve(JSON.parse(xr.responseText)); }
        catch { reject(new Error('Invalid server response')); }
      } else {
        let msg = `Upload failed (${xr.status})`;
        try { msg += ' — ' + JSON.parse(xr.responseText)?.detail; } catch {}
        reject(new Error(msg));
      }
    };
    xr.onerror = () => reject(new Error('Network error — is the backend running?'));
    xr.send(fd);
  });

  const handleFiles = async files => {
    reset();
    const file = files[0];
    const err  = validateFile(file);
    if (err) { setError(err); return; }
    setProcessing(true);
    try {
      const res = await uploadFile(file);
      await handleResult(res, file.name);
    } catch (e) {
      setError(e.message || 'Upload failed');
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  // ── TAB 2 — URL Feed ──────────────────────────────────────────────────────
  const handleUrlScan = async () => {
    reset();
    if (!urlValue.trim()) { setError('Please enter a URL.'); return; }
    setProcessing(true);
    try {
      const resp = await fetch(URL_SCAN, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ url: urlValue.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.detail || `Error ${resp.status}`);
      await handleResult(data, urlValue.trim());
    } catch (e) { setError(e.message); }
    finally { setProcessing(false); }
  };

  // ── TAB 3 — Paste Text ────────────────────────────────────────────────────
  const handleTextScan = async () => {
    reset();
    if (pasteText.trim().length < 10) { setError('Please paste at least 10 characters.'); return; }
    setProcessing(true);
    try {
      const resp = await fetch(TEXT_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ text: pasteText, format: pasteFormat, source_name: 'pasted-text' }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.detail || `Error ${resp.status}`);
      await handleResult(data, `Pasted text (${pasteFormat})`);
    } catch (e) { setError(e.message); }
    finally { setProcessing(false); }
  };

  // ── TAB 4 — Simulate Data ─────────────────────────────────────────────────
  const handleSimGenerate = async () => {
    reset();
    setProcessing(true);
    try {
      const resp = await fetch(SIM_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ data_type: simDataType, risk_level: simRiskLevel, format: simFormat }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.detail || `Error ${resp.status}`);
      setSimPreview(data.preview || '');
      await handleResult(data, `Simulated ${simDataType} data`);
    } catch (e) { setError(e.message); }
    finally { setProcessing(false); }
  };

  const downloadSim = () => {
    if (!simPreview) return;
    const ext  = simFormat === 'json' ? 'json' : simFormat === 'yaml' ? 'yaml' : 'txt';
    const blob = new Blob([simPreview], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `simulated-${simDataType}-${simRiskLevel}.${ext}`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  // ── Report download ───────────────────────────────────────────────────────
  const downloadReport = async fmt => {
    if (!result) return;
    setProcessing(true);
    try {
      const ai = result?.report?.ai_analysis || {};
      const payload = {
        filename:             result.filename || 'scan',
        risk_score:           ai.risk_score ?? 0,
        compliance_score:     ai.compliance_score ?? 0,
        risk_level:           ai.risk_level ?? 'UNKNOWN',
        compliance_status:    ai.compliance_status ?? 'UNKNOWN',
        detailed_findings:    ai.detailed_findings ?? [],
        violated_regulations: ai.violated_regulations ?? [],
        remediation_plan:     ai.remediation_plan ?? {},
      };
      const form = new FormData();
      form.append('format', fmt);
      form.append('payload_json', JSON.stringify(payload));
      const resp = await fetch(`${API_BASE}/reports/generate`, { method: 'POST', body: form });
      if (!resp.ok) throw new Error(`Report error (${resp.status})`);
      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `compliance_report.${fmt}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e.message); }
    finally { setProcessing(false); }
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const ai        = result?.report?.ai_analysis || {};
  const riskScore = ai.risk_score  ?? 0;
  const compScore = 100 - riskScore;
  const riskLevel = ai.risk_level  || (riskScore === 0 ? 'NO RISK' : 'LOW');
  const findings  = ai.detailed_findings || [];
  const regs      = ai.violated_regulations || [];
  const remPlan   = ai.remediation_plan || {};
  const remFlat   = ai.remediation_actions || [];
  const showFix   = ['MEDIUM','HIGH','CRITICAL'].includes(riskLevel) && result;
  const rc        = riskColor(riskLevel);
  // Backend provides the full AI analysis explanation 
  const aiExpl    = ai?.ai_explanation || null;

  const selectCls = 'w-full border border-border bg-white text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
          <BreadcrumbNavigation />

          {/* ── Page Title ── */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#0B2E33' }}>Monitoring</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Upload or input data for full PII screening, AI analysis, risk scoring, and compliance assessment.
              </p>
            </div>
            <button
              onClick={async () => {
                setClearingHistory(true);
                try {
                  const resp = await fetch(`${API_BASE}/api/clear-history`, {
                    method: 'DELETE',
                    headers: getAuthHeaders(),
                  });
                  if (resp.ok) {
                    reset();
                    window.dispatchEvent(new Event('dashboard:refresh'));
                  }
                } catch (e) {
                  console.error('Clear history failed', e);
                } finally {
                  setClearingHistory(false);
                }
              }}
              disabled={clearingHistory}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50"
              style={{ borderColor: '#DC2626', color: '#DC2626', background: '#FEF2F2' }}
            >
              <Icon name={clearingHistory ? 'Loader2' : 'Trash2'} size={15} className={clearingHistory ? 'animate-spin' : ''} />
              {clearingHistory ? 'Clearing...' : 'Clear History'}
            </button>
          </div>

          {/* ── Pipeline Progress Indicator ── */}
          {(processing || pipelineStep > 0) && (
            <div className="mb-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#4F7C82' }}>
                Pipeline Progress
              </p>
              <div className="flex items-center gap-2">
                {PIPELINE_STEPS.map((step, idx) => {
                  const done    = pipelineStep > step.id;
                  const active  = pipelineStep === step.id;
                  const pending = pipelineStep < step.id;
                  return (
                    <React.Fragment key={step.id}>
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
                          style={{
                            background: done ? '#16A34A' : active ? '#0B2E33' : '#EEF7F9',
                            color: (done || active) ? '#fff' : '#93B1B5',
                            boxShadow: active ? '0 0 0 4px rgba(79,124,130,0.25)' : 'none',
                          }}
                        >
                          {done
                            ? <Icon name="Check" size={16} />
                            : active
                              ? <Icon name="Loader2" size={16} className="animate-spin" />
                              : <Icon name={step.icon} size={14} />
                          }
                        </div>
                        <span className="text-[10px] font-medium text-center leading-tight"
                              style={{ color: done ? '#16A34A' : active ? '#0B2E33' : '#93B1B5' }}>
                          {step.label}
                        </span>
                      </div>
                      {idx < PIPELINE_STEPS.length - 1 && (
                        <div className="flex-1 h-0.5 rounded-full transition-all duration-500"
                             style={{ background: done ? '#16A34A' : '#D4EDF1' }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Feed Input Card ── */}
          <div className="bg-white border border-border rounded-2xl shadow-sm mb-6 overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-border"
                 style={{ background: '#EEF7F9' }}>
              <Icon name="Zap" size={16} style={{ color: '#4F7C82' }} />
              <span className="font-semibold text-sm" style={{ color: '#0B2E33' }}>Feed Input</span>
            </div>

            {/* Tab Pills */}
            <div className="flex gap-2 px-6 pt-4 pb-3 flex-wrap">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); reset(); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200"
                  style={
                    activeTab === tab.id
                      ? { background: '#0B2E33', color: '#fff', borderColor: '#0B2E33' }
                      : { background: 'transparent', color: '#4F7C82', borderColor: '#93B1B5' }
                  }
                >
                  <Icon name={tab.icon} size={13} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="px-6 pb-6">
              {/* ── Upload File ── */}
              {activeTab === 'upload' && (
                <div
                  onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
                  style={{
                    borderColor: dragActive ? '#4F7C82' : '#B8E3E9',
                    background:  dragActive ? 'rgba(79,124,130,0.05)' : '#FAFEFF',
                  }}
                >
                  <input ref={fileRef} type="file" accept={ALLOWED_EXT.join(',')}
                         onChange={onFileInput} className="hidden" />
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                       style={{ background: '#EEF7F9' }}>
                    <Icon name="Upload" size={32} style={{ color: '#4F7C82' }} />
                  </div>
                  <p className="text-lg font-semibold" style={{ color: '#0B2E33' }}>
                    {dragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supported: {ALLOWED_EXT.join(', ')} · Max 1 GB
                  </p>
                  {processing && (
                    <div className="w-full max-w-md mt-5">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Processing…</span><span>{progress}%</span>
                      </div>
                      <div className="w-full rounded-full h-2" style={{ background: '#D4EDF1' }}>
                        <div className="h-2 rounded-full transition-all"
                             style={{ width: `${progress}%`, background: '#4F7C82' }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── URL Feed ── */}
              {activeTab === 'url' && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium" style={{ color: '#0B2E33' }}>
                    Enter a publicly accessible URL to fetch and scan
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="url" value={urlValue}
                      onChange={e => setUrlValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleUrlScan()}
                      placeholder="https://example.com/data"
                      className="flex-1 border border-border bg-white text-foreground rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <Button variant="default" onClick={handleUrlScan} disabled={processing}>
                      {processing
                        ? <><Icon name="Loader2" size={15} className="mr-2 animate-spin" />Fetching…</>
                        : <><Icon name="Globe" size={15} className="mr-2" />Fetch & Scan</>}
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Paste Text ── */}
              {activeTab === 'paste' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium" style={{ color: '#0B2E33' }}>Paste your data below</label>
                    <select value={pasteFormat} onChange={e => setPasteFormat(e.target.value)}
                            className="border border-border bg-white rounded-md px-2 py-1 text-xs focus:outline-none">
                      <option value="plain">Plain Text</option>
                      <option value="json">JSON</option>
                      <option value="yaml">YAML</option>
                    </select>
                  </div>
                  <textarea
                    value={pasteText} onChange={e => setPasteText(e.target.value)} rows={10}
                    placeholder={"Paste JSON, YAML, or plain text here…\n\nExample:\nName: John Smith\nEmail: john@example.com\nSSN: 123-45-6789"}
                    className="w-full border border-border bg-white text-foreground rounded-xl p-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent resize-y"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{pasteText.length} characters</span>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setPasteText('')} disabled={!pasteText}>Clear</Button>
                      <Button variant="default" onClick={handleTextScan}
                              disabled={processing || pasteText.length < 10}>
                        {processing
                          ? <><Icon name="Loader2" size={15} className="mr-2 animate-spin" />Screening…</>
                          : <><Icon name="ScanLine" size={15} className="mr-2" />Run Screening</>}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Simulate Data ── */}
              {activeTab === 'simulate' && (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground">
                    Generate realistic synthetic PII data and run it through the full compliance pipeline.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Data Type</label>
                      <select value={simDataType} onChange={e => setSimDataType(e.target.value)} className={selectCls}>
                        <option value="personal">Personal Data</option>
                        <option value="financial">Financial Data</option>
                        <option value="healthcare">Healthcare Data</option>
                        <option value="mixed">Mixed Data</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Risk Level</label>
                      <select value={simRiskLevel} onChange={e => setSimRiskLevel(e.target.value)} className={selectCls}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Format</label>
                      <select value={simFormat} onChange={e => setSimFormat(e.target.value)} className={selectCls}>
                        <option value="text">Plain Text</option>
                        <option value="json">JSON</option>
                        <option value="yaml">YAML</option>
                      </select>
                    </div>
                  </div>
                  {simPreview && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Generated Data Preview</span>
                        <button onClick={downloadSim}
                                className="flex items-center gap-1 text-xs hover:underline"
                                style={{ color: '#4F7C82' }}>
                          <Icon name="Download" size={12} /> Download
                        </button>
                      </div>
                      <pre className="border border-border rounded-xl p-4 text-xs font-mono overflow-auto max-h-48"
                           style={{ background: '#EEF7F9', color: '#0B2E33' }}>
                        {simPreview}
                      </pre>
                    </div>
                  )}
                  <Button variant="default" onClick={handleSimGenerate} disabled={processing}>
                    {processing
                      ? <><Icon name="Loader2" size={15} className="mr-2 animate-spin" />Generating…</>
                      : <><Icon name="FlaskConical" size={15} className="mr-2" />Generate & Run Screening</>}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ── Non-upload processing indicator ── */}
          {processing && activeTab !== 'upload' && (
            <div className="mb-4 flex items-center gap-3 p-4 rounded-xl text-sm"
                 style={{ background: '#EEF7F9', border: '1px solid #B8E3E9', color: '#4F7C82' }}>
              <Icon name="Loader2" size={18} className="animate-spin shrink-0" />
              <span>Running document through compliance pipeline…</span>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="mb-4 flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <Icon name="AlertCircle" size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
               CRITICAL RISK OVERLAY (risk_score >= 90)
          ═════════════════════════════════════════════════════════════════════*/}
          {showOverlay && (
            <div className="fixed inset-0 z-50 flex items-center justify-center"
                 style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
              <div className="overlay-animate bg-white rounded-2xl p-10 max-w-md w-full mx-4 text-center shadow-2xl"
                   style={{ border: '2px solid #DC2626' }}>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 critical-pulse"
                     style={{ background: '#FEF2F2', border: '2px solid #FECACA' }}>
                  <Icon name="AlertOctagon" size={40} style={{ color: '#DC2626' }} />
                </div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: '#DC2626' }}>
                  CRITICAL RISK DETECTED
                </h2>
                <div className="text-5xl font-black mb-2" style={{ color: '#DC2626' }}>
                  {riskScore}/100
                </div>
                <p className="text-sm font-semibold uppercase tracking-wider mb-4"
                   style={{ color: '#EA580C' }}>
                  Risk Level: CRITICAL
                </p>
                <p className="text-gray-600 text-sm mb-6">
                  Highly sensitive PII has been detected at a critical level.
                  Immediate action is required to prevent a data breach and avoid regulatory penalties.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    className="px-5 py-2.5 rounded-lg font-semibold text-sm text-white transition-all"
                    style={{ background: '#0B2E33' }}
                    onClick={() => { setShowOverlay(false); navigate('/compliance-reports'); }}
                  >
                    View Report
                  </button>
                  <button
                    className="px-5 py-2.5 rounded-lg font-semibold text-sm text-white transition-all"
                    style={{ background: '#DC2626' }}
                    onClick={() => { setShowOverlay(false); navigate('/remediation-centre'); }}
                  >
                    Start Remediation
                  </button>
                </div>
                <button
                  className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline"
                  onClick={() => setShowOverlay(false)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
               RESULTS — Shown after pipeline completes
          ═════════════════════════════════════════════════════════════════════*/}
          {result && (
            <div className="space-y-6">

              {riskScore === 0 && (
                <div className="bg-blue-600 text-white rounded-xl p-4 flex items-center justify-center shadow-lg transform transition-all animate-bounce-short">
                  <Icon name="CheckCircle" size={24} className="mr-3" />
                  <span className="font-bold text-lg">✔ Fully Compliant – No Risk Detected</span>
                </div>
              )}

              {/* ── STEP 2: AI ANALYSIS — Natural language explanation BEFORE scores ── */}
              <div className="rounded-2xl overflow-hidden shadow-sm"
                   style={{ border: '1px solid #B8E3E9' }}>
                <div className="px-6 py-4 flex items-center gap-3"
                     style={{ background: '#0B2E33' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center"
                       style={{ background: 'rgba(184,227,233,0.2)' }}>
                    <Icon name="Brain" size={16} color="#B8E3E9" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm">AI Analysis</span>
                    <span className="text-xs ml-3" style={{ color: '#93B1B5' }}>
                      Step 2 — Natural Language Explanation
                    </span>
                  </div>
                  <div className="ml-auto px-3 py-1 rounded-full text-xs font-bold"
                       style={{ background: rc.bg, color: rc.text }}>
                    {riskLevel}
                  </div>
                </div>
                <div className="p-6 space-y-4" style={{ background: '#FAFEFF' }}>
                  {/* What was found */}
                  <div className="rounded-xl p-4" style={{ background: '#EEF7F9', border: '1px solid #B8E3E9' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name="Search" size={14} style={{ color: '#4F7C82' }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#4F7C82' }}>
                        What Sensitive Data Was Found
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: '#0B2E33' }}>
                      {aiExpl?.whatFound}
                    </p>
                  </div>

                  {/* Why it is risky */}
                  <div className="rounded-xl p-4"
                       style={{ background: rc.light, border: `1px solid ${rc.border}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name="AlertTriangle" size={14} style={{ color: rc.bg }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: rc.bg }}>
                        Why This Is Risky
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: '#0B2E33' }}>
                      {aiExpl?.whyRisky}
                    </p>
                  </div>

                  {/* Which compliance rules are violated */}
                  <div className="rounded-xl p-4"
                       style={{ background: regs.length > 0 ? '#FFF7ED' : '#F0FDF4',
                                border: `1px solid ${regs.length > 0 ? '#FED7AA' : '#BBF7D0'}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name="Scale" size={14} style={{ color: regs.length > 0 ? '#EA580C' : '#16A34A' }} />
                      <span className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: regs.length > 0 ? '#EA580C' : '#16A34A' }}>
                        Compliance Rules Violated
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: '#0B2E33' }}>
                      {aiExpl?.complianceRules}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── STEP 3: SCORES ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Risk Score',       value: `${riskScore}/100`,
                    color: riskScore >= 70 ? '#DC2626' : riskScore >= 40 ? '#CA8A04' : '#16A34A',
                    icon: 'Gauge' },
                  { label: 'Compliance Score', value: `${compScore}/100`,
                    color: compScore >= 80 ? '#16A34A' : compScore >= 50 ? '#CA8A04' : '#DC2626',
                    icon: 'CheckSquare' },
                  { label: 'Risk Level',       value: riskLevel,
                    color: rc.bg, icon: 'AlertOctagon' },
                  { label: 'Status',
                    value: ai.compliance_status === 'COMPLIANT' ? 'COMPLIANT' : 'NON-COMPLIANT',
                    color: ai.compliance_status === 'COMPLIANT' ? '#16A34A' : '#DC2626',
                    icon: 'ShieldCheck' },
                ].map((c, i) => (
                  <div key={i} className="bg-white border border-border rounded-xl p-5 text-center shadow-sm">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
                         style={{ background: `${c.color}18` }}>
                      <Icon name={c.icon} size={20} style={{ color: c.color }} />
                    </div>
                    <div className="text-2xl font-black" style={{ color: c.color }}>{c.value}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{c.label}</div>
                  </div>
                ))}
              </div>

              {/* ── STEP 4: Action buttons (Report) ── */}
              <div className="flex flex-wrap gap-3">
                {/* View Original Document */}
                <button
                  onClick={() => fetchOriginalDoc(result?.scan_id)}
                  disabled={loadingOriginal}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm border transition-all disabled:opacity-50"
                  style={{ borderColor: '#4F7C82', color: '#0B2E33', background: '#EEF7F9' }}>
                  <Icon name={loadingOriginal ? 'Loader2' : 'FileText'} size={15}
                        className={loadingOriginal ? 'animate-spin' : ''} />
                  {loadingOriginal ? 'Loading...' : 'View Original Document'}
                </button>
                <button
                  onClick={async () => {
                    setLoadingPreview(true);
                    await new Promise(r => setTimeout(r, 600)); // fake delay
                    setLoadingPreview(false);
                    navigate('/compliance-reports');
                  }} 
                  disabled={processing || loadingPreview}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm border transition-all disabled:opacity-50"
                  style={{ borderColor: '#4F7C82', color: '#0B2E33', background: '#FAFEFF' }}>
                  <Icon name={loadingPreview ? 'Loader2' : 'Eye'} size={15} className={loadingPreview ? 'animate-spin' : ''} />
                  {loadingPreview ? 'Preparing...' : 'Preview Report'}
                </button>
                <button
                  onClick={() => downloadReport('pdf')} disabled={processing}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-50"
                  style={{ background: '#0B2E33' }}>
                  <Icon name="Download" size={15} />Generate PDF Report
                </button>
                <button
                  onClick={() => downloadReport('docx')} disabled={processing}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm border transition-all disabled:opacity-50"
                  style={{ borderColor: '#4F7C82', color: '#0B2E33', background: '#EEF7F9' }}>
                  <Icon name="Download" size={15} />Generate DOCX Report
                </button>
                <button
                  onClick={() => navigate('/risk-assessment-details')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm border transition-all"
                  style={{ borderColor: '#93B1B5', color: '#4F7C82', background: 'white' }}>
                  <Icon name="Shield" size={15} />View Risk Analysis
                </button>
                {showFix && (
                  <button
                    onClick={() => navigate('/remediation-centre')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm text-white transition-all"
                    style={{ background: '#DC2626' }}>
                    <Icon name="AlertTriangle" size={15} />Start Remediation
                  </button>
                )}
              </div>

              {/* ── Detected PII Entities Table ── */}
              {findings.length > 0 && (
                <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#0B2E33' }}>
                    <Icon name="Table" size={16} style={{ color: '#4F7C82' }} />
                    Detected PII Entities ({findings.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: '#EEF7F9' }}>
                          {['#','Type','Value','Severity','Category'].map(h => (
                            <th key={h} className="text-left px-3 py-2 font-bold uppercase tracking-wide"
                                style={{ color: '#4F7C82' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {findings.slice(0, 30).map((f, i) => {
                          const sc = SEV_BADGE[f.severity] || { bg: '#93B1B5', text: '#fff' };
                          const isNaac = f.type === 'NAAC_C4_ENTITY';
                          const naacLabel = isNaac && f.naac_sub_criterion ? `NAAC C${f.naac_sub_criterion}` : f.type?.replace(/_/g,' ');
                          return (
                            <tr key={i}
                                className="border-t border-border hover:bg-muted/20 transition-colors">
                              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                              <td className="px-3 py-2 font-bold" style={{ color: '#0B2E33' }}>
                                {naacLabel}
                                {isNaac && f.naac_sub_label && (
                                  <span className="ml-1 text-[9px] font-normal" style={{ color: '#4F7C82' }}>({f.naac_sub_label})</span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-mono" style={{ color: '#4F7C82' }}>
                                {f.value}
                                {isNaac && f.cross_mapping && f.cross_mapping.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {f.cross_mapping.map((reg, ri) => {
                                      const isGDPR = reg.includes('GDPR');
                                      const isISO = reg.includes('ISO');
                                      const badgeBg = isGDPR ? '#EFF6FF' : isISO ? '#F0FDFA' : '#FAEEFF';
                                      const badgeColor = isGDPR ? '#2563EB' : isISO ? '#0D9488' : '#9333EA';
                                      const badgeBorder = isGDPR ? '#BFDBFE' : isISO ? '#CCFBF1' : '#E9D5FF';
                                      return (
                                        <span key={ri} className="px-1.5 py-0.5 rounded text-[8px] font-bold"
                                              style={{ background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}` }}>
                                          {reg}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {riskScore === 0 ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold text-gray-500 bg-gray-100">
                                    INFO
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                                        style={{ background: sc.bg, color: sc.text }}>
                                    {f.severity}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {f.category && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                                        style={{ background: '#EEF7F9', color: '#4F7C82', border: '1px solid #B8E3E9' }}>
                                    {f.category}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {findings.length > 30 && (
                      <p className="text-xs text-muted-foreground text-center italic pt-2">
                        …and {findings.length - 30} more instances
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Violated Regulations ── */}
              {regs.length > 0 && (
                <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#0B2E33' }}>
                    <Icon name="Scale" size={16} style={{ color: '#EA580C' }} />
                    Violated Regulations
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {regs.map((r, i) => (
                      <span key={i}
                            className="px-3 py-1.5 text-xs font-bold rounded-full"
                            style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── STEP 5: Remediation Plan ── */}
              {(remPlan.immediate_actions?.length > 0 || remFlat.length > 0) && (
                <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-4">
                  <h3 className="font-bold flex items-center gap-2" style={{ color: '#0B2E33' }}>
                    <Icon name="Wrench" size={16} style={{ color: '#4F7C82' }} />
                    AI-Generated Remediation Plan
                  </h3>
                  {[
                    { key: 'immediate_actions',  label: '⚡ Immediate Actions',      bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
                    { key: 'short_term_actions', label: '📅 Short-term (30 days)',  bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412' },
                    { key: 'technical_controls', label: '🔧 Technical Controls',    bg: '#EEF7F9', border: '#B8E3E9', text: '#164E63' },
                    { key: 'compliance_notes',   label: '📋 Compliance Notes',      bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6' },
                  ].map(({ key, label, bg, border, text }) => {
                    const items = remPlan[key] || [];
                    if (!items.length) return null;
                    return (
                      <div key={key} className="p-4 rounded-xl"
                           style={{ background: bg, border: `1px solid ${border}` }}>
                        <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: text }}>{label}</p>
                        <ul className="list-disc ml-5 space-y-1">
                          {items.map((item, i) => (
                            <li key={i} className="text-xs leading-relaxed" style={{ color: '#0B2E33' }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                  {!remPlan.immediate_actions?.length && remFlat.length > 0 && (
                    <div className="p-4 rounded-xl" style={{ background: '#EEF7F9', border: '1px solid #B8E3E9' }}>
                      <ul className="list-disc ml-5 space-y-1">
                        {remFlat.map((r, i) => <li key={i} className="text-xs" style={{ color: '#0B2E33' }}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={() => navigate('/remediation-centre')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                      style={{ background: '#4F7C82' }}>
                      <Icon name="ArrowRight" size={14} />
                      Open Remediation Centre
                    </button>
                    <button
                      onClick={() => navigate('/remediation-planning')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border"
                      style={{ borderColor: '#93B1B5', color: '#4F7C82' }}>
                      <Icon name="ClipboardList" size={14} />
                      View Remediation Planning
                    </button>
                  </div>
                </div>
              )}

              {/* ── No PII found ── */}
              {findings.length === 0 && (
                <div className="bg-white border border-border rounded-xl p-8 text-center shadow-sm">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                       style={{ background: '#F0FDF4' }}>
                    <Icon name="ShieldCheck" size={28} style={{ color: '#16A34A' }} />
                  </div>
                  <p className="font-semibold" style={{ color: '#16A34A' }}>No PII Detected</p>
                  <p className="text-sm text-muted-foreground mt-1">This document appears clean.</p>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
               VIEW ORIGINAL DOCUMENT MODAL
          ═════════════════════════════════════════════════════════════════════*/}
          {showOriginal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center"
                 style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
              <div className="bg-white rounded-2xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col shadow-2xl"
                   style={{ border: '2px solid #B8E3E9' }}>
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border"
                     style={{ background: '#0B2E33' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center"
                         style={{ background: 'rgba(184,227,233,0.2)' }}>
                      <Icon name="FileText" size={16} color="#B8E3E9" />
                    </div>
                    <div>
                      <span className="font-bold text-white text-sm">Original Document</span>
                      <span className="text-xs ml-3" style={{ color: '#93B1B5' }}>
                        {result?.filename || 'Document'}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setShowOriginal(false)}
                          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                    <Icon name="X" size={16} color="#B8E3E9" />
                  </button>
                </div>
                {/* Modal Body */}
                <div className="flex-1 overflow-auto p-6">
                  <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words"
                       style={{ color: '#0B2E33' }}>
                    {originalContent || 'No content available.'}
                  </pre>
                </div>
                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-border"
                     style={{ background: '#EEF7F9' }}>
                  <button onClick={() => setShowOriginal(false)}
                          className="px-4 py-2 rounded-lg text-sm font-semibold border"
                          style={{ borderColor: '#93B1B5', color: '#4F7C82' }}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Empty state ── */}
          {!result && !processing && !error && pipelineStep === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                   style={{ background: '#EEF7F9' }}>
                <Icon name="ShieldCheck" size={36} style={{ color: '#B8E3E9' }} />
              </div>
              <p className="text-sm text-muted-foreground">
                No data yet — upload a file or enter text to begin the compliance pipeline.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
