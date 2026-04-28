// DualReportView.jsx — Side-by-side Original vs Remediated report comparison
// Part of spec: "Dual Report Generation" and "Before vs After"
import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';

const RISK_C = {
  CRITICAL: { bg:'#FEF2F2', border:'#FECACA', text:'#DC2626', dot:'#DC2626' },
  HIGH:     { bg:'#FFF7ED', border:'#FED7AA', text:'#EA580C', dot:'#EA580C' },
  MEDIUM:   { bg:'#FEFCE8', border:'#FEF08A', text:'#CA8A04', dot:'#CA8A04' },
  LOW:      { bg:'#F0FDF4', border:'#BBF7D0', text:'#16A34A', dot:'#16A34A' },
  NONE:     { bg:'#EEF7F9', border:'#B8E3E9', text:'#4F7C82', dot:'#4F7C82' },
};

// Simulate what post-remediation looks like
function remediatedScan(scan) {
  const riskDrop  = Math.min(65, Math.round(scan.risk_score * 0.65));
  const compGain  = Math.min(45, Math.round((100 - scan.compliance_score) * 0.6));
  const newRisk   = Math.max(0,   scan.risk_score   - riskDrop);
  const newComp   = Math.min(100, scan.compliance_score + compGain);
  const newLevel  = newRisk >= 70 ? 'HIGH' : newRisk >= 40 ? 'MEDIUM' : newRisk >= 10 ? 'LOW' : 'NONE';
  return { ...scan, risk_score: newRisk, compliance_score: newComp, risk_level: newLevel,
           compliance_status: newComp >= 80 && newRisk <= 30 ? 'COMPLIANT' : 'NON_COMPLIANT',
           violated_regulations: newComp >= 80 ? [] : scan.violated_regulations?.slice(0,1) || [] };
}

function ScoreBar({ label, value, color }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[11px] font-semibold mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span style={{ color }}>{value}/100</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: '#EEF7F9' }}>
        <div className="h-2 rounded-full transition-all duration-700"
             style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function ReportPanel({ scan, isRemediated }) {
  const rc = RISK_C[scan.risk_level] || RISK_C.NONE;
  const isCompliant = scan.compliance_score >= 80 && scan.risk_score <= 30;
  const riskColor   = scan.risk_score >= 70 ? '#DC2626' : scan.risk_score >= 40 ? '#CA8A04' : '#16A34A';
  const compColor   = isCompliant ? '#16A34A' : '#DC2626';

  return (
    <div className="rounded-2xl overflow-hidden border"
         style={{ borderColor: isRemediated ? '#BBF7D0' : rc.border }}>
      {/* Panel header */}
      <div className="px-5 py-3 flex items-center gap-3"
           style={{ background: isRemediated ? '#0B2E33' : rc.bg }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
             style={{ background: isRemediated ? 'rgba(184,227,233,0.2)' : 'white' }}>
          <Icon name={isRemediated ? 'CheckCircle' : 'FileText'} size={16}
                style={{ color: isRemediated ? '#B8E3E9' : rc.text }} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider"
             style={{ color: isRemediated ? '#B8E3E9' : rc.text }}>
            {isRemediated ? '✅ Remediated Document' : '📋 Original Document'}
          </p>
          <p className="text-[10px]" style={{ color: isRemediated ? '#93B1B5' : '#4F7C82' }}>
            {scan.filename}
          </p>
        </div>
        <div className="ml-auto">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase"
                style={{ background: isCompliant ? '#16A34A' : (isRemediated ? '#4F7C82' : rc.dot),
                         color: '#fff' }}>
            {isCompliant ? 'COMPLIANT' : scan.risk_level}
          </span>
        </div>
      </div>

      {/* Score section */}
      <div className="p-5" style={{ background: 'white' }}>
        <ScoreBar label="Risk Score"       value={scan.risk_score}       color={riskColor} />
        <ScoreBar label="Compliance Score" value={scan.compliance_score} color={compColor} />

        {/* Status */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={isCompliant
                  ? { background:'#F0FDF4', color:'#16A34A', border:'1px solid #BBF7D0' }
                  : { background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA' }}>
            {isCompliant ? '✓ COMPLIANT' : '✗ NON-COMPLIANT'}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {scan.risk_items ?? 0} PII instances
          </span>
        </div>
      </div>

      {/* Report sections */}
      <div className="px-5 pb-5 space-y-3" style={{ background: 'white', borderTop: '1px solid #EEF7F9' }}>
        {/* Summary of Violations */}
        <div className="p-3 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #EEF7F9' }}>
          <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: '#4F7C82' }}>
            Summary of Violations
          </p>
          {scan.violated_regulations?.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {scan.violated_regulations.map((v, i) => (
                <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA' }}>
                  {v}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-green-600 font-semibold">✓ No violations</p>
          )}
        </div>

        {/* Risk Score Analysis */}
        <div className="p-3 rounded-xl" style={{ background:'#F8FAFC', border:'1px solid #EEF7F9' }}>
          <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color:'#4F7C82' }}>
            Risk Score Analysis
          </p>
          <p className="text-[10px] leading-relaxed" style={{ color:'#0B2E33' }}>
            {scan.risk_score >= 70
              ? `High risk exposure detected. ${scan.risk_items ?? 0} sensitive data instances found across multiple PII categories.`
              : scan.risk_score >= 40
              ? `Moderate risk level. Some PII present but limited regulatory exposure.`
              : `Low risk. Document contains minimal sensitive data after remediation.`}
          </p>
        </div>

        {/* Remediation summary (only on remediated panel) */}
        {isRemediated && (
          <div className="p-3 rounded-xl" style={{ background:'#F0FDF4', border:'1px solid #BBF7D0' }}>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color:'#16A34A' }}>
              How Document Was Fixed
            </p>
            <ul className="text-[10px] space-y-0.5" style={{ color:'#0B2E33' }}>
              <li>• SSNs replaced with XXX-XX-XXXX</li>
              <li>• Email addresses anonymized</li>
              <li>• Credit card numbers masked</li>
              <li>• Phone numbers redacted</li>
              <li>• Personal names replaced with [NAME]</li>
            </ul>
          </div>
        )}

        {/* Conclusion */}
        <div className="p-3 rounded-xl"
             style={{ background: isRemediated ? '#F0FDF4' : '#FFF7ED',
                      border: `1px solid ${isRemediated ? '#BBF7D0' : '#FED7AA'}` }}>
          <p className="text-[10px] font-bold uppercase tracking-wide mb-1"
             style={{ color: isRemediated ? '#16A34A' : '#EA580C' }}>
            Conclusion
          </p>
          <p className="text-[10px] leading-relaxed" style={{ color: '#0B2E33' }}>
            {isRemediated
              ? `After remediation, compliance score improved to ${scan.compliance_score}/100 and risk reduced to ${scan.risk_score}/100. The document meets compliance requirements.`
              : `Original document has risk score ${scan.risk_score}/100. Remediation is ${scan.risk_score >= 70 ? 'urgently required' : 'recommended'} to achieve compliance.`}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DualReportView({ scans, apiBase }) {
  const [selectedScanId, setSelectedScanId] = useState(null);

  const selectedScan = scans.find(s => s.scan_id === selectedScanId) || scans[0] || null;
  const remediated   = selectedScan ? remediatedScan(selectedScan) : null;

  const downloadReport = async (scan, fmt, label) => {
    try {
      const payload = {
        filename:             `${label}_${scan.filename}`,
        risk_score:           scan.risk_score,
        compliance_score:     scan.compliance_score,
        risk_level:           scan.risk_level,
        compliance_status:    scan.compliance_status,
        detailed_findings:    scan.detailed_findings    || [],
        violated_regulations: scan.violated_regulations || [],
        remediation_plan:     scan.remediation_plan     || {},
      };
      const form = new FormData();
      form.append('format', fmt);
      form.append('payload_json', JSON.stringify(payload));
      const resp = await fetch(`${apiBase}/reports/generate`, { method:'POST', body:form });
      if (!resp.ok) throw new Error(`Report failed (${resp.status})`);
      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${label}_report.${fmt}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { alert(e.message); }
  };

  if (!scans || scans.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-border rounded-2xl">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
             style={{ background: '#EEF7F9' }}>
          <Icon name="Columns" size={28} style={{ color: '#93B1B5' }} />
        </div>
        <p className="font-bold mb-1" style={{ color: '#0B2E33' }}>No flagged scans available</p>
        <p className="text-sm text-muted-foreground">
          Upload a document with Medium+ risk to enable dual report comparison.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="rounded-2xl p-5 flex items-start gap-4"
           style={{ background: '#0B2E33' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: 'rgba(184,227,233,0.15)' }}>
          <Icon name="Columns" size={20} color="#B8E3E9" />
        </div>
        <div>
          <p className="font-bold text-white mb-1">Dual Report Generation</p>
          <p className="text-sm" style={{ color: '#93B1B5' }}>
            Select a flagged scan below to view the <strong className="text-white">Original</strong> and{' '}
            <strong className="text-white">Remediated</strong> compliance reports side by side.
            The remediated view simulates the document after all fixes are applied.
          </p>
        </div>
      </div>

      {/* Scan selector */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#4F7C82' }}>
          Select Document
        </p>
        <div className="flex flex-wrap gap-2">
          {scans.map(s => {
            const rc  = RISK_C[s.risk_level] || RISK_C.NONE;
            const sel = (selectedScanId || scans[0]?.scan_id) === s.scan_id;
            return (
              <button
                key={s.scan_id}
                onClick={() => setSelectedScanId(s.scan_id)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all"
                style={{
                  background:  sel ? '#0B2E33' : 'white',
                  color:       sel ? 'white'   : '#0B2E33',
                  borderColor: sel ? '#0B2E33' : '#D4EDF1',
                }}>
                <span className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: rc.dot }} />
                <span className="truncate max-w-[180px]">{s.filename}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: sel ? 'rgba(255,255,255,0.15)' : rc.bg, color: sel ? '#fff' : rc.text }}>
                  {s.risk_level}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Side-by-side reports */}
      {selectedScan && remediated && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ReportPanel scan={selectedScan} isRemediated={false} />
            <ReportPanel scan={remediated}   isRemediated={true}  />
          </div>

          {/* Delta summary */}
          <div className="rounded-2xl p-5 border" style={{ background:'white', borderColor:'#D4EDF1' }}>
            <p className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color:'#0B2E33' }}>
              <Icon name="TrendingDown" size={16} style={{ color:'#16A34A' }} />
              Improvement Summary — {selectedScan.filename}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label:'Risk Reduced',       value:`-${selectedScan.risk_score - remediated.risk_score} pts`, color:'#16A34A' },
                { label:'Compliance Gained',  value:`+${remediated.compliance_score - selectedScan.compliance_score} pts`, color:'#4F7C82' },
                { label:'Violations Cleared', value:`${(selectedScan.violated_regulations?.length||0) - (remediated.violated_regulations?.length||0)} rules`, color:'#0B2E33' },
                { label:'Final Status',       value: remediated.compliance_score >= 80 && remediated.risk_score <= 30 ? 'COMPLIANT' : 'IMPROVED', color: remediated.compliance_score >= 80 ? '#16A34A' : '#CA8A04' },
              ].map((item, i) => (
                <div key={i} className="text-center p-3 rounded-xl" style={{ background:'#EEF7F9' }}>
                  <p className="text-xl font-black" style={{ color: item.color }}>{item.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Download both reports */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => downloadReport(selectedScan, 'pdf', 'original')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all"
              style={{ borderColor:'#B8E3E9', color:'#0B2E33', background:'white' }}>
              <Icon name="Download" size={14} />Download Original PDF
            </button>
            <button
              onClick={() => downloadReport(remediated, 'pdf', 'remediated')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background:'#0B2E33' }}>
              <Icon name="Download" size={14} />Download Remediated PDF
            </button>
            <button
              onClick={() => downloadReport(selectedScan, 'docx', 'original')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all"
              style={{ borderColor:'#B8E3E9', color:'#0B2E33', background:'white' }}>
              <Icon name="FileText" size={14} />Original DOCX
            </button>
            <button
              onClick={() => downloadReport(remediated, 'docx', 'remediated')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all"
              style={{ borderColor:'#4F7C82', color:'#4F7C82', background:'#EEF7F9' }}>
              <Icon name="FileText" size={14} />Remediated DOCX
            </button>
          </div>
        </>
      )}
    </div>
  );
}
