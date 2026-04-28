import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import priorityAlerts from "../../data/priorityAlerts";

const RemediationPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const alertIndex = priorityAlerts.findIndex(
        (alert) => alert.id === id
    );

    if (alertIndex === -1) {
        return (
            <div className="p-6">
                <h2 className="text-lg font-semibold text-foreground">
                    Alert not found
                </h2>

                <div onClick={() => navigate("/alerts")} className="inline-block mt-4">
                    <Button variant="ghost" size="sm">
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    const alert = priorityAlerts[alertIndex];
    const [status, setStatus] = useState(alert.status);

    const handleRemediate = () => {
        priorityAlerts[alertIndex].status = "REMEDIATED";
        setStatus("REMEDIATED");
    };

    return (
        <div className="p-6 space-y-6">
            {/* BACK */}
            <div onClick={() => navigate(-1)} className="inline-block">
                <Button variant="ghost" size="sm" iconName="ArrowLeft">
                    Back
                </Button>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h1 className="text-xl font-semibold text-foreground">
                    Remediation Actions
                </h1>

                <p className="text-sm text-muted-foreground">
                    Follow the recommended steps below to resolve this compliance issue.
                </p>

                {/* ALERT SUMMARY */}
                <div className="border border-border rounded-lg p-4 space-y-2">
                    <h3 className="text-sm font-medium text-foreground">
                        {alert.title}
                    </h3>

                    <p className="text-sm text-muted-foreground">
                        {alert.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <span className="flex items-center space-x-2">
                            <Icon name="Database" size={14} />
                            <span>{alert.source}</span>
                        </span>

                        <span className="flex items-center space-x-2">
                            <Icon name="FileText" size={14} />
                            <span>{alert.recordsAffected} records affected</span>
                        </span>
                    </div>
                </div>

                {/* RECOMMENDED ACTIONS */}
                <div className="border border-border rounded-lg p-4 space-y-2">
                    <h3 className="text-sm font-medium text-foreground">
                        Recommended Actions
                    </h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li>Identify and remove exposed sensitive data</li>
                        <li>Apply encryption and access restrictions</li>
                        <li>Notify compliance and security teams</li>
                        <li>Update internal data handling policies</li>
                    </ul>
                </div>

                {/* STATUS + ACTION */}
                <div className="border border-border rounded-lg p-4 flex items-center justify-between">
                    <span className="text-sm">
                        Current Status:{" "}
                        <span
                            className={
                                status === "REMEDIATED"
                                    ? "text-success"
                                    : "text-error"
                            }
                        >
                            {status}
                        </span>
                    </span>

                    {status !== "REMEDIATED" && (
                        <div onClick={handleRemediate} className="inline-block">
                            <Button variant="default" iconName="CheckCircle">
                                Mark as Remediated
                            </Button>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="flex justify-end">
                    <div onClick={() => navigate("/alerts")} className="inline-block">
                        <Button variant="outline">
                            View All Alerts
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RemediationPage;
