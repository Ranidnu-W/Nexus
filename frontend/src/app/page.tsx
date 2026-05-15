"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Particles from "@/components/Particles";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Chat", href: "/chat" },
  { label: "DocMentor", href: "/docmentor" },
  { label: "Reviews", href: "/review" },
  { label: "Status", href: "/status" },
  { label: "Analytics", href: "/analytics" },
];

export default function LandingPage() {
  const layer1Ref = useRef<HTMLDivElement>(null);
  const layer2Ref = useRef<HTMLDivElement>(null);
  const layer3Ref = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const smoothRef = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };
    window.addEventListener("mousemove", onMove);

    const tick = () => {
      const s = smoothRef.current;
      const m = mouseRef.current;
      s.x += (m.x - s.x) * 0.04;
      s.y += (m.y - s.y) * 0.04;
      const dx = s.x - 0.5;
      const dy = s.y - 0.5;
      if (layer1Ref.current)
        layer1Ref.current.style.translate = `${dx * -20}px ${dy * -20}px`;
      if (layer2Ref.current)
        layer2Ref.current.style.translate = `${dx * -35}px ${dy * -35}px`;
      if (layer3Ref.current)
        layer3Ref.current.style.translate = `${dx * -50}px ${dy * -50}px`;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh", overflow: "hidden", background: "#000", position: "relative" }}>
      <style>{`
        .bg-layer {
          position: absolute;
          width: 180%; height: 180%;
          top: -40%; left: -40%;
          background: url('/Nexus_node_img.png') center/cover no-repeat;
          will-change: transform, filter;
        }
        .bg-layer-1 {
          animation: drift1 30s ease-in-out infinite alternate, pulse1 8s ease-in-out infinite;
        }
        .bg-layer-2 {
          opacity: 0.4;
          mix-blend-mode: screen;
          animation: drift2 25s ease-in-out infinite alternate-reverse, pulse2 6s ease-in-out infinite;
          filter: blur(2px) hue-rotate(15deg);
        }
        .bg-layer-3 {
          opacity: 0.25;
          mix-blend-mode: lighten;
          animation: drift3 35s ease-in-out infinite alternate, pulse3 10s ease-in-out infinite;
          filter: blur(4px) hue-rotate(-10deg) brightness(1.3);
        }
        @keyframes drift1 {
          0%   { transform: translate(0%, 0%) scale(1); }
          25%  { transform: translate(3%, -2%) scale(1.05); }
          50%  { transform: translate(-2%, 3%) scale(1.02); }
          75%  { transform: translate(1%, 1%) scale(1.08); }
          100% { transform: translate(-3%, -1%) scale(1.03); }
        }
        @keyframes drift2 {
          0%   { transform: translate(2%, 1%) scale(1.05) rotate(0.5deg); }
          50%  { transform: translate(-3%, 2%) scale(1.1) rotate(-0.5deg); }
          100% { transform: translate(1%, -2%) scale(1.02) rotate(0.3deg); }
        }
        @keyframes drift3 {
          0%   { transform: translate(-1%, 2%) scale(1.08); }
          50%  { transform: translate(2%, -1%) scale(1.03); }
          100% { transform: translate(-2%, 0%) scale(1.1); }
        }
        @keyframes pulse1 {
          0%, 100% { filter: brightness(1) saturate(1); }
          50%      { filter: brightness(1.15) saturate(1.2); }
        }
        @keyframes pulse2 {
          0%, 100% { opacity: 0.35; }
          50%      { opacity: 0.55; }
        }
        @keyframes pulse3 {
          0%, 100% { opacity: 0.2; }
          50%      { opacity: 0.35; }
        }
        .logo-text {
          font-size: clamp(3rem, 8vw, 7rem);
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          background: linear-gradient(135deg, #f5c842 0%, #e8a020 40%, #ffdd70 60%, #d4912a 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: textGlow 4s ease-in-out infinite;
        }
        @keyframes textGlow {
          0%, 100% { filter: drop-shadow(0 0 30px rgba(245, 200, 66, 0.2)); }
          50%      { filter: drop-shadow(0 0 60px rgba(245, 200, 66, 0.5)); }
        }
        .tagline {
          font-size: clamp(0.9rem, 2vw, 1.3rem);
          font-weight: 300;
          letter-spacing: 0.35em;
          text-transform: uppercase;
          color: rgba(255, 220, 112, 0.7);
          margin-top: 0.5rem;
          font-family: var(--font-jetbrains-mono), monospace;
        }
        .nav-pill-link {
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          font-size: 0.85rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          font-family: var(--font-jetbrains-mono), monospace;
          transition: all 0.4s ease;
          padding: 0.5rem 1rem;
          border: 1px solid transparent;
          border-radius: 2px;
        }
        .nav-pill-link:hover {
          color: #f5c842;
          border-color: rgba(245, 200, 66, 0.3);
          text-shadow: 0 0 20px rgba(245, 200, 66, 0.4);
        }
        .status-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #4ade80;
          display: inline-block; margin-right: 0.5rem;
          animation: statusPulse 2s ease-in-out infinite;
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px #4ade80; }
          50%      { opacity: 0.5; box-shadow: 0 0 12px #4ade80; }
        }
        .fade-in { animation: fadeIn 1.5s ease-out both; }
        .fade-in-delay-1 { animation-delay: 0.3s; }
        .fade-in-delay-2 { animation-delay: 0.6s; }
        .fade-in-delay-3 { animation-delay: 1s; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Animated background layers */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden" }}>
        <div className="bg-layer bg-layer-1" ref={layer1Ref} />
        <div className="bg-layer bg-layer-2" ref={layer2Ref} />
        <div className="bg-layer bg-layer-3" ref={layer3Ref} />
      </div>

      {/* Vignette */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)",
      }} />

      {/* Particles */}
      <Particles />

      {/* Scanlines */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none",
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
      }} />

      {/* Main content */}
      <div style={{
        position: "relative", zIndex: 10,
        width: "100%", height: "100%",
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        textAlign: "center", padding: "2rem",
      }}>
        <h1 className="logo-text fade-in">Nexus</h1>

        {/* Frosted glass pill */}
        <div className="fade-in fade-in-delay-1" style={{
          marginTop: "1.5rem",
          padding: "1.5rem 3rem 1.2rem",
          background: "rgba(0, 0, 0, 0.45)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 220, 112, 0.1)",
          borderRadius: "20px",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          <p className="tagline">Multi-Agent AI Platform</p>
          <nav className="fade-in fade-in-delay-2" style={{ display: "flex", gap: "2rem", marginTop: "1.5rem", flexWrap: "wrap", justifyContent: "center" }}>
            {navItems.map((item) => (
              <Link key={item.label} href={item.href} className="nav-pill-link">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fade-in fade-in-delay-3" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "1.2rem 2rem",
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: "0.7rem",
        color: "rgba(255,255,255,0.25)",
        letterSpacing: "0.1em",
      }}>
        <span><span className="status-dot" />Systems Online</span>
        <span>v1.0.0</span>
      </div>
    </div>
  );
}
