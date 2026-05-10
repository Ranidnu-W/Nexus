"use client";

import { useState, useEffect } from "react";

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function generateParticles() {
  return Array.from({ length: 25 }, (_, i) => ({
    id: i,
    size: rand(2, 6),
    dur: rand(10, 28),
    drift: rand(-40, 40),
    peakOp: rand(0.3, 0.75),
    x: rand(0, 100),
    delay: rand(0, 20),
  }));
}

export default function Particles() {
  const [pts, setPts] = useState<ReturnType<typeof generateParticles>>([]);

  useEffect(() => {
    setPts(generateParticles());
  }, []);

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%   { opacity: 0; transform: translateY(0) translateX(0); }
          10%  { opacity: var(--peak-op); }
          90%  { opacity: var(--peak-op); }
          100% { opacity: 0; transform: translateY(calc(-100vh - 20px)) translateX(var(--drift)); }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
          zIndex: 3,
        }}
      >
        {pts.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              bottom: "-10px",
              left: `${p.x}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(245,200,66,0.8) 0%, transparent 70%)",
              animation: `floatUp var(--dur) linear infinite`,
              animationDelay: `calc(var(--delay) * -1s)`,
              // CSS custom properties
              ["--dur" as string]: `${p.dur}s`,
              ["--drift" as string]: `${p.drift}px`,
              ["--peak-op" as string]: p.peakOp,
              ["--delay" as string]: p.delay,
            }}
          />
        ))}
      </div>
    </>
  );
}
