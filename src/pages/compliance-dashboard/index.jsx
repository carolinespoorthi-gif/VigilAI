// src/pages/compliance-dashboard/index.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import MetricsOverview from './components/MetricsOverview';
import PriorityAlerts from './components/PriorityAlerts';
import RiskSummaryTable from './components/RiskSummaryTable';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import FileUploadModal from './components/FileUploadModal';
import ChatWidget from '../../components/ChatWidget';
import CameraScanModal from './components/CameraScanModal';
import RecentActivity from './components/RecentActivity';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import AnalyticsCharts from './components/AnalyticsCharts';

const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");

const ComplianceDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const isAdmin = user?.role === 'admin';

  const [isFileUploadModalOpen, setIsFileUploadModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

  /* ===== ACTIVITY STATE ===== */
  const [activityItems, setActivityItems] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // Use variables from global settings context
  const { density, units: unitPrefix } = settings;

  /* ===== CAMERA EVENT ===== */
  useEffect(() => {
    const onOpen = () => setIsCameraModalOpen(true);
    window.addEventListener('camera:open', onOpen);
    return () => window.removeEventListener('camera:open', onOpen);
  }, []);

  /* ===== FETCH ACTIVITY ===== */
  useEffect(() => {
    let cancelled = false;

    async function fetchActivity() {
      try {
        const token = user?.token || localStorage.getItem('token');
        const res = await fetch(
          `${API_BASE}/activity?limit=5`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setActivityItems(Array.isArray(data) ? data : []);
      } catch {
        // silently ignore network errors for the widget
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    }

    fetchActivity();
    const timer = setInterval(fetchActivity, 30_000); // refresh every 30 s

    // Also refresh when a dashboard:refresh event fires (e.g. after file upload)
    const onRefresh = () => fetchActivity();
    window.addEventListener('dashboard:refresh', onRefresh);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('dashboard:refresh', onRefresh);
    };
  }, [user]);

  const handleRefreshDashboard = () => {
    window.location.reload();
  };

  return (
    <div className={`min-h-screen bg-background ${density === 'compact' ? 'text-sm' : ''}`}>
      <Header />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
          <BreadcrumbNavigation />

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#0B2E33' }}>
                {isAdmin ? "Compliance Dashboard" : "User Portal"}
              </h1>
              <p className="text-muted-foreground mt-2">
                {isAdmin ? "Monitor PII risks and compliance status" : "Manage your documents and compliance reports"}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/monitoring')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: '#4F7C82' }}>
                <Icon name="Upload" size={15} />Upload Document
              </button>

              <button
                onClick={async () => {
                  setClearingHistory(true);
                  try {
                    const API = (import.meta?.env?.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
                    const token = user?.token || localStorage.getItem('token') || sessionStorage.getItem('token');
                    const resp = await fetch(`${API}/api/clear-history`, {
                      method: 'DELETE',
                      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    });
                    if (resp.ok) {
                      window.dispatchEvent(new Event('dashboard:refresh'));
                    }
                  } catch (e) {
                    console.error('Clear history failed', e);
                  } finally {
                    setClearingHistory(false);
                  }
                }}
                disabled={clearingHistory}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50"
                style={{ borderColor: '#DC2626', color: '#DC2626', background: '#FEF2F2' }}
              >
                <Icon name={clearingHistory ? 'Loader2' : 'Trash2'} size={14} className={clearingHistory ? 'animate-spin' : ''} />
                {clearingHistory ? 'Clearing...' : 'Clear History'}
              </button>

              <Button onClick={handleRefreshDashboard} variant="outline">
                <Icon name="RefreshCw" size={14} className="mr-2" />Refresh
              </Button>

              {isAdmin && (
                <Button onClick={() => navigate('/settings')} variant="outline">
                  <Icon name="Settings" size={14} className="mr-2" />Settings
                </Button>
              )}
            </div>
          </div>

          <MetricsOverview unitPrefix={unitPrefix} />

          {/* ── SECTION GROUP 1: Risk Heat Map + Priority Alerts ──────────────── */}
          <div style={{
            background: 'var(--card, #ffffff)',
            border: '1px solid var(--border, rgba(0,0,0,0.08))',
            borderRadius: 20,
            padding: 24,
            marginBottom: 24,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}>
            <AnalyticsCharts />

            {isAdmin && (
              <div style={{ marginTop: 24 }}>
                <PriorityAlerts />
              </div>
            )}
          </div>

          {/* ── SECTION GROUP 2: Risk Summary + Recent Activity ───────────────── */}
          <div style={{
            background: 'var(--card, #ffffff)',
            border: '1px solid var(--border, rgba(0,0,0,0.08))',
            borderRadius: 20,
            padding: 24,
            marginBottom: 24,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}>
            {isAdmin && (
              <div style={{ marginBottom: 24 }}>
                <RiskSummaryTable />
              </div>
            )}

            <RecentActivity
              items={activityItems}
              loading={activityLoading}
              onViewAll={() => navigate('/activity')}
            />
          </div>
        </div>
      </main>

      <FileUploadModal
        isOpen={isFileUploadModalOpen}
        onClose={() => setIsFileUploadModalOpen(false)}
      />

      <CameraScanModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
      />

      <ChatWidget backendUrl={API_BASE} />
    </div>
  );
};

export default ComplianceDashboard;
