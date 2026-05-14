[README.md](https://github.com/user-attachments/files/27770371/README.md)
# Nexus — Personal AI Agent Platform

A self-hosted, multi-agent AI platform orchestrated entirely through n8n. Nexus lets users interact with specialized AI agents through a unified frontend — upload documents, ask questions via RAG, analyze reviews, receive automated content digests, and monitor system health — all powered by local LLM inference with zero paid API costs.

## Architecture

![Architecture Diagram](docs/architecture.png)

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | Next.js + TypeScript | User interface |
| Orchestration | n8n (self-hosted) | Workflow engine |
| LLM | Ollama + Llama 3 8B | Local AI inference |
| Embeddings | Ollama + nomic-embed-text | Vector embeddings for RAG |
| Vector Store | Qdrant | Similarity search |
| Doc Parsing | Docling | PDF/DOCX → structured text |
| Data Layer | Airtable | State management, logging |
| Hosting | Vercel + Cloudflare Tunnel | Demo day access |

## Infrastructure

- **MacBook Air M4** — n8n orchestration, Next.js frontend
- **ASUS Gaming Laptop (RTX 4060)** — Ollama, Qdrant, Docling
- Connected over LAN; single Llama 3 8B model in VRAM, multiple agents differentiated by system prompts

## Workflows

| # | Workflow | Type | Purpose |
|---|---------|------|---------|
| 1 | System Health Monitor | No AI | Checks all services every 5 min, alerts on failure |
| 2 | File Intake Pipeline | Minimal AI | Parses uploads, chunks text, embeds, stores in Qdrant |
| 3 | DocMentor RAG | AI-Heavy | Chat with uploaded documents using retrieval-augmented generation |
| 4 | Review Analyst | AI-Heavy | Extracts sentiment, pros/cons, rating from review text |
| 5 | Orchestrator | AI-Light | Classifies intent, routes to correct agent |
| 6 | Digest Agent | AI-Light | Scheduled content digests from RSS feeds |
| 7 | Interaction Analytics | No AI | Aggregates usage stats from Airtable |
| 8 | Cleanup Workflow | No AI | Prunes old vectors, archives stale records |
| 9 | Job Status Endpoint | No AI | Returns async job status for long-running tasks |

## Components

| Component | Owner | Description |
|-----------|-------|-------------|
| Data Ingestion | Deon | File Intake Pipeline — upload, parse, chunk, embed, store |
| AI Analysis | Deon | DocMentor RAG + Review Analyst — document Q&A and structured extraction |
| Orchestration | Deon | Orchestrator, Health Monitor, Analytics, Digest, Cleanup — routing, scheduling, monitoring |
| Interface | Deon | Next.js frontend — dashboard, chat, review submission, system status |

## Project Structure

```
├── .github/                    # Copilot instructions
├── deliverables/checkpoint2/   # Lab deliverables and screenshots
├── docs/                       # Architecture doc, proposal, diagrams
├── frontend/                   # Next.js application
├── n8n-workflows/              # All 9 workflow JSON exports
├── scripts/                    # Setup and utility scripts
├── .env.example                # Environment variable template
└── .gitignore
```

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env` and fill in your values
3. Start ASUS services: `docker compose up -d` (Qdrant + Docling), launch Ollama
4. Start n8n on MacBook: `docker compose up -d`
5. Import workflow JSONs into n8n and activate all 9
6. Start frontend: `cd frontend && npm run dev`

## Documentation

- [Architecture Document](docs/Architecture.md)
- [Project Proposal](docs/proposal.md)
- [Architecture Diagram](docs/architecture.png)
