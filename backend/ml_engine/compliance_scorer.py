"""
ml_engine/compliance_scorer.py
─────────────────────────────────────────────────────────────
Structured compliance scoring — deduction-based.

Starts from 100 (fully compliant) and *deducts* points based on the
severity of each violation found during a scan.

Severity deductions:
  • Minor   — -5   (e.g. a single email or phone exposed)
  • Moderate— -15  (e.g. unmasked DOB, address, or name+email combo)
  • Severe  — -30  (e.g. SSN, Credit Card, Aadhaar, passwords, API keys)

Status thresholds (STRICT):
  COMPLIANT     — compliance_score >= 80 AND risk_score <= 30
  NON_COMPLIANT — everything else (no middle tier)
"""
from __future__ import annotations
from typing import Dict, Any, List, Tuple

# ── Deduction rules per PII type ───────────────────────────────────────────
#  (deduction_per_item, deduction_label)
_DEDUCTION_MAP: Dict[str, Tuple[int, str]] = {
    # Severe (-30 each)
    'ssns':          (30, 'Severe: Unprotected SSN detected'),
    'credit_cards':  (30, 'Severe: Unprotected credit card number'),
    'aadhaar':       (30, 'Severe: Aadhaar number exposed'),
    'api_keys':      (30, 'Severe: API key / secret exposed'),
    'passwords':     (30, 'Severe: Plaintext password detected'),
    'sensitive_ids': (30, 'Severe: Sensitive ID (passport etc.) exposed'),
    'cvv':           (30, 'Severe: CVV/security code exposed'),
    'otp':           (30, 'Severe: One-time password exposed'),
    'pin':           (30, 'Severe: PIN code exposed'),
    'ip_addresses':  (30,  'Severe: IP address exposed'),
    # Moderate (-15 each)
    'addresses':     (15, 'Moderate: Physical address exposed'),
    'dates_of_birth':(15, 'Moderate: Date of birth exposed'),
    'emails':        (15, 'Moderate: Email address exposed'),
    'phones':        (15, 'Moderate: Phone number exposed'),
    'health_data':   (15, 'Moderate: Health/medical data detected'),
    # Minor (-5 each)
    'names':         (5,  'Minor: Personal name detected'),
    'urls':          (5,  'Minor: URL reference found'),
    'linkedin':      (5,  'Minor: LinkedIn profile URL'),
    'github':        (5,  'Minor: GitHub profile URL'),
}


def compute_compliance_score(findings: Dict[str, Any], risk_score: float = 50.0) -> Dict[str, Any]:
    """
    Compute a deduction-based compliance score from PII findings.

    Returns:
      score:       float 0–100
      status:      COMPLIANT | NON_COMPLIANT
      deductions:  [{type, count, deduction, reason}, …]
      summary:     str — human-readable summary
    """
    total_deductions = 0.0
    deductions: List[Dict[str, Any]] = []

    for pii_type, (deduction_val, reason) in _DEDUCTION_MAP.items():
        items = findings.get(pii_type, [])
        if not isinstance(items, list) or not items:
            continue

        count = len(items)
        # NO per-type cap — each instance fully deducts
        total = deduction_val * count
        total_deductions += total

        deductions.append({
            'type':      pii_type.replace('_', ' ').title(),
            'count':     count,
            'deduction': total,
            'severity':  _severity_label(deduction_val),
            'reason':    reason,
        })

    # NO global cap — score can reach 0
    score = max(0.0, 100.0 - total_deductions)
    score = round(score, 1)
    status = _status(score, risk_score)

    return {
        'score':      score,
        'status':     status,
        'deductions': deductions,
        'summary':    _summary(score, status, deductions),
    }


# ── Helpers ────────────────────────────────────────────────────────────────

def _severity_label(deduction: int) -> str:
    if deduction >= 30:
        return 'Severe'
    if deduction >= 15:
        return 'Moderate'
    return 'Minor'


def _status(score: float, risk_score: float = 50.0) -> str:
    """
    STRICT binary status:
    COMPLIANT only when compliance_score >= 80 AND risk_score <= 30
    Everything else is NON_COMPLIANT
    """
    if score >= 90 and risk_score <= 10:
        return 'COMPLIANT'
    return 'NON_COMPLIANT'


def _summary(score: float, status: str, deductions: List[Dict]) -> str:
    if not deductions:
        return ('No compliance violations detected. '
                'The scanned data appears fully compliant.')

    severe = [d for d in deductions if d['severity'] == 'Severe']
    moderate = [d for d in deductions if d['severity'] == 'Moderate']
    minor = [d for d in deductions if d['severity'] == 'Minor']

    parts = []
    if severe:
        parts.append(f"{len(severe)} severe violation(s)")
    if moderate:
        parts.append(f"{len(moderate)} moderate violation(s)")
    if minor:
        parts.append(f"{len(minor)} minor violation(s)")

    return (f"Compliance score: {score}/100 ({status.replace('_', ' ')}). "
            f"Found {', '.join(parts)}. "
            f"Total deduction: {sum(d['deduction'] for d in deductions)} points.")
