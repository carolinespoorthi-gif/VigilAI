"""
llm_reasoning/analysis_explainer.py
Generates the LIVE AI ANALYSIS blocks required strictly BEFORE scoring.
Explains What data is detected, Why it is risky, and Which rules are violated.
"""
from typing import Dict, Any, List

def generate_live_ai_analysis(findings: Dict[str, List[str]], risk_score: float, violated_regs: List[str], data_categories: Dict[str, int], context_flags: List[str]) -> Dict[str, str]:
    """
    Generates a natural language explanation of the compliance status and risk level,
    adhering strictly to the context-aware risk rules.
    """
    
    # ── 1. WHAT DATA IS DETECTED ──
    total_found = sum(len(v) for k, v in findings.items() if isinstance(v, list) and k not in ('detailed_findings', 'counts', 'violated_regulations', 'risk_categories'))
    
    if total_found == 0:
        what_found = "No sensitive data or PII entities were detected in this document."
    else:
        # Get top 3 categories
        type_counts = {k: len(v) for k, v in findings.items() if isinstance(v, list) and v and k not in ('detailed_findings', 'counts', 'violated_regulations', 'risk_categories')}
        top_types = sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        top_strings = [f"{count} {t.replace('_', ' ')}" for t, count in top_types]
        
        what_found = f"The AI engine detected {total_found} sensitive data instance(s). "
        what_found += f"Key detections include: {', '.join(top_strings)}. "
        
        if data_categories.get('Personal', 0) > 0 and data_categories.get('Financial', 0) > 0:
            what_found += "Both Identity and Financial patterns are present simultaneously."

    # ── 2. WHY IT IS RISKY ──
    why_risky = ""
    # Map back to the exact strict risk rules
    if risk_score == 100:
        why_risky = "CRITICAL RISK (100/100): The document contains critically sensitive data requiring immediate intervention. This may include exposed credentials (passwords, API keys), combined identity and financial data (SSN + Credit Card), or sensitive data in an unsafe context (plain text, public access). Immediate containment and remediation is mandatory."
    elif risk_score >= 90:
        why_risky = f"CRITICAL RISK ({risk_score}/100): Severe compliance violations detected. Multiple critical conditions are met, including data exposure patterns that could lead to immediate identity theft, financial fraud, or regulatory sanctions."
    elif risk_score >= 85:
        why_risky = f"HIGH RISK ({risk_score}/100): The document exposes highly sensitive combinations, such as simultaneous Identity and Financial data, or unmasked sensitive exposure without credentials. This acts as a major risk multiplier."
    elif risk_score >= 40:
        why_risky = f"MEDIUM RISK ({risk_score}/100): Personal and financial data are present or partially exposed. While not a full critical compromise, this data requires stringent access controls and masking to prevent privacy violations."
    elif risk_score >= 10:
        why_risky = f"LOW RISK ({risk_score}/100): The detected data is mostly masked, protected, or lacks risky combinations. Minimal exposure risk found, but best practices dictate continuing to limit access."
    else:
        why_risky = f"NO RISK ({risk_score}/100): No sensitive data was detected, or all detected data was fully masked and securely protected via remediation. The document is safe."

    if "UNSAFE_CONTEXT" in context_flags:
        why_risky += " WARNING: The AI contextual analysis detected plaintext or unencrypted exposure markers, severely increasing the severity."

    naac_issues = []
    naac_sub_map = {
        'naac_4_1': ('4.1', 'Infrastructure'),
        'naac_4_2': ('4.2', 'Library'),
        'naac_4_3': ('4.3', 'IT Infrastructure'),
        'naac_4_4': ('4.4', 'Maintenance'),
    }
    for key, (code, label) in naac_sub_map.items():
        items = findings.get(key)
        if items:
            keywords = ', '.join(items[:3])
            naac_issues.append(f"Sub-Criterion {code} ({label}) — detected: {keywords}")

    if naac_issues:
        why_risky += f" NAAC Criterion 4 violations detected: {'; '.join(naac_issues)}."

    # ── 3. WHICH RULES ARE VIOLATED ──
    compliance_rules = ""
    if not violated_regs:
        compliance_rules = "No specific regulatory violations were identified based on the detected entities."
    else:
        compliance_rules = "The exposed data directly violates the following regulatory frameworks: "
        explanations = []
        if "GDPR" in violated_regs:
            explanations.append("GDPR (General Data Protection Regulation) - Unauthorized exposure of personal identities or contact structures.")
        if "PCI-DSS" in violated_regs:
            explanations.append("PCI-DSS (Payment Card Industry Data Security Standard) - Unsafe storage or transmission of credit card PANs, CVVs, or financial auth data.")
        if "HIPAA" in violated_regs:
            explanations.append("HIPAA (Health Insurance Portability and Accountability Act) - Exposure of protected health information (PHI) or medical records.")
        if "ISO 27001" in violated_regs:
            explanations.append("ISO 27001 - Failure to encrypt or adequately protect sensitive informational assets and credentials (passwords, API keys).")
        if "CCPA" in violated_regs:
            explanations.append("CCPA - Exposure of California resident personal data without adequate security measures.")
        # Handle NAAC with sub-criteria labels
        naac_regs = [r for r in violated_regs if r.startswith('NAAC')]
        if naac_regs:
            naac_list = ', '.join(naac_regs)
            explanations.append(f"{naac_list} - Non-compliance with NAAC Criterion 4: Infrastructure and Learning Resources standard.")
        
        # Add any remaining ones that didn't have special text
        handled = {"GDPR", "PCI-DSS", "HIPAA", "ISO 27001", "CCPA"}
        for r in violated_regs:
            if r not in handled and not r.startswith('NAAC'):
                explanations.append(f"{r} - Exposure of related sensitive data entities.")
                
        compliance_rules += " ".join(explanations)

    return {
        "whatFound": what_found,
        "whyRisky": why_risky,
        "complianceRules": compliance_rules
    }
