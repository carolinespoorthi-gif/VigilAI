// src/services/activityLogger.js
/**
 * Sends an activity event to the backend /activity/log endpoint.
 * Called by AuthContext for login/logout/register, and can be imported
 * anywhere in the app to log frontend-originated actions.
 */

const API_BASE = (
    (typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_URL) ||
    "http://localhost:8000"
).replace(/\/+$/, "");

/**
 * @param {string} kind  - machine-readable event type  e.g. "logout"
 * @param {string} title - human-readable title          e.g. "User logged out"
 * @param {Object} [details] - optional key/value bag
 * @param {string} [username]
 * @param {string} [role]
 */
export async function logActivity(kind, title, details = {}, username = null, role = null) {
    try {
        const token = localStorage.getItem("token");
        await fetch(`${API_BASE}/activity/log`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ kind, title, details, username, role }),
        });
    } catch {
        // Never crash the caller — activity logging is best-effort
    }
}
