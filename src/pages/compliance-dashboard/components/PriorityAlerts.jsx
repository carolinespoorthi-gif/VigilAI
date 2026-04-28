// src/pages/compliance-dashboard/components/PriorityAlerts.jsx
// Fetches real HIGH / CRITICAL risk scans from /scans and renders them as priority alerts.
// No static mock data.
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const API_BASE = (import.meta?.env?.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

const SEV_MAP = {
  CRITICAL: {
    color: 'text-error', bgColor: 'bg-error/10',
    borderColor: 'border-l-error', icon: 'AlertTriangle',
  },
  HIGH: {
    color: 'text-warning', bgColor: 'bg-warning/10',
    borderColor: 'border-l-warning', icon: 'AlertCircle',
  },
  MEDIUM: {
    color: 'text-accent', bgColor: 'bg-accent/10',
    borderColor: 'border-l-accent', icon: 'Info',
  },
};

const PriorityAlerts = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchAlerts() {
      try {
        const res = await fetch(`${API_BASE}/scans`);
        if (!res.ok) throw new Error('scans fetch failed');
        const scans = await res.json();
        // Only show HIGH / CRITICAL scans as alerts
        const flagged = (Array.isArray(scans) ? scans : [])
          .filter(s => ['HIGH', 'CRITICAL'].includes(s.risk_level))
          .slice(0, 5)
          .map(s => ({
            id:              s.scan_id,
            severity:        s.risk_level,
            title:           `${s.risk_level} Risk: ${s.filename}`,
            description:     `Found ${s.risk_items ?? 0} PII instance(s). Compliance score: ${s.compliance_score}/100.`,
            source:          s.dataset_type || 'document',
            timestamp:       new Date(s.scanned_at || Date.now()),
            affectedRecords: s.risk_items ?? 0,
            actionRequired:  true,
          }));
        if (!cancelled) setAlerts(flagged);
      } catch {
        if (!cancelled) setAlerts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAlerts();
    window.addEventListener('dashboard:refresh', fetchAlerts);
    return () => {
      cancelled = true;
      window.removeEventListener('dashboard:refresh', fetchAlerts);
    };
  }, []);

  const formatTimestamp = ts => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(diff / 3600000);
    if (mins < 60) return `${mins}m ago`;
    return `${hrs}h ago`;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-error/10 rounded-lg">
            <Icon name="AlertTriangle" size={20} className="text-error" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Priority Alerts</h2>
            <p className="text-sm text-muted-foreground">High / Critical risk scans requiring action</p>
          </div>
        </div>
        <Button
          variant="outline"
          iconName="Settings"
          iconPosition="left"
          size="sm"
          onClick={() => navigate('/settings')}
        >
          Configure Alerts
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
        </div>
      )}

      {/* Empty state */}
      {!loading && alerts.length === 0 && (
        <div className="text-center py-10">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Icon name="CheckCircle" size={28} className="text-green-600" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">No priority alerts</h3>
          <p className="text-xs text-muted-foreground">
            No data available. Please upload or input data to begin monitoring.
          </p>
        </div>
      )}

      {/* Alert list */}
      {!loading && alerts.length > 0 && (
        <div className="space-y-4">
          {alerts.map(alert => {
            const cfg = SEV_MAP[alert.severity] || SEV_MAP['HIGH'];
            return (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 ${cfg.bgColor} ${cfg.borderColor}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <Icon name={cfg.icon} size={18} className={`mt-0.5 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-sm font-medium text-foreground truncate">{alert.title}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${cfg.color} ${cfg.bgColor} shrink-0`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span className="flex items-center space-x-1">
                          <Icon name="Database" size={12} />
                          <span>{alert.source}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Icon name="Clock" size={12} />
                          <span>{formatTimestamp(alert.timestamp)}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Icon name="FileText" size={12} />
                          <span>{alert.affectedRecords} records</span>
                        </span>
                      </div>
                    </div>
                  </div>

                    <div className="flex items-center space-x-2 ml-4 shrink-0">
                      <Button
                        variant="outline" size="sm" iconName="Eye"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card trigger
                          console.log("View clicked for alert:", alert.id);
                          navigate('/risk-assessment-details', { state: { alertData: alert } });
                        }}
                      >
                        View
                      </Button>
                      <Button
                        variant="default" size="sm" iconName="Zap"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card trigger
                          console.log("Remediate clicked for alert:", alert.id);
                          navigate('/remediation-centre', { state: { alertData: alert } });
                        }}
                      >
                        Remediate
                      </Button>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {!loading && alerts.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {alerts.length} priority alert{alerts.length !== 1 ? 's' : ''}
          </span>
          <Button
            variant="ghost" iconName="ArrowRight" iconPosition="right" size="sm"
            onClick={() => navigate('/monitoring')}
          >
            Go to Monitoring
          </Button>
        </div>
      )}
    </div>
  );
};

export default PriorityAlerts;
