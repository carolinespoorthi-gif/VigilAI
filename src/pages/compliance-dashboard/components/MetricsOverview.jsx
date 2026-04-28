import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';

const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");

const MetricsOverview = ({ unitPrefix = 'normal' }) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const [metricData, setMetricData] = useState({
    total_pii: 0,
    total_scans: 0,
    high_risk: 0,
    compliance_score: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch(`${API_BASE}/metrics`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setMetricData({
            total_pii: data.total_pii || 0,
            total_scans: data.total_scans || 0,
            high_risk: data.high_risk_items || 0,
            compliance_score: data.compliance_score || 0
          });
        }
      } catch (err) {
        console.error("Failed to fetch metrics", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchMetrics();
    // Refresh when a new file is uploaded
    const handler = () => fetchMetrics();
    window.addEventListener('dashboard:refresh', handler);
    return () => window.removeEventListener('dashboard:refresh', handler);
  }, []);
  const metrics = [
    {
      id: 1,
      title: "Total PII Instances",
      value: loading ? "…" : metricData.total_pii.toLocaleString(),
      icon: "Shield",
      color: "text-accent",
      bgColor: "bg-accent/10"
    },
    {
      id: 2,
      title: "Total Scans Run",
      value: loading ? "…" : metricData.total_scans.toLocaleString(),
      icon: "FileText",
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      id: 3,
      title: "High-Risk Items",
      value: loading ? "…" : metricData.high_risk.toLocaleString(),
      icon: "AlertTriangle",
      color: "text-error",
      bgColor: "bg-error/10"
    },
    {
      id: 4,
      title: "Avg Compliance Score",
      value: loading ? "…" : metricData.total_scans === 0 ? "No Data Yet" : `${metricData.compliance_score.toFixed(1)}`,
      icon: "TrendingUp",
      color: "text-success",
      bgColor: "bg-success/10"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics?.map((metric) => (
        <div key={metric?.id}
             className="bg-white border border-border rounded-xl p-6 hover:shadow-md transition-all duration-200"
             style={{ borderLeft: '3px solid var(--vigil-teal, #4F7C82)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#EEF7F9' }}>
              <Icon name={metric?.icon} size={22} style={{ color: '#4F7C82' }} />
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ background: '#EEF7F9', color: '#4F7C82' }}>
              {loading ? '…' : 'Live'}
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-black mb-1" style={{ color: '#0B2E33' }}>
              {metric?.value}
            </h3>
            <p className="text-sm text-muted-foreground">{metric?.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MetricsOverview;