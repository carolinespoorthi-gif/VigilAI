from pii_engine.pii_detector import PIIDetector
from ml_engine.risk_model import RiskModel

d = PIIDetector()
m = RiskModel()

# TEST 1: Fully compliant (NO RISK)
text1 = 'The campus IT infrastructure is implemented, encrypted, secured, maintained and compliant. LAN connectivity is available. Digital library with e-resources. IT policy enforced. Maintenance logs are updated.'
f1 = d.detect(text1)
s1, c1 = m.predict(f1, text1)
print(f"TEST 1 (Fully Compliant): Risk={s1}, Compliance={c1}, Level={m.severity(s1)}")
for df in f1.get('detailed_findings', []):
    print(f"  Entity: {df['value']} -> Severity: {df['severity']}")

print()

# TEST 2: Partial compliance (MEDIUM)
text2 = 'The campus has LAN and digital library. IT policy not updated. Maintenance logs are partially maintained.'
f2 = d.detect(text2)
s2, c2 = m.predict(f2, text2)
print(f"TEST 2 (Partial): Risk={s2}, Compliance={c2}, Level={m.severity(s2)}")

print()

# TEST 3: Critical violation
text3 = 'The campus has LAN but no IT policy. No cybersecurity. Credit Card: 4532015112830366'
f3 = d.detect(text3)
s3, c3 = m.predict(f3, text3)
print(f"TEST 3 (Critical): Risk={s3}, Compliance={c3}, Level={m.severity(s3)}")

print()

# TEST 4: Post-masking (should be <= 30)
text4 = 'Name: R**** CC: **** **** **** 9999 Aadhaar: XXXX-XXXX-3456 Password: [PASSWORD REMOVED]'
f4 = d.detect(text4)
s4, c4 = m.predict(f4, text4)
print(f"TEST 4 (Masked): Risk={s4}, Compliance={c4}, Level={m.severity(s4)}")
