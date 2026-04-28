// src/pages/compliance-dashboard/components/CameraScanModal.jsx
import React, { useEffect, useRef, useState } from "react";

/**
 * CameraScanModal
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   onUploaded: (result) => void
 *   apiBase?: string  // optional override, defaults to VITE_API_URL or http://localhost:8000
 *
 * Behavior:
 *  - Requests camera permission and shows live preview.
 *  - Capture still frame -> upload to /chat/upload
 *  - Shows upload progress and server response.
 *  - NEW: Generate Report button (uses server response -> calls /reports/generate_json)
 */

const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
const UPLOAD_URL = (apiBase) => `${(apiBase || API_BASE)}/chat/upload`;
const REPORT_JSON_URL = (apiBase, fmt = "docx") => `${(apiBase || API_BASE)}/reports/generate_json?format=${fmt}`;

const ALLOWED_EXT = [".txt", ".csv", ".doc", ".docx", ".pdf", ".xlsx", ".png", ".jpg", ".jpeg", ".gif"];
const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

export default function CameraScanModal({ isOpen, onClose, onUploaded, apiBase }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const [uploadPct, setUploadPct] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      resetState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function startCamera() {
    setError(null);
    setPermissionDenied(false);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Camera not supported by this browser.");
        setCameraAvailable(false);
        return;
      }
      const constraints = { video: { facingMode: "environment" }, audio: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraAvailable(true);
      setCameraActive(true);
    } catch (err) {
      console.error("startCamera error", err);
      setPermissionDenied(true);
      setCameraAvailable(false);
      setCameraActive(false);
      setError("Camera access denied or unavailable.");
    }
  }

  function stopCamera() {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } catch (err) {
      // ignore
    } finally {
      setCameraActive(false);
    }
  }

  function resetState() {
    setUploadPct(0);
    setProcessing(false);
    setResult(null);
    setError(null);
    setGenerating(false);
  }

  function captureToBlob() {
    return new Promise((resolve, reject) => {
      try {
        const video = videoRef.current;
        if (!video) return reject(new Error("Video not ready"));
        const w = video.videoWidth || 1280;
        const h = video.videoHeight || 720;
        const canvas = canvasRef.current || document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Capture failed"));
          resolve(blob);
        }, "image/png");
      } catch (err) {
        reject(err);
      }
    });
  }

  function uploadFileToServer(fileToUpload) {
    return new Promise((resolve, reject) => {
      setError(null);
      setUploadPct(0);
      setProcessing(true);

      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append("file", fileToUpload);
      fd.append("message", "Uploaded via CameraScanModal");

      xhr.open("POST", UPLOAD_URL(apiBase), true);

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * 100);
          setUploadPct(pct);
        }
      };

      xhr.onload = () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const parsed = xhr.responseText ? JSON.parse(xhr.responseText) : {};
            setResult(parsed);
            if (onUploaded) {
              try { onUploaded(parsed); } catch (e) { /* ignore callback errors */ }
            }
            resolve(parsed);
          } else {
            let msg = `Upload failed (${xhr.status})`;
            try {
              const body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
              if (body && body.detail) msg += ` — ${body.detail}`;
            } catch (e) {}
            reject(new Error(msg));
          }
        } catch (err) {
          reject(err);
        } finally {
          setProcessing(false);
          setUploadPct(0);
        }
      };

      xhr.onerror = () => {
        setProcessing(false);
        setUploadPct(0);
        reject(new Error("Network error during upload (backend unreachable)"));
      };

      xhr.send(fd);
    });
  }

  async function handleCaptureAndUpload() {
    setError(null);
    if (!cameraActive) {
      setError("Camera not active. Click Start Camera first.");
      return;
    }
    try {
      const blob = await captureToBlob();
      const file = new File([blob], `capture_${Date.now()}.png`, { type: "image/png" });
      const res = await uploadFileToServer(file);
      return res;
    } catch (err) {
      console.error("capture/upload error", err);
      setError(err.message || String(err));
      setProcessing(false);
    }
  }

  // Build simple remediation heuristics client-side from PII categories
  function buildRemediationFromPII(piiObj) {
    const rem = [];
    if (!piiObj || typeof piiObj !== "object") return rem;
    const keys = Object.keys(piiObj || {});
    for (const k of keys) {
      const low = k.toLowerCase();
      if (low.includes("ssn") || low.includes("social")) {
        rem.push("Move SSNs to a secure vault, restrict access, and pseudonymize/anonymize the records.");
      } else if (low.includes("credit") || low.includes("card")) {
        rem.push("Remove or tokenize credit card numbers; ensure PCI-compliant storage if needed.");
      } else if (low.includes("email")) {
        rem.push("Mask or redact email addresses in logs and public channels; limit downstream sharing.");
      } else if (low.includes("phone")) {
        rem.push("Encrypt phone numbers; restrict access and log access events.");
      } else if (low.includes("address") || low.includes("dob")) {
        rem.push("Treat as sensitive PII: restrict access, mask in views, and consider deletion if not required.");
      } else {
        rem.push(`Review occurrences of ${k} and apply appropriate minimization/anonymization.`);
      }
    }
    // dedupe
    return Array.from(new Set(rem));
  }

  // POST the server result to /reports/generate_json and download file
  async function handleGenerateReport(format = "docx") {
    if (!result) {
      setError("No uploaded file result available. Capture and upload first.");
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      // Prepare payload expected by generate_report_json: keys: pii, risks, remediation, summary
      const payload = {
        pii: result.report?.pii || {},
        risks: result.report?.risks || [],
        remediation: result.report?.remediation || buildRemediationFromPII(result.report?.pii || {}),
        summary: result.report?.summary || result.reply || `Uploaded file processed on ${new Date().toISOString()}`
      };

      // call /reports/generate_json with JSON body
      const url = REPORT_JSON_URL(apiBase, format);
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`Report generation failed (${resp.status}) ${txt}`);
      }

      const blob = await resp.blob();
      // determine filename from content-disposition if provided
      let fname = `compliance_report.${format === "pdf" ? "pdf" : "docx"}`;
      const cd = resp.headers.get("content-disposition");
      if (cd) {
        const m = /filename\*=UTF-8''(.+)|filename="?([^";]+)"?/.exec(cd);
        if (m) fname = decodeURIComponent(m[1] || m[2]);
      }

      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlBlob;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(urlBlob);

      // optionally record success in UI
      alert(`Report generated and downloaded: ${fname}`);
    } catch (err) {
      console.error("generate report error", err);
      setError(err.message || String(err));
    } finally {
      setGenerating(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => { stopCamera(); onClose && onClose(); }}
      />

      <div className="relative w-full max-w-3xl bg-card border border-border rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">New Scan — Capture or Upload</h3>
          <div className="flex items-center space-x-2">
            <button
              className="text-sm px-3 py-1 rounded hover:bg-muted/20"
              onClick={() => {
                stopCamera();
                onClose && onClose();
              }}
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <div className="bg-muted/10 rounded-lg p-2 flex items-center justify-center" style={{ minHeight: 260 }}>
              {cameraActive ? (
                <video ref={videoRef} className="w-full h-full object-contain" playsInline muted />
              ) : (
                <div className="text-center">
                  <div className="text-sm font-medium text-foreground">Camera preview</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {permissionDenied ? "Camera permission denied. Use another upload method." : "Start camera to capture document image."}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {!cameraActive && (
                <button
                  className="px-3 py-2 bg-primary text-white rounded"
                  onClick={startCamera}
                >
                  Start Camera
                </button>
              )}

              {cameraActive && (
                <>
                  <button
                    className="px-3 py-2 bg-success text-white rounded"
                    onClick={handleCaptureAndUpload}
                    disabled={processing}
                  >
                    Capture & Upload
                  </button>
                  <button
                    className="px-3 py-2 bg-rose-500 text-white rounded"
                    onClick={() => { stopCamera(); }}
                    disabled={processing}
                  >
                    Stop Camera
                  </button>
                </>
              )}

              <div className="ml-auto text-sm text-muted-foreground">
                {processing ? `Uploading ${uploadPct}%` : (result ? "Upload succeeded" : "Idle")}
              </div>
            </div>

            {/* upload result / errors */}
            {error && <div className="text-sm text-red-600 mt-2">{error}</div>}

            {result && (
              <div className="mt-3 p-3 bg-muted/5 border border-border rounded text-sm">
                <div className="font-medium">Server Result</div>
                <div className="mt-1">{result?.reply || JSON.stringify(result)}</div>
                {result?.report?.summary && <div className="mt-2 text-xs text-muted-foreground">Summary: {result.report.summary}</div>}
                {result?.report?.pii && (
                  <div className="mt-2">
                    <strong>PII:</strong>
                    <ul className="list-disc ml-5">
                      {Object.entries(result.report.pii).map(([k, v]) => (
                        <li key={k}><span className="capitalize">{k}:</span> {Array.isArray(v) ? v.length : String(v)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="space-y-3">
            <div className="bg-muted/10 p-3 rounded border border-border">
              <div className="text-sm font-medium">Generate Report</div>
              <div className="text-xs text-muted-foreground mt-1">
                Generate a mitigation / remediation report for the uploaded capture or file.
              </div>

              <div className="mt-3">
                <div className="text-sm">Status:</div>
                <div className="mt-2 text-sm text-foreground">
                  {result ? "File processed — report available" : "No uploaded file yet"}
                </div>
                <div className="mt-3">
                  <button
                    className="w-full px-3 py-2 bg-primary text-white rounded"
                    onClick={() => handleGenerateReport("docx")}
                    disabled={!result || generating}
                  >
                    {generating ? "Generating..." : "Generate Report (DOCX)"}
                  </button>
                </div>

                <div className="mt-2">
                  <button
                    className="w-full px-3 py-2 border rounded"
                    onClick={() => handleGenerateReport("pdf")}
                    disabled={!result || generating}
                  >
                    {generating ? "Generating..." : "Generate Report (PDF)"}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-muted/10 p-3 rounded border border-border">
              <div className="text-sm font-medium">Hints</div>
              <ul className="list-disc ml-5 mt-2 text-xs text-muted-foreground">
                <li>Use the rear camera (environment) for documents.</li>
                <li>If camera blocked, allow camera access or use another upload flow outside this modal.</li>
                <li>Captured images are uploaded to the server for PII detection; report will summarize findings & mitigations.</li>
              </ul>
            </div>

            <div className="bg-muted/10 p-3 rounded border border-border">
              <div className="text-sm font-medium">Actions</div>
              <div className="mt-2 space-y-2">
                <button
                  className="w-full px-3 py-2 border rounded"
                  onClick={() => {
                    stopCamera();
                    onClose && onClose();
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
