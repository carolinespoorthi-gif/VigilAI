from main import _run_pipeline
from utils import generate_remediated_content

print("=== VIGIL AI SCORING TEST SUITE ===\n")

# TEST 1: Fully compliant document → NO RISK
t1 = ("The campus IT infrastructure is implemented, encrypted, secured, "
      "maintained and compliant. LAN and digital library. "
      "IT policy enforced. Maintenance logs updated.")
sid1, r1, _ = _run_pipeline(t1, "compliant.txt", "document")
print(f"T1 Compliant: Risk={r1['risk_score']}  Comp={r1['compliance_score']}  "
      f"Level={r1['risk_level']}  Status={r1['compliance_status']}")

# TEST 2: Partial compliance → MEDIUM
t2 = ("Campus has LAN, digital library. IT policy not updated. "
      "Maintenance logs partially maintained.")
sid2, r2, _ = _run_pipeline(t2, "partial.txt", "document")
print(f"T2 Partial:   Risk={r2['risk_score']}  Comp={r2['compliance_score']}  "
      f"Level={r2['risk_level']}  Status={r2['compliance_status']}")

# TEST 3: Critical violation
t3 = "SSN: 123-45-6789 CC: 4532015112830366 CVV: 123 no IT policy"
sid3, r3, _ = _run_pipeline(t3, "critical.txt", "document")
print(f"T3 Critical:  Risk={r3['risk_score']}  Comp={r3['compliance_score']}  "
      f"Level={r3['risk_level']}  Status={r3['compliance_status']}")

# TEST 4: Remediated → LOW/COMPLIANT
rem = generate_remediated_content(t3, r3, "text")
sid4, r4, _ = _run_pipeline(rem, "remediated_critical.txt", "document")
print(f"T4 Remediat:  Risk={r4['risk_score']}  Comp={r4['compliance_score']}  "
      f"Level={r4['risk_level']}  Status={r4['compliance_status']}")

print("\n=== EXPECTED ===")
print("T1: Risk=0,   Comp=100, NO RISK,  COMPLIANT")
print("T2: Risk=50,  Comp=50,  MEDIUM,   NON_COMPLIANT")
print("T3: Risk=100, Comp=0,   CRITICAL, NON_COMPLIANT")
print("T4: Risk<=10, Comp>=90, LOW,      COMPLIANT")
