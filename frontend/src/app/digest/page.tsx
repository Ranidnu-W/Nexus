"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import DOMPurify from "dompurify";
import { configureDigest, getLatestDigest } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/docmentor", label: "DocMentor" },
  { href: "/review", label: "Reviews" },
  { href: "/digest", label: "Digests" },
  { href: "/files", label: "Files" },
  { href: "/status", label: "Status" },
  { href: "/analytics", label: "Analytics" },
];

type Frequency = "daily" | "weekly";

type LatestDigest = {
  digest_id: string;
  content: string;
  sent_at: string;
  item_count?: number;
};

export default function DigestPage() {
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [latest, setLatest] = useState<LatestDigest | null>(null);
  const [loadingDigest, setLoadingDigest] = useState(true);
  const topicRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getLatestDigest()
      .then((d) => setLatest(d as LatestDigest))
      .catch(() => {})
      .finally(() => setLoadingDigest(false));
  }, []);

  function addTopic() {
    const t = topicInput.trim();
    if (t && !topics.includes(t)) setTopics((prev) => [...prev, t]);
    setTopicInput("");
    topicRef.current?.focus();
  }

  function removeTopic(t: string) {
    setTopics((prev) => prev.filter((x) => x !== t));
  }

  async function save() {
    if (!email.trim() || topics.length === 0 || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await configureDigest(topics, frequency, email.trim());
      setToast(true);
      setTimeout(() => setToast(false), 3000);
    } catch {
      setSaveError("n8n is offline or the workflow isn't active yet.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0a0a0f", color: "#fff", fontFamily: "var(--font-space-grotesk), sans-serif" }}>
      <style>{`
        .nav-link { color: rgba(255,255,255,0.45); font-size: 0.8rem; letter-spacing: 0.08em; text-decoration: none; padding: 0.4rem 0.9rem; border-radius: 999px; transition: all 0.2s; }
        .nav-link:hover { color: #fff; background: rgba(255,255,255,0.07); }
        .nav-link.active { color: #f5c842; background: rgba(245,200,66,0.1); }
        .section-label { font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.3); font-family: var(--font-jetbrains-mono), monospace; }
        .freq-btn { flex: 1; padding: 0.55rem; border-radius: 8px; border: 1px solid transparent; font-family: var(--font-space-grotesk), sans-serif; font-size: 0.82rem; cursor: pointer; transition: all 0.2s; background: transparent; color: rgba(255,255,255,0.45); }
        .freq-btn.selected { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.35); color: #10b981; font-weight: 600; }
        .freq-btn:hover:not(.selected) { background: rgba(255,255,255,0.05); color: #fff; }
        .save-btn { width: 100%; padding: 0.85rem; background: #10b981; color: #fff; font-weight: 600; font-size: 0.9rem; border: none; border-radius: 10px; cursor: pointer; font-family: var(--font-space-grotesk), sans-serif; transition: background 0.2s; letter-spacing: 0.04em; }
        .save-btn:hover:not(:disabled) { background: #059669; }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .config-input { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 10px; color: #fff; padding: 0.75rem 1rem; font-size: 0.88rem; font-family: var(--font-space-grotesk), sans-serif; outline: none; }
        .config-input:focus { border-color: rgba(16,185,129,0.4); }
        .config-input::placeholder { color: rgba(255,255,255,0.2); }
        .topic-chip { display: flex; align-items: center; gap: 0.4rem; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); color: #10b981; font-size: 0.72rem; padding: 0.25rem 0.6rem 0.25rem 0.75rem; border-radius: 999px; font-family: var(--font-jetbrains-mono), monospace; }
        .topic-chip button { background: none; border: none; color: rgba(16,185,129,0.6); cursor: pointer; font-size: 0.8rem; padding: 0; line-height: 1; transition: color 0.15s; }
        .topic-chip button:hover { color: #10b981; }
        @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideDown { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(12px); } }
        .result-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 1.5rem; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: "2rem", right: "2rem", zIndex: 100, background: "#10b981", color: "#fff", padding: "0.75rem 1.5rem", borderRadius: 12, fontWeight: 600, fontSize: "0.85rem", boxShadow: "0 8px 32px rgba(16,185,129,0.3)", animation: "slideUp 0.3s ease" }}>
          ✓ Digest activated!
        </div>
      )}

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "1.1rem 2.5rem", display: "flex", alignItems: "center", gap: "1.5rem", flexShrink: 0 }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.22em", color: "#f5c842", marginRight: "1rem", textDecoration: "none", textTransform: "uppercase", flexShrink: 0 }}>Nexus</Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.15rem", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "999px", padding: "0.35rem 0.5rem" }}>
          {NAV.map((l) => <Link key={l.href} href={l.href} className={`nav-link${l.href === "/digest" ? " active" : ""}`}>{l.label}</Link>)}
        </div>
      </nav>

      {/* Page header */}
      <div style={{ padding: "2rem 2.5rem 0", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>📰</div>
        <div>
          <span className="section-label">Scheduled Summaries</span>
          <h1 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: "0.15rem" }}>Digest Agent</h1>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "400px 1fr", gap: "1.5rem", padding: "1.5rem 2.5rem 2.5rem" }}>

        {/* Left: config */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="result-card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Configure Digest</h2>

            {/* Topics */}
            <div>
              <label className="section-label" style={{ display: "block", marginBottom: "0.6rem" }}>Topics</label>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.65rem" }}>
                <input
                  ref={topicRef}
                  className="config-input"
                  style={{ flex: 1 }}
                  placeholder="e.g. AI, n8n, crypto…"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTopic(); } }}
                />
                <button onClick={addTopic} style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", borderRadius: 10, padding: "0 1rem", cursor: "pointer", fontSize: "1.1rem", transition: "background 0.2s" }}>+</button>
              </div>
              {topics.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {topics.map((t) => (
                    <span key={t} className="topic-chip">
                      {t}
                      <button onClick={() => removeTopic(t)}>✕</button>
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.2)" }}>Add at least one topic to continue.</p>
              )}
            </div>

            {/* Frequency */}
            <div>
              <label className="section-label" style={{ display: "block", marginBottom: "0.6rem" }}>Frequency</label>
              <div style={{ display: "flex", gap: "0.5rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "0.3rem" }}>
                <button className={`freq-btn${frequency === "daily" ? " selected" : ""}`} onClick={() => setFrequency("daily")}>📅 Daily</button>
                <button className={`freq-btn${frequency === "weekly" ? " selected" : ""}`} onClick={() => setFrequency("weekly")}>📆 Weekly</button>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="section-label" style={{ display: "block", marginBottom: "0.6rem" }}>Delivery Email</label>
              <input
                className="config-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {saveError && (
              <p style={{ fontSize: "0.78rem", color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "0.6rem 0.9rem" }}>{saveError}</p>
            )}

            <button className="save-btn" onClick={save} disabled={saving || !email.trim() || topics.length === 0}>
              {saving ? "Saving…" : "Save & Activate →"}
            </button>
          </div>

          {/* Info card */}
          <div style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)", borderRadius: 12, padding: "1rem 1.25rem" }}>
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
              Nexus fetches RSS feeds and news for your topics, generates a single AI summary, and emails it on your schedule.
            </p>
          </div>
        </div>

        {/* Right: latest digest preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="section-label">Latest Digest</span>
            {latest && (
              <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                Sent {new Date(latest.sent_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                {latest.item_count ? ` · ${latest.item_count} items` : ""}
              </span>
            )}
          </div>

          <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {loadingDigest && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)", fontSize: "0.85rem" }}>Loading…</div>
            )}
            {!loadingDigest && !latest && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem", opacity: 0.4 }}>
                <div style={{ fontSize: "3rem" }}>📭</div>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.6 }}>No digest sent yet.<br />Configure topics above to get started.</p>
              </div>
            )}
            {!loadingDigest && latest && (
              <div
                style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(latest.content) }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
