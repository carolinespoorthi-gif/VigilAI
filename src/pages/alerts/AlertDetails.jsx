import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import priorityAlerts from "../../data/priorityAlerts";

const AlertDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const alert = priorityAlerts.find((a) => a.id === id);

    if (!alert) {
        return (
            <div className="p-6">
                <h2 className="text-lg font-semibold text-foreground">
                    Alert not found
                </h2>

                <div onClick={() => navigate("/alerts")} className="mt-4 inline-block">
                    <Button variant="ghost" size="sm">
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* 🔙 BACK */}
            <div onClick={() => navigate(-1)} className="inline-block">
                <Button variant="ghost" size="sm" iconName="ArrowLeft">
                    Back
                </Button>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-foreground">
                        {alert.title}
                    </h1>

                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-error/10 text-error">
                        {alert.severity}
                    </span>
                </div>

                <p className="text-sm text-muted-foreground">
                    {alert.description}
                </p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                        <Icon name="Database" size={14} />
                        <span>{alert.source}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Icon name="FileText" size={14} />
                        <span>{alert.recordsAffected} records affected</span>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Icon name="AlertTriangle" size={14} />
                        <span>Status: {alert.status}</span>
                    </div>
                </div>

                <div className="flex space-x-3 pt-4">
                    {/* ⚡ REMEDIATE */}
                    {alert.status === "OPEN" && (
                        <div
                            onClick={() => navigate(`/remediation/${alert.id}`)}
                            className="inline-block"
                        >
                            <Button variant="default" iconName="Zap">
                                Remediate
                            </Button>
                        </div>
                    )}

                    {/* 📋 ALL ALERTS */}
                    <div
                        onClick={() => navigate("/alerts")}
                        className="inline-block"
                    >
                        <Button variant="outline">
                            View All Alerts
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlertDetails;
