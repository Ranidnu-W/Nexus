# Nexus — Personal AI Agent Platform

## Architecture Document v1.0

---

## 1. System Overview

Nexus is a self-hosted, multi-agent AI platform orchestrated entirely through n8n. Users interact with specialized AI agents through a unified TypeScript frontend. Each agent is powered by a combination of local LLM inference (Ollama), vector search (Qdrant), document parsing (Docling), and pure n8n automation workflows.

The system follows a **status-driven pipeline pattern** — Airtable acts as the shared data layer, n8n workflows poll for records at specific statuses, process them, and advance the status. Every interaction is logged, every service is monitored, and the system is fully observable.

**Key Design Principles:**

- One model in VRAM, multiple agents via system prompts
- n8n is the orchestration backbone — all routing, scheduling, and data flow lives here
- Frontend communicates exclusively via n8n webhook endpoints
- Async-first: long-running tasks return a job ID, frontend polls for results
- Airtable is the single source of truth for all state

---

## 2. Infrastructure Topology

```
┌─────────────────────────────────────┐     ┌─────────────────────────────────────┐
│         MacBook Air M4              │     │        ASUS Gaming Laptop           │
│         (Orchestration)             │     │        (AI Server)                  │
│                                     │     │                                     │
│  ┌───────────┐   ┌───────────────┐  │     │  ┌───────────┐                     │
│  │  Next.js   │   │     n8n       │  │     │  │  Ollama    │ :11434             │
│  │  Frontend  │   │  (self-host)  │  │     │  │ Llama 3 8B │                    │
│  │  :3000     │   │  :5678        │  │     │  └───────────┘                     │
│  └─────┬──────┘   └──────┬────────┘  │     │  ┌───────────┐                     │
│        │                 │           │     │  │  Qdrant    │ :6333              │
│        └────── REST ─────┘           │     │  │ (vectors)  │                    │
│                                     │     │  └───────────┘                     │
│                                     │     │  ┌───────────┐                     │
│                                     │     │  │  Docling   │ :5001              │
│                                     │     │  │ (doc parse)│                    │
│                                     │     │  └───────────┘                     │
└──────────────────┬──────────────────┘     └──────────────────┬──────────────────┘
                   │          Local Network (LAN)              │
                   └───────────────────────────────────────────┘
```

**Service Map:**

| Service        | Host     | Port  | Purpose                              |
|----------------|----------|-------|--------------------------------------|
| Next.js        | MacBook  | 3000  | User-facing frontend                 |
| n8n            | MacBook  | 5678  | Workflow orchestration                |
| Ollama         | ASUS     | 11434 | LLM inference (Llama 3 8B)           |
| Qdrant         | ASUS     | 6333  | Vector storage and similarity search |
| Docling        | ASUS     | 5001  | Document parsing (PDF → structured)  |
| Airtable       | Cloud    | —     | Shared data layer / state management |

**Network Notes:**

- n8n calls ASUS services at `http://<ASUS_LOCAL_IP>:<PORT>`
- Frontend only talks to n8n at `http://localhost:5678/webhook/*`
- For demo day: Cloudflare Tunnel exposes n8n webhooks, Vercel hosts frontend
- Both machines must be on the same network during development and demo

---

## 3. Agent & Workflow Registry

### 3.1 Orchestrator (AI-Light)

**Purpose:** Central routing layer. Receives all user requests, classifies intent, routes to the correct agent sub-workflow.

**Trigger:** Webhook — `POST /webhook/orchestrator`

**Flow:**
```
User request (frontend)
  → Webhook receives { message, context, session_id }
  → Single Ollama call: classify intent from message
     → Expected output: { agent: "docmentor|review|digest|file", confidence: 0.0-1.0 }
  → Switch node routes to correct agent sub-workflow
  → Agent sub-workflow executes
  → Response returned to frontend
  → Log interaction to Airtable (interactions table)
```

**Ollama System Prompt:**
```
You are an intent classifier. Given a user message, determine which agent should handle it.
Respond ONLY with valid JSON: { "agent": "<agent_name>", "confidence": <0.0-1.0> }

Agents:
- docmentor: Questions about uploaded documents, "what does the doc say about..."
- review: Analyzing reviews, sentiment, extracting patterns from review text
- digest: Setting up content digests, topic subscriptions, "send me updates about..."
- file: Uploading files, processing documents, "parse this PDF"
- general: Anything that doesn't fit the above

Do not explain. JSON only.
```

**n8n Patterns:** Webhook trigger, HTTP Request (Ollama), Switch node, Execute Sub-workflow, Respond to Webhook

---

### 3.2 DocMentor — RAG Agent (AI-Heavy)

**Purpose:** Upload documents, parse them, store in vector DB, then chat with them using RAG.

**Triggers:**
- Upload: `POST /webhook/docmentor/upload`
- Query: `POST /webhook/docmentor/query`

**Upload Flow:**
```
User uploads document (frontend)
  → Webhook receives file + metadata
  → File Intake Pipeline processes the file (see 3.5)
  → Docling parses to structured text
  → Text chunked (500 tokens, 50 token overlap)
  → Each chunk embedded via Ollama embeddings endpoint
  → Chunks + vectors stored in Qdrant (collection: "docmentor")
  → Document record created in Airtable (documents table, status: "indexed")
  → Response: { document_id, chunk_count, status: "indexed" }
```

**Query Flow:**
```
User asks a question (frontend)
  → Webhook receives { query, session_id, document_filter? }
  → Query embedded via Ollama embeddings
  → Qdrant similarity search (top 5 chunks)
  → Retrieved chunks assembled into context
  → Ollama chat completion with:
      system: "Answer based on the provided context. Cite which document."
      user: "Context: {chunks}\n\nQuestion: {query}"
  → Response returned to frontend
  → Log interaction to Airtable
```

**n8n Patterns:** Webhook, HTTP Request (Docling, Ollama, Qdrant), Code node (chunking), Loop (embed each chunk), Respond to Webhook

---

### 3.3 Review Analyst (AI-Heavy)

**Purpose:** Takes restaurant/product review text, extracts structured insights — sentiment, key themes, pros/cons, rating prediction.

**Trigger:** Webhook — `POST /webhook/review/analyze`

**Flow:**
```
User submits review text or URL (frontend)
  → Webhook receives { text, source?, type: "restaurant|product|service" }
  → Validate input (not empty, within length limits)
  → Ollama call with structured extraction prompt:
      system: "Extract structured analysis from this review..."
      → Output: {
           sentiment: "positive|negative|mixed",
           sentiment_score: 0.0-1.0,
           key_themes: ["theme1", "theme2"],
           pros: ["..."],
           cons: ["..."],
           predicted_rating: 1-5,
           summary: "one sentence summary"
         }
  → Parse and validate JSON output
  → Write to Airtable (reviews table)
  → Return structured result to frontend
  → Log interaction
```

**Ollama System Prompt:**
```
You are a review analyst. Analyze the following review and extract structured insights.
Respond ONLY with valid JSON matching this schema:
{
  "sentiment": "positive|negative|mixed",
  "sentiment_score": <0.0 to 1.0>,
  "key_themes": ["<theme>", ...],
  "pros": ["<pro>", ...],
  "cons": ["<con>", ...],
  "predicted_rating": <1-5>,
  "summary": "<one sentence>"
}
Do not explain. JSON only.
```

**n8n Patterns:** Webhook, input validation (IF node), HTTP Request (Ollama), Code node (JSON parse + validation), Airtable write, error branch for malformed AI output

---

### 3.4 Digest Agent (AI-Light)

**Purpose:** User configures topics of interest. A scheduled workflow fetches content from RSS feeds or web sources, aggregates it, generates a summary via one LLM call, and emails the digest.

**Triggers:**
- Configure: `POST /webhook/digest/configure` (webhook)
- Execute: Cron trigger (daily or user-defined schedule)
- Fetch latest: `GET /webhook/digest/latest`

**Configuration Flow:**
```
User sets up a digest (frontend)
  → Webhook receives { topics: ["AI", "n8n"], frequency: "daily", email: "user@..." }
  → Validate input
  → Write config to Airtable (digests table, status: "active")
  → Return confirmation
```

**Scheduled Execution Flow:**
```
Cron triggers (e.g., daily 8:00 AM)
  → Query Airtable: all digests where status = "active"
  → For each active digest:
      → Fetch RSS feeds / news APIs matching topics (HTTP Request nodes)
      → Aggregate top 10 items (Code node: deduplicate, sort by relevance)
      → Single Ollama call: "Summarize these 10 items into a concise digest"
      → Format digest as HTML email
      → Send via email node (Gmail SMTP or similar)
      → Update Airtable: last_sent_at, item_count, status
      → Log interaction
```

**n8n Patterns:** Cron trigger, Airtable read (filtered), HTTP Request (RSS/APIs), Code node (aggregation), HTTP Request (Ollama — single call), Email send, Loop (per digest config), Airtable update

---

### 3.5 File Intake Pipeline (Minimal AI)

**Purpose:** Receives uploaded files, detects type, routes to appropriate processing path, chunks text, generates embeddings, stores in Qdrant. Serves as the ingestion engine for DocMentor and any future agents.

**Trigger:** Webhook — `POST /webhook/file/upload`

**Flow:**
```
File received via webhook
  → Detect file type (Code node: check extension + MIME type)
  → Switch node routes by type:
      ├── PDF → Send to Docling API → Get structured markdown
      ├── TXT/MD → Read directly
      ├── CSV/JSON → Parse, validate schema
      └── Unsupported → Return error, log to Airtable
  → Create document record in Airtable (documents table, status: "processing")
  → Chunk text (Code node: recursive character splitter)
  → Generate embeddings (HTTP Request → Ollama /api/embeddings)
  → Store in Qdrant (HTTP Request → Qdrant REST API)
  → Update Airtable: status = "indexed", chunk_count, vector_collection
  → Return { document_id, status, chunk_count }
  → Error branch: status = "error", log error details
```

**n8n Patterns:** Webhook, Code node (type detection), Switch node (routing), HTTP Request (Docling, Ollama embeddings, Qdrant), Airtable CRUD, Error branch with logging

---

### 3.6 System Health Monitor (No AI)

**Purpose:** Periodically checks if all services are alive and responsive. Logs results to Airtable. Sends alert if a service goes down.

**Trigger:** Cron — every 5 minutes

**Flow:**
```
Cron triggers
  → HTTP Request: GET http://<ASUS_IP>:11434/api/tags (Ollama health)
  → HTTP Request: GET http://<ASUS_IP>:6333/healthz (Qdrant health)
  → HTTP Request: GET http://<ASUS_IP>:5001/health (Docling health)
  → HTTP Request: GET http://localhost:5678/healthz (n8n self-check)
  → Code node: aggregate results
      {
        timestamp: "...",
        ollama: { status: "up|down", response_ms: 45 },
        qdrant: { status: "up|down", response_ms: 12 },
        docling: { status: "up|down", response_ms: 23 },
        n8n: { status: "up|down", response_ms: 5 },
        all_healthy: true|false
      }
  → Write to Airtable (health_logs table)
  → IF all_healthy = false:
      → Send alert (email or Discord webhook)
  → Expose latest status: GET /webhook/health/status
```

**n8n Patterns:** Cron trigger, multiple HTTP Request nodes (with timeout settings), Code node (aggregation + response time measurement), IF node (alerting), Airtable write, Webhook (status endpoint)

---

### 3.7 Interaction Analytics (No AI)

**Purpose:** Aggregates interaction logs from Airtable into summary statistics. Provides data for the frontend analytics dashboard.

**Trigger:**
- Scheduled: Cron — runs hourly
- On-demand: `GET /webhook/analytics/summary`

**Scheduled Flow:**
```
Cron triggers
  → Read Airtable: all interactions in last 24 hours
  → Code node: compute aggregates
      {
        total_interactions: 142,
        by_agent: { docmentor: 45, review: 30, digest: 12, ... },
        avg_response_time_ms: 2340,
        error_rate: 0.03,
        peak_hour: 14,
        most_queried_document: "textbook_ch3.pdf"
      }
  → Write summary to Airtable (analytics table)
```

**On-demand Flow:**
```
GET /webhook/analytics/summary
  → Read latest analytics record from Airtable
  → Return JSON to frontend
```

**n8n Patterns:** Cron trigger, Airtable read (with date filter), Code node (aggregation logic), Airtable write, Webhook (GET endpoint)

---

### 3.8 Cleanup Workflow (No AI)

**Purpose:** Maintenance automation. Prunes old vectors from Qdrant, archives stale Airtable records, keeps the system lean.

**Trigger:** Cron — daily at 2:00 AM

**Flow:**
```
Cron triggers
  → Qdrant: delete vectors older than 30 days (HTTP Request + filter)
  → Airtable: find interactions older than 30 days
      → Archive (move status to "archived") or delete
  → Airtable: find health_logs older than 7 days
      → Delete old logs
  → Airtable: find documents with status = "error" older than 7 days
      → Clean up orphaned records
  → Log cleanup results to Airtable:
      { vectors_pruned: 150, records_archived: 45, logs_deleted: 200 }
```

**n8n Patterns:** Cron trigger, HTTP Request (Qdrant delete API), Airtable read + delete/update, Code node (date calculations), logging

---

## 4. Airtable Schema

### 4.1 Table: interactions

The central log of every agent call. All agents write here.

| Field               | Type          | Written By    | Notes                                    |
|---------------------|---------------|---------------|------------------------------------------|
| record_id           | Autonumber    | Auto          | Primary key                              |
| created_at          | Date+time     | Auto          | When interaction occurred                |
| session_id          | Single Line   | All agents    | Groups interactions by user session      |
| agent               | Single Select | Orchestrator  | docmentor, review, digest, file, system  |
| input_preview       | Long Text     | All agents    | First 200 chars of user input            |
| output_preview      | Long Text     | All agents    | First 200 chars of agent response        |
| response_time_ms    | Number        | All agents    | End-to-end response time                 |
| status              | Single Select | All agents    | success, error, timeout                  |
| error_message       | Long Text     | All agents    | Populated only on error                  |
| source              | Single Line   | All agents    | Which workflow generated this            |

### 4.2 Table: documents

Tracks all uploaded files and their processing state.

| Field               | Type          | Written By      | Notes                                  |
|---------------------|---------------|-----------------|----------------------------------------|
| record_id           | Autonumber    | Auto            | Primary key                            |
| created_at          | Date+time     | Auto            | When uploaded                          |
| status              | Single Select | File Intake     | uploaded → processing → indexed → error|
| file_name           | Single Line   | File Intake     | Original filename                      |
| file_type           | Single Select | File Intake     | pdf, txt, md, csv, json               |
| file_size_bytes     | Number        | File Intake     | Size in bytes                          |
| chunk_count         | Number        | File Intake     | Number of text chunks created          |
| vector_collection   | Single Line   | File Intake     | Qdrant collection name                 |
| parsed_at           | Date+time     | File Intake     | When Docling finished parsing          |
| indexed_at          | Date+time     | File Intake     | When vectors were stored               |
| error_message       | Long Text     | File Intake     | Populated only on error                |
| source              | Single Line   | File Intake     | upload, api, scheduled                 |

### 4.3 Table: reviews

Stores review analysis results.

| Field               | Type          | Written By      | Notes                                  |
|---------------------|---------------|-----------------|----------------------------------------|
| record_id           | Autonumber    | Auto            | Primary key                            |
| created_at          | Date+time     | Auto            | When submitted                         |
| status              | Single Select | Review Analyst  | submitted → analyzing → complete → error|
| raw_text            | Long Text     | Review Analyst  | Original review text                   |
| review_type         | Single Select | Review Analyst  | restaurant, product, service           |
| sentiment           | Single Select | Review Analyst  | positive, negative, mixed              |
| sentiment_score     | Number        | Review Analyst  | 0.0 – 1.0                             |
| key_themes          | Long Text     | Review Analyst  | JSON array of themes                   |
| pros                | Long Text     | Review Analyst  | JSON array of pros                     |
| cons                | Long Text     | Review Analyst  | JSON array of cons                     |
| predicted_rating    | Number        | Review Analyst  | 1–5                                    |
| summary             | Long Text     | Review Analyst  | One-sentence summary                   |
| analyzed_at         | Date+time     | Review Analyst  | When analysis completed                |
| source              | Single Line   | Review Analyst  | frontend, api                          |

### 4.4 Table: digests

Stores digest configurations and execution history.

| Field               | Type          | Written By      | Notes                                  |
|---------------------|---------------|-----------------|----------------------------------------|
| record_id           | Autonumber    | Auto            | Primary key                            |
| created_at          | Date+time     | Auto            | When config was created                |
| status              | Single Select | Digest Agent    | active, paused, error                  |
| topics              | Long Text     | Digest Agent    | JSON array of topic strings            |
| frequency           | Single Select | Digest Agent    | daily, weekly                          |
| email               | Email         | Digest Agent    | Delivery email address                 |
| last_sent_at        | Date+time     | Digest Agent    | When last digest was sent              |
| item_count          | Number        | Digest Agent    | Items in last digest                   |
| last_digest_content | Long Text     | Digest Agent    | HTML content of last sent digest       |
| error_message       | Long Text     | Digest Agent    | Populated only on error                |
| source              | Single Line   | Digest Agent    | frontend, api                          |

### 4.5 Table: health_logs

Service health check results.

| Field               | Type          | Written By      | Notes                                  |
|---------------------|---------------|-----------------|----------------------------------------|
| record_id           | Autonumber    | Auto            | Primary key                            |
| created_at          | Date+time     | Auto            | When check ran                         |
| all_healthy         | Checkbox      | Health Monitor  | True if all services responded         |
| ollama_status       | Single Select | Health Monitor  | up, down                               |
| ollama_ms           | Number        | Health Monitor  | Response time in ms                    |
| qdrant_status       | Single Select | Health Monitor  | up, down                               |
| qdrant_ms           | Number        | Health Monitor  | Response time in ms                    |
| docling_status      | Single Select | Health Monitor  | up, down                               |
| docling_ms          | Number        | Health Monitor  | Response time in ms                    |
| n8n_status          | Single Select | Health Monitor  | up, down                               |
| n8n_ms              | Number        | Health Monitor  | Response time in ms                    |

### 4.6 Table: analytics

Aggregated usage statistics.

| Field               | Type          | Written By      | Notes                                  |
|---------------------|---------------|-----------------|----------------------------------------|
| record_id           | Autonumber    | Auto            | Primary key                            |
| created_at          | Date+time     | Auto            | When summary was computed              |
| period              | Single Select | Analytics       | hourly, daily                          |
| total_interactions  | Number        | Analytics       | Total interactions in period           |
| by_agent            | Long Text     | Analytics       | JSON: { agent: count }                 |
| avg_response_ms     | Number        | Analytics       | Average response time                  |
| error_rate          | Number        | Analytics       | Percentage of errors (0.0 – 1.0)      |
| peak_hour           | Number        | Analytics       | Hour with most interactions (0-23)     |
| top_document        | Single Line   | Analytics       | Most queried document                  |

---

## 5. Webhook API Contract

All frontend communication goes through these endpoints. Every endpoint is an n8n webhook node.

### 5.1 Synchronous Endpoints (immediate response)

```
POST /webhook/orchestrator
  Body: { "message": "string", "session_id": "string" }
  Response: { "agent": "string", "response": "string", "session_id": "string" }

POST /webhook/review/analyze
  Body: { "text": "string", "type": "restaurant|product|service" }
  Response: { "sentiment": "...", "sentiment_score": 0.0, ... }

POST /webhook/digest/configure
  Body: { "topics": ["string"], "frequency": "daily|weekly", "email": "string" }
  Response: { "digest_id": "string", "status": "active" }

GET /webhook/digest/latest
  Response: { "digest_id": "string", "content": "html", "sent_at": "datetime" }

GET /webhook/health/status
  Response: { "ollama": {...}, "qdrant": {...}, "docling": {...}, "all_healthy": true }

GET /webhook/analytics/summary
  Response: { "total_interactions": 0, "by_agent": {...}, ... }
```

### 5.2 Asynchronous Endpoints (job-based pattern)

For long-running tasks. Frontend receives a job ID and polls for completion.

```
POST /webhook/file/upload
  Body: multipart/form-data (file + metadata)
  Response: { "job_id": "string", "status": "processing" }

POST /webhook/docmentor/query
  Body: { "query": "string", "session_id": "string", "document_filter": "string?" }
  Response: { "job_id": "string", "status": "processing" }

GET /webhook/job/{job_id}
  Response: { "job_id": "string", "status": "processing|complete|error", "result": {...} }
```

**Async Pattern in n8n:**
```
Webhook receives request
  → Generate job_id (Code node: uuid)
  → Write job record to Airtable (status: "processing")
  → Respond to Webhook immediately: { job_id, status: "processing" }
  → Continue processing in background (Execute Workflow node, async)
  → On completion: update Airtable job record (status: "complete", result: {...})

Separate webhook: GET /webhook/job/{job_id}
  → Read job record from Airtable by job_id
  → Return current status and result (if complete)
```

---

## 6. Frontend Pages

| Page              | Purpose                                    | Primary Webhook                  |
|-------------------|--------------------------------------------|----------------------------------|
| Dashboard         | Overview: recent activity, system status   | analytics/summary, health/status |
| DocMentor         | Chat interface for document Q&A            | docmentor/query, file/upload     |
| Review Analyst    | Submit reviews, view analysis results      | review/analyze                   |
| Digest Manager    | Configure topics, view past digests        | digest/configure, digest/latest  |
| File Manager      | Upload/manage documents                    | file/upload, job/{id}            |
| System Status     | Live health check dashboard                | health/status                    |
| Analytics         | Usage charts and statistics                | analytics/summary                |

---

## 7. Ollama Configuration

**Model:** Llama 3 8B (Q4_K_M quantization)

**Why:** Best balance of quality and speed on RTX 4060 8GB. Expect ~30 tokens/sec.

**Endpoints used:**
```
POST http://<ASUS_IP>:11434/api/chat        → Agent conversations
POST http://<ASUS_IP>:11434/api/embeddings  → Vector embeddings (for RAG)
GET  http://<ASUS_IP>:11434/api/tags        → Health check / model list
```

**All agents share the same model. Differentiation is by system prompt only.**

**Embedding model:** `nomic-embed-text` (runs alongside Llama 3, small enough to coexist in VRAM)

---

## 8. Qdrant Configuration

**Collections:**
```
docmentor       → Document chunks for RAG (primary collection)
                   vector_size: 768 (nomic-embed-text output)
                   distance: Cosine
```

**Key operations from n8n:**
```
PUT  http://<ASUS_IP>:6333/collections/{name}          → Create collection
POST http://<ASUS_IP>:6333/collections/{name}/points   → Upsert vectors
POST http://<ASUS_IP>:6333/collections/{name}/points/search → Search
DELETE http://<ASUS_IP>:6333/collections/{name}/points  → Delete (cleanup)
GET  http://<ASUS_IP>:6333/healthz                      → Health check
```

---

## 9. Docling Configuration

Docling runs as a REST API service on the ASUS laptop.

**Key endpoint:**
```
POST http://<ASUS_IP>:5001/convert
  Body: multipart/form-data (file)
  Response: { "markdown": "...", "metadata": {...} }
```

**Supported formats:** PDF, DOCX, PPTX, HTML, images (with OCR)

---

## 10. Demo Day Setup

### Pre-Demo Checklist

**ASUS Laptop:**
- [ ] Ollama running with Llama 3 8B loaded (`ollama run llama3`)
- [ ] Nomic-embed-text pulled (`ollama pull nomic-embed-text`)
- [ ] Qdrant running (Docker or binary)
- [ ] Docling API running
- [ ] Note ASUS local IP address

**MacBook:**
- [ ] n8n running, all workflows active
- [ ] n8n environment variables set (ASUS_IP, Airtable API key)
- [ ] Frontend running or deployed to Vercel
- [ ] Cloudflare Tunnel active (if remote demo)
- [ ] Test data loaded in Airtable
- [ ] Run one end-to-end test through each agent

### Demo Script Outline

1. Show the dashboard — system health all green
2. Upload a document → show File Intake processing → status updates in real-time
3. Ask DocMentor a question about the uploaded doc → RAG in action
4. Submit a review → show structured extraction result
5. Show digest configuration → show a previously generated digest email
6. Show analytics page — interaction counts, response times
7. Kill Ollama on ASUS → health monitor catches it → alert fires → restart → recovers

Step 7 is the wow moment — showing resilience and observability in a live demo.

---

## 11. Build Order (Recommended)

| Priority | Workflow / Component      | Why First                                        |
|----------|---------------------------|--------------------------------------------------|
| 1        | System Health Monitor     | Validates all services are connected and talking |
| 2        | File Intake Pipeline      | Foundation — everything else depends on files    |
| 3        | DocMentor (RAG)           | Core showcase agent, depends on file intake      |
| 4        | Orchestrator              | Routes to agents — build after agents exist      |
| 5        | Review Analyst            | Independent, can build in parallel               |
| 6        | Interaction Analytics     | Needs interaction data, build after agents work  |
| 7        | Digest Agent              | Scheduled, can build independently               |
| 8        | Cleanup Workflow          | Last — maintenance, low demo priority            |
| 9        | Frontend                  | Build incrementally as each webhook stabilizes   |

**Rationale:** Start with health monitor because it proves your infrastructure works. Then build the ingestion pipeline, then the agents that consume it. Frontend grows alongside.

---

## 12. Tech Stack Summary

| Layer          | Technology                  | Role                          |
|----------------|-----------------------------|-------------------------------|
| Frontend       | Next.js + TypeScript        | User interface                |
| Orchestration  | n8n (self-hosted)           | Workflow engine               |
| LLM            | Ollama + Llama 3 8B         | Local AI inference            |
| Embeddings     | Ollama + nomic-embed-text   | Vector embeddings for RAG     |
| Vector Store   | Qdrant                      | Similarity search             |
| Doc Parsing    | Docling                     | PDF/DOCX → structured text   |
| Data Layer     | Airtable                    | State management, logging     |
| Hosting (demo) | Vercel + Cloudflare Tunnel  | Public access for demo day    |
| Version Control| GitHub                      | Code + workflow JSONs         |