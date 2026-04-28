import React from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

/* ─── Compliance status badge ─────────────────────────────── */
const StatusBadge = ({ status }) => {
  const styles = {
    COMPLIANT:           { bg: '#F0FDF4', border: '#BBF7D0', color: '#16A34A', label: '✓ COMPLIANT' },
    PARTIALLY_COMPLIANT: { bg: '#FEFCE8', border: '#FEF08A', color: '#CA8A04', label: '⚠ PARTIALLY COMPLIANT' },
    NON_COMPLIANT:       { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626', label: '✗ NON-COMPLIANT — Fix Required' },
  };
  const s = styles[status] || styles.NON_COMPLIANT;
  return (
    <span style={{ padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
      background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      {s.label}
    </span>
  );
};

/* ─── Score bar ───────────────────────────────────────────── */
const ScoreBar = ({ label, value, color }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
      <span style={{ color: '#6B7280' }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{value}/100</span>
    </div>
    <div style={{ height: 6, borderRadius: 3, background: '#F1F5F9' }}>
      <div style={{ height: 6, borderRadius: 3, width: `${value}%`, background: color, transition: 'width 0.6s' }} />
    </div>
  </div>
);

/* ─── Section row ─────────────────────────────────────────── */
const REPORT_SECTIONS = [
  'Executive Summary', 'Documents Reviewed', 'Objectives', 'Scope of Report',
  'Compliance Criteria', 'Methodology', 'Findings (Before Changes)',
  'Changes / Corrections Applied', 'Impact of Changes', 'Graphical Analysis',
  'Recommendations', 'Conclusion', 'Appendix'
];

const ReportPreviewModal = ({ report, isOpen, onClose, onDownload }) => {
  if (!isOpen || !report) return null;

  const scan        = report._scan || {};
  const compStatus  = scan.compliance_status || 'NON_COMPLIANT';
  const riskScore   = scan.risk_score    ?? 0;
  const compScore   = scan.compliance_score ?? 0;
  const riskLevel   = scan.risk_level    || 'LOW';
  const violations  = scan.violated_regulations || [];
  const findings    = scan.key_findings  || [];
  const remPlan     = scan.remediation_plan || {};
  const beforeAfter = scan.before_after  || [];
  const isNonCompliant = compStatus === 'NON_COMPLIANT';

  const riskColor = riskScore >= 70 ? '#DC2626' : riskScore >= 40 ? '#CA8A04' : '#16A34A';
  const compColor = compScore >= 80 ? '#16A34A' : compScore >= 50 ? '#CA8A04' : '#DC2626';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}>
      <div style={{ background: 'var(--card, white)', border: '1px solid var(--border, #E2E8F0)',
        borderRadius: 12, width: '100%', maxWidth: 900, maxHeight: '90vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--border, #E2E8F0)' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--card-foreground, #0F172A)', margin: 0 }}>
              {report.title}
            </h2>
            <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>
              Generated {report.generatedDate ? new Date(report.generatedDate).toLocaleString() : 'N/A'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!isNonCompliant && (
              <Button variant="outline" iconName="Download" iconPosition="left"
                onClick={() => onDownload && onDownload(report, 'pdf')}>
                Download PDF
              </Button>
            )}
            <Button variant="ghost" size="sm" iconName="X" onClick={onClose} />
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar: sections */}
          <div style={{ width: 220, borderRight: '1px solid var(--border, #E2E8F0)',
            background: '#F8FAFC', padding: '16px 12px', overflowY: 'auto' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase',
              letterSpacing: '0.05em', marginBottom: 10 }}>13 Sections</p>
            {REPORT_SECTIONS.map((s, i) => (
              <div key={i} style={{ padding: '7px 10px', borderRadius: 6, marginBottom: 2,
                fontSize: 12, color: '#374151', background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#9CA3AF', fontSize: 10, minWidth: 18 }}>{String(i+1).padStart(2,'0')}</span>
                {s}
              </div>
            ))}
          </div>

          {/* Main content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            {isNonCompliant && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
                padding: '16px 20px', marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>
                  ⚠ Fix Required Before Report Generation
                </div>
                <p style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 1.6, margin: 0 }}>
                  This document is <strong>NON-COMPLIANT</strong>. Apply required remediation fixes
                  and re-scan before a full compliance report can be generated.
                </p>
                {violations.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {violations.map(v => (
                      <span key={v} style={{ padding: '2px 10px', background: '#FEE2E2',
                        border: '1px solid #FECACA', borderRadius: 100, color: '#DC2626',
                        fontSize: 11, fontWeight: 600 }}>{v}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Scores */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10,
              padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>Risk & Compliance Summary</span>
                <StatusBadge status={compStatus} />
              </div>
              <ScoreBar label="Risk Score" value={riskScore} color={riskColor} />
              <ScoreBar label="Compliance Score" value={compScore} color={compColor} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <span style={{ padding: '3px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700,
                  background: riskScore >= 70 ? '#FEF2F2' : riskScore >= 40 ? '#FEFCE8' : '#F0FDF4',
                  color: riskColor }}>
                  {riskLevel} RISK
                </span>
              </div>
            </div>

            {/* Key Findings */}
            {findings.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>
                  Key Findings
                </h3>
                {findings.map((f, i) => (
                  <div key={i} style={{ padding: '8px 12px', background: '#F1F5F9',
                    borderRadius: 6, marginBottom: 6, fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                    {f}
                  </div>
                ))}
              </div>
            )}

            {/* Before/After */}
            {beforeAfter.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>
                  Before vs After Changes
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#0B2E33' }}>
                      <th style={{ padding: '8px 12px', color: 'white', textAlign: 'left', borderRadius: '4px 0 0 0' }}>Type</th>
                      <th style={{ padding: '8px 12px', color: 'white', textAlign: 'left' }}>Before (Original)</th>
                      <th style={{ padding: '8px 12px', color: 'white', textAlign: 'left', borderRadius: '0 4px 0 0' }}>After (Masked)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {beforeAfter.map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#F8FAFC' : 'white' }}>
                        <td style={{ padding: '7px 12px', color: '#374151', borderBottom: '1px solid #E2E8F0' }}>{row.type}</td>
                        <td style={{ padding: '7px 12px', color: '#DC2626', fontFamily: 'monospace', borderBottom: '1px solid #E2E8F0' }}>{row.before}</td>
                        <td style={{ padding: '7px 12px', color: '#16A34A', fontFamily: 'monospace', borderBottom: '1px solid #E2E8F0' }}>{row.after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Recommendations */}
            {(remPlan.immediate_actions || []).length > 0 && (
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>
                  Recommendations
                </h3>
                {(remPlan.immediate_actions || []).slice(0,3).map((action, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 12px', background: '#FFF7ED',
                    border: '1px solid #FED7AA', borderRadius: 6, marginBottom: 6 }}>
                    <span style={{ color: '#EA580C', fontWeight: 700, fontSize: 11, minWidth: 60 }}>URGENT</span>
                    <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{action}</span>
                  </div>
                ))}
                {(remPlan.short_term_actions || []).slice(0,2).map((action, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 12px', background: '#FEFCE8',
                    border: '1px solid #FEF08A', borderRadius: 6, marginBottom: 6 }}>
                    <span style={{ color: '#CA8A04', fontWeight: 700, fontSize: 11, minWidth: 60 }}>SHORT-TERM</span>
                    <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{action}</span>
                  </div>
                ))}
              </div>
            )}

            {!scan.scan_id && (
              <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 32 }}>
                No detailed scan data available. Upload a document to generate a full analysis.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPreviewModal;
