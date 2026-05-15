"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getHealthStatus } from "@/lib/api";

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

interface ServiceHealth {
  status: "up" | "down";
  response_ms: number;
}

interface HealthData {
  ollama: ServiceHealth;
  qdrant: ServiceHealth;
  docling: ServiceHealth;
  n8n: ServiceHealth;
  all_healthy: boolean;
}

type HistoryEntry = {
  time: Date;
  services: Record<string, "up" | "down">;
};

const SERVICES: { key: keyof Omit<HealthData, "all_healthy">; label: string; sub: string; icon: string; color: string }[] = [
  { key: "ollama", label: "Ollama", sub: "LLM Inference", icon: "🧠", color: "#a78bfa" },
  { key: "qdrant", label: "Qdrant", sub: "Vector Store", icon: "🔷", color: "#60a5fa" },
  { key: "docling", label: "Docling", sub: "Doc Parser", icon: "📑", color: "#f59e0b" },
  { key: "n8n", label: "n8n", sub: "Orchestration", icon: "⚡", color: "#10b981" },
];

const POLL_INTERVAL = 15_000;
const MAX_HISTORY = 20;

export default function StatusPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [checking, setChecking] = useState(false);

  const fetchHealth = useCallback(async () => {
    setChecking(true);
    try {
      const data = (await getHealthStatus()) as HealthData;
      setHealth(data);
      setError(null);
      setLastChecked(new Date());
      setHistory((prev) => {
        const entry: HistoryEntry = {
          time: new Date(),
          services: Object.fromEntries(
            SERVICES.map((s) => [s.key, data[s.key]?.status ?? "down"])
          ),
        };
        return [entry, ...prev].slice(0, MAX_HISTORY);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch health");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const upCount = health
    ? SERVICES.filter((s) => health[s.key]?.status === "up").length
    : 0;
  const totalServices = SERVICES.length;
  const uptimePct = health ? Math.round((upCount / totalServices) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0a0a0f", color: "#fff", fontFamily: "var(--font-space-grotesk), sans-serif" }}>
      <style>{`
        .nav-link { color: rgba(255,255,255,0.45); font-size: 0.8rem; letter-spacing: 0.08em; text-decoration: none; padding: 0.4rem 0.9rem; border-radius: 999px; transition: all 0.2s; }
        .nav-link:hover { color: #fff; background: rgba(255,255,255,0.07); }
        .nav-link.active { color: #f5c842; background: rgba(245,200,66,0.1); }
        .section-label { font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.3); font-family: var(--font-jetbrains-mono), monospace; }
        .glass-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 1.5rem; transition: border-color 0.2s; }
        .glass-card:hover { border-color: rgba(255,255,255,0.14); }
        .service-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 1.5rem; transition: all 0.3s ease; position: relative; overflow: hidden; }
        .service-card:hover { border-color: rgba(255,255,255,0.16); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
        .service-card.up { border-color: rgba(74,222,128,0.15); }
        .service-card.down { border-color: rgba(248,113,113,0.25); background: rgba(248,113,113,0.03); }
        .badge-up { background: rgba(74,222,128,0.12); color: #4ade80; font-size: 0.68rem; font-family: var(--font-jetbrains-mono), monospace; letter-spacing: 0.12em; padding: 0.25rem 0.7rem; border-radius: 20px; border: 1px solid rgba(74,222,128,0.25); }
        .badge-down { background: rgba(248,113,113,0.12); color: #f87171; font-size: 0.68rem; font-family: var(--font-jetbrains-mono), monospace; letter-spacing: 0.12em; padding: 0.25rem 0.7rem; border-radius: 20px; border: 1px solid rgba(248,113,113,0.25); }
        .badge-unknown { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.3); font-size: 0.68rem; font-family: var(--font-jetbrains-mono), monospace; letter-spacing: 0.12em; padding: 0.25rem 0.7rem; border-radius: 20px; }
        .pulse-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .pulse-dot.live { animation: pulseDot 2s ease-in-out infinite; }
        @keyframes pulseDot { 0%, 100% { opacity: 1; box-shadow: 0 0 4px currentColor; } 50% { opacity: 0.4; box-shadow: 0 0 12px currentColor; } }
        .refresh-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); font-size: 0.75rem; font-family: var(--font-jetbrains-mono), monospace; padding: 0.4rem 0.9rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.4rem; }
        .refresh-btn:hover { background: rgba(255,255,255,0.08); color: #fff; border-color: rgba(255,255,255,0.2); }
        .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinning { animation: spin 1s linear infinite; display: inline-block; }
        .latency-bar { height: 4px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden; margin-top: 0.75rem; }
        .latency-fill { height: 100%; border-radius: 999px; transition: width 0.6s ease; }
        .timeline-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; transition: all 0.2s; }
        .stat-value { font-size: 2rem; font-weight: 700; line-height: 1; }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fadeSlideIn 0.4s ease-out both; }
        .animate-in-1 { animation-delay: 0.05s; }
        .animate-in-2 { animation-delay: 0.1s; }
        .animate-in-3 { animation-delay: 0.15s; }
        .animate-in-4 { animation-delay: 0.2s; }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "1.1rem 2.5rem", display: "flex", alignItems: "center", gap: "1.5rem", flexShrink: 0 }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.22em", color: "#f5c842", marginRight: "1rem", textDecoration: "none", textTransform: "uppercase", flexShrink: 0 }}>Nexus</Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.15rem", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "999px", padding: "0.35rem 0.5rem" }}>
          {NAV.map((l) => <Link key={l.href} href={l.href} className={`nav-link${l.href === "/status" ? " active" : ""}`}>{l.label}</Link>)}
        </div>
      </nav>

      <main style={{ flex: 1, padding: "2rem 2.5rem", maxWidth: 1100, margin: "0 auto", width: "100%" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #22c55e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>
              {health?.all_healthy ? "🟢" : error ? "🔴" : "⏳"}
            </div>
            <div>
              <span className="section-label">Infrastructure</span>
              <h1 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: "0.15rem" }}>System Status</h1>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {lastChecked && (
              <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                Last checked {lastChecked.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
            <button className="refresh-btn" onClick={fetchHealth} disabled={checking}>
              <span className={checking ? "spinning" : ""}>↻</span>
              {checking ? "Checking" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Overall status banner */}
        <div className="glass-card animate-in" style={{
          marginBottom: "1.75rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.25rem 1.75rem",
          borderColor: health?.all_healthy ? "rgba(74,222,128,0.2)" : error ? "rgba(248,113,113,0.2)" : "rgba(255,255,255,0.07)",
          background: health?.all_healthy ? "rgba(74,222,128,0.04)" : error ? "rgba(248,113,113,0.04)" : "rgba(255,255,255,0.03)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span className="pulse-dot live" style={{ color: health?.all_healthy ? "#4ade80" : "#f87171", background: health?.all_healthy ? "#4ade80" : error ? "#f87171" : "rgba(255,255,255,0.3)" }} />
            <div>
              <p style={{ fontSize: "1rem", fontWeight: 600 }}>
                {error ? "Connection Error" : health?.all_healthy ? "All Systems Operational" : health ? "Service Degradation Detected" : "Checking Services..."}
              </p>
              {error && <p style={{ fontSize: "0.78rem", color: "#f87171", marginTop: "0.2rem" }}>{error}</p>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>Uptime</p>
              <p style={{ fontSize: "1.5rem", fontWeight: 700, color: health?.all_healthy ? "#4ade80" : "#f87171" }}>{health ? `${uptimePct}%` : "---"}</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>Services</p>
              <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                <span style={{ color: "#4ade80" }}>{upCount}</span>
                <span style={{ color: "rgba(255,255,255,0.2)" }}> / {totalServices}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Service cards grid */}
        <div style={{ marginBottom: "2rem" }}>
          <span className="section-label" style={{ display: "block", marginBottom: "1rem" }}>Services</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
            {SERVICES.map((svc, i) => {
              const data = health?.[svc.key];
              const isUp = data?.status === "up";
              const maxLatency = 500;
              const latencyPct = data ? Math.min((data.response_ms / maxLatency) * 100, 100) : 0;
              const latencyColor = data
                ? data.response_ms < 100 ? "#4ade80"
                : data.response_ms < 300 ? "#fbbf24"
                : "#f87171"
                : "rgba(255,255,255,0.1)";

              return (
                <div key={svc.key} className={`service-card animate-in animate-in-${i + 1} ${data ? (isUp ? "up" : "down") : ""}`}>
                  {/* Accent glow */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: isUp ? svc.color : data ? "#f87171" : "rgba(255,255,255,0.05)", opacity: 0.6 }} />

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${svc.color}15`, border: `1px solid ${svc.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>
                      {svc.icon}
                    </div>
                    {data ? (
                      <span className={isUp ? "badge-up" : "badge-down"}>{isUp ? "UP" : "DOWN"}</span>
                    ) : (
                      <span className="badge-unknown">---</span>
                    )}
                  </div>

                  <p style={{ fontSize: "0.95rem", fontWeight: 600 }}>{svc.label}</p>
                  <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-jetbrains-mono), monospace", marginTop: "0.15rem" }}>{svc.sub}</p>

                  {/* Latency */}
                  <div style={{ marginTop: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>Latency</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: data ? latencyColor : "rgba(255,255,255,0.2)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                        {data ? (isUp ? `${data.response_ms}ms` : "---") : "---"}
                      </span>
                    </div>
                    <div className="latency-bar">
                      <div className="latency-fill" style={{ width: `${latencyPct}%`, background: latencyColor }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom section: timeline + details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem" }}>

          {/* Check history timeline */}
          <div>
            <span className="section-label" style={{ display: "block", marginBottom: "1rem" }}>Recent Checks</span>
            <div className="glass-card" style={{ padding: "1.25rem" }}>
              {history.length === 0 ? (
                <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "2rem 0" }}>
                  No checks recorded yet
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  {/* Header row */}
                  <div style={{ display: "grid", gridTemplateColumns: "90px repeat(4, 1fr)", gap: "0.5rem", marginBottom: "0.75rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: "0.1em" }}>TIME</span>
                    {SERVICES.map((s) => (
                      <span key={s.key} style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: "0.1em", textAlign: "center" }}>
                        {s.label.toUpperCase()}
                      </span>
                    ))}
                  </div>
                  {/* Rows */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {history.map((entry, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "90px repeat(4, 1fr)", gap: "0.5rem", alignItems: "center", padding: "0.35rem 0", opacity: 1 - (idx * 0.03) }}>
                        <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                          {entry.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                        {SERVICES.map((s) => {
                          const st = entry.services[s.key];
                          return (
                            <div key={s.key} style={{ display: "flex", justifyContent: "center" }}>
                              <div
                                className="timeline-dot"
                                style={{
                                  background: st === "up" ? "#4ade80" : "#f87171",
                                  boxShadow: st === "up" ? "0 0 6px rgba(74,222,128,0.4)" : "0 0 6px rgba(248,113,113,0.4)",
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <span className="section-label" style={{ display: "block" }}>Details</span>

            {/* Config info */}
            <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <p style={{ fontSize: "0.82rem", fontWeight: 600 }}>Monitoring Config</p>
              {[
                { label: "Poll interval", value: `${POLL_INTERVAL / 1000}s` },
                { label: "History depth", value: `${MAX_HISTORY} checks` },
                { label: "Endpoint", value: "/webhook/health/status" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>{item.label}</span>
                  <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* Service endpoints */}
            <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <p style={{ fontSize: "0.82rem", fontWeight: 600 }}>Endpoints</p>
              {SERVICES.map((svc) => {
                const data = health?.[svc.key];
                const isUp = data?.status === "up";
                return (
                  <div key={svc.key} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span className="pulse-dot" style={{ width: 6, height: 6, background: data ? (isUp ? "#4ade80" : "#f87171") : "rgba(255,255,255,0.15)", flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>{svc.label}</span>
                    <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-jetbrains-mono), monospace", color: data ? (isUp ? "rgba(74,222,128,0.7)" : "rgba(248,113,113,0.7)") : "rgba(255,255,255,0.2)" }}>
                      {data ? (isUp ? `${data.response_ms}ms` : "TIMEOUT") : "---"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "1rem 1.25rem" }}>
              <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.7, fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                <span style={{ color: "#4ade80" }}>Green</span> = healthy &lt;100ms
                <br />
                <span style={{ color: "#fbbf24" }}>Yellow</span> = slow 100-300ms
                <br />
                <span style={{ color: "#f87171" }}>Red</span> = down or &gt;300ms
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
