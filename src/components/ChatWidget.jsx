// ChatWidget.jsx — Vigil AI Compliance Chatbot
// 15 predefined Q&A with keyword matching as primary mode
// Falls back to OpenAI/HF if available
import React, { useState, useEffect, useRef } from 'react';

// ── 15 Predefined Q&A pairs (keyword → answer) ────────────────────────────
const QA_BANK = [
  {
    id: 1,
    question: 'What is PII?',
    keywords: ['pii', 'personally identifiable', 'personal data', 'personal information'],
    answer: 'PII (Personally Identifiable Information) refers to any data that can be used to identify an individual — such as name, SSN, email address, phone number, date of birth, credit card number, or medical record ID. Under GDPR, HIPAA, and PCI-DSS, organizations must protect PII from unauthorized access or disclosure.',
  },
  {
    id: 2,
    question: 'What is GDPR?',
    keywords: ['gdpr', 'general data protection', 'european data'],
    answer: 'GDPR (General Data Protection Regulation) is an EU regulation that governs how organizations collect, store, and process personal data of EU residents. Key requirements include obtaining explicit consent, the right to erasure, data minimization, and mandatory breach notification within 72 hours. Non-compliance can result in fines up to €20 million or 4% of annual turnover.',
  },
  {
    id: 3,
    question: 'What is HIPAA?',
    keywords: ['hipaa', 'health', 'medical', 'healthcare', 'phi', 'protected health'],
    answer: 'HIPAA (Health Insurance Portability and Accountability Act) is a US law that protects the privacy and security of Protected Health Information (PHI). It requires healthcare entities to implement safeguards for electronic PHI, conduct risk assessments, train employees, and report breaches affecting 500+ individuals within 60 days.',
  },
  {
    id: 4,
    question: 'What is PCI-DSS?',
    keywords: ['pci', 'pci-dss', 'credit card', 'payment card', 'cardholder'],
    answer: 'PCI-DSS (Payment Card Industry Data Security Standard) is a set of security standards for organizations that handle credit/debit card data. It requires strong access control, encryption of cardholder data, regular vulnerability scanning, and maintaining a secure network. Non-compliance can result in fines and loss of card processing privileges.',
  },
  {
    id: 5,
    question: 'What is a risk score?',
    keywords: ['risk score', 'risk level', 'score mean', 'risk rating', 'why is my risk high', 'why high', 'risk high'],
    answer: 'A risk score (0–100) quantifies the severity of sensitive data exposure. If your risk is HIGH (≥70), it means the system detected critical PII (like SSNs, medical IDs, or passwords) in an unsafe context. High scores require immediate remediation — such as masking or redacting the sensitive fields — to achieve COMPLIANT status.',
  },
  {
    id: 6,
    question: 'What is a compliance score?',
    keywords: ['compliance score', 'compliance rating', 'compliant score'],
    answer: 'A compliance score (0–100) reflects how well a document aligns with applicable regulations. A score ≥80 with risk ≤30 means COMPLIANT status. Scores are reduced when violations of GDPR, HIPAA, PCI-DSS, or CCPA are detected. Remediation actions improve the compliance score.',
  },
  {
    id: 7,
    question: 'How do I fix a non-compliant document?',
    keywords: ['fix', 'remediate', 'non-compliant', 'how to fix', 'resolve', 'remediation', 'how to fix this'],
    answer: 'To fix a non-compliant document: (1) Go to the Remediation Centre, (2) Select the flagged document, (3) Choose fixes — mask SSNs, redact emails, remove passwords, etc., (4) Click "Apply Fixes" to run the Document Fixing Engine, (5) The system will re-analyze and show updated scores. Aim for Risk ≤30 and Compliance ≥80 for COMPLIANT status.',
  },
  {
    id: 8,
    question: 'What data types are detected?',
    keywords: ['detect', 'what types', 'data types', 'can find', 'entity types', 'scan for'],
    answer: 'Vigil AI detects: SSNs, credit card numbers, email addresses, phone numbers, names, dates of birth, addresses, medical record IDs, passport numbers, IP addresses, bank account numbers, and driver\'s license numbers. Each entity is classified as Personal, Financial, or Sensitive with individual risk ratings.',
  },
  {
    id: 9,
    question: 'What file formats are supported?',
    keywords: ['file format', 'file type', 'upload', 'supported', 'docx', 'pdf', 'txt', 'json'],
    answer: 'Vigil AI supports: .txt (plain text), .pdf (PDF documents), .docx (Word documents), and .json (structured data). You can also paste text directly or provide a URL for scanning. Maximum file size is 1 GB per upload.',
  },
  {
    id: 10,
    question: 'What is data masking?',
    keywords: ['masking', 'mask', 'anonymize', 'redact', 'anonymization'],
    answer: 'Data masking replaces sensitive values with non-sensitive equivalents while preserving the document structure. Examples: SSN "123-45-6789" → "XXX-XX-XXXX", Email "john@company.com" → "j***@company.com", Credit card → "****-****-****-1234". Masking allows documents to be shared safely without exposing real PII.',
  },
  {
    id: 11,
    question: 'What is a data breach?',
    keywords: ['breach', 'data breach', 'incident', 'leak', 'exposure'],
    answer: 'A data breach is the unauthorized access, disclosure, or loss of sensitive data. Under GDPR, breaches must be reported to supervisory authorities within 72 hours. HIPAA requires notification within 60 days for breaches affecting ≥500 individuals. Vigil AI helps prevent breaches by detecting and remediating PII before data is shared.',
  },
  {
    id: 12,
    question: 'What is CCPA?',
    keywords: ['ccpa', 'california consumer', 'california privacy'],
    answer: 'CCPA (California Consumer Privacy Act) gives California residents rights over their personal data — including the right to know what data is collected, the right to delete it, and the right to opt out of its sale. Businesses subject to CCPA must disclose data practices and respond to consumer requests within 45 days.',
  },
  {
    id: 13,
    question: 'How is the compliance status determined?',
    keywords: ['status', 'compliant', 'non-compliant', 'how is status', 'determine status'],
    answer: 'Compliance status is determined by two thresholds: (1) Compliance Score ≥ 80 AND (2) Risk Score ≤ 30 → Status = COMPLIANT. If either condition fails, the status is NON-COMPLIANT. After remediation, re-analysis will recalculate both scores and update the status accordingly.',
  },
  {
    id: 14,
    question: 'What is the remediation plan?',
    keywords: ['remediation plan', 'action plan', 'mitigation plan', 'what plan', 'plan'],
    answer: 'The AI-generated remediation plan organizes fixes into four categories: (1) Immediate Actions — critical steps to take right now, (2) Short-term Actions — tasks to complete within 30 days, (3) Technical Controls — system-level fixes like encryption and access control, (4) Compliance Notes — regulatory guidance and policy updates. Plans are tailored to the specific violations found.',
  },
  {
    id: 15,
    question: 'How do I generate a compliance report?',
    keywords: ['report', 'generate report', 'download report', 'compliance report', 'export'],
    answer: 'Reports can be generated in two ways: (1) From the Monitoring page — after scanning a document, click "Generate PDF Report", (2) From the Remediation Centre — download pre-fix or post-fix reports for any flagged document. Reports include: summary of violations, risk/compliance scores, entity tables, remediation plan, and before/after comparison.',
  },
  {
    id: 16,
    question: 'Explain NAAC 4.3',
    keywords: ['naac', '4.3', 'criterion 4', 'it infrastructure'],
    answer: 'NAAC Criterion 4.3 (IT Infrastructure) evaluates the adequacy and maintenance of IT facilities, including student-computer ratios, internet bandwidth, Wi-Fi connectivity, and robust IT policies. Vigil AI scans documents for these indicators to ensure institutional compliance with educational quality standards.',
  },
  {
    id: 17,
    question: 'What is ISO 27001?',
    keywords: ['iso 27001', 'iso27001', 'information security standard'],
    answer: 'ISO/IEC 27001 is the international standard for information security management systems (ISMS). It provides a framework for managing risks related to data security, ensuring confidentiality, integrity, and availability of information through a systematic approach of people, processes, and technology.',
  },
  {
    id: 18,
    question: 'What is data sovereignty?',
    keywords: ['data sovereignty', 'data residency', 'data location'],
    answer: 'Data sovereignty is the principle that digital data is subject to the laws of the country in which it is located. This often requires organizations to store personal data of citizens within the country\'s borders to comply with local privacy and security regulations.',
  },
  {
    id: 19,
    question: 'How does Vigil AI handle AI Ethics?',
    keywords: ['ethics', 'ai ethics', 'responsible ai', 'bias'],
    answer: 'Vigil AI follows responsible AI principles by ensuring transparency in its scoring logic, providing clear reasoning for every risk detected, and using deterministic models where possible to avoid bias. Our remediation engine preserves document integrity while removing only specific sensitive data points.',
  },
  {
    id: 20,
    question: 'What is a PII audit?',
    keywords: ['audit', 'pii audit', 'data audit', 'privacy audit'],
    answer: 'A PII audit is a systematic review of an organization\'s data storage and processing practices to identify where Personally Identifiable Information is kept and ensure it is protected according to legal and regulatory requirements. Vigil AI automates this by scanning file repositories for hidden PII.',
  },
];

// ── Keyword matcher ────────────────────────────────────────────────────────
function findAnswer(input) {
  const lower = input.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const qa of QA_BANK) {
    let score = 0;
    for (const kw of qa.keywords) {
      if (lower.includes(kw)) score += kw.length; // longer match = better
    }
    if (score > bestScore) { bestScore = score; best = qa; }
  }
  return best && bestScore > 0 ? best.answer : null;
}

// ── OpenAI fallback (optional) ────────────────────────────────────────────
const OPENAI_KEY   = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo';
const API_BASE = (import.meta?.env?.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

async function fetchLatestScanContext() {
  try {
    const res = await fetch(`${API_BASE}/scans`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const s = data[0];
        return `Current Scan Context: Filename: ${s.filename}, Risk: ${s.risk_level} (${s.risk_score}/100), Compliance: ${s.compliance_status} (${s.compliance_score}/100), Regs: ${(s.violated_regulations||[]).join(', ')}`;
      }
    }
  } catch {}
  return "No active scan found.";
}

async function callOpenAI(userText) {
  if (!OPENAI_KEY) return null;
  const scanContext = await fetchLatestScanContext();
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: `You are a professional compliance assistant for Vigil AI. Answer concisely about data privacy, PII, GDPR, HIPAA, PCI-DSS, and compliance topics. ${scanContext}` },
          { role: 'user', content: userText },
        ],
        max_tokens: 400, temperature: 0.6,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────
export default function ChatWidget({ position = 'right' }) {
  const [open,    setOpen]    = useState(false);
  const [messages,setMessages]= useState([
    {
      id: 'm0', from: 'bot',
      text: "Hi! I'm your Vigil AI Compliance Assistant.\n\nI can answer questions about PII, GDPR, HIPAA, risk scores, remediation, and more. Click a question below or type your own.",
    },
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showQs,  setShowQs]  = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  function addMsg(m) {
    setMessages(p => [...p, { id: `m-${Date.now()}-${Math.random()}`, ...m }]);
  }

  async function handleSend(rawText) {
    const text = (rawText ?? input).trim();
    if (!text) return;
    setInput('');
    setShowQs(false);
    addMsg({ from: 'user', text });
    setLoading(true);

    try {
      // 1. Keyword matching (primary)
      const kwAnswer = findAnswer(text);
      if (kwAnswer) {
        await new Promise(r => setTimeout(r, 400)); // brief "thinking" pause
        addMsg({ from: 'bot', text: kwAnswer });
        setLoading(false);
        return;
      }

      // 2. OpenAI fallback
      const aiAnswer = await callOpenAI(text);
      if (aiAnswer) {
        addMsg({ from: 'bot', text: aiAnswer });
        setLoading(false);
        return;
      }

      // 3. Default fallback
      addMsg({
        from: 'bot',
        text: "I don't have a specific answer for that. Try rephrasing, or ask about: PII, GDPR, HIPAA, PCI-DSS, risk scores, compliance status, data masking, file formats, or remediation.",
      });
    } catch {
      addMsg({ from: 'bot', text: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMessages([{
      id: 'm0', from: 'bot',
      text: "Chat reset. Ask me anything about compliance, PII, or data privacy.",
    }]);
    setShowQs(true);
    setInput('');
  }

  // Suggested questions grouped
  const QUICK_QS = [
    'Why is my risk high?',
    'How to fix this?',
    'Explain NAAC 4.3',
    'What is PII?',
    'What is GDPR?',
  ];

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Widget container */}
      <div className={`fixed bottom-6 ${position === 'right' ? 'right-6' : 'left-6'} z-50 flex flex-col items-end gap-3`}>

        {/* Chat window */}
        <div
          className={`
            transition-all duration-300 origin-bottom-right
            ${open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}
          `}
          style={{
            width: 360,
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(11,46,51,0.35)',
            border: '1px solid rgba(184,227,233,0.3)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0"
               style={{ background: '#0B2E33' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                   style={{ background: 'linear-gradient(135deg,#4F7C82,#B8E3E9)', color: '#0B2E33' }}>
                VA
              </div>
              <div>
                <div className="text-sm font-bold text-white">Compliance Assistant</div>
                <div className="text-[10px]" style={{ color: '#93B1B5' }}>
                  Vigil AI · 15 Q&amp;A Topics
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetChat}
                className="text-[10px] px-2 py-1 rounded font-medium transition-all"
                style={{ background: 'rgba(184,227,233,0.15)', color: '#B8E3E9' }}>
                Reset
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                style={{ background: 'rgba(184,227,233,0.15)', color: '#B8E3E9' }}
                aria-label="Close">
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3"
               style={{ background: '#FAFEFF', scrollbarWidth: 'thin', maxHeight: 380 }}>

            {messages.map(m => (
              <div key={m.id}
                   className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[82%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed"
                  style={
                    m.from === 'user'
                      ? { background: '#0B2E33', color: 'white', borderRadius: '18px 18px 4px 18px', whiteSpace: 'pre-wrap' }
                      : { background: 'white', color: '#0B2E33', border: '1px solid #D4EDF1',
                          borderRadius: '4px 18px 18px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                          whiteSpace: 'pre-wrap' }
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="px-4 py-2.5 rounded-2xl text-sm"
                     style={{ background: 'white', border: '1px solid #D4EDF1',
                              borderRadius: '4px 18px 18px 18px', color: '#4F7C82' }}>
                  <span className="animate-pulse">Thinking…</span>
                </div>
              </div>
            )}

            {/* Quick question buttons */}
            {showQs && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-wider"
                   style={{ color: '#93B1B5' }}>
                  Suggested Questions
                </p>
                {QUICK_QS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="w-full text-left text-xs px-3 py-2 rounded-xl border transition-all"
                    style={{
                      background: 'white', borderColor: '#B8E3E9', color: '#0B2E33',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#EEF7F9';
                      e.currentTarget.style.borderColor = '#4F7C82';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.borderColor = '#B8E3E9';
                    }}>
                    {q}
                  </button>
                ))}
                <button
                  className="w-full text-center text-[10px] py-1 font-medium"
                  style={{ color: '#4F7C82' }}
                  onClick={() => setShowQs(false)}>
                  Hide suggestions
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t shrink-0"
               style={{ borderColor: '#D4EDF1', background: 'white' }}>
            {!showQs && (
              <button
                className="mb-2 text-[10px] font-medium px-2 py-1 rounded"
                style={{ background: '#EEF7F9', color: '#4F7C82' }}
                onClick={() => setShowQs(true)}>
                📋 Show all questions
              </button>
            )}
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ask about compliance, PII, GDPR…"
                className="flex-1 px-3 py-2 text-sm rounded-xl border focus:outline-none"
                style={{ borderColor: '#B8E3E9', color: '#0B2E33', background: '#FAFEFF' }}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                style={{ background: '#0B2E33', color: 'white' }}>
                ➤
              </button>
            </div>
          </div>
        </div>

        {/* FAB button */}
        <button
          onClick={() => setOpen(v => !v)}
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95"
          style={{
            background: open ? '#4F7C82' : 'linear-gradient(135deg,#0B2E33,#4F7C82)',
            boxShadow: '0 8px 24px rgba(11,46,51,0.4)',
          }}
          aria-label="Toggle chat"
        >
          <span className="text-white text-xl font-bold">{open ? '✕' : '💬'}</span>
        </button>
      </div>
    </>
  );
}
