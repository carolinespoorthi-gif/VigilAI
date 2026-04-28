from main import _run_pipeline

text = ("The campus IT infrastructure is implemented, encrypted, secured, "
        "maintained and compliant. LAN connectivity is available. "
        "Digital library with e-resources. IT policy enforced. "
        "Maintenance logs are updated.")

sid, res, cnt = _run_pipeline(text, "test_compliant.txt", "document")
print(f"Risk={res['risk_score']}, Compliance={res['compliance_score']}, "
      f"Level={res['risk_level']}, Status={res['compliance_status']}")
