"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { queryDocmentor, uploadFile, getJobStatus } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/docmentor", label: "DocMentor" },
  { href: "/review", label: "Reviews" },
  { href: "/digest", label: "Digests" },
  { href: "/files", label: "Files" },
  { href: "/status", label: "Status" },
  { href: "/analytics", label: "Analytics" },
];

const SESSION_ID = `session-${Math.random().toString(36).slice(2)}`;

type Message = {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  loading?: boolean;
};

type Doc = { name: string; status: "indexed" | "uploading" | "error" };

export default function DocMentorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const pollJob = useCallback(async (jobId: string, msgId: string) => {
    const interval = setInterval(async () => {
      try {
        const job = await getJobStatus(jobId) as { status: string; result?: { response?: string } };
        if (job.status === "complete") {
          clearInterval(interval);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId
                ? { ...m, content: job.result?.response ?? "Done.", loading: false }
                : m
            )
          );
        } else if (job.status === "error") {
          clearInterval(interval);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId
                ? { ...m, role: "error", content: "Something went wrong. Try again.", loading: false }
                : m
            )
          );
        }
      } catch {
        clearInterval(interval);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, role: "error", content: "Lost connection to n8n.", loading: false } : m
          )
        );
      }
    }, 2000);
  }, []);

  async function send() {
    if (!input.trim() || sending) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: input.trim() };
    const asstId = crypto.randomUUID();
    const asstMsg: Message = { id: asstId, role: "assistant", content: "", loading: true };
    setMessages((prev) => [...prev, userMsg, asstMsg]);
    setInput("");
    setSending(true);
    try {
      const res = await queryDocmentor(input.trim(), SESSION_ID) as { job_id?: string; response?: string };
      if (res.job_id) {
        pollJob(res.job_id, asstId);
      } else {
        setMessages((prev) =>
          prev.map((m) => m.id === asstId ? { ...m, content: res.response ?? "No response.", loading: false } : m)
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => m.id === asstId ? { ...m, role: "error", content: "n8n is offline. Start your workflow first.", loading: false } : m)
      );
    } finally {
      setSending(false);
    }
  }

  async function handleUpload(file: File) {
    const doc: Doc = { name: file.name, status: "uploading" };
    setDocs((prev) => [doc, ...prev]);
    try {
      await uploadFile(file);
      setDocs((prev) => prev.map((d) => d.name === file.name ? { ...d, status: "indexed" } : d));
    } catch {
      setDocs((prev) => prev.map((d) => d.name === file.name ? { ...d, status: "error" } : d));
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0a0a0f", color: "#fff", fontFamily: "var(--font-space-grotesk), sans-serif" }}>
      <style>{`
        .nav-link { color: rgba(255,255,255,0.45); font-size: 0.8rem; letter-spacing: 0.08em; text-decoration: none; padding: 0.4rem 0.9rem; border-radius: 999px; transition: all 0.2s; }
        .nav-link:hover { color: #fff; background: rgba(255,255,255,0.07); }
        .nav-link.active { color: #f5c842; background: rgba(245,200,66,0.1); }
        .section-label { font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.3); font-family: var(--font-jetbrains-mono), monospace; }
        .doc-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.55rem 0.75rem; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
        .send-btn { background: #6366f1; color: #fff; border: none; border-radius: 10px; padding: 0.65rem 1.1rem; font-size: 0.85rem; font-family: var(--font-space-grotesk), sans-serif; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; gap: 0.4rem; white-space: nowrap; }
        .send-btn:hover:not(:disabled) { background: #4f46e5; }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .chat-input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #fff; padding: 0.75rem 1rem; font-size: 0.9rem; font-family: var(--font-space-grotesk), sans-serif; resize: none; outline: none; line-height: 1.5; }
        .chat-input:focus { border-color: rgba(99,102,241,0.5); }
        .chat-input::placeholder { color: rgba(255,255,255,0.25); }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        .typing-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #6366f1; animation: blink 1.2s ease-in-out infinite; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "1.1rem 2.5rem", display: "flex", alignItems: "center", gap: "1.5rem", flexShrink: 0 }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.22em", color: "#f5c842", marginRight: "1rem", textDecoration: "none", textTransform: "uppercase", flexShrink: 0 }}>Nexus</Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.15rem", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "999px", padding: "0.35rem 0.5rem" }}>
          {NAV.map((l) => <Link key={l.href} href={l.href} className={`nav-link${l.href === "/docmentor" ? " active" : ""}`}>{l.label}</Link>)}
        </div>
      </nav>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Sidebar */}
        <div style={{ width: 272, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", padding: "1.5rem 1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <span className="section-label">Documents</span>
            <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>{docs.length} indexed</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {docs.length === 0 && (
              <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: "2rem", lineHeight: 1.6 }}>
                No documents yet.<br />Upload one below.
              </p>
            )}
            {docs.map((doc) => (
              <div key={doc.name} className="doc-row">
                <span style={{ fontSize: "1rem" }}>📄</span>
                <span style={{ flex: 1, fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</span>
                {doc.status === "uploading" && <span style={{ fontSize: "0.65rem", color: "#6366f1", fontFamily: "var(--font-jetbrains-mono), monospace" }}>…</span>}
                {doc.status === "indexed" && <span style={{ fontSize: "0.65rem", color: "#4ade80", fontFamily: "var(--font-jetbrains-mono), monospace" }}>✓</span>}
                {doc.status === "error" && <span style={{ fontSize: "0.65rem", color: "#f87171", fontFamily: "var(--font-jetbrains-mono), monospace" }}>✗</span>}
              </div>
            ))}
          </div>

          {/* Upload zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              marginTop: "1rem", border: `1px dashed ${dragging ? "#6366f1" : "rgba(255,255,255,0.15)"}`,
              borderRadius: 12, padding: "1.25rem", textAlign: "center", cursor: "pointer",
              background: dragging ? "rgba(99,102,241,0.06)" : "transparent", transition: "all 0.2s",
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>⬆️</div>
            <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
              Drop a file or click<br />
              <span style={{ color: "#6366f1" }}>PDF, TXT, MD, CSV</span>
            </p>
            <input ref={fileRef} type="file" style={{ display: "none" }} accept=".pdf,.txt,.md,.csv,.json" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
          </div>
        </div>

        {/* Chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "1.25rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>📚</div>
            <div>
              <h1 style={{ fontSize: "1rem", fontWeight: 600 }}>DocMentor Agent</h1>
              <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>RAG · Llama 3 8B · Qdrant</p>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {messages.length === 0 && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", opacity: 0.5 }}>
                <div style={{ fontSize: "3rem" }}>📖</div>
                <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)", textAlign: "center", lineHeight: 1.6 }}>
                  Upload a document, then ask<br />anything about it.
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.role === "user" ? (
                  <div style={{ maxWidth: "70%", background: "#6366f1", borderRadius: "16px 16px 4px 16px", padding: "0.75rem 1.1rem", fontSize: "0.9rem", lineHeight: 1.6 }}>
                    {msg.content}
                  </div>
                ) : msg.loading ? (
                  <div style={{ display: "flex", gap: "4px", alignItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px 16px 16px 4px", padding: "0.85rem 1.1rem" }}>
                    <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                  </div>
                ) : (
                  <div style={{ maxWidth: "75%", background: msg.role === "error" ? "rgba(248,113,113,0.08)" : "rgba(255,255,255,0.05)", border: `1px solid ${msg.role === "error" ? "rgba(248,113,113,0.2)" : "rgba(255,255,255,0.08)"}`, borderRadius: "16px 16px 16px 4px", padding: "0.85rem 1.1rem", fontSize: "0.9rem", lineHeight: 1.7, color: msg.role === "error" ? "#f87171" : "#fff" }}>
                    {msg.content}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "1rem 2rem 1.5rem", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
            <textarea
              ref={textareaRef}
              className="chat-input"
              rows={2}
              placeholder="Ask something about your documents…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <button className="send-btn" onClick={send} disabled={sending || !input.trim()}>
              Send ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
