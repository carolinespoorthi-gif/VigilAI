"""pii_engine/entity_validator.py — false-positive reduction."""
import re
from typing import Dict, List, Any

FP_NAMES = {'Machine Learning','Deep Learning','Risk Score','High Risk',
            'Low Risk','Open Source','Cloud Computing','True False'}

class EntityValidator:
    def validate_all(self, findings: Dict[str, Any], text: str) -> Dict[str, Any]:
        findings['emails']       = self._emails(findings.get('emails', []))
        findings['phones']       = self._phones(findings.get('phones', []))
        findings['ssns']         = self._ssns(findings.get('ssns', []))
        findings['names']        = [n for n in findings.get('names', []) if n not in FP_NAMES and len(n.split()) >= 2]
        findings['addresses']    = [a for a in findings.get('addresses', []) if re.match(r'^\d+', a.strip()) and len(a) >= 10]
        findings['credit_cards'] = [c for c in findings.get('credit_cards', []) if self.luhn_check(c)]
        return findings

    def _emails(self, emails):
        out = []
        for e in emails:
            p = e.split('@')
            if len(p) == 2 and '.' in p[1] and len(p[1]) >= 4:
                out.append(e)
        return out

    def _phones(self, phones):
        out = []
        for p in phones:
            d = re.sub(r'\D', '', p)
            if 10 <= len(d) <= 15 and len(set(d)) >= 3:
                out.append(p)
        return out

    def _ssns(self, ssns):
        out = []
        for s in ssns:
            d = re.sub(r'\D', '', s)
            if len(d) != 9: continue
            a, g, sr = int(d[:3]), int(d[3:5]), int(d[5:])
            if a in (0, 666) or a >= 900: continue
            if g == 0 or sr == 0: continue
            out.append(s)
        return out

    @staticmethod
    def luhn_check(number: str) -> bool:
        d = re.sub(r'\D', '', number)
        if len(d) < 13: return False
        total = 0
        for i, c in enumerate(reversed(d)):
            n = int(c)
            if i % 2 == 1:
                n *= 2
                if n > 9: n -= 9
            total += n
        return total % 10 == 0
