# n8n Workflow Screenshots

Screenshots of all 9 Nexus workflows in the n8n editor, plus the overview dashboard and terminal testing.

## Overview

### n8n_overview_dashboard_stats.png
The n8n Overview dashboard showing platform-wide execution stats: 300 production executions, 15 failed (5% failure rate), and 1.7s average run time. Below is the workflow list sorted by last updated, showing all 9 workflows with their tags and "Published" status.

### n8n_workflow_list_top.png
Top half of the workflow list showing 6 workflows: Nexus_File Intake Pipeline (files, ingestion), Nexus_System Health Monitor (health, monitoring), Nexus_Interaction Analytics (analytics), Nexus_Review Analyst (analysis, review), Nexus_DocMentor RAG Agent (docmentor, rag), and Nexus_Orchestrator (routing, orchestrator). All marked as Personal and Published.

### n8n_workflow_list_bottom.png
Bottom half of the workflow list showing the remaining 3 workflows: Nexus_Cleanup Workflow (maintenance, cleanup), Nexus_Digest Agent (digest, scheduled), and Nexus_Job Status Endpoint (jobs, utility). All marked as Personal and Published.

## Individual Workflows

### n8n_workflow_orchestrator.png
The **Orchestrator** workflow (16 nodes) — the central routing brain. Flow: POST /orchestrator webhook → Extract Input → Classify Intent (Ollama) → Parse Intent → Check Confidence → Route to Agent (switch node branching to Call DocMentor, Call Review Analyst, Call Digest, File Upload Redirect, or General Chat) → Format Response → Respond → Log Interaction. A low-confidence branch goes to Flag for Review → Low Confidence Response.

### n8n_workflow_file_intake_pipeline.png
The **File Intake Pipeline** workflow (~15 nodes) — handles document ingestion. Flow: POST /file/upload webhook → Generate Job ID → Create Job Record → Extract File Type → Route by Type → Parse Text Content → Create Document Record → Code: Wait → Embed via Qdrant → Create Indexed → Create Vectors → Prepare Success Update → Update Job Complete → Log Interaction. Includes a sub-branch for unsupported file type handling and an independent "Update Job Error" path.

### n8n_workflow_docmentor_rag_agent.png
The **DocMentor RAG Agent** workflow (~12 nodes) — document Q&A with retrieval-augmented generation. Two pipelines: (1) Upload delegation: POST /docmentor/upload → Delegate to File Intake → Respond Upload. (2) Query pipeline: POST /docmentor/query → Generate Query Job ID → Respond with Job ID → Embed Query → Search Qdrant → Assemble Context → Ollama RAG Chat → Extract Answer → Update Job Complete → Log Query Interaction.

### n8n_workflow_digest_agent.png / n8n_workflow_digest.png
The **Digest Agent** workflow (~35 nodes) — three pipelines visible: (1) Configure: POST /digest/configure → Validate Config → Save Digest Config → Respond Config Saved (with error branch). (2) Scheduled: Daily 8AM cron → Read Active Digests → Loop Digests → Prepare Digest Query → Fetch News/RSS → Aggregate Top Items → Summarize via Ollama → Format HTML Email → Update Digest Record → Log Digest Interaction. (3) Latest: GET /digest/latest → Read Latest Digest → Format Latest Response → Respond Latest Digest. Two screenshots show slightly different zoom levels of the same workflow.

### n8n_workflow_review_analyst.png
The **Review Analyst** workflow (8 nodes) — sentiment analysis pipeline. Flow: POST /review/analyze → Validate Input → Prepare Request → Analyze Review (Ollama) → Parse Analysis → Write Review Record (Airtable) → Respond with Analysis → Log Interaction. Includes an error branch for empty input.

### n8n_workflow_system_health_monitor.png
The **System Health Monitor** workflow (~12 nodes) — two pipelines: (1) Scheduled monitoring: Every 5 Minutes cron → parallel HTTP checks to Ollama, Qdrant, Docling, n8n → Aggregate Results → Log to Airtable → Any Service Down? → Send Alert (conditional). (2) On-demand status: GET /health/status → Read Latest Health → sequential checks (Check Ollama1, Check Qdrant1, Check Docling1) → Format Live Status → Respond Health Status.

### n8n_workflow_interaction_analytics.png
The **Interaction Analytics** workflow (8 nodes) — two pipelines: (1) Hourly cron → Read Recent Interactions (Airtable) → Compute Aggregates (Code node) → Write Analytics Record. (2) GET /analytics/summary → Read Latest Analytics → Format Analytics Response → Respond Analytics.

### n8n_workflow_cleanup.png
The **Cleanup Workflow** (~10 nodes) — automated maintenance. Daily 2AM cron → Calculate Cutoff Dates → three parallel branches: Find Old Interactions → Archive Old Interactions, Find Old Health Logs → Count Old Health Logs, Find Error Documents → Count Error Documents. All branches converge on → Aggregate Results → Log Cleanup Results (Airtable).

### n8n_workflow_job_status_endpoint.png
The **Job Status Endpoint** workflow (4 nodes) — simple polling endpoint. GET /job/:id → Read Job Record (Airtable lookup) → Format Response (Code node) → Respond Job Status. The frontend polls this endpoint to check async job completion.

## Terminal Testing

### n8n_terminal_curl_testing.png
Terminal window showing extensive `curl` testing of n8n webhook endpoints during development. Includes POST requests to `/webhook/file/upload` (file uploads with multipart form data), `/webhook/docmentor/query` (document Q&A queries), and various debug iterations. Shows both successful JSON responses and error messages during the workflow development process.
