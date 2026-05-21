# Airtable Screenshots

Screenshots of the Nexus Base in Airtable, showing all 6 data tables used by the platform.

### airtable_interactions_table.png
The **interactions** table — the primary activity log for the platform. Each row is a single agent call with columns for session_id, agent name, input/output previews, response_time_ms, status (success/needs_review), source workflow, error_message, and created_at timestamp. Shows 186+ records across all agents (docmentor, file, review, digest, system, general). Includes two filtered views: "Error Monitor" for flagging failures and "Pipeline Status" for tracking processing state.

### airtable_documents_table.png
The **documents** table — tracks every file processed through the File Intake Pipeline. Columns include file_name, file_type (txt/docx/pdf), file_size_bytes, processing status, source, vector_collection name, chunk_count, parsed_at, and indexed_at timestamps. Shows 54 records including test uploads and sample topic files (AI healthcare, cloud computing, data engineering, biotechnology, etc.).

### airtable_jobs_table.png
The **jobs** table — async job tracking for long-running operations. Each row has a unique job_id (UUID), status (processing/complete), workflow_type (file_intake or docmentor_query), result payload, and created_at/completed_at timestamps. The frontend polls this table via the Job Status Endpoint workflow to update the UI when async tasks finish. Shows 102 total jobs.

### airtable_digests_table.png
The **digests** table — stores digest subscription configurations and generated content. Columns for email, topics (JSON array), frequency (daily/weekly), status (active), last_sent_at, item_count, last_digest_content (HTML), and error_message. Shows active subscriptions from multiple test emails with topics spanning AI, n8n, automation, robotics, and more.

### airtable_health_logs_table.png
The **health_logs** table — records from the System Health Monitor workflow that runs every 5 minutes. Each row logs the timestamp, all_healthy flag, and per-service status and latency for Ollama, Qdrant, Docling, and n8n. Green "up" and red "down" status indicators are visible in the grid. 522 total health check records.

### airtable_analytics_table.png
The **analytics** table — hourly snapshots of platform-wide usage metrics computed by the Interaction Analytics workflow. Columns include total_interactions, period (hourly), by_agent (JSON breakdown), avg_response_ms, error_rate, peak_hour, and top_document. Shows the analytics growing over time from 5 to 97 total interactions across snapshots.
