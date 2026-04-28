// src/pages/risk-assessment-details/components/LiveRiskPanel.jsx
// Pulls real scan data from the backend and shows live risk analysis
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const API_BASE = (import.meta?.env?.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

const FRAMEWORKS = ['GDPR', 'ISO 27001', 'PCI-DSS', 'HIPAA', 'CCPA'];
const CAT_COLORS  = { Privacy: '#6366f1', Security: '#ef4444', Bias: '#f59e0b', Compliance: '#0ea5e9' };
const SEV_COLORS  = { Critical:'bg-red-700 text-white', High:'bg-red-500 text-white', Medium:'bg-yellow-500 text-white', Low:'bg-green-600 text-white' };
const RISK_BADGE  = { CRITICAL:'bg-red-800 text-white', HIGH:'bg-red-600 text-white', MEDIUM:'bg-yellow-500 text-white', LOW:'bg-green-600 text-white' };
const RISK_CLR    = { CRITICAL:'#991b1b', HIGH:'#dc2626', MEDIUM:'#d97706', LOW:'#16a34a' };

export default function LiveRiskPanel() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [scan,    setScan]    = useState(null);
  const [allScans,setAllScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selIdx,  setSelIdx]  = useState(0);
  const piiTableRef = useRef(null);

  useEffect(() => {
    if (location.state?.alertId && scan && scan.scan_id === location.state.alertId && piiTableRef.current) {
      setTimeout(() => {
        piiTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [location.state, scan]);

  useEffect(() => {
    fetchScans();
    const h = () => fetchScans();
    window.addEventListener('dashboard:refresh', h);
    return () => window.removeEventListener('dashboard:refresh', h);
  }, []);

  const fetchScans = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE}/scans`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setAllScans(data);
        if (data.length > 0) {
          if (location.state?.alertId) {
            const idx = data.findIndex(s => s.scan_id === location.state.alertId);
            if (idx !== -1) {
              setSelIdx(idx);
              setScan(data[idx]);
              return;
            }
          }
          setScan(data[0]);
        }
      }
    } catch (e) {
      console.error('LiveRiskPanel fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  const selectScan = (idx) => {
    setSelIdx(idx);
    setScan(allScans[idx]);
    // clear location state so it doesn't force re-scroll
    window.history.replaceState({}, document.title);
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"/>
    </div>
  );

  if (allScans.length === 0) return (
    <div className="bg-card border border-border rounded-xl p-10 text-center">
      <Icon name="Shield" size={40} className="text-muted-foreground mx-auto mb-3"/>
      <h3 className="font-semibold text-foreground mb-2">No scan data</h3>
      <p className="text-sm text-muted-foreground mb-4">Upload a file in Monitoring to see live analysis.</p>
      <Button onClick={() => navigate('/monitoring')}>Go to Monitoring</Button>
    </div>
  );

  const findings  = scan?.detailed_findings || [];
  const cats      = scan?.risk_categories   || {};
  const regs      = scan?.violated_regulations || [];
  const piiCounts = scan?.pii_detected || {};

  // Category pie data
  const catData = Object.entries(cats).filter(([,v])=>v>0).map(([name,value])=>({name,value}));

  // PII type bar data
  const piiBar = Object.entries(piiCounts).filter(([,v])=>v>0)
    .map(([k,v])=>({ type: k.replace(/_/g,' '), count: v }))
    .sort((a,b)=>b.count-a.count).slice(0,10);

  // Framework coverage — dynamically include NAAC sub-criteria from violated regs
  const naacRegs = regs.filter(r => r.startsWith('NAAC'));
  const allFrameworks = [...FRAMEWORKS, ...naacRegs.filter(r => !FRAMEWORKS.includes(r))];
  const frameworkStatus = allFrameworks.map(fw => ({
    name: fw,
    violated: regs.some(r => r === fw || (fw.startsWith('NAAC') && r === fw)),
  }));

  return (
    <div className="space-y-6">

      {/* Scan selector */}
      {allScans.length > 1 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Select Scan</h3>
          <div className="flex flex-wrap gap-2">
            {allScans.slice(0,8).map((s,i) => (
              <button key={s.scan_id}
                      onClick={() => selectScan(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                        ${selIdx === i
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-foreground border-border hover:border-primary/50'}`}>
                <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${RISK_BADGE[s.risk_level]?.split(' ')[0] || 'bg-gray-400'}`}/>
                {s.filename.length > 20 ? s.filename.slice(0,20)+'…' : s.filename}
              </button>
            ))}
          </div>
        </div>
      )}

      {scan && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:'Risk Score',       value:`${scan.risk_score}/100`,        color:'text-red-600' },
              { label:'Compliance Score', value:`${scan.compliance_score}/100`,  color:'text-green-600' },
              { label:'PII Instances',    value:scan.risk_items ?? 0,            color:'text-orange-500' },
              { label:'Risk Level',       value:scan.risk_level,                  color: RISK_CLR[scan.risk_level] ? '' : 'text-foreground',
                style: { color: RISK_CLR[scan.risk_level] } },
            ].map((c,i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold ${c.color}`} style={c.style||{}}>{c.value}</div>
                <div className="text-xs text-muted-foreground uppercase mt-1">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Why this is risky panel */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-4 shadow-sm">
            <h3 className="font-semibold text-red-800 flex items-center gap-2 mb-2">
              <Icon name="AlertTriangle" size={18} />
              Why this is risky
            </h3>
            <ul className="list-disc list-inside text-sm text-red-900 space-y-1">
              <li>No cybersecurity constraints placed on PII processing → <strong>high risk</strong></li>
              <li>Exposed credentials or identifiers detected → <strong>critical violation</strong></li>
              <li>Missing access logs/audits → <strong>NAAC/GDPR violation</strong></li>
            </ul>
          </div>

          {/* File details */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3">File Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                ['Filename',    scan.filename],
                ['Type',        scan.dataset_type],
                ['Status',      (scan.compliance_status||'N/A').replace(/_/g,' ')],
                ['Scanned At',  scan.scanned_at ? new Date(scan.scanned_at).toLocaleString() : 'N/A'],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground uppercase">{label}</p>
                  <p className="font-medium text-foreground truncate">{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Regulatory frameworks */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-4">Regulatory Framework Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {frameworkStatus.map(fw => (
                <div key={fw.name}
                     className={`p-3 rounded-lg border text-center ${
                       fw.violated
                         ? 'bg-red-50 border-red-300'
                         : 'bg-green-50 border-green-300'}`}>
                  <div className={`text-xl mb-1 ${fw.violated ? 'text-red-600' : 'text-green-600'}`}>
                    {fw.violated ? '✗' : '✓'}
                  </div>
                  <p className={`text-xs font-bold ${fw.violated ? 'text-red-800' : 'text-green-800'}`}>
                    {fw.name}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${fw.violated ? 'text-red-600' : 'text-green-600'}`}>
                    {fw.violated ? 'VIOLATED' : 'COMPLIANT'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* Risk category pie */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Risk by Category</h3>
              {catData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={catData} dataKey="value" nameKey="name"
                         cx="50%" cy="50%" outerRadius={75} paddingAngle={3}
                         label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}
                         labelLine={false}>
                      {catData.map((d,i) => (
                        <Cell key={i} fill={CAT_COLORS[d.name] || '#94a3b8'}/>
                      ))}
                    </Pie>
                    <Tooltip/>
                    <Legend/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                  No category data
                </div>
              )}
            </div>

            {/* PII type bar */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">PII Types Detected</h3>
              {piiBar.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={piiBar} layout="vertical">
                    <XAxis type="number" tick={{fontSize:10}} allowDecimals={false}/>
                    <YAxis dataKey="type" type="category" width={90} tick={{fontSize:10}}/>
                    <Tooltip/>
                    <Bar dataKey="count" name="Count" fill="#6366f1" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                  No PII detected
                </div>
              )}
            </div>
          </div>

          {/* Detailed findings table */}
          <div ref={piiTableRef} className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-4">
              Detected PII Instances
              <span className="ml-2 text-xs text-muted-foreground">({findings.length} total)</span>
            </h3>
            {findings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {['Type','Value','Severity','Category'].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-muted-foreground font-medium uppercase text-[10px]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {findings.slice(0,25).map((f,i) => {
                      const isNaac = f.type === 'NAAC_C4_ENTITY';
                      const typeLabel = isNaac && f.naac_sub_criterion
                        ? `NAAC C${f.naac_sub_criterion}`
                        : f.type;
                      return (
                      <tr key={i} className={`border-b border-border/50 ${i%2===0 ? 'bg-muted/10' : ''}`}>
                        <td className="py-2 px-3 font-bold text-primary">
                          {typeLabel}
                          {isNaac && f.naac_sub_label && (
                            <span className="ml-1 text-[9px] font-normal text-muted-foreground">({f.naac_sub_label})</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-foreground max-w-[200px]">
                          <span className="truncate block">{f.value}</span>
                          {isNaac && f.cross_mapping && f.cross_mapping.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {f.cross_mapping.map((reg, ri) => (
                                <span key={ri} className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-50 text-red-700 border border-red-200">
                                  {reg}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${SEV_COLORS[f.severity]||'bg-gray-400 text-white'}`}>
                            {f.severity}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
                            {f.category||'N/A'}
                          </span>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                {findings.length > 25 && (
                  <p className="text-[10px] text-muted-foreground text-center mt-2 italic">
                    Showing 25 of {findings.length} findings
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-green-600 font-medium">✓ No PII instances detected in this scan.</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            {['MEDIUM','HIGH','CRITICAL'].includes(scan.risk_level) && (
              <Button variant="default" onClick={() => navigate('/remediation-centre')}
                      className="bg-red-600 hover:bg-red-700 text-white">
                <Icon name="AlertTriangle" size={16} className="mr-2"/>
                Go to Remediation Centre
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/monitoring')}>
              <Icon name="Upload" size={16} className="mr-2"/> New Scan
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
