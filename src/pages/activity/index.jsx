// src/pages/activity/index.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "components/ui/Header";
import Icon from "components/AppIcon";
import Button from "components/ui/Button";

// Same icon+color map as the widget
const KIND_META = {
  login: { icon: "LogIn", color: "text-green-500" },
  login_failed: { icon: "ShieldAlert", color: "text-red-500" },
  logout: { icon: "LogOut", color: "text-slate-400" },
  register: { icon: "UserPlus", color: "text-blue-500" },
  file_uploaded: { icon: "Upload", color: "text-purple-500" },
  scan_started: { icon: "ScanLine", color: "text-yellow-500" },
  scan_completed: { icon: "ShieldCheck", color: "text-green-500" },
  remediation_applied: { icon: "Shield", color: "text-emerald-500" },
  report_generated: { icon: "FileText", color: "text-blue-400" },
  settings_changed: { icon: "Settings", color: "text-orange-400" },
};
const DEFAULT_META = { icon: "Clock", color: "text-primary" };
const kindMeta = (kind) => KIND_META[kind] ?? DEFAULT_META;

const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");

export default function ActivityPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${API_BASE}/activity?limit=${limit}`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const json = await res.json();
        if (!cancelled) setItems(Array.isArray(json) ? json : []);
      } catch (e) {
        console.error("Failed to load activity", e);
        if (!cancelled) setErr(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    // also refresh when dashboard broadcasts a refresh (so activity reflects new events)
    const onRefresh = () => load();
    window.addEventListener("dashboard:refresh", onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener("dashboard:refresh", onRefresh);
    };
  }, [limit]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Activity Feed</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Recent system and user activities (server-side feed).
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" onClick={() => navigate(-1)}>
                Go Back
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // refresh locally
                  window.dispatchEvent(new CustomEvent("dashboard:refresh"));
                }}
              >
                Refresh
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            {loading && (
              <div className="text-center py-12">
                <div className="text-sm text-muted-foreground">Loading activity…</div>
              </div>
            )}

            {err && (
              <div className="text-center py-8">
                <div className="text-sm text-red-600">Failed to load activity: {err}</div>
                <div className="mt-4">
                  <Button onClick={() => window.dispatchEvent(new CustomEvent("dashboard:refresh"))}>
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {!loading && !err && items.length === 0 && (
              <div className="text-center py-8">
                <Icon name="Search" size={40} className="text-muted-foreground mx-auto mb-3" />
                <div className="text-sm text-muted-foreground">No activity found</div>
              </div>
            )}

            {!loading && !err && items.length > 0 && (
              <div className="space-y-4">
                {items.map((it) => {
                  const { icon, color } = kindMeta(it.kind);
                  const detail = it.details
                    ? Object.entries(it.details)
                      .filter(([, v]) => v !== null && v !== undefined && v !== "")
                      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
                      .join(" · ")
                    : "";
                  return (
                    <div key={it.id} className="flex items-start space-x-3 py-2 border-b border-border/50 last:border-0">
                      <div className="p-2 bg-muted/30 rounded-lg flex-shrink-0">
                        <Icon name={icon} size={14} className={color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="text-sm font-medium text-foreground">{it.title}</h4>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">{it.timeLabel || it.timestamp}</div>
                        </div>
                        {detail && (
                          <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
                        )}
                        {it.username && (
                          <div className="flex items-center gap-1 mt-1">
                            <Icon name="User" size={10} className="text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{it.username}</span>
                            {it.role && (
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${it.role === "admin"
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                }`}>{it.role}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* footer */}
            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Showing {items.length} items</div>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={() => setLimit((s) => Math.max(10, s - 10))}>Less</Button>
                <Button variant="ghost" size="sm" onClick={() => setLimit((s) => s + 10)}>More</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
