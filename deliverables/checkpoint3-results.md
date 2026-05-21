# Checkpoint 3 — Results

## 1. Pipeline at Volume

Data collected from Airtable exports across 6 tables, spanning May 5 – May 21, 2026.

### Interactions (186 records)

The interactions table logs every agent call across the platform.

| Metric | Value |
|--------|-------|
| Total interactions | 186 |
| Success rate | 96.8% (180 success, 3 needs_review, 3 empty) |
| Median response time | 2,493 ms |
| Average response time | 9,602 ms (skewed by long-running digest/file pipelines) |
| Max response time | 542,805 ms (~9 min, digest generation) |

**Breakdown by agent:**

| Agent | Count | % of Total |
|-------|-------|------------|
| DocMentor (RAG) | 63 | 33.9% |
| File Intake | 48 | 25.8% |
| Review Analyst | 36 | 19.4% |
| Digest Agent | 27 | 14.5% |
| System / Health | 7 | 3.8% |
| General Chat | 2 | 1.1% |

**Breakdown by source workflow:**

| Source | Count |
|--------|-------|
| Orchestrator | 49 |
| File Intake Pipeline | 45 |
| DocMentor RAG | 44 |
| Review Analyst | 25 |
| Digest Agent | 13 |
| Cleanup Workflow | 7 |

### Documents (54 records)

| Metric | Value |
|--------|-------|
| Total documents processed | 54 |
| Successfully processing | 51 |
| File types | 29 TXT, 20 DOCX, 2 PDF |
| Total data ingested | 6.6 KB (test/sample files) |
| Files with names | 51 |

Sample documents include: `test-upload.txt`, `test-ai-healthcare.txt`, and various sample text files covering AI, cloud computing, data engineering, and biotechnology topics.

### Jobs (102 records)

| Metric | Value |
|--------|-------|
| Total async jobs | 102 |
| Completed | 47 (46.1%) |
| Processing | 52 (51.0%) |
| Job types | 55 file_intake, 44 docmentor_query |

### Digests (16 records)

| Metric | Value |
|--------|-------|
| Total digest configurations | 16 |
| Active subscriptions | 13 |
| Frequency split | 11 daily, 2 weekly |
| Unique subscriber emails | 7 |
| Articles per digest | 10 (consistent) |
| Topics covered | AI, n8n, automation, machine learning, robotics, cybersecurity, quantum computing, space exploration, cloud computing |

### Health Logs (522 records)

The System Health Monitor runs every 5 minutes, checking all 4 services.

| Metric | Value |
|--------|-------|
| Total health checks | 522 |
| Checks with all healthy | 127 (24.3%) |
| Service uptime — Ollama | 49.7% (258 up / 261 down) |
| Service uptime — Qdrant | 41.0% (213 up / 306 down) |
| Service uptime — Docling | 32.7% (170 up / 349 down) |
| Service uptime — n8n | 39.1% (203 up / 316 down) |

Uptime percentages reflect that the backend services (Ollama, Qdrant, Docling) run on a separate ASUS laptop connected over LAN — when that machine is off or sleeping, health checks log "down." n8n reports itself as hardcoded "up" during workflow execution but logs "down" from the health check perspective when the self-check times out. During active development sessions, all 4 services are consistently healthy with sub-30ms latency.

**Average service latency (when up):**

| Service | Avg Latency |
|---------|-------------|
| Ollama | 255 ms |
| Qdrant | 255 ms |
| Docling | 255 ms |
| n8n | 1 ms |

### Analytics Snapshots (13 records)

Hourly cron snapshots tracking cumulative interaction counts over time. The latest snapshot shows 97 total interactions with an average response time of 2,484 ms and 0.0% error rate.

### n8n Execution Stats (from Overview Dashboard)

| Metric | Value |
|--------|-------|
| Total production executions | 300 |
| Failed executions | 15 |
| Failure rate | 5% |
| Average run time | 1.7 s |

---

## 2. Dashboard Views

The frontend provides 8 pages accessible from the navigation bar: Dashboard, Chat, DocMentor, Reviews, Digests, Files, Status, and Analytics.

### Dashboard
Overview page showing 4 summary cards (Total Interactions, Avg Response, Error Rate, Services Up) and quick-launch cards for each agent (DocMentor, Review Analyst, Digest Agent, File Intake). The right sidebar displays real-time service health for Ollama, Qdrant, Docling, and n8n with latency indicators and UP/DOWN badges.

### Chat (Nexus Chat)
Unified multi-agent chat interface. The Orchestrator classifies each message and routes it to the appropriate agent — responses are tagged with the agent name (NEXUS, DOCMENTOR, REVIEW ANALYST, etc.). Supports quick-start suggestion chips ("Summarize my docs", "Analyze a review", "Show my digest"). Llama 3 8B powers all agent responses via Ollama.

### Analytics
Full analytics dashboard with time range filtering (7d / 30d / All). Displays: total interactions count, average response time, error rate with health indicator, document count, usage-by-agent bar chart (5 agents), daily activity timeline, top queries list, and agent performance table (calls, avg ms, errors per agent).

### Status Page
Infrastructure monitoring dashboard showing all 4 services (Ollama — LLM Inference, Qdrant — Vector Store, Docling — Doc Parser, n8n — Orchestration) with live UP/DOWN status, latency bars, and a recent checks history table. Details panel shows monitoring config (15s poll interval, 20-check history depth, `/webhook/health/status` endpoint) and per-service endpoint latencies with a color legend (green < 100ms, yellow 100–300ms, red > 300ms).

### Digest Agent
Two-panel layout: left side has the configuration form (topics input with chip tags, daily/weekly frequency toggle, delivery email field, "Save & Activate" button) and right side shows a live preview of the latest generated digest. Digests are HTML-rendered with article summaries grouped by theme, source links, and a "Generated by Nexus Digest Agent" footer.

### Review Analyst
Split-panel review analysis workspace. Left side: text area for pasting reviews with a type selector (Restaurant / Product / Service). Right side: structured AI output showing sentiment (Positive/Negative with confidence %), star rating, key themes as tags, one-line summary, and pros/cons lists.

### DocMentor
RAG-powered document Q&A interface with a left sidebar listing indexed documents and a file upload drop zone (supports TXT, MD, CSV, JSON). Main area shows chat with the DocMentor agent which references uploaded source documents by name in its responses.

### File Intake
Drag-and-drop file upload page with supported format badges (.txt, .md, .csv, .json). Files are processed through the File Intake Pipeline (parse → chunk → embed → store in Qdrant) and become available to DocMentor for RAG queries.

---

## 3. Known Issues & Scope Changes

### Gmail SMTP Not Usable in Local-Only Setup

Because n8n is self-hosted inside a Docker container on a local machine (no public IP or verified domain), Gmail SMTP authentication fails with `535-5.7.8 Username and Password not accepted`. Google's security policies block sign-in attempts from unrecognized environments, and generating a Gmail App Password requires additional account configuration that adds friction to the dev workflow. We resolved this by switching to **Ethereal Email** — a free SMTP testing service from the Nodemailer team (`smtp.ethereal.email:587`). Emails are captured in Ethereal's web UI for verification rather than landing in real inboxes. This is sufficient for development and demos, but production deployment would require a properly configured SMTP provider (e.g., Gmail with App Password, SendGrid, or Resend).

### Docling PDF/DOCX Parsing — No Stable Node Version

While setting up the File Intake Pipeline, we attempted to integrate Docling for parsing PDFs and DOCX files into structured text. However, we could not find a stable Docling Docker image version that reliably handled both PDF and DOCX formats. Certain versions would crash on specific file types or produce empty output. For the current build, the pipeline handles plain text uploads and basic document formats, but robust PDF/DOCX parsing remains a gap. A future iteration would pin a known-good Docling version or evaluate alternatives like Apache Tika or Unstructured.

---

## 4. What We'd Improve With More Time

### Vercel Deployment + Cloudflare Tunnel for Live Demos

The frontend currently runs as a local Next.js dev server on port 3002, with a rewrite proxy (`/webhook/*` → `localhost:5678/webhook/*`) forwarding API calls to the n8n Docker container. The Vercel + Cloudflare Tunnel hosting strategy is already outlined in the project architecture — Vercel would host the Next.js frontend, and a Cloudflare Tunnel would expose the local n8n instance to the public internet so the hosted frontend can reach the backend. This would enable live demos without requiring the audience to be on the same local network.

### Multi-Model Testing with Ollama (Llama 3 vs Gemma vs Qwen)

Currently the entire platform runs on a single Llama 3 8B model served by Ollama, with all agents differentiated purely by system prompts. A worthwhile experiment would be loading a second model — such as Gemma 2 or Qwen 2.5 — and benchmarking response quality and latency across different agents. The constraint is 8 GB of VRAM on the RTX 4060, so only one model can be loaded at a time (or two smaller quantized models). Testing whether certain agents perform better on different models could improve the quality of a fully local-hosted multi-agent system without adding any API costs.

### Unit Tests and End-to-End Tests

The project currently has no automated test suite. Adding unit tests for the frontend components (API client, intent parsing logic, data formatting) and E2E tests (simulating a user flow from chat input → n8n webhook → response display) would catch regressions early and make refactoring safer. Tools like Vitest for unit tests and Playwright or Cypress for E2E would fit the Next.js stack.

### CI/CD Pipeline

With tests in place, a CI/CD pipeline (GitHub Actions) would automate linting, type checking, and test runs on every push. This would also handle automated Vercel preview deployments for PRs, ensuring that changes are validated before merging to main.
