// src/pages/compliance-reports/components/AuditLogsPanel.jsx
// Compliance history + audit logs from scan store + activity feed
import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';

const API_BASE = (import.meta?.env?.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

const RISK_DOT = {
  CRITICAL: 'bg-red-700',
  HIGH:     'bg-red-500',
  MEDIUM:   'bg-yellow-500',
  LOW:      'bg-green-500',
};

export default function AuditLogsPanel() {
  const [scans,    setScans]    = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('history'); // 'history' | 'activity'

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sRes, aRes] = await Promise.all([
          fetch(`${API_BASE}/scans`),
          fetch(`${API_BASE}/activity`),
        ]);
        if (sRes.ok) setScans(await sRes.json());
        if (aRes.ok) {
          const data = await aRes.json();
          setActivity(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('AuditLogsPanel error', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"/>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Tab header */}
      <div className="flex border-b border-border">
        {[
          { key:'history',  label:'Compliance History', icon:'Clock' },
          { key:'activity', label:'Audit Logs',          icon:'List' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors
                    ${tab === t.key
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-muted-foreground hover:text-foreground'}`}>
            <Icon name={t.icon} size={15}/>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* ── Compliance History ─────────────────────────────────── */}
        {tab === 'history' && (
          scans.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <Icon name="Clock" size={32} className="mx-auto mb-2 opacity-40"/>
              No scan history yet.
            </div>
          ) : (
            <div className="space-y-3">
              {scans.map((s, i) => (
                <div key={s.scan_id || i}
                     className="flex items-center justify-between p-4 bg-muted/10 rounded-lg border border-border hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${RISK_DOT[s.risk_level]||'bg-gray-400'}`}/>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.scanned_at ? new Date(s.scanned_at).toLocaleString() : 'Unknown time'}
                        {' · '}{s.dataset_type || 'document'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-4 shrink-0">
                    <div className="text-center hidden sm:block">
                      <p className="text-sm font-bold text-red-600">{s.risk_score}/100</p>
                      <p className="text-[10px] text-muted-foreground">Risk</p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-sm font-bold text-green-600">{s.compliance_score}/100</p>
                      <p className="text-[10px] text-muted-foreground">Compliance</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase
                      ${s.risk_level==='CRITICAL' ? 'bg-red-100 text-red-800'
                        : s.risk_level==='HIGH'   ? 'bg-red-50 text-red-700'
                        : s.risk_level==='MEDIUM' ? 'bg-yellow-50 text-yellow-800'
                        : 'bg-green-50 text-green-800'}`}>
                      {s.risk_level}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Audit Logs ─────────────────────────────────────────── */}
        {tab === 'activity' && (
          activity.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <Icon name="List" size={32} className="mx-auto mb-2 opacity-40"/>
              No activity logs yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {activity.map((a, i) => (
                <div key={i}
                     className="flex items-start gap-3 p-3 rounded-lg bg-muted/10 border border-border/50 text-sm">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name={a.kind === 'file_uploaded' ? 'Upload' : 'Activity'} size={13} className="text-primary"/>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground font-medium text-xs">{a.title || a.message || JSON.stringify(a)}</p>
                    {a.timestamp && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(a.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
