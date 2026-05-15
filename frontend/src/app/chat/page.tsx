"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { sendMessage, getJobStatus } from "@/lib/api";

type IntervalId = ReturnType<typeof setInterval>;

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

const SESSION_ID = `session-${Math.random().toString(36).slice(2)}`;

type Message = {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  loading?: boolean;
  agent?: string;
  meta?: Record<string, unknown>;
};

const AGENT_TAGS: Record<string, { label: string; color: string }> = {
  general: { label: "Nexus", color: "#f5c842" },
  docmentor: { label: "DocMentor", color: "#6366f1" },
  review: { label: "Review Analyst", color: "#10b981" },
  digest: { label: "Digest", color: "#f59e0b" },
  file: { label: "File Manager", color: "#8b5cf6" },
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const intervalsRef = useRef<Set<IntervalId>>(new Set());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      intervalsRef.current.forEach(clearInterval);
    };
  }, []);

  const pollJob = useCallback((jobId: string, msgId: string) => {
    const interval = setInterval(async () => {
      try {
        const job = (await getJobStatus(jobId)) as {
          status: string;
          result?: { response?: string; sources?: string[] };
        };
        if (job.status === "complete") {
          clearInterval(interval);
          intervalsRef.current.delete(interval);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId
                ? { ...m, content: job.result?.response ?? "Done.", loading: false }
                : m
            )
          );
        } else if (job.status === "error") {
          clearInterval(interval);
          intervalsRef.current.delete(interval);
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
        intervalsRef.current.delete(interval);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, role: "error", content: "Lost connection to n8n.", loading: false }
              : m
          )
        );
      }
    }, 2000);
    intervalsRef.current.add(interval);
  }, []);

  async function send() {
    if (!input.trim() || sending) return;
    const text = input.trim();
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const asstId = crypto.randomUUID();
    const asstMsg: Message = { id: asstId, role: "assistant", content: "", loading: true };
    setMessages((prev) => [...prev, userMsg, asstMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSending(true);

    try {
      const res = (await sendMessage(text, SESSION_ID)) as {
        agent?: string;
        response?: string;
        job_id?: string;
        status?: string;
        sentiment?: string;
        sentiment_score?: number;
        key_themes?: string[];
        pros?: string[];
        cons?: string[];
        predicted_rating?: number;
      };

      const agent = res.agent || "general";

      if (res.job_id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstId ? { ...m, agent, content: "Thinking..." } : m
          )
        );
        pollJob(res.job_id, asstId);
      } else if (agent === "review" && res.sentiment) {
        const reviewContent = formatReview(res);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstId
              ? { ...m, agent, content: reviewContent, loading: false }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstId
              ? { ...m, agent, content: res.response ?? "No response.", loading: false }
              : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstId
            ? { ...m, role: "error", content: "n8n is offline. Start your workflow first.", loading: false }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  }

  function formatReview(res: {
    response?: string;
    sentiment?: string;
    sentiment_score?: number;
    key_themes?: string[];
    pros?: string[];
    cons?: string[];
    predicted_rating?: number;
  }): string {
    const lines: string[] = [];
    if (res.response) lines.push(res.response);
    lines.push("");
    if (res.sentiment) lines.push(`Sentiment: ${res.sentiment} (${((res.sentiment_score ?? 0) * 100).toFixed(0)}%)`);
    if (res.predicted_rating) lines.push(`Rating: ${"★".repeat(res.predicted_rating)}${"☆".repeat(5 - res.predicted_rating)}`);
    if (res.key_themes?.length) lines.push(`Themes: ${res.key_themes.join(", ")}`);
    if (res.pros?.length) lines.push(`Pros: ${res.pros.join(" · ")}`);
    if (res.cons?.length) lines.push(`Cons: ${res.cons.join(" · ")}`);
    return lines.join("\n");
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0a0a0f",
        color: "#fff",
        fontFamily: "var(--font-space-grotesk), sans-serif",
      }}
    >
      <style>{`
        .nav-link { color: rgba(255,255,255,0.45); font-size: 0.8rem; letter-spacing: 0.08em; text-decoration: none; padding: 0.4rem 0.9rem; border-radius: 999px; transition: all 0.2s; }
        .nav-link:hover { color: #fff; background: rgba(255,255,255,0.07); }
        .nav-link.active { color: #f5c842; background: rgba(245,200,66,0.1); }
        .chat-input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; color: #fff; padding: 0.85rem 1.15rem; font-size: 0.9rem; font-family: var(--font-space-grotesk), sans-serif; resize: none; outline: none; line-height: 1.5; overflow-y: auto; }
        .chat-input:focus { border-color: rgba(245,200,66,0.4); }
        .chat-input::placeholder { color: rgba(255,255,255,0.25); }
        .send-btn { background: #f5c842; color: #000; border: none; border-radius: 12px; padding: 0.65rem 1.2rem; font-size: 0.85rem; font-weight: 600; font-family: var(--font-space-grotesk), sans-serif; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.4rem; white-space: nowrap; }
        .send-btn:hover:not(:disabled) { background: #e8b830; }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.15} }
        .typing-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #f5c842; animation: blink 1.2s ease-in-out infinite; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        .agent-tag { font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; font-family: var(--font-jetbrains-mono), monospace; padding: 0.15rem 0.5rem; border-radius: 999px; margin-bottom: 0.35rem; display: inline-block; }
        .msg-text { white-space: pre-wrap; }
      `}</style>

      {/* Nav */}
      <nav
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          padding: "1.1rem 2.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
          flexShrink: 0,
        }}
      >
        <Link
          href="/"
          style={{
            fontWeight: 700,
            fontSize: "1.1rem",
            letterSpacing: "0.22em",
            color: "#f5c842",
            marginRight: "1rem",
            textDecoration: "none",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          Nexus
        </Link>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.15rem",
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "999px",
            padding: "0.35rem 0.5rem",
          }}
        >
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link${l.href === "/chat" ? " active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", maxWidth: 820, width: "100%", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 2rem",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f5c842, #e8a020)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "#000",
            }}
          >
            N
          </div>
          <div>
            <h1 style={{ fontSize: "1rem", fontWeight: 600 }}>Nexus Chat</h1>
            <p
              style={{
                fontSize: "0.72rem",
                color: "rgba(255,255,255,0.35)",
                fontFamily: "var(--font-jetbrains-mono), monospace",
              }}
            >
              Multi-agent · Llama 3 8B · Routes to specialized agents
            </p>
          </div>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.5rem 2rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "1.2rem",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(245,200,66,0.15), rgba(245,200,66,0.05))",
                  border: "1px solid rgba(245,200,66,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  color: "#f5c842",
                }}
              >
                N
              </div>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "rgba(255,255,255,0.4)",
                  textAlign: "center",
                  lineHeight: 1.7,
                }}
              >
                Ask anything. Nexus routes your<br />
                message to the right agent.
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.25rem" }}>
                {[
                  "What can you do?",
                  "Summarize my docs",
                  "Analyze a review",
                  "Show my digest",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      padding: "0.5rem 0.9rem",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      fontFamily: "var(--font-space-grotesk), sans-serif",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(245,200,66,0.3)";
                      e.currentTarget.style.color = "#f5c842";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {msg.role === "user" ? (
                <div
                  style={{
                    maxWidth: "70%",
                    background: "rgba(245,200,66,0.12)",
                    border: "1px solid rgba(245,200,66,0.2)",
                    borderRadius: "16px 16px 4px 16px",
                    padding: "0.75rem 1.1rem",
                    fontSize: "0.9rem",
                    lineHeight: 1.6,
                    color: "#fff",
                  }}
                >
                  {msg.content}
                </div>
              ) : msg.loading ? (
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px 16px 16px 4px",
                    padding: "0.85rem 1.1rem",
                  }}
                >
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              ) : (
                <div
                  style={{
                    maxWidth: "75%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {msg.agent && AGENT_TAGS[msg.agent] && (
                    <span
                      className="agent-tag"
                      style={{
                        color: AGENT_TAGS[msg.agent].color,
                        background: `${AGENT_TAGS[msg.agent].color}15`,
                        border: `1px solid ${AGENT_TAGS[msg.agent].color}30`,
                      }}
                    >
                      {AGENT_TAGS[msg.agent].label}
                    </span>
                  )}
                  <div
                    style={{
                      background:
                        msg.role === "error"
                          ? "rgba(248,113,113,0.08)"
                          : "rgba(255,255,255,0.05)",
                      border: `1px solid ${
                        msg.role === "error"
                          ? "rgba(248,113,113,0.2)"
                          : "rgba(255,255,255,0.08)"
                      }`,
                      borderRadius: "16px 16px 16px 4px",
                      padding: "0.85rem 1.1rem",
                      fontSize: "0.9rem",
                      lineHeight: 1.7,
                      color: msg.role === "error" ? "#f87171" : "#fff",
                    }}
                  >
                    <span className="msg-text">{msg.content}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          style={{
            padding: "1rem 2rem 1.5rem",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-end",
          }}
        >
          <textarea
            ref={textareaRef}
            className="chat-input"
            rows={1}
            placeholder="Ask Nexus anything..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            className="send-btn"
            onClick={send}
            disabled={sending || !input.trim()}
          >
            Send ↑
          </button>
        </div>
      </div>
    </div>
  );
}
