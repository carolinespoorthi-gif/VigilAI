"""
pii_engine/pii_detector.py
Accurate PII detection: regex + spaCy NER fallback + validation.
Supports: GDPR, HIPAA, PCI-DSS, ISO27001, NAAC Criterion 4 contexts.
"""
import re
from typing import List, Dict, Any
from .entity_validator import EntityValidator

EMAIL_RE    = re.compile(r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b')
PHONE_RE    = re.compile(r'(?<!\d)(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})(?!\d)')
SSN_RE      = re.compile(r'\b(?!000|666|9\d{2})\d{3}[- ](?!00)\d{2}[- ](?!0000)\d{4}\b')
CC_RE       = re.compile(r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b')
DOB_RE      = re.compile(r'\b(?:0?[1-9]|1[0-2])[\/\-\.](?:0?[1-9]|[12]\d|3[01])[\/\-\.](?:19|20)\d{2}\b')
ADDRESS_RE  = re.compile(r'\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,3}(?:St(?:reet)?|Ave(?:nue)?|Blvd|Rd|Road|Dr(?:ive)?|Ln|Lane|Ct|Court|Way|Pl(?:ace)?|Pkwy)\b', re.IGNORECASE)
IP_RE       = re.compile(r'\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b')
URL_RE      = re.compile(r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+(?:/[^\s]*)?')
PASSPORT_RE = re.compile(r'\b[A-Z]{1,2}\d{6,9}\b')
LINKEDIN_RE = re.compile(r'linkedin\.com/in/[A-Za-z0-9\-]+')
GITHUB_RE   = re.compile(r'github\.com/[A-Za-z0-9\-]+')
API_KEY_RE  = re.compile(r'(?:API_KEY|api_key|apikey)\s*[=:]\s*["\']?([A-Za-z0-9\-_]{20,})["\']?')
PASSWORD_RE = re.compile(r'(?:password|passwd|pwd)\s*[=:]\s*["\']([^"\']+)["\']', re.IGNORECASE)
AADHAAR_RE  = re.compile(r'\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b')
NAME_RE     = re.compile(r'\b([A-Z][a-z]{1,20})\s+([A-Z][a-z]{1,20})(?:\s+[A-Z][a-z]{1,20})?\b')

# ── NEW: CVV, OTP, PIN detection ──────────────────────────────────────────
CVV_RE      = re.compile(r'(?:CVV|cvv|CVC|cvc|security\s*code)\s*[=:]\s*(\d{3,4})', re.IGNORECASE)
OTP_RE      = re.compile(r'(?:OTP|otp|one[- ]?time[- ]?(?:password|code|pin))\s*[=:]\s*(\d{4,8})', re.IGNORECASE)
PIN_RE      = re.compile(r'(?:PIN|pin|personal\s*identification)\s*[=:]\s*(\d{4,6})', re.IGNORECASE)

# ── NEW: Health data keyword detection ────────────────────────────────────
HEALTH_KEYWORDS = re.compile(
    r'\b(?:diagnosis|diagnosed|patient|medical\s*record|health\s*record|'
    r'prescription|treatment|medication|HIV|cancer|diabetes|hypertension|'
    r'bipolar|schizophrenia|HIPAA|insurance\s*ID|medical\s*ID|'
    r'blood\s*type|allergies|symptoms|prognosis|clinical|pathology)\b',
    re.IGNORECASE
)

# ── NEW: NAAC Criterion 4 keywords ────────────────────────────────────────
NAAC_C4_1_RE = re.compile(r'\b(?:ICT-enabled classrooms|smart classrooms|LMS|laboratory adequacy|infrastructure augmentation|stock register|usage logs|auditorium|gymnasium|yoga centre|divyangjan-friendly|safety compliance|computing equipment)\b', re.IGNORECASE)
NAAC_C4_2_RE = re.compile(r'\b(?:ILMS|library automation|e-resources|e-journals|Shodhganga|e-books|OPAC|digital library|plagiarism software|stock verification)\b', re.IGNORECASE)
NAAC_C4_3_RE = re.compile(r'\b(?:student-computer ratio|bandwidth|Wi-Fi campus|LAN|IT policy|cybersecurity|firewall|licensed software|server maintenance|hardware inventory)\b', re.IGNORECASE)
NAAC_C4_4_RE = re.compile(r'\b(?:maintenance policy|SOPs|AMC|budget allocation|complaint register|maintenance logs|fire safety audit|housekeeping|infrastructure sustainability)\b', re.IGNORECASE)

NAME_BLACKLIST = {
    'The','This','That','With','From','Into','High','Risk','Low','Medium',
    'Critical','Score','Level','Data','File','Name','User','Type','Date',
    'Time','Code','Report','Table','Total','Count','Rate','Page','Http',
    'Https','True','False','None','Null','Error','Warning','Info','Debug',
    'Test','City','State','Country','Street','Road','Avenue','Drive',
    'January','February','March','April','May','June','July','August',
    'September','October','November','December','Monday','Tuesday',
    'Wednesday','Thursday','Friday','Saturday','Sunday','Compliance',
    'Guardian','Analysis','System','Service','Server','Client','Module',
    'Engine','Object','Result','Status','Value','Index','Input','Output',
    'Access','Token','Secret','Public','Private','Risk','Audit','Policy',
    'Gdpr','Hipaa','Pci','Iso','Naac',
}

SEVERITY_MAP = {
    'ssns':'Critical','credit_cards':'Critical','api_keys':'Critical',
    'passwords':'Critical','aadhaar':'Critical',
    'cvv':'Critical','otp':'Critical','pin':'Critical',
    'emails':'High','addresses':'High','dates_of_birth':'High',
    'sensitive_ids':'High','health_data':'High',
    'phones':'Medium','names':'Low',
    'ip_addresses':'Low','urls':'Low','linkedin':'Low','github':'Low',
}

REGULATION_MAP = {
    'ssns':       ['GDPR', 'CCPA'],
    'aadhaar':    ['GDPR', 'CCPA'],
    'credit_cards': ['PCI-DSS'],
    'cvv':        ['PCI-DSS'],
    'emails':     ['GDPR', 'ISO 27001'],
    'phones':     ['GDPR', 'ISO 27001'],
    'names':      ['GDPR', 'ISO 27001'],
    'addresses':  ['GDPR', 'ISO 27001'],
    'dates_of_birth': ['GDPR', 'ISO 27001'],
    'api_keys':   ['ISO 27001', 'PCI-DSS'],
    'passwords':  ['ISO 27001', 'PCI-DSS'],
    'otp':        ['ISO 27001', 'PCI-DSS'],
    'pin':        ['ISO 27001', 'PCI-DSS'],
    'sensitive_ids': ['GDPR', 'ISO 27001', 'HIPAA'],
    'health_data': ['HIPAA', 'GDPR'],
    'ip_addresses': ['GDPR'],
    'urls':        ['ISO 27001'],
    'linkedin':    ['GDPR'],
    'github':      ['ISO 27001'],
}

RISK_CATEGORY = {
    'ssns':'Privacy','credit_cards':'Security','emails':'Privacy',
    'phones':'Privacy','names':'Privacy','addresses':'Privacy',
    'dates_of_birth':'Privacy','api_keys':'Security','passwords':'Security',
    'aadhaar':'Privacy','sensitive_ids':'Security','ip_addresses':'Security',
    'urls':'Security','linkedin':'Privacy','github':'Security',
    'cvv':'Security','otp':'Security','pin':'Security',
    'health_data':'Privacy',
}


class PIIDetector:
    def __init__(self):
        self.validator = EntityValidator()
        self.nlp = self._load_spacy()

    def _load_spacy(self):
        try:
            import spacy
            return spacy.load('en_core_web_sm')
        except Exception:
            return None

    def detect(self, text: str, dataset_type: str = 'document') -> Dict[str, Any]:
        findings: Dict[str, List[str]] = {
            'emails':        self._dd(EMAIL_RE.findall(text)),
            'phones':        self._phones(text),
            'ssns':          self._dd(SSN_RE.findall(text)),
            'credit_cards':  self._dd([m for m in CC_RE.findall(text) if self.validator.luhn_check(m)]),
            'dates_of_birth':self._dd(DOB_RE.findall(text)),
            'addresses':     self._dd(ADDRESS_RE.findall(text)),
            'ip_addresses':  self._dd(IP_RE.findall(text)),
            'urls':          self._dd(URL_RE.findall(text)),
            'sensitive_ids': self._dd(PASSPORT_RE.findall(text)),
            'linkedin':      self._dd(LINKEDIN_RE.findall(text)),
            'github':        self._dd(GITHUB_RE.findall(text)),
            'aadhaar':       self._dd(AADHAAR_RE.findall(text)),
            'names':         [],
            # ── Detect in ALL document types (not just code) ──
            'api_keys':      self._dd(API_KEY_RE.findall(text)),
            'passwords':     self._dd(PASSWORD_RE.findall(text)),
            # ── NEW entity types ──
            'cvv':           self._dd(CVV_RE.findall(text)),
            'otp':           self._dd(OTP_RE.findall(text)),
            'pin':           self._dd(PIN_RE.findall(text)),
            'health_data':   self._detect_health(text),
            'naac_4_1':      self._dd(NAAC_C4_1_RE.findall(text)),
            'naac_4_2':      self._dd(NAAC_C4_2_RE.findall(text)),
            'naac_4_3':      self._dd(NAAC_C4_3_RE.findall(text)),
            'naac_4_4':      self._dd(NAAC_C4_4_RE.findall(text)),
        }

        findings['names'] = self._spacy_names(text) if self.nlp else self._regex_names(text)
        findings = self.validator.validate_all(findings, text)

        detailed: List[Dict] = []
        violated_regs: set = set()
        risk_categories: Dict[str, int] = {'Privacy': 0, 'Security': 0, 'Bias': 0}

        for key, values in findings.items():
            if not isinstance(values, list) or not values:
                continue
            
            if key.startswith('naac_4_'):
                sub_crit = key.replace('naac_4_', '4.')
                sub_label = {'4.1': 'Infrastructure', '4.2': 'Library', '4.3': 'IT Infrastructure', '4.4': 'Maintenance'}.get(sub_crit, '')
                naac_reg_label = f'NAAC ({sub_crit})'
                risk_categories['Compliance'] = risk_categories.get('Compliance', 0) + len(values)
                
                # ── Context-aware NAAC severity ────────────────────────
                # Only assign MEDIUM+ if the document has negative context
                text_lower = text.lower()
                _neg_keywords = ['no ', 'missing', 'lack', 'without', 'not updated',
                                 'partially', 'incomplete', 'outdated', 'absence']
                _pos_keywords = ['implemented', 'encrypted', 'secured', 'maintained', 'compliant']
                has_negatives = any(w in text_lower for w in _neg_keywords)
                has_all_positive = all(w in text_lower for w in _pos_keywords)
                
                # Determine NAAC severity based on document context
                if has_all_positive and not has_negatives:
                    naac_severity = 'Low'   # Fully compliant → no risk
                elif has_negatives:
                    naac_severity = 'Medium' # Violations found → medium
                else:
                    naac_severity = 'Low'    # Neutral → low
                
                for val in values:
                    v_lower = val.lower()
                    regs = [naac_reg_label]
                    # Cross-mapping: every keyword gets proper regulation associations
                    if 'usage logs' in v_lower:
                        regs.extend(['GDPR', 'ISO 27001'])
                    elif 'cybersecurity' in v_lower:
                        regs.extend(['ISO 27001'])
                    elif 'firewall' in v_lower:
                        regs.extend(['ISO 27001'])
                    elif 'it policy' in v_lower:
                        regs.extend(['ISO 27001'])
                    elif 'digital library' in v_lower or 'e-resources' in v_lower:
                        regs.extend(['GDPR'])
                    elif 'e-journals' in v_lower or 'e-books' in v_lower:
                        regs.extend(['GDPR'])
                    elif 'budget allocation' in v_lower:
                        regs.extend(['CCPA'])
                    elif 'safety compliance' in v_lower:
                        regs.extend(['ISO 27001'])
                    elif 'server maintenance' in v_lower or 'hardware inventory' in v_lower:
                        regs.extend(['ISO 27001'])
                    elif 'licensed software' in v_lower:
                        regs.extend(['ISO 27001'])
                    elif 'plagiarism software' in v_lower:
                        regs.extend(['GDPR'])
                    elif 'lms' in v_lower or 'opac' in v_lower or 'ilms' in v_lower:
                        regs.extend(['ISO 27001'])
                    elif 'wi-fi' in v_lower or 'lan' in v_lower or 'bandwidth' in v_lower:
                        regs.extend(['ISO 27001'])
                    elif 'maintenance logs' in v_lower or 'maintenance policy' in v_lower:
                        regs.extend(['ISO 27001'])
                    elif 'fire safety' in v_lower:
                        regs.extend(['ISO 27001'])
                    elif 'stock register' in v_lower or 'stock verification' in v_lower:
                        regs.extend(['ISO 27001'])
                    elif 'complaint register' in v_lower:
                        regs.extend(['GDPR'])
                    
                    for r in regs: violated_regs.add(r)
                    
                    detailed.append({
                        'type': 'NAAC_C4_ENTITY',
                        'value': val,
                        'severity': naac_severity,
                        'category': 'Compliance',
                        'naac_criterion': 4,
                        'naac_sub_criterion': sub_crit,
                        'naac_sub_label': sub_label,
                        'cross_mapping': regs
                    })
                continue

            sev = SEVERITY_MAP.get(key, 'Low')
            cat = RISK_CATEGORY.get(key, 'Privacy')
            risk_categories[cat] = risk_categories.get(cat, 0) + len(values)
            for reg in REGULATION_MAP.get(key, []):
                violated_regs.add(reg)
            for val in values:
                detailed.append({'type': key.replace('_',' ').upper(), 'value': val,
                                 'severity': sev, 'category': cat})

        return {
            **findings,
            'detailed_findings': detailed,
            'counts': {k: len(v) for k, v in findings.items()},
            'violated_regulations': sorted(violated_regs),
            'risk_categories': risk_categories,
        }

    def _detect_health(self, text: str) -> List[str]:
        """Detect health-related data keywords in text."""
        matches = HEALTH_KEYWORDS.findall(text)
        return self._dd(matches)

    def _spacy_names(self, text: str) -> List[str]:
        try:
            doc = self.nlp(text[:100_000])
            return self._dd([e.text.strip() for e in doc.ents
                             if e.label_ == 'PERSON' and self._valid_name(e.text.strip())])
        except Exception:
            return self._regex_names(text)

    def _regex_names(self, text: str) -> List[str]:
        out = []
        for m in NAME_RE.finditer(text):
            parts = m.group().split()
            if any(p in NAME_BLACKLIST for p in parts):
                continue
            if self._valid_name(m.group()):
                out.append(m.group().strip())
        return self._dd(out)

    def _valid_name(self, name: str) -> bool:
        parts = name.strip().split()
        if len(parts) < 2: return False
        for p in parts:
            if p in NAME_BLACKLIST or len(p) < 2 or len(p) > 25: return False
            if not p[0].isupper() or any(c.isdigit() for c in p): return False
        return True

    def _phones(self, text: str) -> List[str]:
        raw = [m.group().strip() for m in PHONE_RE.finditer(text)]
        return self._dd([p for p in raw if len(re.sub(r'\D','',p)) >= 10])

    @staticmethod
    def _dd(items: List[str]) -> List[str]:
        seen, out = set(), []
        for i in items:
            if i and i not in seen:
                seen.add(i); out.append(i)
        return out
