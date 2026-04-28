"""
llm_reasoning/remediation_advisor.py
Generates step-by-step mitigation plans.
Uses Anthropic API if available, falls back to rich rule-based engine.
"""
import os, json, urllib.request
from typing import Dict, Any, List

_RECS = {
    'ssns':         {'imm':['Immediately restrict SSN access and trigger incident response.',
                             'Notify affected individuals and DPA within 72 hours (GDPR Art.33).',
                             'Revoke access tokens for systems that touched these records.'],
                     'tech':['Tokenise SSNs — store only opaque references.',
                              'Apply AES-256 field-level encryption to all SSN columns.',
                              'Enforce strict audit logging on every SSN lookup.']},
    'credit_cards': {'imm':['Invalidate exposed card numbers and notify card issuers immediately.',
                             'Escalate to PCI DSS QSA within 24 hours.'],
                     'tech':['Integrate payment vault (Stripe/Braintree) — never store raw PANs.',
                              'Apply P2PE across all payment channels.']},
    'emails':       {'imm':['Restrict dataset access and classify all email fields.'],
                     'tech':['SHA-256 hash emails in non-essential systems.',
                              'Apply RBAC so only authorised services read plaintext emails.']},
    'phones':       {'imm':[],
                     'tech':['Encrypt phone columns at rest with AES-256.',
                              'Mask phone numbers in logs — show only last 4 digits.']},
    'names':        {'imm':[],
                     'tech':['Pseudonymise names in non-production environments.',
                              'Apply data minimisation — collect full names only when required.']},
    'addresses':    {'imm':[],
                     'tech':['Encrypt address fields in transit (TLS 1.3) and at rest.',
                              'Use geohashing where exact address is not required.']},
    'api_keys':     {'imm':['Rotate ALL exposed API keys immediately — assume compromised.',
                             'Revoke old keys in every integrated service dashboard.'],
                     'tech':['Move secrets to a vault (HashiCorp Vault / AWS Secrets Manager).',
                              'Add pre-commit hooks to block secret commits.']},
    'passwords':    {'imm':['Rotate all exposed passwords immediately.',
                             'Force password reset for all affected accounts.'],
                     'tech':['Hash passwords with bcrypt (cost ≥12) or Argon2id.',
                              'Add SAST rules to flag hardcoded credentials.']},
    'aadhaar':      {'imm':['Restrict access to Aadhaar data immediately.',
                             'Report to UIDAI and relevant authorities if exposure confirmed.'],
                     'tech':['Store only masked Aadhaar (last 4 digits visible).',
                              'Apply tokenisation compliant with UIDAI guidelines.']},
    'dates_of_birth':{'imm':[],
                      'tech':['Store only birth year where full DOB not required.',
                               'Encrypt DOB fields with column-level encryption.']},
}

_LONG_TERM = [
    'Conduct a full data audit to map all PII data stores.',
    'Implement a Data Loss Prevention (DLP) solution.',
    'Establish Privacy Impact Assessments (PIA) for all new features.',
    'Apply principle of least privilege across all data access.',
    'Integrate automated PII scanning into CI/CD pipeline.',
    'Deliver quarterly privacy and security training to all staff.',
]

_REG_NOTES = {
    'GDPR':            'GDPR Art.33 — notify supervisory authority within 72 h.',
    'HIPAA':           'HIPAA §164.400 — conduct risk assessment & notify patients.',
    'PCI-DSS':         'PCI DSS — immediate incident response + card-network notification.',
    'ISO 27001':       'ISO 27001 A.12.6 — document vulnerability management controls.',
    'NAAC Criterion 4':'NAAC Criterion 4 — ensure learning resource data is protected.',
    'CCPA':            'CCPA §1798.82 — notify CA residents within 45 days.',
}


class RemediationAdvisor:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv('ANTHROPIC_API_KEY', '')

    def generate(self, findings: Dict[str,Any], risk_score: float,
                 violated_rules: List[str]) -> Dict[str,Any]:
        if self.api_key and len(self.api_key) > 20:
            result = self._llm(findings, risk_score, violated_rules)
            if result: return result
        return self._rule(findings, risk_score, violated_rules)

    def flat_list(self, plan: Dict[str,Any]) -> List[str]:
        out = []
        for k in ('immediate_actions','short_term_actions','technical_controls'):
            out.extend(plan.get(k, []))
        return out

    def _llm(self, findings, risk_score, regs):
        pii_summary = {k:len(v) for k,v in findings.items()
                       if isinstance(v,list) and v and k not in ('detailed_findings',)}
        prompt = (
            f"You are a senior cybersecurity expert.\n"
            f"SCAN: Risk={risk_score}/100  PII={json.dumps(pii_summary)}  "
            f"Regulations={', '.join(regs) or 'None'}\n"
            f"Return ONLY valid JSON with keys: immediate_actions, short_term_actions, "
            f"long_term_actions, technical_controls, compliance_notes. "
            f"Each is a list of 3-5 concise actionable strings."
        )
        try:
            payload = json.dumps({"model":"claude-sonnet-4-20250514","max_tokens":1000,
                                  "messages":[{"role":"user","content":prompt}]}).encode()
            req = urllib.request.Request(
                'https://api.anthropic.com/v1/messages', data=payload,
                headers={'Content-Type':'application/json','x-api-key':self.api_key,
                         'anthropic-version':'2023-06-01'}, method='POST')
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read().decode())
                text = data['content'][0]['text']
                result = json.loads(text[text.find('{'):text.rfind('}')+1])
                result['source'] = 'llm'
                return result
        except: return None

    def _rule(self, findings, risk_score, regs):
        imm, tech = [], []
        for pii_type, recs in _RECS.items():
            if not findings.get(pii_type): continue
            imm.extend(recs.get('imm', []))
            tech.extend(recs.get('tech', []))
        if not imm:
            sev = 'CRITICAL' if risk_score > 80 else 'HIGH' if risk_score > 50 else 'MEDIUM'
            imm = [f'Restrict access to files containing detected PII ({sev} risk).',
                   'Begin internal incident review and notify your security team.',
                   'Document all PII findings for regulatory reporting.']
        notes = [_REG_NOTES[r] for r in regs if r in _REG_NOTES]
        if not notes: notes = ['Review applicable data-privacy regulations.']
        return {
            'immediate_actions':  _top(imm, 5),
            'short_term_actions': _top(tech[:5], 5) or ['Encrypt all detected PII at rest.','Apply RBAC to PII fields.'],
            'long_term_actions':  _LONG_TERM[:4],
            'technical_controls': _top(tech[5:], 5) or ['Integrate DLP solution.','Add automated PII scanning to CI/CD.'],
            'compliance_notes':   _top(notes, 4),
            'source': 'rule_based',
        }

def _top(lst, n):
    seen, out = set(), []
    for x in lst:
        if x not in seen:
            seen.add(x); out.append(x)
        if len(out) == n: break
    return out
