"""
pii_engine/classifier.py
─────────────────────────────────────────────────────────────
Entity classification, deduplication, and contextual-risk analysis.

Categories:
  • Personal  — names, emails, phones, DOB, addresses
  • Financial — credit cards, bank accounts, SSNs (when paired with financial ctx)
  • Sensitive — SSNs, Aadhaar, passwords, API keys, health data, CVV, OTP, PIN

Contextual rules flag elevated risk when dangerous combinations appear
(e.g. SSN + Name = identity theft risk).
"""
from __future__ import annotations
from typing import Dict, List, Any, Tuple

# ── Category mappings ──────────────────────────────────────────────────────
PERSONAL_TYPES  = {'names', 'emails', 'phones', 'dates_of_birth', 'addresses', 'linkedin', 'github'}
FINANCIAL_TYPES = {'credit_cards', 'cvv', 'pin'}
SENSITIVE_TYPES = {'ssns', 'aadhaar', 'api_keys', 'passwords', 'sensitive_ids',
                   'credit_cards', 'cvv', 'otp', 'pin', 'health_data'}
# IPs and URLs default to Security / informational
INFORMATIONAL_TYPES = {'ip_addresses', 'urls'}


def classify_entities(findings: Dict[str, Any]) -> Dict[str, Any]:
    """
    Classify every detected entity into Personal / Financial / Sensitive.
    Returns a dict with:
      data_categories: {Personal: int, Financial: int, Sensitive: int}
      entity_details:  [{type, value, category, risk_label, risk_score_individual}, …]
      context_flags:   [str, …]  — contextual-risk notes
    """
    personal  = 0
    financial = 0
    sensitive = 0
    entity_details: List[Dict[str, Any]] = []

    for key, values in findings.items():
        if not isinstance(values, list) or not values:
            continue
        if key in ('detailed_findings', 'counts', 'violated_regulations',
                   'risk_categories'):
            continue

        cats = _categories_for(key)
        for val in values:
            if 'Personal' in cats:
                personal += 1
            if 'Financial' in cats:
                financial += 1
            if 'Sensitive' in cats:
                sensitive += 1
            if not cats:
                personal += 1  # informational → count as personal

            cat_str = ", ".join(cats) if cats else "Personal"
            entity_details.append({
                'type':     key.replace('_', ' ').upper(),
                'value':    val,
                'category': cat_str,
            })

    # Deduplication (same type + value)
    entity_details = _deduplicate(entity_details)

    # Recount after dedup (since multiple categories can apply)
    personal = 0
    financial = 0
    sensitive = 0
    for e in entity_details:
        c = e['category']
        if 'Personal' in c: personal += 1
        if 'Financial' in c: financial += 1
        if 'Sensitive' in c: sensitive += 1

    # Contextual analysis
    context_flags = _contextual_analysis(findings)

    return {
        'data_categories': {
            'Personal':  personal,
            'Financial': financial,
            'Sensitive': sensitive,
        },
        'entity_details':  entity_details,
        'context_flags':   context_flags,
        'total_entities':  personal + financial + sensitive,
    }


# ── Helpers ────────────────────────────────────────────────────────────────

def _categories_for(key: str) -> List[str]:
    cats = []
    if key in PERSONAL_TYPES:
        cats.append('Personal')
    if key in FINANCIAL_TYPES:
        cats.append('Financial')
    if key in SENSITIVE_TYPES:
        cats.append('Sensitive')
    return cats


def _deduplicate(details: List[Dict]) -> List[Dict]:
    seen = set()
    out  = []
    for d in details:
        sig = (d['type'], d['value'])
        if sig not in seen:
            seen.add(sig)
            out.append(d)
    return out


def _contextual_analysis(findings: Dict[str, Any]) -> List[str]:
    """
    Flag dangerous combinations.
    """
    flags: List[str] = []
    has_names = bool(findings.get('names'))
    has_ssns  = bool(findings.get('ssns'))
    has_cc    = bool(findings.get('credit_cards'))
    has_dob   = bool(findings.get('dates_of_birth'))
    has_addr  = bool(findings.get('addresses'))
    has_email = bool(findings.get('emails'))
    has_pwd   = bool(findings.get('passwords'))
    has_keys  = bool(findings.get('api_keys'))
    has_aadh  = bool(findings.get('aadhaar'))
    has_cvv   = bool(findings.get('cvv'))
    has_otp   = bool(findings.get('otp'))
    has_pin   = bool(findings.get('pin'))
    has_health = bool(findings.get('health_data'))

    if has_names and has_ssns:
        flags.append('IDENTITY_THEFT_RISK: Name + SSN combination detected — '
                     'high risk of identity theft if exposed.')
    if has_names and has_cc:
        flags.append('FINANCIAL_FRAUD_RISK: Name + Credit Card combination — '
                     'potential for financial fraud.')
    if has_ssns and has_dob:
        flags.append('FULL_IDENTITY_EXPOSURE: SSN + Date of Birth — '
                     'complete identity compromise possible.')
    if has_names and has_dob and has_addr:
        flags.append('PROFILING_RISK: Name + DOB + Address — sufficient '
                     'data for profiling and social engineering.')
    if has_pwd or has_keys:
        flags.append('CREDENTIAL_EXPOSURE: Passwords or API keys detected — '
                     'immediate rotation required.')
    if has_aadh:
        flags.append('AADHAAR_EXPOSURE: Aadhaar numbers detected — '
                     'violates UIDAI data protection guidelines.')
    if has_email and has_names and has_addr:
        flags.append('CONTACT_PROFILE_RISK: Enough PII to build a full '
                     'contact profile — data minimisation recommended.')
    # ── NEW combination flags ──
    if has_cc and has_cvv:
        flags.append('CRITICAL_FINANCIAL_EXPOSURE: Credit Card + CVV combination — '
                     'complete card compromise. Immediate invalidation required.')
    if has_otp:
        flags.append('OTP_EXPOSURE: One-time passwords detected in document — '
                     'potential authentication bypass risk.')
    if has_pin:
        flags.append('PIN_EXPOSURE: PIN codes detected — '
                     'potential unauthorized account access.')
    if has_health:
        flags.append('HEALTH_DATA_EXPOSURE: Medical/health information detected — '
                     'HIPAA compliance review required.')
    # ── Full compromise flag (Identity + Financial + Credentials) ──
    has_identity = has_ssns or has_aadh or bool(findings.get('sensitive_ids'))
    has_financial = has_cc or has_cvv or has_pin
    has_credentials = has_pwd or has_keys or has_otp
    if has_identity and has_financial and has_credentials:
        flags.append('FULL_COMPROMISE_RISK: Identity + Financial + Credential data '
                     'all present — CRITICAL exposure level. Immediate containment required.')

    return flags
