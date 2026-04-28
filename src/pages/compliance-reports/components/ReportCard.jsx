import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';

const API_BASE = (import.meta?.env?.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

const RISK_COLOR = {
  CRITICAL: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', badge: '#DC2626' },
  HIGH:     { bg: '#FFF7ED', border: '#FED7AA', text: '#EA580C', badge: '#EA580C' },
  MEDIUM:   { bg: '#FEFCE8', border: '#FEF08A', text: '#CA8A04', badge: '#CA8A04' },
  LOW:      { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', badge: '#16A34A' },
  NONE:     { bg: '#EEF7F9', border: '#B8E3E9', text: '#4F7C82', badge: '#4F7C82' },
};

function getTypeIcon(type) {
  switch (type) {
    case 'gdpr': return 'Shield';
    case 'pii':  return 'Eye';
    case 'remediation': return 'CheckCircle';
    case 'audit': return 'FileSearch';
    default: return 'FileText';
  }
}

const ReportCard = ({ report, onPreview, onGenerate, onDownload }) => {
  const [generating, setGenerating] = useState(false);

  const scan        = report?._scan || {};
  const riskScore   = scan.risk_score        ?? null;
  const compScore   = scan.compliance_score  ?? null;
  const riskLevel   = scan.risk_level        || null;
  const compStatus  = scan.compliance_status || null;
  const violations  = scan.violated_regulations || [];
  const isCompliant = compScore >= 80 && riskScore !== null && riskScore <= 30;
  const rc          = RISK_COLOR[riskLevel] || RISK_COLOR.NONE;

  const handleGenerateReport = async () => {
    const scanId = scan.scan_id || report?.id;
    if (!scanId) { alert('No scan data available for this report.'); return; }
    setGenerating(true);
    try {
      const form = new FormData();
      form.append('scan_id', scanId);
      form.append('format', 'pdf');
      const resp = await fetch(`${API_BASE}/reports/compliance`, { method: 'POST', body: form });
      if (resp.status === 422) {
        // NON_COMPLIANT — show fix required message
        const errData = await resp.json().catch(() => ({}));
        const requiredActions = errData.required_actions || [];
        let msg = `⚠️ Fix Required Before Report Generation\n\n`;
        msg += `Status: ${errData.compliance_status || 'NON_COMPLIANT'}\n`;
        msg += `Risk Score: ${errData.risk_score}/100 | Compliance: ${errData.compliance_score}/100\n`;
        if (errData.violated_regulations?.length) {
          msg += `\nViolations: ${errData.violated_regulations.join(', ')}\n`;
        }
        if (requiredActions.length) {
          msg += `\nRequired Actions:\n${requiredActions.slice(0, 3).map((a, i) => `${i+1}. ${a}`).join('\n')}`;
        }
        msg += `\n\nApply remediation and re-scan before generating a full report.`;
        alert(msg);
        return;
      }
      if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).detail || `Report failed (${resp.status})`);
      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `Vigil_AI_Report_${(report?.title || 'report').replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message || 'Report generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className="bg-white border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300"
      style={{ borderTop: `3px solid ${rc.badge}` }}
    >
      {/* ── Card body ── */}
      <div className="px-5 pt-5 pb-4">

        {/* Title row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl shrink-0" style={{ background: '#EEF7F9' }}>
              <Icon name={getTypeIcon(report?.type)} size={18} style={{ color: '#4F7C82' }} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm truncate" style={{ color: '#0B2E33' }}>
                {report?.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {report?.generatedDate
                  ? new Date(report.generatedDate).toLocaleDateString(undefined,
                      { month: 'short', day: 'numeric', year: 'numeric' })
                  : '—'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
            {report?.isNew && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full"
                    style={{ background: '#EEF7F9', color: '#4F7C82' }}>
                NEW
              </span>
            )}
            {riskLevel && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase"
                    style={{ background: rc.badge, color: '#fff' }}>
                {riskLevel}
              </span>
            )}
          </div>
        </div>

        {/* Score bars */}
        {riskScore !== null && compScore !== null && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="flex justify-between text-[10px] font-medium mb-1">
                <span className="text-muted-foreground">Risk</span>
                <span style={{ color: rc.text }}>{riskScore}/100</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: '#EEF7F9' }}>
                <div className="h-1.5 rounded-full"
                     style={{ width: `${riskScore}%`, background: rc.badge, transition: 'width 0.5s' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-medium mb-1">
                <span className="text-muted-foreground">Compliance</span>
                <span style={{ color: isCompliant ? '#16A34A' : '#DC2626' }}>{compScore}/100</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: '#EEF7F9' }}>
                <div className="h-1.5 rounded-full"
                     style={{ width: `${compScore}%`,
                              background: isCompliant ? '#16A34A' : '#DC2626',
                              transition: 'width 0.5s' }} />
              </div>
            </div>
          </div>
        )}

        {/* Compliance status chip */}
        {compStatus && (
          <div className="flex items-center gap-2 mb-3">
            {compStatus === 'NON_COMPLIANT' ? (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                ✗ NON-COMPLIANT — Fix Required
              </span>
            ) : compStatus === 'PARTIALLY_COMPLIANT' ? (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: '#FEFCE8', color: '#CA8A04', border: '1px solid #FEF08A' }}>
                ⚠ PARTIALLY COMPLIANT
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                ✓ COMPLIANT
              </span>
            )}
            {violations.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {violations.length} violation{violations.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Violations chips */}
        {violations.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {violations.slice(0, 3).map((v, i) => (
              <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                {v}
              </span>
            ))}
            {violations.length > 3 && (
              <span className="text-[9px] text-muted-foreground self-center">
                +{violations.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2">{report?.description}</p>
      </div>

      {/* ── Actions ── */}
      <div className="px-5 pb-5 pt-3 border-t border-border space-y-2">
        {/* Primary: generate full PDF report */}
        {report?._scan && (
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: '#0B2E33' }}
          >
            {generating ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <Icon name="FileBarChart" size={14} />
                Generate Compliance Report
              </>
            )}
          </button>
        )}

        {/* Secondary row */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPreview && onPreview(report)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex-1 justify-center"
            style={{ borderColor: '#B8E3E9', color: '#4F7C82', background: 'white' }}
          >
            <Icon name="Eye" size={12} /> Preview
          </button>
          <button
            onClick={() => onDownload && onDownload(report, 'pdf')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex-1 justify-center"
            style={{ borderColor: '#B8E3E9', color: '#4F7C82', background: 'white' }}
          >
            <Icon name="Download" size={12} /> PDF
          </button>
          <button
            onClick={() => onDownload && onDownload(report, 'docx')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex-1 justify-center"
            style={{ borderColor: '#B8E3E9', color: '#4F7C82', background: 'white' }}
          >
            <Icon name="Download" size={12} /> DOCX
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportCard;
