// src/pages/compliance-dashboard/components/ComplianceChart.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import html2canvas from "html2canvas";
import Button from "../../../components/ui/Button";

const COLORS = {
  primary: "#4F7C82",
  success: "#16A34A",
  error:   "#DC2626",
  accent:  "#0B2E33",
};

const timeRangeOptions = [
  { value: "24h", label: "Last 24 Hours", ms: 24 * 3600 * 1000 },
  { value: "7d", label: "Last 7 Days", ms: 7 * 24 * 3600 * 1000 },
  { value: "30d", label: "Last 30 Days", ms: 30 * 24 * 3600 * 1000 },
  { value: "90d", label: "Last 90 Days", ms: 90 * 24 * 3600 * 1000 },
];

function formatXAxisLabel(isoString, range) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  if (range === "24h") return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(d);
  if (range === "7d") return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(d);
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg" style={{ minWidth: 140 }}>
      <div className="text-sm font-medium text-popover-foreground mb-2">{label}</div>
      {payload.map((entry, idx) => {
        const name = entry?.name ?? entry?.dataKey ?? "";
        const value = typeof entry?.value === "number" ? Number(entry.value).toFixed(2) : entry?.value;
        return (
          <div key={idx} className="text-sm" style={{ color: entry?.color || "#111" }}>
            <strong style={{ marginRight: 6 }}>{name}:</strong> {value}
            {name === "complianceScore" ? "/100" : ""}
          </div>
        );
      })}
    </div>
  );
};

export default function ComplianceChart() {
  const [chartType, setChartType] = useState("trend");
  const [timeRange, setTimeRange] = useState("7d");
  const [metrics, setMetrics] = useState({ trend: [], distribution: [], categories: [], last_updated: null });
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const autoRefreshRef = useRef(null);

  const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
  const BACKEND_METRICS_URL = `${API_BASE}/metrics`;

  const fetchMetrics = useCallback(async (rangeHours = 24) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${BACKEND_METRICS_URL}?range_hours=${rangeHours}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error(`Failed to fetch metrics (${res.status})`);
      const json = await res.json();
      // defensive normalization
      const normalizedTrend = Array.isArray(json.trend)
        ? json.trend.map((p) => {
            const ts = p.timestamp || p.ts || p.time || null;
            let iso = ts;
            if (typeof ts === "number") iso = new Date(ts).toISOString();
            if (!iso) iso = new Date().toISOString();
            const complianceScore = p.complianceScore !== undefined ? Number(p.complianceScore) : undefined;
            const riskItems = p.riskItems !== undefined ? Number(p.riskItems) : undefined;
            const remediatedItems = p.remediatedItems !== undefined ? Number(p.remediatedItems) : undefined;
            return { timestamp: iso, complianceScore, riskItems, remediatedItems };
          })
        : [];

      setMetrics({
        trend: normalizedTrend,
        distribution: Array.isArray(json.distribution) ? json.distribution : [],
        categories: Array.isArray(json.categories) ? json.categories : [],
        last_updated: json.last_updated || new Date().toISOString(),
      });
    } catch (err) {
      console.error("[ComplianceChart] Error fetching metrics:", err);
      // keep earlier metrics if fetch fails
    } finally {
      setLoading(false);
    }
  }, [BACKEND_METRICS_URL]);

  useEffect(() => {
    // fetch initial data with range based on selected timeRange
    const initialRangeHours = timeRange === "24h" ? 24 : timeRange === "7d" ? 168 : timeRange === "30d" ? 720 : 2160;
    fetchMetrics(initialRangeHours);

    // hourly polling (1 hour = 3600000 ms)
    const HOUR_MS = 60 * 60 * 1000;
    autoRefreshRef.current = setInterval(() => {
      // fetch with selected timeRange window on each hourly tick
      const rr = timeRange === "24h" ? 24 : timeRange === "7d" ? 168 : timeRange === "30d" ? 720 : 2160;
      fetchMetrics(rr);
    }, HOUR_MS);

    return () => clearInterval(autoRefreshRef.current);
  }, [fetchMetrics, timeRange]);

  // filteredTrend respects user's selected timeRange but uses server trend from metrics.trend
  const filteredTrend = useMemo(() => {
    const raw = metrics.trend || [];
    if (!raw.length) return [];

    const nowMs = Date.now();
    const rangeObj = timeRangeOptions.find((r) => r.value === timeRange) || timeRangeOptions[1];
    const cutoff = nowMs - rangeObj.ms;

    const parsed = raw
      .map((t) => {
        const dt = new Date(t.timestamp);
        const tsMs = Number.isNaN(dt.getTime()) ? null : dt.getTime();
        return { ...t, tsMs };
      })
      .filter((t) => t.tsMs !== null)
      .filter((t) => t.tsMs >= cutoff)
      .sort((a, b) => a.tsMs - b.tsMs)
      .map((p) => ({ ...p, timestamp: p.timestamp }));

    if (parsed.length === 0) {
      // fallback - return the last N points from server trend if no points match the cutoff
      const maxPoints = rangeObj.value === "24h" ? 24 : rangeObj.value === "7d" ? 7 : rangeObj.value === "30d" ? 30 : 90;
      const parsedAll = raw
        .map((t) => {
          const dt = new Date(t.timestamp);
          const tsMs = Number.isNaN(dt.getTime()) ? Date.now() : dt.getTime();
          return { ...t, tsMs };
        })
        .sort((a, b) => a.tsMs - b.tsMs);
      const fallback = parsedAll.slice(Math.max(0, parsedAll.length - maxPoints));
      return fallback.map((p) => ({ ...p, timestamp: p.timestamp }));
    }

    return parsed;
  }, [metrics.trend, timeRange]);

  const distributionData = metrics.distribution && metrics.distribution.length ? metrics.distribution : [
    { name: "Slack", value: 35, color: "#0EA5E9" },
    { name: "Email", value: 28, color: "#059669" },
    { name: "GitHub", value: 18, color: "#D97706" },
    { name: "Jira", value: 12, color: "#DC2626" },
    { name: "Database", value: 7, color: "#7C3AED" },
  ];

  const categoriesData = metrics.categories && metrics.categories.length ? metrics.categories : [
    { category: "SSN", count: 45, severity: "Critical" },
    { category: "Credit Card", count: 32, severity: "Critical" },
    { category: "Email", count: 89, severity: "Medium" },
    { category: "Phone", count: 67, severity: "Medium" },
    { category: "Address", count: 54, severity: "Low" },
    { category: "Name", count: 123, severity: "Low" },
  ];

  const handleExportCard = async () => {
    if (!wrapperRef.current) {
      alert("Chart area not ready for export.");
      return;
    }
    try {
      const node = wrapperRef.current;
      const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: null });
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance-card-${chartType}-${timeRange}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
      alert("Export failed: " + (err?.message || "unknown"));
    }
  };

  const handleExportCSV = async () => {
    try {
      const rangeHours = timeRange === "24h" ? 24 : timeRange === "7d" ? 168 : timeRange === "30d" ? 720 : 2160;
      const url = `${API_BASE}/metrics/export/csv?range_hours=${rangeHours}`;
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      const res = await fetch(url, { 
        method: "GET",
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Export CSV failed", res.status, txt);
        alert(`Export failed: server returned ${res.status}. Check backend logs.`);
        return;
      }

      const blob = await res.blob();
      const filename = `compliance-trend-${timeRange}.csv`;
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("handleExportCSV error", err);
      alert("Export CSV failed: " + (err?.message || err));
    }
  };

  // manual refresh bound to button
  const handleRefreshClick = async () => {
    try {
      const rangeHours = timeRange === "24h" ? 24 : timeRange === "7d" ? 168 : timeRange === "30d" ? 720 : 2160;
      await fetchMetrics(rangeHours);
      // tiny UI feedback (console). Replace with toast if you have one.
      console.info("Metrics refreshed");
    } catch (err) {
      console.error("Refresh failed", err);
      alert("Refresh failed: " + (err?.message || "unknown"));
    }
  };

  const getChartDescription = useCallback(() => {
    switch (chartType) {
      case "trend":
        return "Compliance score trends and remediation progress over time";
      case "distribution":
        return "Distribution of PII risks across different data sources";
      case "categories":
        return "Breakdown of detected PII types by category";
      default:
        return "";
    }
  }, [chartType]);

  return (
    <div ref={wrapperRef} className="bg-card border border-border rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Compliance Analytics</h2>
          <p className="text-sm text-muted-foreground">{getChartDescription()}</p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ zIndex: 9999, position: "relative" }}
            className="px-3 py-2 border rounded-md text-sm bg-white"
          >
            <option value="trend">Compliance Trend</option>
            <option value="distribution">Source Distribution</option>
            <option value="categories">Risk Categories</option>
          </select>

          {chartType === "trend" && (
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ zIndex: 9999, position: "relative" }}
              className="px-3 py-2 border rounded-md text-sm bg-white"
            >
              {timeRangeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          )}

          <Button variant="outline" iconName="Download" size="sm" onClick={handleExportCard}>Export PNG</Button>
          <Button variant="outline" iconName="Download" size="sm" onClick={handleExportCSV}>Export CSV</Button>
          <Button variant="outline" iconName="RefreshCw" size="sm" onClick={handleRefreshClick}>Refresh</Button>
        </div>
      </div>

      <div className="w-full h-80 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "trend" && (
            <LineChart data={filteredTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="timestamp" tickFormatter={(val) => formatXAxisLabel(val, timeRange)} minTickGap={12} interval="preserveStartEnd" height={50} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="complianceScore" stroke={COLORS.primary} strokeWidth={3} dot={{ r: 3 }} isAnimationActive animationDuration={800} />
              <Line type="monotone" dataKey="riskItems" stroke={COLORS.error} strokeWidth={2} dot={{ r: 2 }} isAnimationActive animationDuration={900} />
              <Line type="monotone" dataKey="remediatedItems" stroke={COLORS.success} strokeWidth={2} dot={{ r: 2 }} isAnimationActive animationDuration={1000} />
            </LineChart>
          )}

          {chartType === "distribution" && (
            <PieChart>
              <Pie data={distributionData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} isAnimationActive animationDuration={900} startAngle={-90} endAngle={270}>
                {distributionData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          )}

          {chartType === "categories" && (
            <BarChart data={categoriesData} margin={{ top: 10, right: 20, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="category" angle={-30} textAnchor="end" interval={0} height={60} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill={COLORS.accent} radius={[8, 8, 0, 0]} isAnimationActive animationDuration={900}>
                {categoriesData.map((entry, idx) => <Cell key={idx} fill={COLORS.accent} />)}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="mt-2 pt-2 border-t border-border">
        {chartType === "trend" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.primary }} />
              <div>
                <div className="text-sm font-medium text-foreground">Compliance Score</div>
                <div className="text-xs text-muted-foreground">Current: {filteredTrend?.length ? Number(filteredTrend[filteredTrend.length - 1].complianceScore).toFixed(1) : "—"}/100</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.error }} />
              <div>
                <div className="text-sm font-medium text-foreground">Risk Items</div>
                <div className="text-xs text-muted-foreground">Current: {filteredTrend?.length ? Math.round(filteredTrend[filteredTrend.length - 1].riskItems) : "—"}</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.success }} />
              <div>
                <div className="text-sm font-medium text-foreground">Remediated</div>
                <div className="text-xs text-muted-foreground">Current: {filteredTrend?.length ? Math.round(filteredTrend[filteredTrend.length - 1].remediatedItems) : "—"}</div>
              </div>
            </div>
          </div>
        )}

        {chartType === "distribution" && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {distributionData.map((d, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <div>
                  <div className="text-sm font-medium text-foreground">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{d.value}%</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {chartType === "categories" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {categoriesData.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-foreground">{c.category}</div>
                  <div className="text-xs text-muted-foreground">{c.severity} Risk</div>
                </div>
                <div className="text-lg font-bold text-foreground">{c.count}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        {loading ? "Updating…" : `Last updated: ${metrics.last_updated ? new Date(metrics.last_updated).toLocaleString() : new Date().toLocaleString()}`}
      </div>
    </div>
  );
}
