import os
import json
from openai import OpenAI
from typing import Dict, Any, Tuple


# Configure OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = None
if OPENAI_API_KEY:
    client = OpenAI(api_key=OPENAI_API_KEY)

# The single prompt template
PROMPT_TEMPLATE = """
You are an expert Automated Compliance Officer. Your task is to analyze the following document text, detect sensitive data (PII), and evaluate its regulatory compliance (GDPR, HIPAA, ISO 27001).

Document Name: {document_name}
Dataset Type: {dataset_type}

--- Document Content ---
{text}
------------------------

Analyze the text and provide a structured JSON response EXACTLY matching this schema:
{{
  "compliance_status": "COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT",
  "risk_level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "compliance_score": number (0 to 100),
  "pii_detected": {{
    "aadhaar": count (number),
    "credit_card": count (number),
    "ssn": count (number),
    "phone_number": count (number),
    "email": count (number)
  }},
  "violated_regulations": ["GDPR", "HIPAA", "ISO27001", "NAAC", "PCI-DSS"] (list only the violated ones, empty list if None),
  "risk_items": total number of unique risk or PII items found (number),
  "remediation": [
    "Suggested action 1",
    "Suggested action 2"
  ]
}}

Rules:
- Generate a score between 0 and 100 (90-100: compliant, 60-90: minor, 40-60: moderate, 0-40: critical).
- If sensitive personal data is exposed without protection, classify as NON_COMPLIANT and risk_level HIGH or CRITICAL.
- Ensure all keys and values match the required schema exactly.
"""


async def analyze_document_with_ai(text: str, document_name: str, dataset_type: str) -> Tuple[Dict[str, Any], str]:
    """
    Sends the extracted text to OpenAI and returns the parsed JSON dict and raw text.
    """

    if not client:
        # Fallback for demo if no key or client is provided
        return {
            "compliance_status": "PARTIALLY_COMPLIANT",
            "risk_level": "MEDIUM",
            "compliance_score": 75,
            "pii_detected": {"email": 1},
            "violated_regulations": ["GDPR"],
            "risk_items": 1,
            "remediation": ["Mask email addresses"]
        }, "No API Key or OpenAI client provided, generated mock response."

    try:

        prompt = PROMPT_TEMPLATE.format(
            document_name=document_name,
            dataset_type=dataset_type,
            text=text[:30000]  # Limit text length for safety
        )

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert compliance officer."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=2048
        )

        result_text = response.choices[0].message.content

        # Parse JSON
        try:
            parsed_json = json.loads(result_text)
            return parsed_json, result_text
        except json.JSONDecodeError:
            print(f"Failed to parse JSON from AI: {result_text}")
            return _generate_fallback(result_text), result_text

    except Exception as e:
        print(f"Error calling OpenAI: {e}")
        return _generate_fallback(str(e)), str(e)


def _generate_fallback(error_msg: str) -> Dict[str, Any]:
    return {
        "compliance_status": "NON_COMPLIANT",
        "risk_level": "HIGH",
        "compliance_score": 40,
        "pii_detected": {},
        "violated_regulations": ["Unknown due to error"],
        "risk_items": 1,
        "remediation": [f"System error during analysis: {error_msg}"]
    }