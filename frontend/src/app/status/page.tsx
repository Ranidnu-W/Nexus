"use client";

import { useEffect, useState } from "react";
import { getHealthStatus } from "@/lib/api";

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

export default function StatusPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function fetchHealth() {
      try {
        const data = (await getHealthStatus()) as HealthData;
        setHealth(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch health");
      }
    }

    fetchHealth();
    interval = setInterval(fetchHealth, 30_000);
    return () => clearInterval(interval);
  }, []);

  const services: { key: keyof Omit<HealthData, "all_healthy">; label: string }[] = [
    { key: "ollama", label: "Ollama (LLM)" },
    { key: "qdrant", label: "Qdrant (Vectors)" },
    { key: "docling", label: "Docling (Doc Parser)" },
    { key: "n8n", label: "n8n (Orchestration)" },
  ];

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">System Status</h1>

      {error && (
        <div className="bg-red-100 text-red-800 rounded p-4 mb-4">{error}</div>
      )}

      {!health && !error && <p className="text-gray-500">Loading...</p>}

      {health && (
        <>
          <div
            className={`rounded p-4 mb-6 text-center font-semibold ${
              health.all_healthy
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {health.all_healthy ? "All Systems Operational" : "Service Degradation Detected"}
          </div>

          <div className="space-y-3">
            {services.map(({ key, label }) => {
              const svc = health[key];
              return (
                <div
                  key={key}
                  className="flex items-center justify-between border rounded p-4"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        svc.status === "up" ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <span className="font-medium">{label}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {svc.status === "up" ? `${svc.response_ms}ms` : "DOWN"}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
