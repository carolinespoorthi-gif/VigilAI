// src/pages/compliance-dashboard/components/DragDropTop.jsx
import React, { useState, useCallback, useRef } from "react";
import Button from "../../../components/ui/Button";

/**
 * DragDropTop — improved:
 * - Clickable Choose file reliably triggers hidden input
 * - Accepts .txt, .doc, .docx, .csv, .pdf, .xlsx
 * - Drag & drop works across full area
 * - Shows progress + results
 * - Generates reports via backend /reports/generate (form POST)
 */

const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
const UPLOAD_URL = `${API_BASE}/chat/upload`;
const CSV_URL = `${API_BASE}/metrics/export/csv`;

const ALLOWED_EXT = [".txt", ".csv", ".doc", ".docx", ".pdf", ".xlsx"];
const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

const DragDropTop = ({ onProcessed }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const extOk = (name = "") => {
    const lower = name.toLowerCase();
    return ALLOWED_EXT.some(ext => lower.endsWith(ext));
  };

  const validateFile = (file) => {
    if (!file) return { ok: false, reason: "no_file" };
    if (!extOk(file.name)) return { ok: false, reason: "bad_ext" };
    if (file.size > MAX_SIZE_BYTES) return { ok: false, reason: "too_big" };
    return { ok: true };
  };

  const uploadFile = (file) => {
    return new Promise((resolve, reject) => {
      setError(null);
      setUploadPct(0);
      setProcessing(true);

      const xr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append("file", file);
      fd.append("message", "Uploaded via dashboard top dropzone");

      xr.open("POST", UPLOAD_URL, true);

      xr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          setUploadPct(Math.round((ev.loaded / ev.total) * 100));
        }
      };

      xr.onload = () => {
        try {
          if (xr.status >= 200 && xr.status < 300) {
            const parsed = xr.responseText ? JSON.parse(xhrSafeParse(xr.responseText)) : {};
            resolve(parsed);
          } else {
            let msg = `Upload failed (${xr.status})`;
            try {
              const body = xr.responseText ? JSON.parse(xhrSafeParse(xr.responseText)) : null;
              if (body && body.detail) msg += ` — ${body.detail}`;
            } catch (e) { }
            reject(new Error(msg));
          }
        } catch (e) {
          reject(e);
        }
      };

      xr.onerror = () => reject(new Error("Network error during upload (backend unreachable)"));
      // small helper to avoid JSON.parse blowing up (we still try to parse)
      const xhrSafeParse = (text) => {
        try { return text; } catch (e) { return "{}"; }
      };

      xr.send(fd);
    });
  };

  // Slightly safer JSON.parse wrapper used only above; kept small

  const processFiles = async (files) => {
    if (!files || files.length === 0) return;
    setResult(null);
    setError(null);
    setUploadPct(0);

    const file = files[0];
    const v = validateFile(file);
    if (!v.ok) {
      if (v.reason === "bad_ext") {
        setError(`Unsupported file type. Use: ${ALLOWED_EXT.join(", ")}`);
      } else if (v.reason === "too_big") {
        setError("File too large. Max 100 MB.");
      } else {
        setError("Invalid file.");
      }
      return;
    }

    try {
      // Use fetch with FormData for better control (but keep xhr for progress)
      // We already wrote uploadFile using XHR for progress; call it.
      const res = await uploadFile(file);
      // attach filename so downstream can use it for report name
      const enriched = { ...res, filename: file.name };
      setResult(enriched);
      if (onProcessed) onProcessed(enriched);
    } catch (err) {
      console.error("upload error", err);
      if (err.message?.includes("404")) {
        setError("Upload endpoint not found (404). Check backend URL & server.");
      } else if (err.message?.includes("Network error")) {
        setError("Network error: cannot reach backend. Is FastAPI running?");
      } else {
        setError(err.message || "Upload failed");
      }
    } finally {
      setTimeout(() => {
        setProcessing(false);
        setUploadPct(0);
      }, 300);
    }
  };

  // drag handlers
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);
  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);
  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) processFiles(files);
  }, []);

  // open chooser reliably
  const openFileChooser = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const onFileInput = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) processFiles(files);
    e.target.value = null;
  };

  // NEW: download report (pdf or docx) by posting current `result` to backend
  const downloadReport = async (fmt = "pdf") => {
    if (!result) {
      setError("No processing result available. Upload a file first.");
      return;
    }
    setError(null);
    setProcessing(true);
    try {
      // backend expects form fields: format, title, payload_json
      const form = new FormData();
      form.append("format", fmt);
      form.append("title", `Compliance report - ${result.filename || "scan"}`);

      // build structured payload the backend report builder expects
      const payload = {
        filename: result.filename || "uploaded_file",
        summary: result?.report?.summary || result?.reply || "",
        pii: result?.report?.ai_analysis?.pii_detected || {},
        remediation: result?.report?.ai_analysis?.remediation_actions || [],
        risks: result?.report?.ai_analysis?.violated_regulations || []
      };

      form.append("payload_json", JSON.stringify(payload));

      const resp = await fetch(`${API_BASE}/reports/generate`, {
        method: "POST",
        body: form
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(txt || `Report generation failed (${resp.status})`);
      }

      const blob = await resp.blob();
      // attempt to read filename from content-disposition
      let fname = `compliance_report.${fmt === "pdf" ? "pdf" : "docx"}`;
      const cd = resp.headers.get("content-disposition");
      if (cd) {
        const m = /filename\*=UTF-8''(.+)|filename="?([^";]+)"?/.exec(cd);
        if (m) fname = decodeURIComponent(m[1] || m[2]);
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("report download error", err);
      setError(err.message || "Report generation failed");
    } finally {
      setProcessing(false);
    }
  };
  
  const downloadAnalysisCSV = async () => {
    if (!result) return;
    try {
      const resp = await fetch(`${API_BASE}/metrics/export/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result)
      });
      if (!resp.ok) throw new Error("CSV export failed");
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analysis_${result.filename || 'export'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      setError("Failed to download CSV");
    }
  };

  return (
    <div className="mb-6">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`border-2 rounded-lg p-6 flex flex-col md:flex-row items-center justify-between transition-shadow ${dragActive ? "border-primary bg-surface shadow-md" : "border-border bg-white"}`}
        style={{ cursor: "pointer" }}
      >
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold">Drag & drop personal files to scan for PII</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Detect emails, phone numbers, SSN-like patterns and get remediation suggestions.
            Supported: {ALLOWED_EXT.join(", ")}. Max 100 MB.
          </p>

          <div className="mt-3 flex items-center space-x-3">
            {/* explicit file input with accept filter */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_EXT.map(e => (e === ".xlsx" ? ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : e)).join(",")}
              onChange={onFileInput}
              className="hidden"
            />

            <div onClick={openFileChooser}>
              <Button variant="outline" iconName="Upload">Choose file</Button>
            </div>

            <Button variant="ghost" onClick={() => { if (!processing) { setResult(null); setError(null); } }}>
              Clear
            </Button>

            {/* NEW: Generate Report buttons (PDF and DOCX) */}
            <div className="ml-2 flex items-center space-x-2">
              <Button variant="default" iconName="Download" onClick={() => downloadReport("pdf")} disabled={!result || processing}>
                Generate Report (PDF)
              </Button>
              <Button variant="outline" iconName="Download" onClick={() => downloadReport("docx")} disabled={!result || processing}>
                Generate Report (DOCX)
              </Button>
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/3 mt-4 md:mt-0 md:pl-6">
          <div className="text-sm text-muted-foreground">Upload status</div>
          <div className="w-full bg-muted/20 rounded-full h-3 mt-2 overflow-hidden">
            <div style={{ width: `${uploadPct}%` }} className="h-3 transition-all rounded-full bg-primary" />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <div>{processing ? `Processing (${uploadPct}%)` : (result ? "Done" : "Idle")}</div>
            <div className="text-muted-foreground">{uploadPct ? `${uploadPct}%` : ""}</div>
          </div>
        </div>
      </div>

      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

      {result && (
        <div className="mt-4 p-4 bg-card rounded border border-border">
          <div className="flex items-start justify-between">
            <div className="pr-6 w-full">
                <div className="metrics-header mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-lg text-foreground mr-2">Results</span>
                    <div className={`px-3 py-1 rounded-full text-white text-[10px] uppercase font-bold
                      ${result?.report?.ai_analysis?.risk_level === 'CRITICAL' ? 'bg-red-800' :
                        result?.report?.ai_analysis?.risk_level === 'HIGH' ? 'bg-red-600' :
                        result?.report?.ai_analysis?.risk_level === 'MEDIUM' ? 'bg-yellow-500' :
                        'bg-green-600'
                      }
                    `}>
                      Risk: {result?.report?.ai_analysis?.risk_level || 'UNKNOWN'}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" iconName="Download" onClick={downloadAnalysisCSV}>
                    Download Metrics CSV
                  </Button>
                </div>
              
              <p className="text-sm text-muted-foreground mt-1 mb-4">{result?.report?.summary || result?.reply}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                 <div className="bg-muted/20 p-3 rounded text-center">
                    <div className="text-2xl font-bold">{result?.report?.ai_analysis?.compliance_score || 0}/100</div>
                    <div className="text-xs text-muted-foreground uppercase">Score</div>
                 </div>
                 <div className="bg-muted/20 p-3 rounded text-center">
                    <div className="text-2xl font-bold">{result?.report?.ai_analysis?.compliance_status?.replace('_', ' ') || 'UNKNOWN'}</div>
                    <div className="text-xs text-muted-foreground uppercase">Status</div>
                 </div>
              </div>

              <div className="mt-4">
                <strong className="text-foreground text-sm">Detected PII values:</strong>
                <div className="mt-2 space-y-2">
                  {result?.report?.ai_analysis?.detailed_findings && result.report.ai_analysis.detailed_findings.length > 0 ? (
                    result.report.ai_analysis.detailed_findings.slice(0, 15).map((finding, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded border border-border/50 text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-primary min-w-[80px]">{finding.type}:</span>
                          <span className="text-foreground font-mono break-all">{finding.value}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold text-white
                          ${finding.severity === 'Critical' ? 'bg-red-700' : 
                            finding.severity === 'High' ? 'bg-red-500' :
                            finding.severity === 'Medium' ? 'bg-yellow-600' : 'bg-green-600'}
                        `}>
                          {finding.severity}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-success bg-success/10 p-2 rounded border border-success/20">
                      No sensitive PII values found in this document.
                    </div>
                  )}
                  {result?.report?.ai_analysis?.detailed_findings?.length > 15 && (
                    <p className="text-[10px] text-muted-foreground italic text-center mt-1">
                      ...and {result.report.ai_analysis.detailed_findings.length - 15} more findings
                    </p>
                  )}
                </div>
              </div>
              
              {result?.report?.ai_analysis?.violated_regulations && result.report.ai_analysis.violated_regulations.length > 0 && (
                 <div className="mt-3">
                   <strong className="text-foreground">Violated Regulations:</strong>
                   <div className="flex flex-wrap gap-2 mt-2">
                     {result.report.ai_analysis.violated_regulations.map((reg, i) => (
                       <span key={i} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded border border-red-200">{reg}</span>
                     ))}
                   </div>
                 </div>
              )}

              {result?.report?.ai_analysis?.remediation_actions && result.report.ai_analysis.remediation_actions.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded">
                  <strong className="text-blue-900">Suggested AI Remediation:</strong>
                  <ul className="list-disc ml-6 mt-2 text-sm text-blue-800">
                    {result.report.ai_analysis.remediation_actions.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DragDropTop;
