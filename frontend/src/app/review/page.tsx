"use client";

import { useState } from "react";
import Link from "next/link";
import { analyzeReview } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/docmentor", label: "DocMentor" },
  { href: "/review", label: "Reviews" },
  { href: "/digest", label: "Digests" },
  { href: "/files", label: "Files" },
  { href: "/status", label: "Status" },
  { href: "/analytics", label: "Analytics" },
];

type ReviewType = "restaurant" | "product" | "service";

type AnalysisResult = {
  sentiment: "positive" | "negative" | "mixed";
  sentiment_score: number;
  key_themes: string[];
  pros: string[];
  cons: string[];
  predicted_rating: number;
  summary: string;
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#4ade80",
  negative: "#f87171",
  mixed: "#f59e0b",
};

const TYPE_ICONS: Record<ReviewType, string> = {
  restaurant: "🍽️",
  product: "📦",
  service: "🛠️",
};

export default function ReviewPage() {
  const [text, setText] = useState("");
  const [reviewType, setReviewType] = useState<ReviewType>("restaurant");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await analyzeReview(text.trim(), reviewType) as AnalysisResult;
      setResult(data);
    } catch {
      setError("n8n is offline or the workflow isn't active yet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0a0a0f", color: "#fff", fontFamily: "var(--font-space-grotesk), sans-serif" }}>
      <style>{`
        .nav-link { color: rgba(255,255,255,0.45); font-size: 0.8rem; letter-spacing: 0.08em; text-decoration: none; padding: 0.4rem 0.9rem; border-radius: 999px; transition: all 0.2s; }
        .nav-link:hover { color: #fff; background: rgba(255,255,255,0.07); }
        .nav-link.active { color: #f5c842; background: rgba(245,200,66,0.1); }
        .section-label { font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.3); font-family: var(--font-jetbrains-mono), monospace; }
        .type-btn { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); color: rgba(255,255,255,0.5); font-size: 0.8rem; font-family: var(--font-space-grotesk), sans-serif; padding: 0.5rem 1.1rem; border-radius: 999px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.4rem; }
        .type-btn.selected { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.4); color: #f59e0b; }
        .type-btn:hover:not(.selected) { background: rgba(255,255,255,0.07); color: #fff; }
        .analyze-btn { width: 100%; padding: 0.85rem; background: #f59e0b; color: #000; font-weight: 600; font-size: 0.9rem; border: none; border-radius: 10px; cursor: pointer; font-family: var(--font-space-grotesk), sans-serif; transition: background 0.2s; letter-spacing: 0.04em; }
        .analyze-btn:hover:not(:disabled) { background: #d97706; }
        .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .review-textarea { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 12px; color: #fff; padding: 1rem; font-size: 0.9rem; font-family: var(--font-space-grotesk), sans-serif; resize: none; outline: none; line-height: 1.7; }
        .review-textarea:focus { border-color: rgba(245,158,11,0.4); }
        .review-textarea::placeholder { color: rgba(255,255,255,0.2); }
        .theme-chip { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.25); color: #f59e0b; font-size: 0.72rem; padding: 0.25rem 0.7rem; border-radius: 999px; font-family: var(--font-jetbrains-mono), monospace; letter-spacing: 0.08em; }
        .result-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 1.5rem; }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%); background-size: 400px 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "1.1rem 2.5rem", display: "flex", alignItems: "center", gap: "1.5rem", flexShrink: 0 }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.22em", color: "#f5c842", marginRight: "1rem", textDecoration: "none", textTransform: "uppercase", flexShrink: 0 }}>Nexus</Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.15rem", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "999px", padding: "0.35rem 0.5rem" }}>
          {NAV.map((l) => <Link key={l.href} href={l.href} className={`nav-link${l.href === "/review" ? " active" : ""}`}>{l.label}</Link>)}
        </div>
      </nav>

      {/* Page header */}
      <div style={{ padding: "2rem 2.5rem 0", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #f59e0b, #d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>⭐</div>
        <div>
          <span className="section-label">Analysis Workspace</span>
          <h1 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: "0.15rem" }}>Review Analyst Agent</h1>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", padding: "1.5rem 2.5rem 2.5rem" }}>

        {/* Left: input */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {(["restaurant", "product", "service"] as ReviewType[]).map((t) => (
              <button key={t} className={`type-btn${reviewType === t ? " selected" : ""}`} onClick={() => setReviewType(t)}>
                <span>{TYPE_ICONS[t]}</span>
                <span style={{ textTransform: "capitalize" }}>{t}</span>
              </button>
            ))}
          </div>

          <textarea
            className="review-textarea"
            rows={14}
            placeholder={`Paste a ${reviewType} review here…\n\nBest pizza I've ever had! The crust was perfectly thin and crispy, toppings were fresh…`}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>{text.length} chars</span>
            <button className="analyze-btn" style={{ width: "auto", padding: "0.7rem 2rem" }} onClick={analyze} disabled={loading || !text.trim()}>
              {loading ? "Analyzing…" : "Analyze →"}
            </button>
          </div>
        </div>

        {/* Right: results */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {!result && !loading && !error && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 14, padding: "3rem" }}>
              <div style={{ fontSize: "3rem", opacity: 0.4 }}>📊</div>
              <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 1.6 }}>Paste a review on the left<br />and hit Analyze</p>
            </div>
          )}

          {error && (
            <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 14, padding: "1.5rem", color: "#f87171", fontSize: "0.85rem" }}>
              {error}
            </div>
          )}

          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[80, 40, 60, 100, 55].map((w, i) => (
                <div key={i} className="skeleton" style={{ height: i === 0 ? 48 : 20, width: `${w}%` }} />
              ))}
            </div>
          )}

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto" }}>
              {/* Sentiment + Score */}
              <div className="result-card" style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <div>
                  <span className="section-label">Sentiment</span>
                  <div style={{ marginTop: "0.4rem", fontSize: "1.2rem", fontWeight: 700, color: SENTIMENT_COLORS[result.sentiment] ?? "#fff", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {result.sentiment}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <span className="section-label">Confidence</span>
                  <div style={{ marginTop: "0.5rem", height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${result.sentiment_score * 100}%`, background: SENTIMENT_COLORS[result.sentiment] ?? "#f59e0b", borderRadius: 999, transition: "width 0.6s ease" }} />
                  </div>
                  <div style={{ marginTop: "0.3rem", fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>{(result.sentiment_score * 100).toFixed(0)}%</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <span className="section-label">Rating</span>
                  <div style={{ marginTop: "0.4rem", fontSize: "1.1rem", letterSpacing: "0.05em" }}>
                    {"★".repeat(result.predicted_rating)}{"☆".repeat(5 - result.predicted_rating)}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>{result.predicted_rating}/5</div>
                </div>
              </div>

              {/* Summary */}
              <div className="result-card">
                <span className="section-label">Summary</span>
                <p style={{ marginTop: "0.6rem", fontSize: "0.9rem", lineHeight: 1.7, color: "rgba(255,255,255,0.8)" }}>{result.summary}</p>
              </div>

              {/* Themes */}
              {result.key_themes.length > 0 && (
                <div className="result-card">
                  <span className="section-label">Key Themes</span>
                  <div style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {result.key_themes.map((t) => <span key={t} className="theme-chip">{t}</span>)}
                  </div>
                </div>
              )}

              {/* Pros / Cons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="result-card">
                  <span className="section-label" style={{ color: "#4ade80" }}>Pros</span>
                  <ul style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem", paddingLeft: 0, listStyle: "none" }}>
                    {result.pros.map((p) => (
                      <li key={p} style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", display: "flex", gap: "0.5rem", lineHeight: 1.5 }}>
                        <span style={{ color: "#4ade80", flexShrink: 0 }}>✓</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="result-card">
                  <span className="section-label" style={{ color: "#f87171" }}>Cons</span>
                  <ul style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem", paddingLeft: 0, listStyle: "none" }}>
                    {result.cons.map((c) => (
                      <li key={c} style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", display: "flex", gap: "0.5rem", lineHeight: 1.5 }}>
                        <span style={{ color: "#f87171", flexShrink: 0 }}>✗</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
