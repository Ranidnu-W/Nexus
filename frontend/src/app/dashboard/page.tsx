"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHealthStatus, getAnalyticsSummary } from "@/lib/api";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/docmentor", label: "DocMentor" },
  { href: "/review", label: "Reviews" },
  { href: "/digest", label: "Digests" },
  { href: "/files", label: "Files" },
  { href: "/status", label: "Status" },
  { href: "/analytics", label: "Analytics" },
];

const agents = [
  {
    label: "DocMentor",
    desc: "Chat with your documents using RAG",
    href: "/docmentor",
    icon: "📄",
    color: "#6366f1",
  },
  {
    label: "Review Analyst",
    desc: "Extract sentiment & insights from reviews",
    href: "/review",
    icon: "⭐",
    color: "#f59e0b",
  },
  {
    label: "Digest Agent",
    desc: "Scheduled topic digests to your inbox",
    href: "/digest",
    icon: "📰",
    color: "#10b981",
  },
  {
    label: "File Intake",
    desc: "Upload & index documents for agents",
    href: "/files",
    icon: "📁",
    color: "#3b82f6",
  },
];

const services = [
  { key: "ollama", label: "Ollama", sub: "LLM Inference" },
  { key: "qdrant", label: "Qdrant", sub: "Vector Store" },
  { key: "docling", label: "Docling", sub: "Doc Parser" },
  { key: "n8n", label: "n8n", sub: "Orchestration" },
];

type HealthData = {
  all_healthy: boolean;
  ollama?: { status: string; response_ms: number };
  qdrant?: { status: string; response_ms: number };
  docling?: { status: string; response_ms: number };
  n8n?: { status: string; response_ms: number };
};

type AnalyticsData = {
  total_interactions?: number;
  avg_response_ms?: number;
  error_rate?: number;
  by_agent?: Record<string, number>;
};

export default function Dashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      getHealthStatus().then((d) => setHealth(d as HealthData)),
      getAnalyticsSummary().then((d) => setAnalytics(d as AnalyticsData)),
    ]).then((results) => {
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length === results.length) {
        setError("Unable to reach n8n — is the workflow running?");
      } else if (failed.length > 0) {
        setError("Some data failed to load.");
      }
      setLoading(false);
    });
  }, []);

  const statsCards = [
    {
      label: "Total Interactions",
      value: analytics?.total_interactions ?? "—",
      sub: "all time",
      color: "#f5c842",
    },
    {
      label: "Avg Response",
      value: analytics?.avg_response_ms ? `${analytics.avg_response_ms}ms` : "—",
      sub: "last period",
      color: "#6366f1",
    },
    {
      label: "Error Rate",
      value: analytics?.error_rate != null ? `${(analytics.error_rate * 100).toFixed(1)}%` : "—",
      sub: "last period",
      color: "#10b981",
    },
    {
      label: "Services Up",
      value: health
        ? `${Object.values(health).filter((v) => typeof v === "object" && v !== null && (v as { status: string }).status === "up").length}/4`
        : "—",
      sub: health?.all_healthy ? "all healthy" : "checking…",
      color: health?.all_healthy ? "#4ade80" : "#f87171",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", display: "flex", flexDirection: "column", fontFamily: "var(--font-space-grotesk), sans-serif" }}>
      <style>{`
        .nav-link { color: rgba(255,255,255,0.45); font-size: 0.8rem; letter-spacing: 0.08em; text-decoration: none; padding: 0.4rem 0.9rem; border-radius: 999px; transition: all 0.2s; }
        .nav-link:hover { color: #fff; background: rgba(255,255,255,0.07); }
        .nav-link.active { color: #f5c842; background: rgba(245,200,66,0.1); }
        .stat-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 1.5rem; transition: border-color 0.2s; }
        .stat-card:hover { border-color: rgba(255,255,255,0.14); }
        .agent-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 1.5rem; text-decoration: none; color: #fff; display: flex; flex-direction: column; gap: 0.5rem; transition: all 0.2s; cursor: pointer; }
        .agent-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.16); transform: translateY(-2px); }
        .service-row { display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; }
        .badge-up { background: rgba(74,222,128,0.12); color: #4ade80; font-size: 0.7rem; font-family: var(--font-jetbrains-mono), monospace; letter-spacing: 0.12em; padding: 0.2rem 0.6rem; border-radius: 20px; border: 1px solid rgba(74,222,128,0.25); }
        .badge-down { background: rgba(248,113,113,0.12); color: #f87171; font-size: 0.7rem; font-family: var(--font-jetbrains-mono), monospace; letter-spacing: 0.12em; padding: 0.2rem 0.6rem; border-radius: 20px; border: 1px solid rgba(248,113,113,0.25); }
        .badge-unknown { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.3); font-size: 0.7rem; font-family: var(--font-jetbrains-mono), monospace; letter-spacing: 0.12em; padding: 0.2rem 0.6rem; border-radius: 20px; }
        .section-label { font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 1rem; font-family: var(--font-jetbrains-mono), monospace; }
        .pulse-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; animation: pulseDot 2s ease-in-out infinite; }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "1.1rem 2.5rem", display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.22em", color: "#f5c842", marginRight: "1rem", textDecoration: "none", textTransform: "uppercase", flexShrink: 0 }}>
          Nexus
        </Link>
        {/* Glass pill */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.15rem",
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: "999px",
          padding: "0.35rem 0.5rem",
        }}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`nav-link${link.href === "/dashboard" ? " active" : ""}`}
              style={{ borderRadius: "999px" }}>
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Main */}
      <main style={{ flex: 1, padding: "2.5rem 2rem", maxWidth: "1100px", margin: "0 auto", width: "100%" }}>

        {/* Header */}
        <div style={{ marginBottom: "2.5rem", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <p className="section-label" style={{ marginBottom: "0.3rem" }}>Overview</p>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.01em" }}>Dashboard</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
            <span className="pulse-dot" style={{ background: health?.all_healthy ? "#4ade80" : "#f87171" }} />
            {health?.all_healthy ? "All systems operational" : "Checking services…"}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ marginBottom: "1.5rem", padding: "0.85rem 1.25rem", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 12, display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.1rem" }}>⚠️</span>
            <p style={{ fontSize: "0.82rem", color: "#f87171" }}>{error}</p>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2.5rem", opacity: loading ? 0.5 : 1, transition: "opacity 0.3s" }}>
          {statsCards.map((card) => (
            <div key={card.label} className="stat-card">
              <p style={{ fontSize: "0.72rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-jetbrains-mono), monospace", marginBottom: "0.6rem" }}>
                {card.label}
              </p>
              <p style={{ fontSize: "2rem", fontWeight: 700, color: card.color, lineHeight: 1 }}>
                {card.value}
              </p>
              <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", marginTop: "0.4rem" }}>{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Bottom grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem" }}>

          {/* Agents */}
          <div>
            <p className="section-label">Agents</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {agents.map((agent) => (
                <Link key={agent.label} href={agent.href} className="agent-card">
                  <span style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{agent.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{agent.label}</span>
                  <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>{agent.desc}</span>
                  <span style={{ marginTop: "0.75rem", fontSize: "0.72rem", color: agent.color, fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: "0.1em" }}>
                    Open →
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Service health */}
          <div>
            <p className="section-label">Service Health</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {services.map((svc) => {
                const raw = health?.[svc.key as keyof HealthData];
                const data = (typeof raw === "object" && raw !== null && "status" in raw) ? raw as { status: string; response_ms: number } : undefined;
                return (
                  <div key={svc.key} className="service-row">
                    <div>
                      <p style={{ fontSize: "0.85rem", fontWeight: 500 }}>{svc.label}</p>
                      <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>{svc.sub}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      {data ? (
                        <>
                          {data.status === "up" && (
                            <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>{data.response_ms}ms</span>
                          )}
                          <span className={data.status === "up" ? "badge-up" : "badge-down"}>
                            {data.status.toUpperCase()}
                          </span>
                        </>
                      ) : (
                        <span className="badge-unknown">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <Link href="/status" style={{ display: "block", marginTop: "1rem", textAlign: "center", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-jetbrains-mono), monospace", textDecoration: "none", letterSpacing: "0.1em" }}>
              View full status →
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
