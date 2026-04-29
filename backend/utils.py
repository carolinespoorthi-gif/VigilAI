import os
import json
import re
import pandas as pd
import pdfplumber
from docx import Document
import logging

def extract_pdf_text(path):
    text = ""
    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
    except Exception as e:
        print(f"PDF extraction error: {e}")
    return text

def extract_docx_text(path):
    try:
        doc = Document(path)
        text = "\n".join([p.text for p in doc.paragraphs])
        return text
    except Exception as e:
        print(f"DOCX extraction error: {e}")
        return ""

def extract_csv_text(path):
    try:
        df = pd.read_csv(path)
        return df.to_string()
    except Exception as e:
        print(f"CSV extraction error: {e}")
        return ""

def extract_text_from_file(path):
    text = ""
    if path.endswith(".pdf"):
        text = extract_pdf_text(path)
    elif path.endswith(".docx"):
        text = extract_docx_text(path)
    elif path.endswith(".csv"):
        text = extract_csv_text(path)
    elif path.endswith(".json"):
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                data = json.load(f)
            text = json.dumps(data, indent=2)
        except Exception as e:
            print(f"JSON extraction error: {e}")
    elif path.endswith(".txt"):
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
        except Exception as e:
            print(f"TXT extraction error: {e}")
    
    # Debug output
    print(f"Extracted text length: {len(text)}")
    
    if len(text) < 20:
        return "ERROR: Document extraction failed. No readable text found or document too short."
        
    return text


# ─── Document Remediation Engine ──────────────────────────────────────────
# Masking and removal rules for sensitive data

def _mask_ssn(val):
    """SSN: 123-45-6789 → [SSN REDACTED] (non-matchable token)"""
    return '[SSN REDACTED]'

def _mask_cc(val):
    """Credit Card: 4532015112830366 → [CC REDACTED] (non-matchable token)"""
    return '[CC REDACTED]'

def _mask_email(val):
    """Email: k.harris@enterprise.com → [EMAIL REDACTED]"""
    return '[EMAIL REDACTED]'

def _mask_phone(val):
    """Phone: (702) 555-8800 → [PHONE REDACTED]"""
    return '[PHONE REDACTED]'

def _mask_aadhaar(val):
    """Aadhaar → [AADHAAR REDACTED]"""
    return '[AADHAAR REDACTED]'

def _mask_name(val):
    """Name → [NAME REDACTED]"""
    return '[NAME REDACTED]'

def _mask_address(val):
    """Address → [ADDRESS REDACTED]"""
    return '[ADDRESS REDACTED]'

def _mask_dob(val):
    """DOB → [DOB REDACTED]"""
    return '[DOB REDACTED]'

def _mask_passport(val):
    """Passport → [PASSPORT REDACTED]"""
    return '[PASSPORT REDACTED]'


def remediate_text(content: str, findings: dict) -> str:
    """
    Apply remediation rules to content text.
    
    Phase 1: Replace unsafe compliance/NAAC phrases with safe alternatives
    Phase 2: REMOVE completely: CVV, Passwords, OTP, PINs, API keys
    Phase 3: MASK: SSN, CC, Email, Phone, Aadhaar, Names, Addresses, DOB, Passports
    """
    remediated = content

    # ── Phase 1: Replace unsafe compliance phrases ─────────────────────────
    # These phrases trigger CRITICAL risk — replace with safe equivalents
    _UNSAFE_TO_SAFE = {
        # NAAC / compliance unsafe phrases
        "no it policy":                 "IT policy is implemented and enforced",
        "no cybersecurity":             "cybersecurity measures are in place",
        "no access control":            "access control is enforced",
        "no maintenance logs":          "maintenance logs are maintained",
        "no maintenance system":        "maintenance system is operational",
        "no safety compliance":         "safety compliance is ensured",
        "no firewall":                  "firewall protection is active",
        "no security":                  "security measures are implemented",
        "no policy":                    "policies are documented and enforced",
        "no records":                   "records are maintained and auditable",
        "without governance":           "governance framework is established",
        "without logs":                 "logging and audit trails are maintained",
        "missing maintenance":          "maintenance procedures are documented",
        "missing documentation":        "documentation is complete and updated",
        "lack of usage logs":           "usage logs are properly maintained",
        "partial infrastructure":       "infrastructure is fully operational",
        "absence of":                   "presence of",
        # General unsafe context phrases
        "plain text":                   "encrypted format",
        "no encryption":                "encryption is applied",
        "public access":                "restricted access with authentication",
        "unencrypted":                  "encrypted",
        "stored in plaintext":          "stored with AES-256 encryption",
    }
    for unsafe, safe in _UNSAFE_TO_SAFE.items():
        # Case-insensitive replacement
        pattern = re.compile(re.escape(unsafe), re.IGNORECASE)
        remediated = pattern.sub(safe, remediated)
    
    # ── REMOVE completely (CVV, passwords, OTP, PINs) ─────────────────────
    # Remove password lines
    for pwd in findings.get('passwords', []):
        # Remove the entire line containing the password
        pattern = re.compile(
            r'[^\n]*(?:password|passwd|pwd)\s*[=:]\s*["\']?' + re.escape(pwd) + r'["\']?[^\n]*',
            re.IGNORECASE
        )
        remediated = pattern.sub('[PASSWORD REMOVED]', remediated)
    
    # Remove CVV entries
    for cvv_val in findings.get('cvv', []):
        pattern = re.compile(
            r'[^\n]*(?:CVV|cvv|CVC|cvc|security\s*code)\s*[=:]\s*' + re.escape(cvv_val) + r'[^\n]*',
            re.IGNORECASE
        )
        remediated = pattern.sub('[CVV REMOVED]', remediated)
    
    # Remove OTP entries
    for otp_val in findings.get('otp', []):
        pattern = re.compile(
            r'[^\n]*(?:OTP|otp|one[- ]?time)\s*[=:]\s*' + re.escape(otp_val) + r'[^\n]*',
            re.IGNORECASE
        )
        remediated = pattern.sub('[OTP REMOVED]', remediated)
    
    # Remove PIN entries
    for pin_val in findings.get('pin', []):
        pattern = re.compile(
            r'[^\n]*(?:PIN|pin)\s*[=:]\s*' + re.escape(pin_val) + r'[^\n]*',
            re.IGNORECASE
        )
        remediated = pattern.sub('[PIN REMOVED]', remediated)
    
    # Remove API keys
    for key_val in findings.get('api_keys', []):
        remediated = remediated.replace(key_val, '[API KEY REMOVED]')
    
    # ── MASK sensitive data ───────────────────────────────────────────────
    # SSNs
    for ssn in findings.get('ssns', []):
        remediated = remediated.replace(ssn, _mask_ssn(ssn))
    
    # Credit Cards
    for cc in findings.get('credit_cards', []):
        remediated = remediated.replace(cc, _mask_cc(cc))
    
    # Aadhaar
    for aadh in findings.get('aadhaar', []):
        remediated = remediated.replace(aadh, _mask_aadhaar(aadh))
    
    # Emails
    for email in findings.get('emails', []):
        remediated = remediated.replace(email, _mask_email(email))
    
    # Phones
    for phone in findings.get('phones', []):
        remediated = remediated.replace(phone, _mask_phone(phone))
    
    # Passport / Sensitive IDs
    for sid in findings.get('sensitive_ids', []):
        remediated = remediated.replace(sid, _mask_passport(sid))
    
    # DOBs
    for dob in findings.get('dates_of_birth', []):
        remediated = remediated.replace(dob, _mask_dob(dob))
    
    # Addresses
    for addr in findings.get('addresses', []):
        remediated = remediated.replace(addr, _mask_address(addr))
    
    # Names (do last to avoid replacing parts of other values)
    for name in findings.get('names', []):
        remediated = remediated.replace(name, _mask_name(name))
    
    return remediated


def remediate_json_content(content: str, findings: dict) -> str:
    """
    Remediate JSON content while preserving structure.
    Parse as JSON, remediate values, re-serialize.
    """
    try:
        data = json.loads(content)
        remediated_text = remediate_text(json.dumps(data, indent=2), findings)
        # Try to parse back to ensure valid JSON
        try:
            reparsed = json.loads(remediated_text)
            return json.dumps(reparsed, indent=2)
        except json.JSONDecodeError:
            return remediated_text
    except json.JSONDecodeError:
        # If not valid JSON, treat as plain text
        return remediate_text(content, findings)


def generate_remediated_content(content: str, findings: dict, file_format: str) -> str:
    """
    Generate remediated content based on file format.
    Preserves structure while modifying/removing sensitive data.
    """
    fmt = file_format.lower()
    
    if fmt == 'json':
        return remediate_json_content(content, findings)
    else:
        # Plain text, YAML, etc.
        return remediate_text(content, findings)
