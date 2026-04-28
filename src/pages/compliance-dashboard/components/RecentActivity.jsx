import React from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import PropTypes from "prop-types";

// ── Icon + colour per activity kind ─────────────────────────────────────────
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

function kindMeta(kind) {
  return KIND_META[kind] ?? DEFAULT_META;
}

// ── Skeleton pulse ───────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-muted/40 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-muted/40 rounded w-2/3" />
            <div className="h-2 bg-muted/30 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * RecentActivity — presentational list of activity feed items.
 * Props:
 *   items   – array of activity objects from /activity endpoint
 *   loading – show skeleton while fetching
 *   onViewAll – navigate to full activity page
 */
export default function RecentActivity({ items = [], loading = false, onViewAll }) {
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          iconName="MoreHorizontal" 
          onClick={() => navigate('/activity')}
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <Skeleton />
        ) : items.length > 0 ? (
          items.map((activity) => {
            const { icon, color } = kindMeta(activity.kind);
            // Human-readable detail line
            const detail = activity.details
              ? Object.entries(activity.details)
                .filter(([, v]) => v !== null && v !== undefined && v !== "")
                .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
                .join(" · ")
              : "";
            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="p-2 bg-muted/30 rounded-lg flex-shrink-0">
                  <Icon name={icon} size={14} className={color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="text-sm font-medium text-foreground truncate">{activity.title}</h4>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.timeLabel}</span>
                  </div>
                  {detail && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{detail}</p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-6">
            <Icon name="Activity" size={40} className="text-muted-foreground mx-auto mb-3" />
            <div className="text-sm text-muted-foreground">No recent activity yet</div>
            <div className="text-xs text-muted-foreground mt-1">Actions you take will appear here</div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          iconName="ArrowRight"
          iconPosition="right"
          fullWidth
          onClick={onViewAll}
        >
          View All Activity
        </Button>
      </div>
    </div>
  );
}

RecentActivity.propTypes = {
  items: PropTypes.array,
  loading: PropTypes.bool,
  onViewAll: PropTypes.func,
};
