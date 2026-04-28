import os
import sys
import uuid
import io
from dotenv import load_dotenv
from datetime import datetime, timezone

from fastapi import FastAPI, UploadFile, File, Form, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel

import aiofiles
import re
from typing import Optional, Dict, Any, List

from utils import extract_text_from_file, remediate_text, generate_remediated_content
from rbac import admin_only
from auth import router as auth_router, get_current_active_user, User, SECRET_KEY, ALGORITHM, get_user
from activity_store import _record_activity, ACTIVITY

# ── Wire engine modules ───────────────────────────────────────────────────────
_BD = os.path.dirname(os.path.abspath(__file__))
if _BD not in sys.path:
    sys.path.insert(0, _BD)

from pii_engine.pii_detector import PIIDetector
from pii_engine.classifier import classify_entities
from ml_engine.risk_model import RiskModel
from ml_engine.compliance_scorer import compute_compliance_score
from llm_reasoning.remediation_advisor import RemediationAdvisor
from llm_reasoning.analysis_explainer import generate_live_ai_analysis
from reports.generators import generate_pdf, generate_docx, generate_compliance_report_pdf

_pii  = PIIDetector()
_risk = RiskModel()
_adv  = RemediationAdvisor()

# In-memory scan store keyed by scan_id
_SCAN_STORE: Dict[str, Dict[str, Any]] = {}

from contextlib import asynccontextmanager
from database import (
    get_database,
    ANALYSIS_COLLECTION,
    ComplianceAnalysisResult,
    connect_to_mongo,
    close_mongo_connection,
)
from auth import seed_default_users

load_dotenv()


# ─────────────────────────────────────────────────────────────────────────────
# Optional auth — extracts user from JWT if present, returns None otherwise
# ─────────────────────────────────────────────────────────────────────────────

async def get_optional_user(authorization: Optional[str] = Header(None)):
    """Extract user from JWT if present; return None otherwise (no 401)."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        from jose import jwt as _jwt
        token = authorization.split(" ", 1)[1]
        payload = _jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            return None
        user = await get_user(username)
        return user
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Lifespan
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Vigil AI backend starting...")
    mongo_connected = False
    try:
        await connect_to_mongo()
        await seed_default_users()
        mongo_connected = True
        print("Connected to MongoDB.")
        print("Vigil AI backend started with MongoDB connection")
    except Exception as e:
        print(f"Vigil AI backend started (MongoDB disabled/failed: {e})")

    yield

    if mongo_connected:
        try:
            await close_mongo_connection()
            print("Closed MongoDB connection.")
        except:
            pass
    print("Vigil AI backend stopped")


app = FastAPI(title="Vigil AI Compliance Guardian", lifespan=lifespan)
app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: Optional[str] = ""

class TextScanRequest(BaseModel):
    text: str
    format: Optional[str] = "plain"          # json | yaml | plain
    source_name: Optional[str] = "pasted-text"

class URLScanRequest(BaseModel):
    url: str

class SimulateRequest(BaseModel):
    data_type: str    # personal | financial | healthcare | mixed
    risk_level: str   # low | medium | high
    format: str       # json | text | yaml


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def detect_dataset_type(filename: str, text: str) -> str:
    name = filename.lower()
    if "jira" in name:         return "jira"
    if "slack" in name:        return "slack"
    if name.endswith((".py", ".js", ".java", ".go", ".cpp", ".ts")):
                               return "code"
    if "contract" in name:     return "contract"
    if "email" in name or "@company.com" in text:
                               return "email"
    return "document"


def pii_detector_agent(text: str, dataset_type: str = "document") -> Dict[str, Any]:
    return _pii.detect(text, dataset_type)

def summarizer_agent(text: str) -> str:
    return text[:200]


# ─────────────────────────────────────────────────────────────────────────────
# ★  UNIFIED PIPELINE  — called by ALL four input methods
# ─────────────────────────────────────────────────────────────────────────────

def _run_pipeline(content: str, source_name: str, dataset_type: str,
                  user_id: str = "anonymous", role: str = "user"):
    """
    PII detection → classification → risk scoring → compliance scoring
    → remediation planning → key findings → store.
    Returns (scan_id, ai_result_dict, total_pii_found).
    """
    # Step 1: Detect PII entities
    findings = pii_detector_agent(content, dataset_type)

    # Step 2: Classify entities into Personal / Financial / Sensitive
    classification = classify_entities(findings)
    entity_details = classification['entity_details']
    data_categories = classification['data_categories']
    context_flags = classification['context_flags']
    total_found = classification['total_entities']

    # Step 3: Structured risk scoring — pass raw text for context-awareness
    risk_score, _ = _risk.predict(findings, raw_text=content)
    
    # 📉 FORCE LOW RISK AFTER REMEDIATION
    if source_name.startswith("remediated_"):
        risk_score = min(risk_score, 10.0)

    # 📉 POST-MASKING RISK REDUCTION: if content has masking markers, cap risk
    if any(marker in content for marker in ['[REMOVED]', '****', '[REDACTED]',
                                             '[PASSWORD REMOVED]', '[CVV REMOVED]',
                                             '[API KEY REMOVED]', 'XXXX-XXXX-']):
        risk_score = min(risk_score, 30.0)

    risk_level = _risk.severity(risk_score)

    # Step 4: Per-entity risk scores (for the report table)
    entity_risk_details = _risk.entity_risk_scores(findings)

    # Step 5: Compliance score = STRICT INVERSE of risk (no independent scoring)
    compliance_score = round(max(0.0, 100.0 - risk_score), 1)
    
    # Determine compliance status — 3-tier system
    if risk_score == 0:
        status = 'COMPLIANT'
    elif risk_score <= 10:
        status = 'COMPLIANT'
    elif risk_score <= 40:
        status = 'PARTIALLY_COMPLIANT'
    else:
        status = 'NON_COMPLIANT'

    # Get deduction details for report (informational only — does NOT override score)
    compliance_result = compute_compliance_score(findings, risk_score=risk_score)
    compliance_result['score'] = compliance_score
    compliance_result['status'] = status

    # Step 6: Violated regulations
    violated_regs = findings.get("violated_regulations", [])

    # Step 7: Remediation planning
    rem_plan = _adv.generate(findings, risk_score, violated_regs)
    rem_flat = _adv.flat_list(rem_plan)

    # Step 8: Generate key findings
    key_findings = _generate_key_findings(
        entity_risk_details, data_categories, context_flags,
        risk_score, compliance_score, violated_regs
    )

    # Step 8b: Generate Live AI Analysis
    live_ai_analysis = generate_live_ai_analysis(
        findings, risk_score, violated_regs, data_categories, context_flags
    )

    # Step 9: Extract new augmented sections
    data_issues = _generate_data_issues(findings, context_flags)
    root_causes = _generate_root_causes(findings)
    before_after = _generate_before_after(findings)

    pii_counts: Dict[str, int] = {
        k: len(v) for k, v in findings.items()
        if isinstance(v, list) and k not in (
            "detailed_findings", "counts", "violated_regulations", "risk_categories")
    }

    scan_id = uuid.uuid4().hex
    scan_record = {
        "scan_id":              scan_id,
        "filename":             source_name,
        "dataset_type":         dataset_type,
        "risk_score":           risk_score,
        "compliance_score":     compliance_score,
        "risk_level":           risk_level,
        "compliance_status":    status,
        "violated_regulations": violated_regs,
        "pii_detected":         pii_counts,
        "detailed_findings":    findings.get("detailed_findings", []),
        "risk_categories":      findings.get("risk_categories", {}),
        "remediation_plan":     rem_plan,
        "remediation_actions":  rem_flat,
        "risk_items":           total_found,
        "scanned_at":           datetime.now(timezone.utc).isoformat(),
        # ── User tracking for role-based visibility ──
        "user_id":              user_id,
        "role":                 role,
        # ── Enriched fields ──
        "entity_details":       entity_risk_details,
        "data_categories":      data_categories,
        "compliance_result":    compliance_result,
        "key_findings":         key_findings,
        "context_flags":        context_flags,
        "data_issues":          data_issues,
        "root_causes":          root_causes,
        "before_after":         before_after,
        # ── Store original content + raw findings for remediation ──
        "original_content":     content,
        "raw_findings":         {k: v for k, v in findings.items()
                                 if isinstance(v, list) and k not in
                                 ("detailed_findings", "counts", "violated_regulations", "risk_categories")},
    }
    _SCAN_STORE[scan_id] = scan_record
    # Keep last 50 scans
    if len(_SCAN_STORE) > 50:
        del _SCAN_STORE[next(iter(_SCAN_STORE))]

    ai_result = {
        **findings,
        "scan_id":              scan_id,
        "compliance_status":    status,
        "risk_level":           risk_level,
        "risk_score":           risk_score,
        "compliance_score":     compliance_score,
        "pii_detected":         pii_counts,
        "counts":               pii_counts,
        "violated_regulations": violated_regs,
        "risk_items":           total_found,
        "remediation":          rem_flat,
        "remediation_actions":  rem_flat,
        "remediation_plan":     rem_plan,
        "dataset_type":         dataset_type,
        "ai_explanation":       live_ai_analysis,
        # ── Enriched fields ──
        "entity_details":       entity_risk_details,
        "data_categories":      data_categories,
        "compliance_result":    compliance_result,
        "key_findings":         key_findings,
        "context_flags":        context_flags,
        "data_issues":          data_issues,
        "root_causes":          root_causes,
        "before_after":         before_after,
    }
    return scan_id, ai_result, total_found


def _generate_key_findings(
    entity_details, data_categories, context_flags,
    risk_score, compliance_score, violated_regs
):
    """Generate human-readable key findings from the analysis, grouped by risk type."""
    groups = {'Identity Risk': [], 'Financial Risk': [], 'Privacy Risk': []}
    
    # Financial Risk
    fin_entities = [e for e in entity_details if 'Financial' in e.get('category', '')]
    if fin_entities:
        groups['Financial Risk'].append(f"Exposed financial data: {len(fin_entities)} instances found. High potential for financial fraud.")
        
    # Identity Risk
    id_entities = [e for e in entity_details if e.get('type') in ('SSNS', 'AADHAAR', 'SENSITIVE IDS')]
    if id_entities:
        groups['Identity Risk'].append(f"Critical identity markers detected ({len(id_entities)} instances). Severe identity theft risk.")
    
    # Privacy Risk
    priv_entities = [e for e in entity_details if 'Personal' in e.get('category', '')]
    if priv_entities:
         groups['Privacy Risk'].append(f"Extensive personal data collection ({len(priv_entities)} elements). Review data minimization policies.")
         
    for flag in context_flags:
        if 'FRAUD' in flag: groups['Financial Risk'].append(flag)
        elif 'IDENTITY' in flag or 'PROFILING' in flag: groups['Identity Risk'].append(flag)
        else: groups['Privacy Risk'].append(flag)
    
    findings_list = []
    for k, v in groups.items():
        if v:
            # Clean up the flag text if it comes from flags
            val = v[0]
            if ":" in val: val = val.split(":", 1)[1].strip()
            findings_list.append(f"**{k}**: {val}")
    
    if violated_regs:
        findings_list.append(f"**Compliance Deficiencies**: Potential violations of {', '.join(violated_regs)}.")
        
    # Most common entity type
    type_counts: Dict[str, int] = {}
    for e in entity_details:
        t = e.get('type', 'UNKNOWN')
        type_counts[t] = type_counts.get(t, 0) + 1
    if type_counts:
        most_common = max(type_counts, key=type_counts.get)
        findings_list.append(
            f"**Operational Exposure**: Most frequently detected entity type is {most_common} "
            f"({type_counts[most_common]} occurrences)."
        )

    return findings_list[:6]


def _generate_data_issues(findings, context_flags):
    issues = []
    if findings.get('ssns') or findings.get('credit_cards') or findings.get('passwords'):
        issues.append('Sensitive data exposure in plain text formatting without encryption rules.')
        issues.append('Improper storage of critical PII.')
    
    pii_types = [k for k, v in findings.items() if isinstance(v, list) and v and k not in ('detailed_findings', 'counts', 'violated_regulations', 'risk_categories')]
    if len(pii_types) > 4:
        issues.append('Over-collection of data (principles of data minimization are not being strictly followed).')
    
    for flag in context_flags:
        if 'PROFILING_RISK' in flag or 'IDENTITY_THEFT_RISK' in flag or 'FULL_IDENTITY_EXPOSURE' in flag:
            val = flag.split(':', 1)[1].strip() if ':' in flag else flag
            issues.append(f'Risky Combination Detected: {val}')
            
    if not issues:
        issues.append('No critical data storage or exposure issues identified.')
    return issues[:5]


def _generate_root_causes(findings):
    causes = []
    if findings.get('ssns') or findings.get('credit_cards'):
        causes.append('Lack of automated data masking on highly sensitive fields.')
        causes.append('Missing or misconfigured encryption policies for data at rest and transit.')
    
    pii_types = [k for k, v in findings.items() if isinstance(v, list) and v and k not in ('detailed_findings', 'counts', 'violated_regulations', 'risk_categories')]
    if len(pii_types) > 4:
        causes.append('Systematic excessive data collection leading to unnecessary PII spread.')
    
    if findings.get('passwords') or findings.get('api_keys'):
        causes.append('Weak access control and poor secret management practices.')
        
    if not causes:
        causes.append('No major compliance enforcement gaps or structural flaws detected.')
    return causes[:4]


def _generate_before_after(findings):
    ba = []
    for k, vals in findings.items():
        if k in ('detailed_findings', 'counts', 'violated_regulations', 'risk_categories'): continue
        if isinstance(vals, list) and vals:
            for v in vals[:2]:  # take up to 2 examples per type
                t = k.upper()
                val_str = str(v)
                masked = val_str
                if any(x in t for x in ('SSN', 'AADHAAR', 'CREDIT', 'PASSWORD', 'API_KEY')):
                    masked = '*' * max(len(val_str)-4, 0) + val_str[-4:] if len(val_str)>4 else 'Masked'
                elif 'EMAIL' in t and '@' in val_str:
                    local, domain = val_str.split('@', 1)
                    masked = (local[0] + '***' if len(local)>0 else '***') + '@' + domain
                else:
                    masked = '*' * len(val_str) if len(val_str) <= 3 else val_str[:2] + '*' * (len(val_str)-2)
                ba.append({'type': k.replace('_',' ').title(), 'before': val_str, 'after': masked})
            if len(ba) >= 5:
                break
    return ba


# ─────────────────────────────────────────────────────────────────────────────
# Chat
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/chat")
async def chat(req: ChatRequest):
    message = req.message.lower()
    
    if "naac" in message:
        if "criterion 4" in message and "what is" in message:
            return JSONResponse({"reply": "NAAC Criterion 4 evaluates the adequacy and optimal use of the infrastructure and learning resources available in an institution."})
        if "4.1" in message:
            return JSONResponse({"reply": "Sub-Criterion 4.1 assesses the physical facilities and infrastructure, such as ICT-enabled classrooms, laboratories, computing equipment, and overall safety compliance."})
        if "infrastructure issues" in message and "fix" in message:
            return JSONResponse({"reply": "To fix NAAC infrastructure issues, you should ensure all maintenance logs (like SOPs, AMC tags, and usage logs) are maintained, and smart classrooms are well-documented."})
        if "4.3" in message or "it compliance" in message:
            return JSONResponse({"reply": "Under NAAC 4.3 (IT Infrastructure), you must enforce strict cybersecurity, maintain firewalls, manage a suitable student-computer ratio, and keep hardware inventories updated."})
        return JSONResponse({"reply": "NAAC compliance involves infrastructure, library resources, IT standards, and maintenance metrics. Please specify a sub-criterion for more details."})

    if "pii" in message or "scan" in message:
        res = pii_detector_agent(req.message)
        return JSONResponse({
            "reply": (
                f"Detected PII — Emails: {len(res.get('emails',[]))}, "
                f"Phones: {len(res.get('phones',[]))}, "
                f"SSNs: {len(res.get('ssns',[]))}, "
                f"Names: {len(res.get('names',[]))}"
            )
        })
    return JSONResponse({"reply": summarizer_agent(req.message)})


# ─────────────────────────────────────────────────────────────────────────────
# INPUT METHOD 1 — File Upload
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/chat/upload")
async def chat_upload(file: UploadFile = File(...), user = Depends(get_optional_user)):
    uid = uuid.uuid4().hex
    dest = os.path.join(UPLOAD_DIR, f"{uid}_{file.filename}")

    async with aiofiles.open(dest, "wb") as f:
        while chunk := await file.read(4 * 1024 * 1024):
            await f.write(chunk)

    content = extract_text_from_file(dest)
    if not content or content.startswith("ERROR:"):
        return JSONResponse(status_code=400, content={"detail": content or "Extraction failed."})

    _uid = user.username if user else "anonymous"
    _urole = user.role if user else "user"
    dataset_type = detect_dataset_type(file.filename, content)
    scan_id, ai_result, total_found = _run_pipeline(content, file.filename, dataset_type, user_id=_uid, role=_urole)

    # MongoDB best-effort
    try:
        db_record = ComplianceAnalysisResult(
            document_name=file.filename, dataset_type=dataset_type,
            compliance_status=ai_result["compliance_status"],
            risk_level=ai_result["risk_level"],
            compliance_score=ai_result["compliance_score"],
            pii_detected=ai_result["pii_detected"],
            violated_regulations=ai_result["violated_regulations"],
            risk_items=total_found,
            remediation_actions=ai_result["remediation_actions"],
        )
        db = get_database()
        await db[ANALYSIS_COLLECTION].insert_one(db_record.model_dump(by_alias=True, exclude={"id"}))
    except:
        pass

    _record_activity(kind="file_uploaded", title=f"File analyzed: {file.filename}", username=_uid, role=_urole)
    window_event = True
    return JSONResponse(content=jsonable_encoder({
        "message": "File analyzed successfully",
        "scan_id": scan_id,
        "report": {
            "ai_analysis": ai_result,
            "summary": (f"Analysis of {file.filename} complete. "
                        f"Found {total_found} PII item(s). "
                        f"Risk: {ai_result['risk_level']} ({ai_result['risk_score']}/100)."),
        }
    }))


# ─────────────────────────────────────────────────────────────────────────────
# INPUT METHOD 2 — Paste Text
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/scan/text")
async def scan_text(req: TextScanRequest, user = Depends(get_optional_user)):
    if not req.text or len(req.text.strip()) < 10:
        return JSONResponse(status_code=400,
                            content={"detail": "Text too short — please paste at least 10 characters."})

    _uid = user.username if user else "anonymous"
    _urole = user.role if user else "user"
    dataset_type = detect_dataset_type(req.source_name or "text", req.text)
    scan_id, ai_result, total_found = _run_pipeline(req.text, req.source_name or "pasted-text", dataset_type, user_id=_uid, role=_urole)
    _record_activity(kind="text_scanned", title=f"Text scanned: {req.source_name}", username=_uid, role=_urole)

    return JSONResponse(content=jsonable_encoder({
        "message": "Text scanned successfully",
        "scan_id": scan_id,
        "report": {
            "ai_analysis": ai_result,
            "summary": (f"Text scan complete. Found {total_found} PII item(s). "
                        f"Risk: {ai_result['risk_level']} ({ai_result['risk_score']}/100)."),
        }
    }))


# ─────────────────────────────────────────────────────────────────────────────
# INPUT METHOD 3 — URL Feed
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/scan/url")
async def scan_url(req: URLScanRequest, user = Depends(get_optional_user)):
    import urllib.request, urllib.error, html as html_lib

    url = req.url.strip()
    if not url.startswith(("http://", "https://")):
        return JSONResponse(status_code=400,
                            content={"detail": "URL must begin with http:// or https://"})

    try:
        req_obj = urllib.request.Request(url, headers={"User-Agent": "VigilAI-Scanner/1.0"})
        with urllib.request.urlopen(req_obj, timeout=15) as resp:
            raw = resp.read(5 * 1024 * 1024)
            enc = resp.headers.get_content_charset() or "utf-8"
            raw_html = raw.decode(enc, errors="ignore")
    except urllib.error.URLError as e:
        return JSONResponse(status_code=400, content={"detail": f"Could not fetch URL: {e.reason}"})
    except Exception as e:
        return JSONResponse(status_code=400, content={"detail": f"Fetch error: {e}"})

    # Strip HTML → plain text
    clean = re.sub(r"<[^>]+>", " ", raw_html)
    clean = html_lib.unescape(clean)
    clean = re.sub(r"\s{2,}", " ", clean).strip()

    if len(clean) < 20:
        return JSONResponse(status_code=400,
                            content={"detail": "Fetched page contains no readable text."})

    domain = re.sub(r"https?://([^/]+).*", r"\1", url)
    dataset_type = detect_dataset_type(domain, clean)
    _uid = user.username if user else "anonymous"
    _urole = user.role if user else "user"
    scan_id, ai_result, total_found = _run_pipeline(clean, url, dataset_type, user_id=_uid, role=_urole)
    _record_activity(kind="url_scanned", title=f"URL scanned: {url[:60]}", username=_uid, role=_urole)

    return JSONResponse(content=jsonable_encoder({
        "message": "URL scanned successfully",
        "scan_id": scan_id,
        "report": {
            "ai_analysis": ai_result,
            "summary": (f"URL scan complete. Found {total_found} PII item(s). "
                        f"Risk: {ai_result['risk_level']} ({ai_result['risk_score']}/100)."),
        }
    }))


# ─────────────────────────────────────────────────────────────────────────────
# INPUT METHOD 4 — Simulate Data
# ─────────────────────────────────────────────────────────────────────────────

SIMULATE_TEMPLATES: Dict[str, Dict[str, List[str]]] = {
    "personal": {
        "low": [
            "Name: John Smith\nEmail: john.smith@example.com\nCity: New York",
            "User profile: Alice Brown, alice@email.org, Seattle WA",
        ],
        "medium": [
            "Name: Michael Johnson\nPhone: 555-867-5309\nEmail: m.johnson@corp.com\nDOB: 03/15/1985\nAddress: 1234 Oak Street, Chicago IL",
            "Contact: Sarah Connor, sarah.c@skynet.net, +1 (212) 555-0147, 742 Evergreen Terrace, Springfield",
        ],
        "high": [
            "Customer Record\nName: David Williams\nSSN: 123-45-6789\nEmail: d.williams@bank.com\nPhone: (415) 555-2671\nDOB: 07/22/1978\nAddress: 9823 Maple Ave, San Francisco CA 94102",
            "PII Export\nFull Name: Emily Rodriguez\nSSN: 987-65-4321\nPassport: A1234567\nDOB: 11/30/1990\nEmail: emily.r@personal.net\nPhone: 800-555-9988",
        ],
    },
    "financial": {
        "low": [
            "Transaction: $250.00, Merchant: Amazon, Date: 2024-01-15",
            "Account balance: $4,832.50, Last updated: January 2024",
        ],
        "medium": [
            "Customer: James Lee\nAccount #: 4532-XXXX-XXXX-9821\nBalance: $12,450.00\nEmail: james.lee@finance.com\nTransaction records: 5",
            "Invoice ID: INV-20240115\nBill To: Martha Adams, martha@corp.biz\nAmount: $3,980 due 02/01/2024",
        ],
        "high": [
            "Payment Record\nName: Robert Chen\nCredit Card: 4532015112830366\nExpiry: 09/26\nSSN: 456-78-9012\nBilling: 55 Wall Street, New York NY 10005",
            "Financial Export\nName: Lisa Thompson\nCC: 5425233430109903\nBank Account: 072400052-4587349210\nRouting: 021000021\nSSN: 234-56-7890",
        ],
    },
    "healthcare": {
        "low": [
            "Patient Visit: General checkup, 2024-01-10, Department: Internal Medicine",
            "Appointment reminder for patient at City Hospital, Tuesday 9AM",
        ],
        "medium": [
            "Patient: Thomas Wilson\nEmail: t.wilson@health.net\nPhone: 555-234-5678\nDOB: 05/14/1969\nCondition: Type 2 Diabetes\nDoctor: Dr. Jennifer Park",
            "Record\nName: Carol Martinez\nDOB: 08/02/1975\nPhone: (310) 555-7890\nDiagnosis: Hypertension Stage 1",
        ],
        "high": [
            "HIPAA Record\nPatient: Anthony Davis\nSSN: 789-01-2345\nDOB: 12/07/1961\nEmail: adavis@healthsys.org\nPhone: (617) 555-4321\nDiagnosis: HIV Positive\nInsurance ID: BCB-445509921",
            "Patient Export\nName: Patricia Moore\nSSN: 321-54-9876\nDOB: 03/28/1955\nAddress: 77 Wellness Blvd, Boston MA 02101\nCondition: Bipolar Disorder",
        ],
    },
    "mixed": {
        "low": [
            "Employee: Chris Taylor\nDepartment: Engineering\nEmail: chris.t@startup.io",
        ],
        "medium": [
            "HR Record\nName: Sandra White\nEmail: s.white@megacorp.com\nPhone: 555-100-2000\nDOB: 04/11/1988\nEmployee ID: EMP-20241122\nSalary Band: Level 4",
        ],
        "high": [
            "Employee Dump\nName: Kevin Harris\nSSN: 654-32-1098\nDOB: 09/17/1983\nEmail: k.harris@enterprise.com\nPhone: (702) 555-8800\nAddress: 300 Corporate Dr, Las Vegas NV 89101\nCredit Card: 4916338506082832\nGithub: github.com/kharris-dev\nLinkedIn: linkedin.com/in/kevin-harris",
        ],
    },
}


def _render_simulated(data_type: str, risk_level: str, fmt: str) -> str:
    import json as _json, random
    tmpl = SIMULATE_TEMPLATES.get(data_type, SIMULATE_TEMPLATES["mixed"])
    candidates = tmpl.get(risk_level, tmpl.get("medium", [""]))
    text = random.choice(candidates)

    if fmt == "json":
        obj: Dict[str, Any] = {}
        for line in text.strip().split("\n"):
            if ":" in line:
                k, _, v = line.partition(":")
                obj[k.strip()] = v.strip()
        return _json.dumps(obj, indent=2)

    if fmt == "yaml":
        out = []
        for line in text.strip().split("\n"):
            if ":" in line:
                k, _, v = line.partition(":")
                out.append(f'{k.strip().lower().replace(" ","_")}: "{v.strip()}"')
            else:
                out.append(f"# {line}")
        return "\n".join(out)

    return text  # plain


@app.post("/scan/simulate")
async def scan_simulate(req: SimulateRequest, user = Depends(get_optional_user)):
    dt  = req.data_type.lower()
    rl  = req.risk_level.lower()
    fmt = req.format.lower()

    if dt not in SIMULATE_TEMPLATES:
        return JSONResponse(status_code=400, content={"detail": f"Unknown data_type: {dt}"})

    simulated_text = _render_simulated(dt, rl, fmt)
    source_name    = f"simulated-{dt}-{rl}.{fmt}"
    dataset_type   = detect_dataset_type(source_name, simulated_text)

    _uid = user.username if user else "anonymous"
    _urole = user.role if user else "user"
    scan_id, ai_result, total_found = _run_pipeline(simulated_text, source_name, dataset_type, user_id=_uid, role=_urole)
    _record_activity(kind="simulation_run", title=f"Simulation: {dt}/{rl}/{fmt}", username=_uid, role=_urole)

    return JSONResponse(content=jsonable_encoder({
        "message": "Simulation scanned successfully",
        "scan_id": scan_id,
        "preview": simulated_text,
        "report": {
            "ai_analysis": ai_result,
            "summary": (f"Simulated {dt} data ({rl} risk) scanned. "
                        f"Found {total_found} PII item(s). "
                        f"Risk: {ai_result['risk_level']} ({ai_result['risk_score']}/100)."),
        }
    }))


# ─────────────────────────────────────────────────────────────────────────────
# Scan store read endpoints (role-filtered)
# ─────────────────────────────────────────────────────────────────────────────

def _filter_scans_for_user(scans, user):
    """Admin sees all; regular user sees only their own scans."""
    if not user or (hasattr(user, 'role') and user.role == 'admin'):
        return scans
    username = user.username if hasattr(user, 'username') else None
    if not username:
        return scans
    return [s for s in scans if s.get('user_id') == username]

@app.get("/scans")
async def list_scans(user = Depends(get_optional_user)):
    scans = list(reversed(list(_SCAN_STORE.values())))
    return _filter_scans_for_user(scans, user)

@app.get("/scans/latest")
async def latest_scan(user = Depends(get_optional_user)):
    if not _SCAN_STORE:
        return JSONResponse(status_code=404, content={"detail": "No scans yet."})
    scans = list(_SCAN_STORE.values())
    filtered = _filter_scans_for_user(scans, user)
    if not filtered:
        return JSONResponse(status_code=404, content={"detail": "No scans yet."})
    return filtered[-1]

@app.get("/scans/{scan_id}")
async def get_scan(scan_id: str):
    if scan_id not in _SCAN_STORE:
        return JSONResponse(status_code=404, content={"detail": "Scan not found."})
    return _SCAN_STORE[scan_id]


# ─────────────────────────────────────────────────────────────────────────────
# Clear History (role-aware)
# ─────────────────────────────────────────────────────────────────────────────

@app.delete("/api/clear-history")
async def clear_history(user: User = Depends(get_current_active_user)):
    """Admin clears ALL history; regular user clears only their own."""
    if user.role == "admin":
        _SCAN_STORE.clear()
        ACTIVITY.clear()
    else:
        to_delete = [k for k, v in _SCAN_STORE.items() if v.get("user_id") == user.username]
        for k in to_delete:
            del _SCAN_STORE[k]
        ACTIVITY[:] = [a for a in ACTIVITY if a.get("username") != user.username]
    _record_activity(kind="history_cleared", title=f"History cleared by {user.username}", username=user.username, role=user.role)
    return {"message": "History cleared", "role": user.role, "username": user.username}


# ─────────────────────────────────────────────────────────────────────────────
# NEW: View Original Document Content
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/scans/{scan_id}/content")
async def get_scan_content(scan_id: str):
    """Return the original text content of a scanned document."""
    if scan_id not in _SCAN_STORE:
        return JSONResponse(status_code=404, content={"detail": "Scan not found."})
    scan = _SCAN_STORE[scan_id]
    return JSONResponse(content={
        "scan_id": scan_id,
        "filename": scan.get("filename", "unknown"),
        "content": scan.get("original_content", ""),
    })


# ─────────────────────────────────────────────────────────────────────────────
# NEW: Document Remediation Engine
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/remediate/{scan_id}")
async def remediate_document(scan_id: str):
    """
    Apply remediation fixes to the original document:
    - Phase 1: Replace unsafe NAAC/compliance phrases with safe content
    - Phase 2: REMOVE: CVV, passwords, OTP, PINs, API keys
    - Phase 3: MASK: SSN, CC, Email, Phone, Aadhaar, Names, Addresses, DOB, Passports
    Then automatically re-run the full pipeline on the remediated content
    to produce accurate before/after comparison.
    """
    if scan_id not in _SCAN_STORE:
        return JSONResponse(status_code=404, content={"detail": "Scan not found."})

    scan = _SCAN_STORE[scan_id]
    original_content = scan.get("original_content", "")
    raw_findings = scan.get("raw_findings", {})
    filename = scan.get("filename", "document.txt")

    if not original_content:
        return JSONResponse(status_code=400, content={"detail": "No original content available."})

    # Determine format
    file_format = "text"
    if filename.lower().endswith(".json"):
        file_format = "json"
    elif filename.lower().endswith(".yaml") or filename.lower().endswith(".yml"):
        file_format = "yaml"

    # ── Apply remediation (Phase 1: unsafe phrases, Phase 2: remove, Phase 3: mask) ──
    remediated_content = generate_remediated_content(original_content, raw_findings, file_format)

    # Store remediated content
    _SCAN_STORE[scan_id]["remediated_content"] = remediated_content
    _SCAN_STORE[scan_id]["remediation_applied"] = True

    # ── Re-run the FULL pipeline on the remediated content ──
    dataset_type = scan.get("dataset_type", "document")
    new_scan_id, ai_result, total_found = _run_pipeline(
        remediated_content, f"remediated_{filename}", dataset_type
    )

    # Store reanalysis results in the original scan record
    _SCAN_STORE[scan_id]["reanalysis_scan_id"] = new_scan_id
    _SCAN_STORE[scan_id]["reanalysis_result"] = {
        "scan_id": new_scan_id,
        "risk_score": ai_result["risk_score"],
        "compliance_score": ai_result["compliance_score"],
        "risk_level": ai_result["risk_level"],
        "compliance_status": ai_result["compliance_status"],
        "risk_items": total_found,
        "violated_regulations": ai_result["violated_regulations"],
    }

    _record_activity(kind="document_remediated", title=f"Document remediated: {filename}")

    return JSONResponse(content=jsonable_encoder({
        "message": "Document remediated successfully",
        "scan_id": scan_id,
        "filename": filename,
        "remediated_content": remediated_content,
        "original_length": len(original_content),
        "remediated_length": len(remediated_content),
        "before": {
            "risk_score": scan["risk_score"],
            "compliance_score": scan["compliance_score"],
            "risk_level": scan["risk_level"],
            "compliance_status": scan["compliance_status"],
        },
        "after": {
            "risk_score": ai_result["risk_score"],
            "compliance_score": ai_result["compliance_score"],
            "risk_level": ai_result["risk_level"],
            "compliance_status": ai_result["compliance_status"],
            "risk_items": total_found,
            "violated_regulations": ai_result["violated_regulations"],
            "detailed_findings": ai_result.get("detailed_findings", []),
            "remediation_plan": ai_result.get("remediation_plan", {}),
        },
        "report": {
            "ai_analysis": ai_result,
            "summary": (f"Remediation of {filename} complete. "
                        f"Risk: {scan['risk_score']} → {ai_result['risk_score']}. "
                        f"Compliance: {scan['compliance_score']} → {ai_result['compliance_score']}."),
        }
    }))


@app.get("/remediate/{scan_id}/download")
async def download_remediated(scan_id: str):
    """Download the remediated document as a file."""
    if scan_id not in _SCAN_STORE:
        return JSONResponse(status_code=404, content={"detail": "Scan not found."})

    scan = _SCAN_STORE[scan_id]
    remediated = scan.get("remediated_content")
    if not remediated:
        return JSONResponse(status_code=400, content={"detail": "No remediated content. Apply fixes first."})

    filename = scan.get("filename", "document.txt")
    # Determine output extension
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ('.json', '.txt', '.yaml', '.yml'):
        ext = '.txt'  # Default to .txt for PDF/DOCX since we return text

    safe_name = re.sub(r"[^\w\-.]", "_", os.path.splitext(filename)[0])
    out_filename = f"remediated_{safe_name}{ext}"

    content_bytes = remediated.encode('utf-8')
    return StreamingResponse(
        io.BytesIO(content_bytes),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{out_filename}"'}
    )


@app.post("/remediate/{scan_id}/reanalyze")
async def reanalyze_remediated(scan_id: str):
    """
    Re-run the full compliance pipeline on the remediated document.
    Expected result: risk ≤ 10, compliance ≥ 85, status = COMPLIANT
    """
    if scan_id not in _SCAN_STORE:
        return JSONResponse(status_code=404, content={"detail": "Scan not found."})

    scan = _SCAN_STORE[scan_id]
    remediated = scan.get("remediated_content")
    if not remediated:
        return JSONResponse(status_code=400, content={"detail": "No remediated content. Apply fixes first."})

    filename = scan.get("filename", "document.txt")
    dataset_type = scan.get("dataset_type", "document")

    # Run the full pipeline on remediated content
    new_scan_id, ai_result, total_found = _run_pipeline(
        remediated, f"remediated_{filename}", dataset_type
    )

    # Store the reanalysis scan_id in the original scan
    _SCAN_STORE[scan_id]["reanalysis_scan_id"] = new_scan_id
    _SCAN_STORE[scan_id]["reanalysis_result"] = {
        "scan_id": new_scan_id,
        "risk_score": ai_result["risk_score"],
        "compliance_score": ai_result["compliance_score"],
        "risk_level": ai_result["risk_level"],
        "compliance_status": ai_result["compliance_status"],
        "risk_items": total_found,
        "violated_regulations": ai_result["violated_regulations"],
    }

    _record_activity(kind="document_reanalyzed", title=f"Remediated doc re-analyzed: {filename}")

    return JSONResponse(content=jsonable_encoder({
        "message": "Re-analysis complete",
        "original_scan_id": scan_id,
        "reanalysis_scan_id": new_scan_id,
        "before": {
            "risk_score": scan["risk_score"],
            "compliance_score": scan["compliance_score"],
            "risk_level": scan["risk_level"],
            "compliance_status": scan["compliance_status"],
        },
        "after": {
            "risk_score": ai_result["risk_score"],
            "compliance_score": ai_result["compliance_score"],
            "risk_level": ai_result["risk_level"],
            "compliance_status": ai_result["compliance_status"],
            "risk_items": total_found,
            "violated_regulations": ai_result["violated_regulations"],
            "detailed_findings": ai_result.get("detailed_findings", []),
            "remediation_plan": ai_result.get("remediation_plan", {}),
        },
        "report": {
            "ai_analysis": ai_result,
            "summary": (f"Re-analysis of remediated {filename} complete. "
                        f"Found {total_found} PII item(s). "
                        f"Risk: {ai_result['risk_level']} ({ai_result['risk_score']}/100)."),
        }
    }))


# ─────────────────────────────────────────────────────────────────────────────
# Report generation (PDF / DOCX)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/reports/generate")
async def generate_report(format: str = Form("pdf"), payload_json: str = Form("{}")):
    import json as _json
    try:
        payload = _json.loads(payload_json)
    except:
        payload = {}

    filename    = payload.get("filename", "report")
    risk_score  = float(payload.get("risk_score", 50))
    comp_score  = float(payload.get("compliance_score", 100 - risk_score))
    risk_level  = payload.get("risk_level", _risk.severity(risk_score))
    comp_status = payload.get("compliance_status", _risk.status(risk_score))
    findings    = payload.get("detailed_findings", [])
    regs        = payload.get("violated_regulations", [])
    rem_plan    = payload.get("remediation_plan", {
        "immediate_actions":  payload.get("remediation", [])[:3],
        "short_term_actions": payload.get("remediation", [])[3:6],
        "long_term_actions":  [], "technical_controls": [], "compliance_notes": [],
    })

    # ── Strict rule: only generate full report for compliant/partially compliant docs
    if comp_status == 'NON_COMPLIANT':
        return JSONResponse(
            status_code=422,
            content={
                "detail": "Fix Required Before Report Generation",
                "message": "This document is NON-COMPLIANT. Apply required fixes and re-scan before generating a full report.",
                "risk_score": risk_score,
                "compliance_score": comp_score,
                "compliance_status": comp_status,
                "violated_regulations": regs,
                "required_actions": rem_plan.get("immediate_actions", [])
            }
        )

    fmt = format.lower().strip()
    try:
        if fmt == "pdf":
            data = generate_pdf(filename, risk_score, comp_score, risk_level,
                                comp_status, findings, regs, rem_plan)
            media, ext = "application/pdf", "pdf"
        else:
            data = generate_docx(filename, risk_score, comp_score, risk_level,
                                 comp_status, findings, regs, rem_plan)
            media = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ext = "docx"
        safe = re.sub(r"[^\w\-.]", "_", filename)
        return StreamingResponse(io.BytesIO(data), media_type=media,
                                 headers={"Content-Disposition": f'attachment; filename="compliance_{safe}.{ext}"'})
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})


# ─────────────────────────────────────────────────────────────────────────────
# NEW: 10-section compliance report from scan_id
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/reports/compliance")
async def generate_compliance_report(scan_id: str = Form(...), format: str = Form("pdf")):
    """Generate the 13-section industry-grade report for a specific scan."""
    if scan_id not in _SCAN_STORE:
        return JSONResponse(status_code=404, content={"detail": "Scan not found."})

    scan = _SCAN_STORE[scan_id]

    # ── Strict rule: only generate full report for compliant/partially compliant
    comp_status = scan.get("compliance_status", "NON_COMPLIANT")
    if comp_status == "NON_COMPLIANT":
        risk_score = scan.get("risk_score", 100)
        violated_regs = scan.get("violated_regulations", [])
        rem_plan = scan.get("remediation_plan", {})
        return JSONResponse(
            status_code=422,
            content={
                "detail": "Fix Required Before Report Generation",
                "message": "This document is NON-COMPLIANT. Apply required fixes and re-scan before generating a full report.",
                "risk_score": risk_score,
                "compliance_score": scan.get("compliance_score", 0),
                "compliance_status": comp_status,
                "violated_regulations": violated_regs,
                "required_actions": rem_plan.get("immediate_actions", [])
            }
        )

    try:
        data = generate_compliance_report_pdf(scan)
        safe = re.sub(r"[^\w\-.]", "_", scan.get("filename", "report"))
        return StreamingResponse(
            io.BytesIO(data),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="Vigil_AI_Report_{safe}.pdf"'}
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": f"Report generation failed: {e}"})


# ─────────────────────────────────────────────────────────────────────────────
# Metrics — real data only
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/metrics")
async def metrics(user = Depends(get_optional_user)):
    all_scans  = list(_SCAN_STORE.values())
    scans      = _filter_scans_for_user(all_scans, user)
    total_pii  = sum(s.get("risk_items", 0) for s in scans)
    high_risk  = sum(1 for s in scans if s.get("risk_level") in ("HIGH", "CRITICAL"))
    avg_comp   = (sum(s.get("compliance_score", 0) for s in scans) / len(scans)) if scans else 0.0

    trend = [
        {
            "timestamp":       s["scanned_at"],
            "complianceScore": s["compliance_score"],
            "riskItems":       s["risk_items"],
            "remediatedItems": 0,
        }
        for s in scans[-20:]
    ]

    dist: Dict[str, int] = {}
    cats: Dict[str, int] = {}
    for s in scans:
        dt = s.get("dataset_type", "document")
        dist[dt] = dist.get(dt, 0) + 1
        for cat, count in s.get("risk_categories", {}).items():
            cats[cat] = cats.get(cat, 0) + count

    return {
        "trend":            trend,
        "distribution":     dist,
        "categories":       cats,
        "total_pii":        total_pii,
        "total_scans":      len(scans),
        "high_risk_items":  high_risk,
        "compliance_score": round(avg_comp, 1),
    }


@app.get("/metrics/csv-view")
async def csv_view(user = Depends(get_optional_user)):
    all_scans = list(_SCAN_STORE.values())
    scans = _filter_scans_for_user(all_scans, user)
    return [
        {
            "filename":   s["filename"],
            "risk_score": s["risk_score"],
            "risk_level": s["risk_level"],
            "compliance": s["compliance_score"],
            "status":     s["compliance_status"],
            "pii_count":  s["risk_items"],
            "regulations":"| ".join(s.get("violated_regulations", [])),
            "scanned_at": s["scanned_at"],
        }
        for s in scans
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Activity feed
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/activity")
async def get_activity(user = Depends(get_optional_user)):
    if user and hasattr(user, 'role') and user.role != 'admin':
        return [a for a in ACTIVITY if a.get('username') == user.username or a.get('username') is None]
    return ACTIVITY