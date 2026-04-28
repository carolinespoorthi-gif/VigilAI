"""
ml_engine/risk_model.py — Context-aware deterministic risk scorer.

Risk = f(severity + combination + exposure + context)

Risk Tiers:
  CRITICAL: 90–100  (only when ALL conditions met: identity+financial+credentials+unsafe)
  HIGH:     70–89   (identity+financial OR 3+ categories)
  MEDIUM:   40–69   (personal+financial OR partial exposure)
  LOW:      10–39   (masked data, minimal exposure)
  NONE:      0–9    (no sensitive data or fully protected)

The old GradientBoosting model is kept as a fallback but NOT used
by default.  The `predict()` interface is unchanged.
"""
import os, pickle, math
import numpy as np
from typing import Dict, Any, Tuple, List

MODEL_PATH = os.path.join(os.path.dirname(__file__), '_model.pkl')

# ── Per-type base weights (impact × sensitivity) ──────────────────────────
WEIGHTS: Dict[str, float] = {
    'ssns':           10.0,
    'credit_cards':   10.0,
    'api_keys':       10.0,
    'passwords':      10.0,
    'aadhaar':        10.0,
    'cvv':            10.0,
    'otp':             9.0,
    'pin':             9.0,
    'sensitive_ids':   7.0,
    'health_data':     6.0,
    'addresses':       5.0,
    'dates_of_birth':  5.0,
    'emails':          4.0,
    'phones':          3.5,
    'names':           2.0,
    'ip_addresses':    2.0,
    'urls':            1.0,
    'linkedin':        1.0,
    'github':          1.0,
    'naac_4_1':        5.0,
    'naac_4_2':        5.0,
    'naac_4_3':        5.0,
    'naac_4_4':        5.0,
}

# Severity tier for each entity type (used in per-entity scoring)
SEVERITY_TIER: Dict[str, str] = {
    'ssns': 'Critical', 'credit_cards': 'Critical', 'api_keys': 'Critical',
    'passwords': 'Critical', 'aadhaar': 'Critical',
    'cvv': 'Critical', 'otp': 'Critical', 'pin': 'Critical',
    'sensitive_ids': 'High', 'addresses': 'High', 'dates_of_birth': 'High',
    'health_data': 'High',
    'emails': 'Medium', 'phones': 'Medium',
    'names': 'Low', 'ip_addresses': 'Low', 'urls': 'Low',
    'linkedin': 'Low', 'github': 'Low',
    'naac_4_1': 'Medium', 'naac_4_2': 'Medium', 'naac_4_3': 'Medium', 'naac_4_4': 'Medium'
}

TIER_MULTIPLIER = {'Critical': 1.0, 'High': 0.75, 'Medium': 0.5, 'Low': 0.25}

# ── Unsafe context phrases ────────────────────────────────────────────────
UNSAFE_CONTEXT_PHRASES = [
    'plain text', 'plaintext', 'no encryption', 'unencrypted',
    'public access', 'publicly accessible', 'shared without consent',
    'unmasked', 'not encrypted', 'without protection', 'exposed',
    'no security', 'open access',
]


class RiskModel:
    """Drop-in replacement — same interface as the original."""

    def __init__(self):
        # Keep old ML model around for potential fallback
        self._ml_model = self._load_ml()

    # ── Public API (unchanged signature) ──────────────────────────────────

    def predict(self, findings: Dict[str, Any], raw_text: str = '') -> Tuple[float, float]:
        """Returns (risk_score, compliance_score)."""
        risk = self._context_aware_score(findings, raw_text)
        # compliance_score is now computed separately by compliance_scorer.py
        # but we still return a quick inverse here for backward compat
        compliance = max(0.0, 100.0 - risk)
        return round(risk, 1), round(compliance, 1)

    def entity_risk_scores(self, findings: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Return per-entity risk scores for the Detected Entities Table.
        Each entry: {type, value, risk_level, risk_score, severity}
        """
        results = []

        has_names = bool(findings.get('names'))
        has_ssns  = bool(findings.get('ssns') or findings.get('aadhaar'))
        has_dob   = bool(findings.get('dates_of_birth'))
        has_cc    = bool(findings.get('credit_cards'))
        has_cvv   = bool(findings.get('cvv'))

        # Ranges as per instructions
        base_ranges = {
            'ssns': 95, 'aadhaar': 95, 'credit_cards': 90,
            'api_keys': 95, 'passwords': 95, 'sensitive_ids': 90,
            'cvv': 95, 'otp': 85, 'pin': 85, 'health_data': 70,
            'dates_of_birth': 60, 'addresses': 50,
            'emails': 40, 'phones': 40,
            'names': 15, 'linkedin': 10, 'github': 10,
            'ip_addresses': 10, 'urls': 10,
            'naac_4_1': 20, 'naac_4_2': 20, 'naac_4_3': 20, 'naac_4_4': 20
        }

        # Global bonuses map across individual items
        bonus = 0.0
        if has_names and has_ssns: bonus += 10
        if has_ssns and has_dob:   bonus += 15
        if has_names and has_cc:   bonus += 15
        if has_cc and has_cvv:     bonus += 20

        for key, values in findings.items():
            if not isinstance(values, list) or not values:
                continue
            if key in ('detailed_findings', 'counts', 'violated_regulations',
                       'risk_categories'):
                continue

            tier = SEVERITY_TIER.get(key, 'Low')
            base_score = base_ranges.get(key, 10.0)

            for val in values:
                # Add context-aware boost, cap at 100
                individual = min(100.0, base_score + bonus)
                results.append({
                    'type':       key.replace('_', ' ').upper(),
                    'value':      val,
                    'risk_level': self.severity(individual),
                    'risk_score': round(individual, 1),
                    'severity':   tier,
                })

        # Sort by risk_score descending
        results.sort(key=lambda x: x['risk_score'], reverse=True)
        return results

    @staticmethod
    def severity(risk: float) -> str:
        if risk == 0:
            return 'NO RISK'
        if risk >= 90:
            return 'CRITICAL'
        if risk >= 70:
            return 'HIGH'
        if risk >= 40:
            return 'MEDIUM'
        return 'LOW'

    @staticmethod
    def status(risk: float) -> str:
        if risk <= 10:
            return 'COMPLIANT'
        return 'NON_COMPLIANT'

    # ── Context-aware scoring (NEW) ───────────────────────────────────────

    def _context_aware_score(self, findings: Dict[str, Any], raw_text: str = '') -> float:
        """
        Context-aware risk scoring:
        Risk = f(severity + combination + exposure + context)

        NOT just presence of data. Evaluates:
        1. What types of data are present
        2. What combinations exist
        3. Whether data is in unsafe context
        4. Overall exposure level
        """
        if not findings:
            return 0.0
            
        total_entities = sum(len(v) for v in findings.values() if isinstance(v, list))

        # ── Detect what categories of data are present ────────────────────
        has_identity = bool(
            findings.get('ssns') or findings.get('aadhaar') or
            findings.get('sensitive_ids')
        )
        has_financial = bool(
            findings.get('credit_cards') or findings.get('cvv') or
            findings.get('pin')
        )
        has_credentials = bool(
            findings.get('passwords') or findings.get('api_keys') or
            findings.get('otp')
        )
        has_personal = bool(
            findings.get('names') or findings.get('emails') or
            findings.get('phones') or findings.get('addresses') or
            findings.get('dates_of_birth')
        )
        has_health = bool(findings.get('health_data'))

        has_cc  = bool(findings.get('credit_cards'))
        has_cvv = bool(findings.get('cvv'))
        has_pin = bool(findings.get('pin'))
        has_otp = bool(findings.get('otp'))

        # ── Check for unsafe context in the raw text ──────────────────────
        text_lower = raw_text.lower() if raw_text else ''
        unsafe_context_count = 0
        for phrase in UNSAFE_CONTEXT_PHRASES:
            if phrase in text_lower:
                unsafe_context_count += 1

        has_unsafe_context = unsafe_context_count > 0

        # ══════════════════════════════════════════════════════════════════
        # FULL COMPLIANCE OVERRIDE — "NO RISK" (risk = 0)
        # If the document contains ALL positive compliance keywords
        # AND has NO negative keywords → treat as fully compliant.
        # ══════════════════════════════════════════════════════════════════
        _POSITIVE_COMPLIANCE = [
            'implemented', 'encrypted', 'secured', 'maintained', 'compliant',
        ]
        _NEGATIVE_KEYWORDS = [
            'no ', 'missing', 'lack', 'without', 'not updated',
            'partially', 'incomplete', 'outdated', 'absence',
        ]

        has_all_positive = all(w in text_lower for w in _POSITIVE_COMPLIANCE)
        has_any_negative = any(w in text_lower for w in _NEGATIVE_KEYWORDS)

        # Check if ONLY NAAC entities are present (no real PII)
        _PII_KEYS = ['ssns', 'credit_cards', 'api_keys', 'passwords', 'aadhaar',
                     'cvv', 'otp', 'pin', 'sensitive_ids', 'health_data',
                     'addresses', 'dates_of_birth', 'emails', 'phones', 'names']
        has_real_pii = any(bool(findings.get(k)) for k in _PII_KEYS)

        if has_all_positive and not has_any_negative and not has_real_pii:
            return 0.0  # FULLY COMPLIANT → NO RISK

        # ── Check for masked/remediated content → force low risk ──────────
        masked_indicators = ['****', '***', 'xxxx', 'XXXX', '[REDACTED]',
                             '[REMOVED]', '[MASKED]', '######', '●●●●',
                             '[PASSWORD REMOVED]', '[CVV REMOVED]',
                             '[API KEY REMOVED]']
        has_masking_markers = any(ind in raw_text for ind in masked_indicators) if raw_text else False

        # ══════════════════════════════════════════════════════════════════
        # FORCE CRITICAL (100) — OVERRIDE ALL AVERAGING
        # If ANY of these conditions: risk = 100, no exceptions.
        # ══════════════════════════════════════════════════════════════════
        if has_cc and has_cvv:
            return 100.0
        if has_financial and (has_pin or has_otp):
            return 100.0
        if has_credentials:
            return 100.0
        if has_identity and has_financial:
            return 100.0
        if (has_identity or has_financial or has_credentials) and has_unsafe_context:
            return 100.0

        # ── Detect NAAC specific rules ────────────────────────────────────
        naac_subs_present = [i for i in range(1, 5) if findings.get(f'naac_4_{i}')]
        has_naac = len(naac_subs_present) > 0
        naac_sub_count = len(naac_subs_present)

        # NAAC violation detection — NOT just "missing/no" words.
        naac_critical_phrases = [
            'no safety compliance', 'no cybersecurity', 'no maintenance system',
            'without governance', 'no it policy', 'no maintenance logs',
            'no firewall', 'no security', 'absence of',
        ]
        naac_high_phrases = [
            'missing maintenance', 'lack of usage logs', 'no policy',
            'missing documentation', 'partial infrastructure',
            'no records', 'no access control', 'without logs',
        ]
        # NEW: Medium-risk partial compliance phrases
        naac_medium_phrases = [
            'not updated', 'partially maintained', 'incomplete',
            'limited', 'outdated', 'partially',
        ]

        naac_critical = has_naac and any(ph in text_lower for ph in naac_critical_phrases)
        naac_high = has_naac and any(ph in text_lower for ph in naac_high_phrases)
        naac_medium = has_naac and any(ph in text_lower for ph in naac_medium_phrases)
        naac_violation = naac_critical or naac_high

        # NAAC overlap boost with GDPR/ISO 27001
        v_regs = findings.get('violated_regulations', [])
        has_naac_reg_overlap = any('GDPR' in str(r) or 'ISO 27001' in str(r) for r in v_regs)
        overlap_boost = 15.0 if (naac_violation and has_naac_reg_overlap) else 0.0

        # Force CRITICAL if NAAC violation conditions met
        if naac_critical:
            return min(100.0, 95.0 + overlap_boost)

        # Multi-NAAC boost: 3+ sub-criteria violated → 95+
        if naac_sub_count >= 3 and naac_violation:
            return min(100.0, 95.0 + overlap_boost)

        # Multi-NAAC boost: 2+ sub-criteria violated → 85+
        if naac_sub_count >= 2 and naac_violation:
            return min(100.0, 85.0 + overlap_boost)

        if naac_high:
            return min(100.0, 80.0 + overlap_boost)

        # Single NAAC violation → MEDIUM
        if has_naac and naac_violation:
            return min(100.0, 55.0 + overlap_boost)

        # NAAC medium partial compliance → MEDIUM (40-70)
        if naac_medium and not has_real_pii:
            return max(40.0, min(70.0, 50.0))

        # NAAC data present, no violation detected, fully compliant context → NO RISK
        if has_naac and not naac_violation and not has_any_negative and not has_real_pii:
            return 0.0

        # NAAC data present, no violation detected but other entities → LOW
        if has_naac and not naac_violation and total_entities > 0:
            return 20.0

        # ── Check if data appears to be masked/protected ──────────────────
        appears_masked = has_masking_markers

        # ── Count active sensitive categories ─────────────────────────────
        active_categories = sum([
            has_identity, has_financial, has_credentials,
            has_personal, has_health
        ])

        # ── Count total sensitive entities ────────────────────────────────
        individual_scores = self.entity_risk_scores(findings)

        if total_entities == 0:
            return 0.0

        # ══════════════════════════════════════════════════════════════════
        # TIER 2: HIGH (70-89)
        # Identity + Financial OR 3+ categories OR sensitive without creds
        # (Note: identity+financial already FORCED to 100 above)
        # ══════════════════════════════════════════════════════════════════

        if active_categories >= 3:
            base = 80.0
            if has_unsafe_context:
                base += 5
            if appears_masked:
                base -= 10
            return max(70.0, min(89.0, base))

        if has_credentials and (has_identity or has_financial):
            base = 78.0
            if has_unsafe_context:
                base += 5
            if appears_masked:
                base -= 8
            return max(70.0, min(89.0, base))

        if has_identity and has_unsafe_context:
            base = 75.0
            return max(70.0, min(89.0, base))

        # ══════════════════════════════════════════════════════════════════
        # TIER 3: MEDIUM (40-69)
        # Personal + Financial OR partial exposure
        # ══════════════════════════════════════════════════════════════════
        if has_personal and has_financial:
            base = 55.0
            if has_unsafe_context:
                base += 10
            if appears_masked:
                base -= 15
            return max(40.0, min(69.0, base))

        if has_identity:
            # Identity alone (SSN, Aadhaar) without financial = medium-high
            base = 60.0
            if appears_masked:
                base -= 15
            return max(40.0, min(69.0, base))

        if has_financial:
            # Financial alone = medium
            base = 55.0
            if appears_masked:
                base -= 15
            return max(40.0, min(69.0, base))

        if has_credentials:
            # Credentials alone = medium
            base = 50.0
            if has_unsafe_context:
                base += 10
            return max(40.0, min(69.0, base))

        if has_health and has_personal:
            base = 55.0
            return max(40.0, min(69.0, base))

        if active_categories >= 2:
            base = 45.0
            if has_unsafe_context:
                base += 10
            return max(40.0, min(69.0, base))

        # ══════════════════════════════════════════════════════════════════
        # TIER 4: LOW (10-39)
        # Minimal exposure, no risky combos
        # ══════════════════════════════════════════════════════════════════
        if has_personal:
            # Only personal data (names, emails, phones) without combos
            weight_sum = 0
            for e in individual_scores:
                lvl = e['risk_level']
                if lvl in ('HIGH', 'CRITICAL'):
                    weight_sum += 3
                elif lvl == 'MEDIUM':
                    weight_sum += 2
                else:
                    weight_sum += 1

            # Scale based on entity weights
            raw = (weight_sum / (total_entities * 3)) * 60
            base = max(10.0, min(39.0, raw))
            if appears_masked:
                base = max(10.0, base - 10)
            return base

        if has_health:
            return 25.0

        # ══════════════════════════════════════════════════════════════════
        # TIER 5: NONE/MINIMAL (0-9)
        # No sensitive data or fully protected
        # ══════════════════════════════════════════════════════════════════
        if appears_masked and total_entities <= 3:
            return 5.0

        # Fallback: weighted scoring for edge cases
        weight_sum = 0
        for e in individual_scores:
            lvl = e['risk_level']
            if lvl in ('HIGH', 'CRITICAL'):
                weight_sum += 3
            elif lvl == 'MEDIUM':
                weight_sum += 2
            else:
                weight_sum += 1

        raw = (weight_sum / (total_entities * 3)) * 50
        return max(0.0, min(39.0, raw))

    # ── Legacy ML model (kept as fallback) ────────────────────────────────

    @staticmethod
    def _load_ml():
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, 'rb') as f:
                    return pickle.load(f)
            except Exception:
                pass
        return None
