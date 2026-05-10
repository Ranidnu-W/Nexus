"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { uploadFile, getJobStatus } from "@/lib/api";

type IntervalId = ReturnType<typeof setInterval>;

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/docmentor", label: "DocMentor" },
  { href: "/review", label: "Reviews" },
  { href: "/digest", label: "Digests" },
  { href: "/files", label: "Files" },
  { href: "/status", label: "Status" },
  { href: "/analytics", label: "Analytics" },
];

type FileStatus = "queued" | "uploading" | "indexed" | "error";

type ManagedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  status: FileStatus;
  progress: number;
  chunkCount?: number;
  error?: string;
  addedAt: Date;
};

const TYPE_COLORS: Record<string, string> = {
  pdf:  "#f87171",
  txt:  "#60a5fa",
  md:   "#a78bfa",
  csv:  "#4ade80",
  json: "#fbbf24",
  default: "#94a3b8",
};

const TYPE_ICONS: Record<string, string> = {
  pdf: "📕",
  txt: "📄",
  md:  "📝",
  csv: "📊",
  json: "🗂️",
  default: "📁",
};

function ext(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "default";
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const ACCEPTED = ".pdf,.txt,.md,.csv,.json";

export default function FilesPage() {
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const intervalsRef = useRef<Set<IntervalId>>(new Set());

  // Cleanup all polling intervals on unmount
  useEffect(() => {
    return () => {
      intervalsRef.current.forEach(clearInterval);
    };
  }, []);

  const updateFile = useCallback((id: string, patch: Partial<ManagedFile>) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f));
  }, []);

  const processFile = useCallback(async (file: File) => {
    const id = crypto.randomUUID();
    const fileExt = ext(file.name);
    const supported = ["pdf", "txt", "md", "csv", "json"].includes(fileExt);

    const entry: ManagedFile = {
      id,
      name: file.name,
      size: file.size,
      type: fileExt,
      status: supported ? "uploading" : "error",
      progress: 0,
      addedAt: new Date(),
      error: supported ? undefined : `Unsupported type: .${fileExt}`,
    };

    setFiles((prev) => [entry, ...prev]);
    if (!supported) return;

    // Simulate progress while uploading
    const ticker = setInterval(() => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id && f.status === "uploading" && f.progress < 80
            ? { ...f, progress: f.progress + Math.random() * 15 }
            : f
        )
      );
    }, 300);
    intervalsRef.current.add(ticker);

    try {
      const res = await uploadFile(file) as { job_id?: string; chunk_count?: number; status?: string };
      clearInterval(ticker);
      intervalsRef.current.delete(ticker);

      if (res.job_id) {
        updateFile(id, { progress: 85 });
        // Poll for completion
        const interval = setInterval(async () => {
          try {
            const job = await getJobStatus(res.job_id!) as { status: string; result?: { chunk_count?: number } };
            if (job.status === "complete") {
              clearInterval(interval);
              intervalsRef.current.delete(interval);
              updateFile(id, { status: "indexed", progress: 100, chunkCount: job.result?.chunk_count });
            } else if (job.status === "error") {
              clearInterval(interval);
              intervalsRef.current.delete(interval);
              updateFile(id, { status: "error", progress: 0, error: "Processing failed in n8n." });
            }
          } catch {
            clearInterval(interval);
            intervalsRef.current.delete(interval);
            updateFile(id, { status: "error", progress: 0, error: "Lost connection during processing." });
          }
        }, 2000);
        intervalsRef.current.add(interval);
      } else {
        // Synchronous response
        updateFile(id, { status: "indexed", progress: 100, chunkCount: res.chunk_count });
      }
    } catch {
      clearInterval(ticker);
      intervalsRef.current.delete(ticker);
      updateFile(id, { status: "error", progress: 0, error: "n8n is offline. Start your workflow first." });
    }
  }, [updateFile]);

  function handleFiles(fileList: FileList) {
    Array.from(fileList).forEach(processFile);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  const indexed = files.filter((f) => f.status === "indexed").length;
  const uploading = files.filter((f) => f.status === "uploading").length;
  const errored = files.filter((f) => f.status === "error").length;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0a0a0f", color: "#fff", fontFamily: "var(--font-space-grotesk), sans-serif" }}>
      <style>{`
        .nav-link { color: rgba(255,255,255,0.45); font-size: 0.8rem; letter-spacing: 0.08em; text-decoration: none; padding: 0.4rem 0.9rem; border-radius: 999px; transition: all 0.2s; }
        .nav-link:hover { color: #fff; background: rgba(255,255,255,0.07); }
        .nav-link.active { color: #f5c842; background: rgba(245,200,66,0.1); }
        .section-label { font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.3); font-family: var(--font-jetbrains-mono), monospace; }
        .file-row { display: grid; grid-template-columns: 36px 1fr auto; gap: 0.85rem; align-items: center; padding: 0.9rem 1.1rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; transition: border-color 0.2s; }
        .file-row:hover { border-color: rgba(255,255,255,0.13); }
        .file-row.status-error { border-color: rgba(248,113,113,0.2); background: rgba(248,113,113,0.04); }
        .file-row.status-indexed { border-color: rgba(59,130,246,0.15); }
        .del-btn { background: none; border: none; color: rgba(255,255,255,0.2); cursor: pointer; font-size: 0.9rem; padding: 0.2rem 0.4rem; border-radius: 6px; transition: all 0.15s; }
        .del-btn:hover { color: #f87171; background: rgba(248,113,113,0.1); }
        .stat-pill { display: flex; align-items: center; gap: 0.4rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 999px; padding: 0.35rem 0.85rem; font-size: 0.72rem; font-family: var(--font-jetbrains-mono), monospace; color: rgba(255,255,255,0.5); }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 14px; height: 14px; border: 2px solid rgba(59,130,246,0.3); border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes pulse-bar { 0%,100%{opacity:1} 50%{opacity:0.6} }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "1.1rem 2.5rem", display: "flex", alignItems: "center", gap: "1.5rem", flexShrink: 0 }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.22em", color: "#f5c842", marginRight: "1rem", textDecoration: "none", textTransform: "uppercase", flexShrink: 0 }}>Nexus</Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.15rem", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "999px", padding: "0.35rem 0.5rem" }}>
          {NAV.map((l) => <Link key={l.href} href={l.href} className={`nav-link${l.href === "/files" ? " active" : ""}`}>{l.label}</Link>)}
        </div>
      </nav>

      <div style={{ flex: 1, padding: "2rem 2.5rem", maxWidth: 860, margin: "0 auto", width: "100%" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>📁</div>
            <div>
              <span className="section-label">Ingestion Engine</span>
              <h1 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: "0.15rem" }}>File Intake Agent</h1>
            </div>
          </div>
          {files.length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <span className="stat-pill"><span style={{ color: "#4ade80" }}>✓</span>{indexed} indexed</span>
              {uploading > 0 && <span className="stat-pill"><span style={{ color: "#3b82f6" }}>↑</span>{uploading} uploading</span>}
              {errored > 0 && <span className="stat-pill"><span style={{ color: "#f87171" }}>✗</span>{errored} failed</span>}
            </div>
          )}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? "#3b82f6" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 18,
            padding: "3rem 2rem",
            textAlign: "center",
            cursor: "pointer",
            background: dragging ? "rgba(59,130,246,0.05)" : "rgba(255,255,255,0.015)",
            transition: "all 0.2s",
            marginBottom: "1.5rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle grid lines for visual interest */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />

          <div style={{ position: "relative" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem", filter: dragging ? "none" : "grayscale(0.3)" }}>
              {dragging ? "📂" : "⬆️"}
            </div>
            <p style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.4rem", color: dragging ? "#3b82f6" : "#fff" }}>
              {dragging ? "Drop to upload" : "Drop files here"}
            </p>
            <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", marginBottom: "1.25rem" }}>
              or click to browse your machine
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              {["PDF", "TXT", "MD", "CSV", "JSON"].map((t) => (
                <span key={t} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "0.2rem 0.65rem", fontSize: "0.7rem", fontFamily: "var(--font-jetbrains-mono), monospace", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>
                  .{t.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
          <input ref={inputRef} type="file" multiple accept={ACCEPTED} style={{ display: "none" }} onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }} />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <span className="section-label" style={{ marginBottom: "0.25rem" }}>
              {files.length} file{files.length !== 1 ? "s" : ""}
            </span>
            {files.map((f) => {
              const color = TYPE_COLORS[f.type] ?? TYPE_COLORS.default;
              const icon = TYPE_ICONS[f.type] ?? TYPE_ICONS.default;
              return (
                <div key={f.id} className={`file-row status-${f.status}`}>
                  {/* Icon */}
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                    {icon}
                  </div>

                  {/* Info */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                      <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-jetbrains-mono), monospace", flexShrink: 0 }}>{fmtSize(f.size)}</span>
                    </div>

                    {/* Progress bar (uploading) */}
                    {f.status === "uploading" && (
                      <div style={{ height: 3, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${f.progress}%`, background: "#3b82f6", borderRadius: 999, transition: "width 0.3s ease", animation: "pulse-bar 1.5s ease-in-out infinite" }} />
                      </div>
                    )}

                    {/* Status text */}
                    {f.status === "indexed" && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.7rem", color: "#4ade80", fontFamily: "var(--font-jetbrains-mono), monospace" }}>Indexed</span>
                        {f.chunkCount && <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>{f.chunkCount} chunks · {fmtTime(f.addedAt)}</span>}
                      </div>
                    )}
                    {f.status === "error" && (
                      <span style={{ fontSize: "0.72rem", color: "#f87171", fontFamily: "var(--font-jetbrains-mono), monospace" }}>{f.error}</span>
                    )}
                    {f.status === "queued" && (
                      <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>Queued…</span>
                    )}
                  </div>

                  {/* Right side */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                    {f.status === "uploading" && <div className="spinner" />}
                    {f.status === "indexed" && <span style={{ color: "#4ade80", fontSize: "1rem" }}>✓</span>}
                    {f.status === "error" && <span style={{ color: "#f87171", fontSize: "1rem" }}>✗</span>}
                    <button className="del-btn" onClick={() => removeFile(f.id)} title="Remove">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {files.length === 0 && (
          <div style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.2)" }}>
            <p style={{ fontSize: "0.82rem", fontFamily: "var(--font-jetbrains-mono), monospace" }}>No files uploaded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
