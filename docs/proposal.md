# Nexus — Personal AI Agent Platform

![Architecture Diagram](architecture.png)

---

## Team Members

This is a solo build. One person covers all four roles end-to-end.

| Member | Role                                                                              |
|--------|-----------------------------------------------------------------------------------|
| Deon   | Data Ingestion (File Intake Pipeline)                                             |
| Deon   | AI Analysis (DocMentor RAG + Review Analyst)                                      |
| Deon   | Orchestration (Orchestrator, Health Monitor, Analytics, Digest, Cleanup)          |
| Deon   | Interface (Next.js Frontend)                                                      |

---

## Problem Statement

Individual knowledge workers and students lack a unified personal AI assistant that can ingest documents, answer questions about them, analyze text, and deliver automated digests — without relying on paid cloud AI services. Existing options either lock users into recurring subscriptions, ship their data to third-party providers, or force them to stitch together half a dozen disconnected tools. There is no self-hosted, single-pane-of-glass alternative that runs entirely on a user's own hardware, keeps their documents private, and exposes a clean interface for day-to-day use.

---

## Target Users

Students and knowledge workers who want a self-hosted AI agent platform with local inference, local data, and no API costs. Specifically:

- **Students** who need to chat with textbooks, lecture notes, and research papers without paying for a ChatGPT Plus subscription.
- **Knowledge workers** who deal with sensitive internal documents and cannot upload them to cloud LLM providers for compliance or policy reasons.
- **Self-hosting enthusiasts** who already run a homelab and want to add a multi-agent AI layer to their existing infrastructure.

---

## Component Breakdown

The system is split into four cooperating components. Each is independently demonstrable and corresponds to one of the four team roles.

### 1. Data Ingestion — File Intake Pipeline

**Description:** The ingestion engine for every document in the system. Receives uploaded files via an n8n webhook, detects file type, routes to the correct parser, chunks the text, generates vector embeddings, and stores them in Qdrant. Document state is tracked in Airtable through a status-driven pipeline (`uploaded → processing → indexed → error`). Serves as the foundation that DocMentor and any future agents depend on.

**Tools:** n8n (Webhook, Switch, Code, HTTP Request, Airtable nodes), Docling (PDF/DOCX → structured markdown), Ollama `nomic-embed-text` (embeddings), Qdrant (vector storage), Airtable (document state).

**Input:** A user-uploaded file via `POST /webhook/file/upload` (multipart/form-data). Supported types: PDF, TXT, MD, CSV, JSON.

**Output:** A JSON response `{ document_id, status, chunk_count }`, a fully populated Airtable `documents` record, and a set of embedded chunks in the Qdrant `docmentor` collection ready for similarity search.

**Standalone demo:** Upload a sample PDF (e.g., the healthcare AI text file) directly to the webhook with `curl`. Watch the Airtable record transition through statuses, then issue a Qdrant search query against the resulting collection to confirm vectors are retrievable — no other components required.

---

### 2. AI Analysis — DocMentor (RAG) + Review Analyst

**Description:** Two AI-heavy agents that share the same local Llama 3 8B model, differentiated only by system prompt. **DocMentor** is a RAG agent: it embeds a user's question, retrieves the top-5 most similar chunks from Qdrant, and asks Llama 3 to answer using only that context, with citations. **Review Analyst** takes free-form review text and uses a strict JSON-schema prompt to extract sentiment, sentiment score, key themes, pros, cons, predicted rating, and a one-sentence summary.

**Tools:** n8n (Webhook, HTTP Request, Code, IF, Airtable nodes), Ollama Llama 3 8B (chat completion), Ollama `nomic-embed-text` (query embedding), Qdrant (top-k similarity search), Airtable (`interactions` and `reviews` tables).

**Input:**
- DocMentor: `POST /webhook/docmentor/query` with `{ query, session_id, document_filter? }`.
- Review Analyst: `POST /webhook/review/analyze` with `{ text, type: "restaurant|product|service" }`.

**Output:**
- DocMentor: a grounded natural-language answer plus the source document references it was drawn from.
- Review Analyst: a validated JSON object matching the review schema, persisted to the `reviews` table.

**Standalone demo:** Hit each webhook directly with `curl`. For DocMentor, upload a doc first (via component 1) then query it — show the retrieved chunks and the grounded answer. For Review Analyst, paste a sample restaurant review and show the structured JSON output with sentiment + rating.

---

### 3. Orchestration — Orchestrator + Health Monitor + Analytics + Digest + Cleanup

**Description:** The backbone of the platform. Five n8n workflows that route traffic, monitor service health, aggregate usage data, deliver scheduled content, and keep the system lean.

- **Orchestrator** — receives every frontend request, makes a single Ollama call to classify intent (`docmentor | review | digest | file | general`), and dispatches to the right sub-workflow via a Switch node.
- **Health Monitor** — cron every 5 minutes; pings Ollama, Qdrant, Docling, and n8n itself, logs results to `health_logs`, and fires an alert if any service is down.
- **Interaction Analytics** — cron hourly; reads the last 24h of `interactions`, computes aggregate stats (counts by agent, average response time, error rate, peak hour, top document), and writes a summary record.
- **Digest Agent** — cron daily; queries active digest configs, pulls Google News RSS feeds matching each user's topics, makes a single Ollama summarization call, and emails the result.
- **Cleanup Workflow** — cron daily at 2 AM; prunes Qdrant vectors older than 30 days, archives stale interaction logs, and removes orphaned error records.

**Tools:** n8n (Cron, Webhook, HTTP Request, Switch, Code, IF, Airtable, Email nodes), Ollama (intent classification and digest summarization), Google News RSS feeds, Airtable (`interactions`, `health_logs`, `analytics`, `digests` tables).

**Input:** A user request to `POST /webhook/orchestrator`, scheduled cron triggers for the background workflows, and `POST /webhook/digest/configure` for digest setup.

**Output:** Routed agent responses, health status records, hourly analytics summaries, scheduled digest emails, and a daily cleanup log entry.

**Standalone demo:** Kill the Ollama service on the ASUS box mid-demo — watch the Health Monitor catch the failure within five minutes, log a `down` status to Airtable, and trigger an alert. Restart Ollama and watch the next check return to green. Separately, hit `GET /webhook/analytics/summary` to show live aggregate stats.

---

### 4. Interface — Next.js Frontend

**Description:** A TypeScript Next.js application that is the user's single window into the platform. The frontend never talks to Ollama, Qdrant, or Docling directly — it speaks only to n8n webhooks. For long-running operations (file upload, DocMentor query) it uses an async job-ID pattern: submit the request, receive a `job_id`, poll `GET /webhook/job/{job_id}` until status is `complete`. Seven pages cover the full surface of the platform.

**Tools:** Next.js, TypeScript, React, Tailwind / shadcn-style components, pnpm, fetch-based webhook client, async job polling pattern.

**Input:** User actions in the browser — typing a chat message, uploading a file, submitting a review, configuring a digest, viewing dashboards.

**Output:** Seven functional pages — Dashboard (recent activity + system status), DocMentor (chat UI), Review Analyst (submit + view), Digest Manager (configure + view past digests), File Manager (upload + status), System Status (live health dashboard), and Analytics (charts and usage stats).

**Standalone demo:** Open `http://localhost:3000` and click through each of the seven pages with the backend stubbed or pointed at a staging n8n instance. Show that every page renders, every form submits, and every page handles the loading / error / success states for its webhook.

---

## Data Sources

| Source                              | Type                | Used By                              |
|-------------------------------------|---------------------|--------------------------------------|
| User-uploaded documents             | PDF, TXT, MD, CSV, JSON | File Intake Pipeline → DocMentor |
| Google News RSS feeds               | RSS / XML           | Digest Agent                         |
| Sample healthcare AI text file      | Plain text          | DocMentor demo corpus                |
| User-submitted review text          | Free-form text      | Review Analyst                       |
| User-submitted chat messages        | Free-form text      | Orchestrator → routed agents         |

All data is either user-supplied or pulled from public RSS feeds. No paid data sources, no cloud AI provider APIs.

---

## AI Capabilities

All capabilities run locally via Ollama on the ASUS gaming laptop. One LLM in VRAM, one embedding model alongside it. Differentiation is by system prompt — not by model.

| Capability                | Model                 | Used By                                |
|---------------------------|-----------------------|----------------------------------------|
| Intent Classification     | Llama 3 8B (Ollama)   | Orchestrator                           |
| RAG Q&A                   | Llama 3 8B (Ollama)   | DocMentor                              |
| Structured Extraction     | Llama 3 8B (Ollama)   | Review Analyst                         |
| Text Summarization        | Llama 3 8B (Ollama)   | Digest Agent                           |
| Embeddings (768-dim)      | nomic-embed-text (Ollama) | File Intake Pipeline, DocMentor    |

---

## Success Criteria

The project is considered successful if all six of the following are demonstrably true on demo day:

1. **All 9 n8n workflows execute end-to-end** without manual intervention — Orchestrator, DocMentor, Review Analyst, Digest Agent, File Intake, Health Monitor, Analytics, Cleanup, and the Job-status webhook.
2. **DocMentor RAG returns grounded answers with citations** for at least three different uploaded documents, retrieving the correct top-5 chunks from Qdrant in every test query.
3. **File Intake processes a fresh PDF end-to-end** — from `POST /webhook/file/upload` to a fully indexed Qdrant collection — in under 60 seconds, with the Airtable `documents` record correctly transitioning through every status.
4. **Health Monitor detects a real service failure** within one cron cycle (5 minutes) when a backing service is killed, logs `all_healthy: false` to Airtable, and fires an alert.
5. **The Next.js frontend is fully connected** — every one of the seven pages successfully calls its webhook and renders the response, including correct loading and error states.
6. **The async job-ID pattern works** — submitting a DocMentor query or file upload returns a `job_id` immediately, and polling `GET /webhook/job/{job_id}` shows the status transitioning from `processing` to `complete` with the final result populated.

---

## Timeline

| Week  | Milestone                                                                                  |
|-------|--------------------------------------------------------------------------------------------|
| 3     | Project scaffold, repo setup, environment configuration on both machines, Architecture doc finalized |
| 4     | Ollama + Llama 3 8B + nomic-embed-text running on ASUS; Qdrant and Docling installed and reachable from MacBook |
| 5     | Airtable schema built (all 6 tables); System Health Monitor workflow live and logging every 5 min |
| 6     | File Intake Pipeline workflow complete; first PDF successfully chunked, embedded, and stored in Qdrant |
| 7     | DocMentor (RAG) workflow complete; query → embed → search → answer round-trip working with sample corpus |
| 8     | Orchestrator workflow live; intent classification routing correctly to DocMentor and stubs for other agents |
| 9     | Review Analyst workflow complete; structured JSON extraction validated against malformed-input edge cases |
| 10    | Interaction Analytics workflow live; hourly summaries writing to Airtable; on-demand endpoint working |
| 11    | Digest Agent workflow complete; RSS fetching, summarization, email delivery, configured via webhook |
| 12    | Cleanup Workflow live; Next.js frontend scaffolded with all 7 pages wired to webhooks (happy path) |
| 13    | Frontend polish — async job polling pattern, loading/error states, system status dashboard wired to live health data |
| 14    | End-to-end testing: load 3+ documents, run all agents, simulate service failure, verify all 6 success criteria |
| 15    | Demo day prep — Cloudflare Tunnel + Vercel deploy, demo script rehearsal, fallback plan for offline scenarios, final presentation |

---
