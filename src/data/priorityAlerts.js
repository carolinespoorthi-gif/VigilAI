// src/data/priorityAlerts.js
// Centralized Priority Alerts data (frontend-only, safe)

const priorityAlerts = [
    {
        id: "alert-1",
        severity: "CRITICAL",
        title: "High-Risk PII in Slack Channel",
        description:
            "Social Security Numbers detected in #customer-support channel",
        source: "Slack",
        timeAgo: "15m ago",
        recordsAffected: 23,
        status: "OPEN",
    },
    {
        id: "alert-2",
        severity: "HIGH",
        title: "Unencrypted Email Attachments",
        description:
            "Customer contracts containing PII sent without encryption",
        source: "Email",
        timeAgo: "45m ago",
        recordsAffected: 7,
        status: "OPEN",
    },
    {
        id: "alert-3",
        severity: "MEDIUM",
        title: "Code Repository Exposure",
        description:
            "API keys and database credentials found in commit history",
        source: "GitHub",
        timeAgo: "2h ago",
        recordsAffected: 12,
        status: "OPEN",
    },
    {
        id: "alert-4",
        severity: "HIGH",
        title: "GDPR Compliance Gap",
        description:
            "Customer data retention exceeds policy limits",
        source: "Database",
        timeAgo: "4h ago",
        recordsAffected: 156,
        status: "OPEN",
    },
];

export default priorityAlerts;
