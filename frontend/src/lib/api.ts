const REQUEST_TIMEOUT_MS = 15_000;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("Request timed out — is n8n running?");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

// --- Orchestrator ---
export function sendMessage(message: string, sessionId: string) {
  return request("/webhook/orchestrator", {
    method: "POST",
    body: JSON.stringify({ message, session_id: sessionId }),
  });
}

// --- DocMentor ---
export function queryDocmentor(query: string, sessionId: string, documentFilter?: string) {
  return request("/webhook/docmentor/query", {
    method: "POST",
    body: JSON.stringify({ query, session_id: sessionId, document_filter: documentFilter }),
  });
}

export async function uploadFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/webhook/file/upload", {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Upload error ${res.status}`);
  return res.json();
}

// --- Review Analyst ---
export function analyzeReview(text: string, type: "restaurant" | "product" | "service") {
  return request("/webhook/review/analyze", {
    method: "POST",
    body: JSON.stringify({ text, type }),
  });
}

// --- Digest ---
export function configureDigest(topics: string[], frequency: "daily" | "weekly", email: string) {
  return request("/webhook/digest/configure", {
    method: "POST",
    body: JSON.stringify({ topics, frequency, email }),
  });
}

export function getLatestDigest() {
  return request("/webhook/digest/latest");
}

// --- Health ---
export function getHealthStatus() {
  return request("/webhook/health/status");
}

// --- Analytics ---
export function getAnalyticsSummary(timeRange?: string) {
  const params = timeRange ? `?range=${timeRange}` : "";
  return request(`/webhook/analytics/summary${params}`);
}

// --- Jobs (async polling) ---
export function getJobStatus(jobId: string) {
  return request(`/webhook/job-status/job/${jobId}`);
}
