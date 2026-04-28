// src/pages/compliance-dashboard/components/AnalyticsCharts.jsx
// PowerBI-style analytics: line, donut, risk matrix, bar — auto-refreshes every 5 min
import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';

const API_BASE = (import.meta?.env?.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

const COLORS = ['#4F7C82','#DC2626','#CA8A04','#16A34A','#0B2E33','#93B1B5'];
const RISK_COLORS = { CRITICAL:'#DC2626', HIGH:'#EA580C', MEDIUM:'#CA8A04', LOW:'#16A34A' };

// ── Risk Matrix: proper 5×5 Likelihood × Impact grid ──────────────────────────
// Likelihood rows (Y-axis): 1 = Rare … 5 = Almost Certain (displayed top→bottom: high→low)
// Impact columns (X-axis): 1 = Negligible … 5 = Critical
// Cell score = L × I  (1–25)  → colour-coded green / lime / yellow / orange / red

const L_LABELS = ['Almost Certain', 'Likely', 'Possible', 'Unlikely', 'Rare'];
const I_LABELS = ['Negligible', 'Minor', 'Moderate', 'Major', 'Critical'];

// Map a scan's risk_score (0-100) → impact index 0–4
function impactIdx(riskScore) {
  if (riskScore <= 20) return 0;  // Negligible
  if (riskScore <= 40) return 1;  // Minor
  if (riskScore <= 60) return 2;  // Moderate
  if (riskScore <= 80) return 3;  // Major
  return 4;                        // Critical
}

// Map a scan's risk_items count → likelihood index 0–4
function likelihoodIdx(riskItems) {
  if (riskItems === 0) return 0;  // Rare
  if (riskItems <= 2)  return 1;  // Unlikely
  if (riskItems <= 5)  return 2;  // Possible
  if (riskItems <= 10) return 3;  // Likely
  return 4;                        // Almost Certain
}

// Cell colour based on L×I score (1–25) — STRICT mapping, no gradients, no color mixing
const getRiskColor = (risk) => {
  if (risk === null || risk === undefined) return '#FFFFFF'; // no data → white

  if (risk === 0) return '#3B82F6'; // No Risk → Blue

  if (risk <= 3)  return '#D1FAE5'; // Low light
  if (risk <= 5)  return '#34D399'; // Low mid
  if (risk <= 8)  return '#059669'; // Low dark

  if (risk <= 10) return '#FEF9C3'; // Medium light
  if (risk <= 14) return '#F59E0B'; // Medium mid
  if (risk <= 18) return '#D97706'; // Medium dark

  if (risk <= 20) return '#FCA5A5'; // High light
  if (risk <= 25) return '#EF4444'; // High mid
  return '#B91C1C';                 // Critical
};

const DARK_BG_COLORS = new Set([
  '#3B82F6','#34D399','#059669','#F59E0B','#D97706',
  '#EF4444','#B91C1C',
]);

function matrixCellBg(score, hasData) {
  if (!hasData) return { bg: '#FFFFFF', fg: '#0B2E33' }; // empty → white
  const bg = getRiskColor(score);
  const fg = DARK_BG_COLORS.has(bg) ? '#FFFFFF' : '#0B2E33';
  return { bg, fg };
}

// Build a 5×5 risk matrix from scan data
// Returns grid[li][ii] = { score, count, totalRisk }
// li = likelihood row (0 = Rare … 4 = Almost Certain)
// ii = impact column  (0 = Negligible … 4 = Critical)
function buildRiskMatrix(scans) {
  const grid = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => ({ count: 0, totalRisk: 0, score: 0 }))
  );

  scans.forEach(s => {
    const li = likelihoodIdx(s.risk_items || 0);
    const ii = impactIdx(s.risk_score || 0);
    grid[li][ii].count     += 1;
    grid[li][ii].totalRisk += (s.risk_score || 0);
  });

  // Score = L × I  (1-based)
  grid.forEach((row, li) =>
    row.forEach((cell, ii) => {
      cell.score = cell.count > 0 ? (li + 1) * (ii + 1) : 0;
    })
  );

  return grid;
}

export default function AnalyticsCharts() {
  const [scans,   setScans]   = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const [sRes, mRes] = await Promise.all([
        fetch(`${API_BASE}/scans`, { headers }),
        fetch(`${API_BASE}/metrics`, { headers }),
      ]);
      if (sRes.ok)  setScans(await sRes.json());
      if (mRes.ok)  setMetrics(await mRes.json());
    } catch (e) {
      console.error('Analytics fetch error', e);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    const h = () => fetchData();
    window.addEventListener('dashboard:refresh', h);
    return () => { clearInterval(interval); window.removeEventListener('dashboard:refresh', h); };
  }, [fetchData]);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
    </div>
  );

  // ── Derived data ────────────────────────────────────────────────────────────

  // Line chart: compliance & risk scores over last 10 scans
  const lineData = [...scans].reverse().slice(0, 10).map((s, i) => ({
    name:       `Scan ${i + 1}`,
    compliance: s.compliance_score || 0,
    risk:       s.risk_score || 0,
  }));

  // Donut chart: PII categories
  const catData = scans.reduce((acc, s) => {
    Object.entries(s.risk_categories || {}).forEach(([cat, count]) => {
      acc[cat] = (acc[cat] || 0) + count;
    });
    return acc;
  }, {});
  const donutData = Object.entries(catData).map(([name, value]) => ({ name, value }));

  // Bar chart: violations per regulation
  const regCounts = scans.reduce((acc, s) => {
    (s.violated_regulations || []).forEach(r => { acc[r] = (acc[r] || 0) + 1; });
    return acc;
  }, {});
  const barData = Object.entries(regCounts).map(([reg, count]) => ({ reg, count }));

  // Risk level breakdown
  const riskBreakdown = { CRITICAL:0, HIGH:0, MEDIUM:0, LOW:0 };
  scans.forEach(s => { riskBreakdown[s.risk_level] = (riskBreakdown[s.risk_level] || 0) + 1; });

  // Risk Matrix (Likelihood × Impact)
  const riskMatrix = buildRiskMatrix(scans);

  return (
    <div className="space-y-6">

      {/* Auto-refresh notice */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Last refreshed: {lastRefresh.toLocaleTimeString()} · Auto-updates every 5 min
        </span>
        {scans.length === 0 && (
          <span className="text-xs text-muted-foreground italic">
            No scan data yet — upload a file in Monitoring.
          </span>
        )}
      </div>

      {/* ── Row 1: Line + Donut ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Line chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Compliance &amp; Risk Score Trend
          </h3>
          {lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="compliance" stroke="#10b981"
                      strokeWidth={2} dot={{ r: 3 }} name="Compliance %" />
                <Line type="monotone" dataKey="risk" stroke="#ef4444"
                      strokeWidth={2} dot={{ r: 3 }} name="Risk Score" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              No scan data yet
            </div>
          )}
        </div>

        {/* Donut chart */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-foreground mb-4">PII Risk Categories</h3>
          {donutData.length > 0 ? (
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name"
                       cx="50%" cy="50%" innerRadius={55} outerRadius={75}
                       paddingAngle={3}
                       label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                       labelLine={true} stroke="none">
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} instances`, `Category: ${n}`]} />
                  <Legend layout="vertical" verticalAlign="middle" align="right"
                          wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              No PII category data yet
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Bar + Risk breakdown ──────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Bar chart: violations */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Violated Regulations</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="reg" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Violations" radius={[4, 4, 0, 0]}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              No violation data yet
            </div>
          )}
        </div>

        {/* Risk level breakdown */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Risk Level Distribution</h3>
          <div className="space-y-3 mt-4">
            {Object.entries(riskBreakdown).map(([level, count]) => {
              const total = scans.length || 1;
              const pct   = Math.round(count / total * 100);
              return (
                <div key={level}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{level}</span>
                    <span className="text-muted-foreground">{count} scans ({pct}%)</span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full transition-all"
                         style={{ width: `${pct}%`, background: RISK_COLORS[level] }} />
                  </div>
                </div>
              );
            })}
            {scans.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">
                No scan data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Risk Heat Map: Likelihood × Impact ───────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Risk Heat Map
        </h3>
        <p className="text-[11px] text-muted-foreground mb-4">
          Risk = Likelihood × Impact
        </p>

        {scans.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No scan data yet — upload a file in Monitoring.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>

            {/* Impact column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '120px repeat(5, 1fr)',
              gap: 4,
              marginBottom: 4,
            }}>
              {/* top-left corner: Y-axis label */}
              <div style={{ textAlign: 'right', paddingRight: 8, fontSize: 9,
                            color: 'var(--muted-foreground,#6b7280)', fontStyle: 'italic', alignSelf: 'end' }}>
                Likelihood ↓
              </div>
              {I_LABELS.map(lbl => (
                <div key={lbl} style={{
                  textAlign: 'center', fontSize: 9,
                  color: 'var(--muted-foreground,#6b7280)', fontWeight: 700,
                }}>
                  {lbl}
                </div>
              ))}
            </div>

            {/* Matrix rows: Almost Certain (index 4) at top → Rare (index 0) at bottom */}
            {[4, 3, 2, 1, 0].map(li => (
              <div key={li} style={{
                display: 'grid',
                gridTemplateColumns: '120px repeat(5, 1fr)',
                gap: 4,
                marginBottom: 4,
                alignItems: 'center',
              }}>
                {/* Likelihood row label */}
                <div style={{
                  fontSize: 9,
                  color: 'var(--muted-foreground,#6b7280)',
                  fontWeight: 700,
                  textAlign: 'right',
                  paddingRight: 8,
                }}>
                  {L_LABELS[4 - li]}
                </div>

                {/* Five impact cells */}
                {[0, 1, 2, 3, 4].map(ii => {
                  const cell  = riskMatrix[li][ii];
                  const score = cell.score;
                  const hasData = cell.count > 0;
                  const { bg, fg } = matrixCellBg(score, hasData);
                  const avgRisk = hasData
                    ? Math.round(cell.totalRisk / cell.count)
                    : 0;
                  const tip = hasData
                    ? `Risk = ${score}  (L${li + 1} × I${ii + 1}) | ${cell.count} scan(s) | Avg risk_score: ${avgRisk}`
                    : `No scans | L${li + 1} × I${ii + 1}`;

                  return (
                    <div
                      key={ii}
                      title={tip}
                      style={{
                        background:    bg,
                        color:         fg,
                        borderRadius:  6,
                        height:        44,
                        display:       'flex',
                        flexDirection: 'column',
                        alignItems:    'center',
                        justifyContent:'center',
                        fontSize:      11,
                        fontWeight:    700,
                        cursor:        hasData ? 'help' : 'default',
                        border:        hasData
                                         ? '1px solid rgba(0,0,0,0.08)'
                                         : '1px solid rgba(0,0,0,0.08)',
                        transition:    'transform 0.15s, box-shadow 0.15s',
                        boxShadow:     hasData ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform  = 'scale(1.08)';
                        e.currentTarget.style.boxShadow  = '0 4px 12px rgba(0,0,0,0.15)';
                        e.currentTarget.style.zIndex     = '10';
                        e.currentTarget.style.position   = 'relative';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform  = 'scale(1)';
                        e.currentTarget.style.boxShadow  = hasData ? '0 1px 3px rgba(0,0,0,0.10)' : 'none';
                        e.currentTarget.style.zIndex     = '';
                        e.currentTarget.style.position   = '';
                      }}
                    >
                      {hasData && <span>{score}</span>}
                      {hasData && (
                        <span style={{ fontSize: 7, fontWeight: 400, opacity: 0.85, marginTop: 1 }}>
                          {cell.count} scan{cell.count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* X-axis label */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr',
              marginTop: 4,
            }}>
              <div />
              <div style={{
                textAlign: 'center', fontSize: 9,
                color: 'var(--muted-foreground,#6b7280)', fontStyle: 'italic',
              }}>
                Impact →
              </div>
            </div>
          </div>
        )}

        {/* Colour legend — matches getRiskColor() exactly */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'var(--muted-foreground,#6b7280)', fontWeight: 600 }}>
            Score:
          </span>
          {[
            { label: 'No Data',    bg: '#FFFFFF', border: '1px solid rgba(0,0,0,0.15)' },
            { label: 'No Risk',    bg: '#3B82F6' },
            { label: 'Low',        bg: '#34D399' },
            { label: 'Medium',     bg: '#F59E0B' },
            { label: 'High/Crit',  bg: '#EF4444' },
          ].map(({ label, bg, border }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                background: bg,
                width: 13, height: 13, borderRadius: 3,
                border: border || '1px solid transparent',
              }} />
              <span style={{ fontSize: 10, color: 'var(--muted-foreground,#6b7280)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
