# Nexus — Personal AI Agent Platform

## Architecture

n8n orchestration backbone, Ollama (Llama 3 8B) for inference, Qdrant for vectors, Docling for doc parsing, Airtable for state management, Next.js frontend.

## Infrastructure

- **MacBook Air M4** runs n8n (Docker, port 5678) and Next.js frontend (port 3002).
- **ASUS gaming laptop (RTX 4060)** runs Ollama (port 11434), Qdrant (port 6333), Docling (port 5001).
- Connected over LAN at `192.168.1.93`.

## Workflows

9 workflows built, tested, and published:

1. **System Health Monitor** — cron every 5 min, checks all services, writes to Airtable. `GET /webhook/health/status` does live sequential checks.
2. **File Intake Pipeline** — webhook upload, detects type, extracts text in Generate Job ID, single-chunk approach, embeds via Ollama nomic-embed-text, stores in Qdrant.
3. **DocMentor RAG** — upload proxy to File Intake + query flow (embed query -> Qdrant search -> assemble context -> Ollama chat -> return answer).
4. **Review Analyst** — validates input, sends to Ollama for structured extraction (sentiment, pros, cons, rating, summary), writes to Airtable.
5. **Orchestrator** — intent classification via Ollama, Switch node routes to agent sub-workflows via production webhook URLs.
6. **Digest Agent** — configure topics via webhook, cron fetches Google News RSS, Ollama summarizes, stores in Airtable.
7. **Interaction Analytics** — cron hourly aggregates interactions from Airtable, `GET` endpoint returns latest summary.
8. **Cleanup Workflow** — cron daily 2AM, prunes old vectors/records/logs.
9. **Job Status Endpoint** — `GET /webhook/job-status/job/:job_id` returns async job status from Airtable.

## Key Environment Variables (n8n Docker)

- `OLLAMA_URL`
- `QDRANT_URL`
- `DOCLING_URL`
- `N8N_URL`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_API_KEY`
- `N8N_CORS_ALLOW_ORIGIN=http://localhost:3002`

## Airtable Tables

`interactions`, `documents`, `reviews`, `digests`, `health_logs`, `analytics`, `jobs`

## Current State

All 9 workflows published and frontend connected — System Status (4/4 UP), DocMentor chat working, Review Analyst partially working (Parse Analysis needs fix). Remaining: test Dashboard, Digests, Files, Analytics pages. Cloudflare Tunnel not yet configured.

## Known Issues

- Review Analyst Parse Analysis JSON extraction
- Health checks show 0ms latency
- Prompt tuning needed for DocMentor responses
