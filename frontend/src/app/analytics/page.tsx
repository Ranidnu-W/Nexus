"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getAnalyticsSummary } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/chat", label: "Chat" },
  { href: "/docmentor", label: "DocMentor" },
  { href: "/review", label: "Reviews" },
  { href: "/digest", label: "Digests" },
  { href: "/files", label: "Files" },
  { href: "/status", label: "Status" },
  { href: "/analytics", label: "Analytics" },
];

type AgentStats = {
  total: number;
  avg_response_ms: number;
  error_count: number;
};

type TimeSeriesPoint = {
  date: string;
  count: number;
};

type AnalyticsData = {
  total_interactions?: number;
  avg_response_ms?: number;
  error_rate?: number;
  by_agent?: Record<string, AgentStats | number>;
  recent_activity?: TimeSeriesPoint[];
  top_queries?: { query: string; count: number }[];
  total_documents?: number;
  total_chunks?: number;
};

const AGENT_META: Record<string, { label: string; icon: string; color: string }> = {
  general: { label: "Nexus Chat", icon: "💬", color: "#f5c842" },
  docmentor: { label: "DocMentor", icon: "📚", color: "#6366f1" },
  review: { label: "Review Analyst", icon: "⭐", color: "#f59e0b" },
  digest: { label: "Digest Agent", icon: "📰", color: "#10b981" },
  file: { label: "File Intake", icon: "📁", color: "#3b82f6" },
  orchestrator: { label: "Orchestrator", icon: "⚡", color: "#a78bfa" },
};

function getAgentMeta(key: string) {
  return AGENT_META[key] ?? { label: key, icon: "🤖", color: "#94a3b8" };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("7d");

  useEffect(() => {
    setLoading(true);
    getAnalyticsSummary(timeRange)
      .then((d) => { setData(d as AnalyticsData); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [timeRange]);

  // Process agent data for the bar chart
  const agentEntries = useMemo(() => {
    if (!data?.by_agent) return [];
    return Object.entries(data.by_agent).map(([key, val]) => {
      const stats: AgentStats = typeof val === "number"
        ? { total: val, avg_response_ms: 0, error_count: 0 }
        : val;
      return { key, ...getAgentMeta(key), ...stats };
    }).sort((a, b) => b.total - a.total);
  }, [data]);

  const maxAgentTotal = Math.max(1, ...agentEntries.map((a) => a.total));

  // Simple sparkline from recent_activity
  const activityPoints = data?.recent_activity ?? [];
  const maxActivity = Math.max(1, ...activityPoints.map((p) => p.count));

  const errorPct = data?.error_rate != null ? (data.error_rate * 100).toFixed(1) : null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0a0a0f", color: "#fff", fontFamily: "var(--font-space-grotesk), sans-serif" }}>
      <style>{`
        .nav-link { color: rgba(255,255,255,0.45); font-size: 0.8rem; letter-spacing: 0.08em; text-decoration: none; padding: 0.4rem 0.9rem; border-radius: 999px; transition: all 0.2s; }
        .nav-link:hover { color: #fff; background: rgba(255,255,255,0.07); }
        .nav-link.active { color: #f5c842; background: rgba(245,200,66,0.1); }
        .section-label { font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.3); font-family: var(--font-jetbrains-mono), monospace; }
        .glass-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 1.5rem; transition: border-color 0.2s; }
        .glass-card:hover { border-color: rgba(255,255,255,0.14); }
        .stat-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 1.5rem; transition: all 0.3s; position: relative; overflow: hidden; }
        .stat-card:hover { border-color: rgba(255,255,255,0.16); transform: translateY(-1px); }
        .time-btn { background: transparent; border: 1px solid transparent; color: rgba(255,255,255,0.35); font-size: 0.72rem; font-family: var(--font-jetbrains-mono), monospace; padding: 0.3rem 0.7rem; border-radius: 6px; cursor: pointer; transition: all 0.2s; letter-spacing: 0.08em; }
        .time-btn.active { background: rgba(245,200,66,0.1); border-color: rgba(245,200,66,0.25); color: #f5c842; }
        .time-btn:hover:not(.active) { color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.04); }
        .bar-row { display: grid; grid-template-columns: 120px 1fr 60px; gap: 1rem; align-items: center; padding: 0.6rem 0; }
        .bar-track { height: 28px; border-radius: 6px; background: rgba(255,255,255,0.04); overflow: hidden; position: relative; }
        .bar-fill { height: 100%; border-radius: 6px; transition: width 0.8s ease; display: flex; align-items: center; padding-left: 0.65rem; }
        .query-row { display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; transition: border-color 0.2s; }
        .query-row:hover { border-color: rgba(255,255,255,0.12); }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%); background-size: 400px 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fadeSlideIn 0.4s ease-out both; }
        .ring-track { fill: none; stroke: rgba(255,255,255,0.06); }
        .ring-fill { fill: none; stroke-linecap: round; transition: stroke-dashoffset 1s ease; }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "1.1rem 2.5rem", display: "flex", alignItems: "center", gap: "1.5rem", flexShrink: 0 }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.22em", color: "#f5c842", marginRight: "1rem", textDecoration: "none", textTransform: "uppercase", flexShrink: 0 }}>Nexus</Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.15rem", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "999px", padding: "0.35rem 0.5rem" }}>
          {NAV.map((l) => <Link key={l.href} href={l.href} className={`nav-link${l.href === "/analytics" ? " active" : ""}`}>{l.label}</Link>)}
        </div>
      </nav>

      <main style={{ flex: 1, padding: "2rem 2.5rem", maxWidth: 1100, margin: "0 auto", width: "100%" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #f5c842, #d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>📊</div>
            <div>
              <span className="section-label">Insights</span>
              <h1 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: "0.15rem" }}>Analytics</h1>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.25rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "0.2rem" }}>
            {(["7d", "30d", "all"] as const).map((t) => (
              <button key={t} className={`time-btn${timeRange === t ? " active" : ""}`} onClick={() => setTimeRange(t)}>
                {t === "all" ? "All" : t}
              </button>
            ))}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="glass-card animate-in" style={{ marginBottom: "1.5rem", borderColor: "rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.04)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.2rem" }}>⚠️</span>
            <div>
              <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#f87171" }}>Unable to load analytics</p>
              <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", marginTop: "0.2rem" }}>{error}</p>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
              {[1,2,3,4].map((i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 14 }} />)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div className="skeleton" style={{ height: 300, borderRadius: 14 }} />
              <div className="skeleton" style={{ height: 300, borderRadius: 14 }} />
            </div>
          </div>
        )}

        {/* Data loaded */}
        {!loading && data && (
          <>
            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
              {/* Total interactions */}
              <div className="stat-card animate-in">
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "#f5c842", opacity: 0.5 }} />
                <p className="section-label" style={{ marginBottom: "0.6rem" }}>Total Interactions</p>
                <p style={{ fontSize: "2.2rem", fontWeight: 700, color: "#f5c842", lineHeight: 1 }}>
                  {data.total_interactions?.toLocaleString() ?? "0"}
                </p>
                <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", marginTop: "0.5rem" }}>all time</p>
              </div>

              {/* Avg response */}
              <div className="stat-card animate-in" style={{ animationDelay: "0.05s" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "#6366f1", opacity: 0.5 }} />
                <p className="section-label" style={{ marginBottom: "0.6rem" }}>Avg Response</p>
                <p style={{ fontSize: "2.2rem", fontWeight: 700, color: "#6366f1", lineHeight: 1 }}>
                  {data.avg_response_ms ? `${data.avg_response_ms.toLocaleString()}` : "---"}
                </p>
                <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", marginTop: "0.5rem" }}>
                  {data.avg_response_ms ? "milliseconds" : "no data"}
                </p>
              </div>

              {/* Error rate with ring */}
              <div className="stat-card animate-in" style={{ animationDelay: "0.1s" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: errorPct && parseFloat(errorPct) > 5 ? "#f87171" : "#4ade80", opacity: 0.5 }} />
                <p className="section-label" style={{ marginBottom: "0.6rem" }}>Error Rate</p>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <p style={{ fontSize: "2.2rem", fontWeight: 700, color: errorPct && parseFloat(errorPct) > 5 ? "#f87171" : "#4ade80", lineHeight: 1 }}>
                    {errorPct ? `${errorPct}%` : "0%"}
                  </p>
                  {/* Mini ring chart */}
                  <svg width="44" height="44" viewBox="0 0 44 44" style={{ flexShrink: 0 }}>
                    <circle className="ring-track" cx="22" cy="22" r="18" strokeWidth="4" />
                    <circle
                      className="ring-fill"
                      cx="22" cy="22" r="18"
                      strokeWidth="4"
                      stroke={errorPct && parseFloat(errorPct) > 5 ? "#f87171" : "#4ade80"}
                      strokeDasharray={`${2 * Math.PI * 18}`}
                      strokeDashoffset={`${2 * Math.PI * 18 * (1 - (data.error_rate ?? 0))}`}
                      transform="rotate(-90 22 22)"
                    />
                  </svg>
                </div>
                <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", marginTop: "0.5rem" }}>
                  {errorPct && parseFloat(errorPct) > 5 ? "needs attention" : "healthy"}
                </p>
              </div>

              {/* Documents */}
              <div className="stat-card animate-in" style={{ animationDelay: "0.15s" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "#3b82f6", opacity: 0.5 }} />
                <p className="section-label" style={{ marginBottom: "0.6rem" }}>Documents</p>
                <p style={{ fontSize: "2.2rem", fontWeight: 700, color: "#3b82f6", lineHeight: 1 }}>
                  {data.total_documents?.toLocaleString() ?? "0"}
                </p>
                <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", marginTop: "0.5rem" }}>
                  {data.total_chunks ? `${data.total_chunks.toLocaleString()} chunks indexed` : "indexed"}
                </p>
              </div>
            </div>

            {/* Middle row: agent breakdown + activity chart */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.75rem" }}>

              {/* Agent breakdown */}
              <div className="glass-card animate-in" style={{ animationDelay: "0.2s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                  <span className="section-label">Usage by Agent</span>
                  <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                    {agentEntries.length} agents
                  </span>
                </div>

                {agentEntries.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
                    <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📭</p>
                    <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.3)" }}>No agent data yet</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {agentEntries.map((agent) => (
                      <div key={agent.key} className="bar-row">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.9rem" }}>{agent.icon}</span>
                          <span style={{ fontSize: "0.78rem", fontWeight: 500, color: "rgba(255,255,255,0.8)" }}>{agent.label}</span>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${(agent.total / maxAgentTotal) * 100}%`, background: `${agent.color}25` }}>
                            <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-jetbrains-mono), monospace", color: agent.color, fontWeight: 600 }}>
                              {agent.total > 0 ? agent.total : ""}
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-jetbrains-mono), monospace", color: "rgba(255,255,255,0.35)", textAlign: "right" }}>
                          {agent.avg_response_ms ? `${agent.avg_response_ms}ms` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Activity chart (simple bar chart) */}
              <div className="glass-card animate-in" style={{ animationDelay: "0.25s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                  <span className="section-label">Activity</span>
                  <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                    interactions / day
                  </span>
                </div>

                {activityPoints.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
                    <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📈</p>
                    <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.3)" }}>Activity data will appear here</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    {/* Bar chart */}
                    <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "3px", minHeight: 160, paddingBottom: "0.5rem" }}>
                      {activityPoints.map((pt, i) => {
                        const h = (pt.count / maxActivity) * 100;
                        return (
                          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", position: "relative" }} title={`${pt.date}: ${pt.count}`}>
                            <div style={{
                              width: "100%",
                              height: `${Math.max(h, 2)}%`,
                              background: `linear-gradient(to top, rgba(245,200,66,0.3), rgba(245,200,66,0.08))`,
                              borderRadius: "3px 3px 0 0",
                              transition: "height 0.5s ease",
                              border: "1px solid rgba(245,200,66,0.15)",
                              borderBottom: "none",
                            }} />
                          </div>
                        );
                      })}
                    </div>
                    {/* X axis labels */}
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.5rem" }}>
                      {activityPoints.length > 0 && (
                        <>
                          <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                            {activityPoints[0].date}
                          </span>
                          <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                            {activityPoints[activityPoints.length - 1].date}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom: top queries + agent performance table */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>

              {/* Top queries */}
              <div className="glass-card animate-in" style={{ animationDelay: "0.3s" }}>
                <span className="section-label" style={{ display: "block", marginBottom: "1rem" }}>Top Queries</span>
                {(!data.top_queries || data.top_queries.length === 0) ? (
                  <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                    <p style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>🔍</p>
                    <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.25)" }}>No query data yet</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {data.top_queries.slice(0, 8).map((q, i) => (
                      <div key={i} className="query-row">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
                          <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-jetbrains-mono), monospace", color: "rgba(255,255,255,0.2)", width: 18, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.query}</span>
                        </div>
                        <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-jetbrains-mono), monospace", color: "#f5c842", flexShrink: 0, marginLeft: "0.75rem" }}>{q.count}x</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Agent performance table */}
              <div className="glass-card animate-in" style={{ animationDelay: "0.35s" }}>
                <span className="section-label" style={{ display: "block", marginBottom: "1rem" }}>Agent Performance</span>
                {agentEntries.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                    <p style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>🤖</p>
                    <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.25)" }}>No performance data yet</p>
                  </div>
                ) : (
                  <div>
                    {/* Table header */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 80px 60px", gap: "0.5rem", paddingBottom: "0.65rem", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "0.5rem" }}>
                      {["Agent", "Calls", "Avg (ms)", "Errors"].map((h) => (
                        <span key={h} style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</span>
                      ))}
                    </div>
                    {/* Rows */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      {agentEntries.map((agent) => (
                        <div key={agent.key} style={{ display: "grid", gridTemplateColumns: "1fr 70px 80px 60px", gap: "0.5rem", alignItems: "center", padding: "0.5rem 0" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.85rem" }}>{agent.icon}</span>
                            <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)" }}>{agent.label}</span>
                          </div>
                          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-jetbrains-mono), monospace", color: "rgba(255,255,255,0.6)" }}>{agent.total}</span>
                          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-jetbrains-mono), monospace", color: agent.avg_response_ms > 3000 ? "#f87171" : agent.avg_response_ms > 1000 ? "#fbbf24" : "#4ade80" }}>
                            {agent.avg_response_ms || "---"}
                          </span>
                          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-jetbrains-mono), monospace", color: agent.error_count > 0 ? "#f87171" : "rgba(255,255,255,0.3)" }}>
                            {agent.error_count || "0"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Empty state when no data and no error */}
        {!loading && !data && !error && (
          <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem", opacity: 0.4 }}>📊</div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem" }}>No Analytics Data</h2>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>
              Start using your agents and data will appear here.<br />
              Analytics are collected automatically from all interactions.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
