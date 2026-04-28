// src/pages/compliance-reports/components/CsvMetricsViewer.jsx
// In-app CSV metrics view (NO download allowed per spec — view only)
import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';

const API_BASE = (import.meta?.env?.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

const RISK_COLORS = {
  CRITICAL: 'text-red-700 bg-red-50',
  HIGH:     'text-red-600 bg-red-50',
  MEDIUM:   'text-yellow-700 bg-yellow-50',
  LOW:      'text-green-700 bg-green-50',
};

export default function CsvMetricsViewer() {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    fetchRows();
    const h = () => fetchRows();
    window.addEventListener('dashboard:refresh', h);
    return () => window.removeEventListener('dashboard:refresh', h);
  }, []);

  const fetchRows = async () => {
    try {
      const res = await fetch(`${API_BASE}/metrics/csv-view`);
      if (res.ok) setRows(await res.json());
      else setError('Failed to load CSV metrics.');
    } catch {
      setError('Backend unreachable.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = rows.filter(r =>
    !search ||
    r.filename?.toLowerCase().includes(search.toLowerCase()) ||
    r.risk_level?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"/>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-foreground">CSV Metrics View</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Scan metrics — view only · CSV download is disabled
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon name="Search" size={14} className="absolute left-2.5 top-2.5 text-muted-foreground"/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8 pr-3 py-2 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">{error}</div>
      )}

      {filtered.length === 0 && !error ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <Icon name="FileText" size={32} className="mx-auto mb-2 opacity-40"/>
          {rows.length === 0 ? 'No scans yet. Upload a file in Monitoring.' : 'No results match your search.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {['Filename','Risk Score','Compliance','Risk Level','Status','PII Count','Regulations','Scanned At'].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-muted-foreground font-semibold uppercase text-[10px] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i} className={`border-b border-border/40 hover:bg-muted/10 transition-colors ${i%2===0 ? '' : 'bg-muted/5'}`}>
                  <td className="py-2.5 px-3 font-medium text-foreground max-w-[160px] truncate" title={row.filename}>
                    {row.filename}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-red-600">{row.risk_score}/100</td>
                  <td className="py-2.5 px-3 font-bold text-green-600">{row.compliance}/100</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${RISK_COLORS[row.risk_level]||'text-gray-600 bg-gray-50'}`}>
                      {row.risk_level}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-foreground whitespace-nowrap">
                    {(row.status||'').replace(/_/g,' ')}
                  </td>
                  <td className="py-2.5 px-3 text-foreground">{row.pii_count}</td>
                  <td className="py-2.5 px-3 text-foreground max-w-[180px] truncate" title={row.regulations}>
                    {row.regulations || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                    {row.scanned_at ? new Date(row.scanned_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground mt-3 text-right">
        ℹ️ CSV download is not available — metrics are view-only per policy.
      </p>
    </div>
  );
}
