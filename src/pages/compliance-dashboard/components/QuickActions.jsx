// src/pages/compliance-dashboard/components/QuickActions.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../../components/AppIcon";
import PropTypes from "prop-types";

export default function QuickActions() {
  const navigate = useNavigate();
  const [loading] = useState(false);

  const quickActions = [
    {
      key: "viewDashboard",
      title: "View Dashboard",
      description: "Return to the main compliance oversight overview",
      icon: "AlertTriangle", // Matching screenshot's triangle icon
      path: "/dashboard",
    },
    {
      key: "manageSources",
      title: "Manage Sources",
      description: "Configure and monitor active data entry points",
      icon: "Database", // Cylinder/Database icon
      path: "/data-source-management",
    },
    {
      key: "viewReports",
      title: "View Reports",
      description: "Access generated compliance and risk documentation",
      icon: "FileText", // File icon
      path: "/compliance-reports",
    },
  ];

  const run = async (item) => {
    console.log(`Navigating to: ${item.path}`);
    navigate(item.path);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="space-y-3">
        {quickActions.map((act) => (
          <button
            key={act.key}
            onClick={() => run(act)}
            disabled={loading}
            className="w-full p-4 text-left bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors duration-200 group"
          >
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg bg-muted/10 group-hover:scale-110 transition-transform duration-200`}>
                <Icon name={act.icon} size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground">{act.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{act.description}</p>
              </div>
              <Icon name="ArrowRight" size={16} className="text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

QuickActions.propTypes = {
  actions: PropTypes.object,
  navigateTo: PropTypes.func, // maintained for backward compatibility if needed
};
