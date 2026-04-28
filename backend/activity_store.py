# backend/activity_store.py
"""
Shared in-memory activity log.
Imported by both auth.py and main.py so all modules write to the same list.
Python module imports are singletons — this is safe.
"""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

# In-memory store — ephemeral (cleared on server restart)
ACTIVITY: List[Dict[str, Any]] = []
_MAX_ITEMS = 500


def _record_activity(
    kind: str,
    title: str,
    details: Optional[Dict[str, Any]] = None,
    username: Optional[str] = None,
    role: Optional[str] = None,
) -> None:
    """Prepend an activity entry to the shared log."""
    try:
        entry: Dict[str, Any] = {
            "id": uuid.uuid4().hex,
            "kind": kind,
            "title": title,
            "details": details or {},
            "username": username,
            "role": role,
            "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
        }
        ACTIVITY.insert(0, entry)
        # Keep list bounded
        while len(ACTIVITY) > _MAX_ITEMS:
            ACTIVITY.pop()
    except Exception:
        pass  # Never crash the caller


def fmt_time_label(ts: Optional[str]) -> str:
    """Return a human-readable '2m ago' label from an ISO-8601 UTC string."""
    if not ts:
        return ""
    try:
        raw = ts.rstrip("Z")
        dt = datetime.fromisoformat(raw).replace(tzinfo=timezone.utc)
        diff = datetime.now(timezone.utc) - dt
        total_s = int(diff.total_seconds())
        if total_s < 60:
            return f"{total_s}s ago"
        if total_s < 3600:
            return f"{total_s // 60}m ago"
        if total_s < 86400:
            return f"{total_s // 3600}h ago"
        return f"{total_s // 86400}d ago"
    except Exception:
        return ts or ""
