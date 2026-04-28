import React from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import priorityAlerts from "../../data/priorityAlerts";

const AlertsList = () => {
    const navigate = useNavigate();

    return (
        <div className="p-6 space-y-6">
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-foreground">
                        All Alerts
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Complete list of detected compliance alerts
                    </p>
                </div>

                <div onClick={() => navigate(-1)} className="inline-block">
                    <Button variant="ghost" size="sm" iconName="ArrowLeft">
                        Back
                    </Button>
                </div>
            </div>

            {/* ALERT LIST */}
            <div className="space-y-4">
                {priorityAlerts.map((alert) => (
                    <div
                        key={alert.id}
                        className="bg-card border border-border rounded-lg p-4"
                    >
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <h3 className="text-sm font-medium text-foreground">
                                    {alert.title}
                                </h3>

                                <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                                    <span className="flex items-center space-x-1">
                                        <Icon name="Database" size={12} />
                                        <span>{alert.source}</span>
                                    </span>

                                    <span
                                        className={
                                            alert.status === "REMEDIATED"
                                                ? "text-success"
                                                : "text-error"
                                        }
                                    >
                                        {alert.status}
                                    </span>
                                </div>
                            </div>

                            <div
                                onClick={() => navigate(`/alerts/${alert.id}`)}
                                className="inline-block"
                            >
                                <Button variant="outline" size="sm">
                                    View
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AlertsList;
