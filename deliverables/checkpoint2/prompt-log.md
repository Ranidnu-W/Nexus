# Checkpoint 2 — AI Prompt Log

## Entry 1: Binary Data Loss Through Airtable Nodes

**Prompt/Question Asked:**
File Intake Pipeline uploads a file via webhook, but after the Airtable "Create Document Record" node, the binary data (file content) is gone. Downstream nodes can't access the uploaded file text. How do I preserve file data through Airtable operations?

**What the AI Suggested:**
Move the text extraction step earlier in the pipeline — extract the file's text content in the Generate Job ID Code node, before any Airtable writes happen. Store the extracted text as a JSON property on the item so it survives Airtable node execution, which strips binary data from the item.

**Did It Work?**
Yes. By extracting the text content in the Generate Job ID node (which runs before Airtable), the text was available as a regular JSON string property throughout the rest of the workflow. Binary data was no longer needed downstream.

**What Was Learned:**
n8n Airtable nodes strip binary data from items after execution. Any binary content (uploaded files, images) must be read and converted to text/JSON before passing through Airtable nodes. Design pipelines to extract what you need from binaries early.

---

## Entry 2: n8n Code Node Memory Errors on Chunking

**Prompt/Question Asked:**
The Code node that chunks document text into 500-token segments with 50-token overlap is throwing memory errors and crashing the n8n worker. The task runner process dies. How do I fix chunking in n8n?

**What the AI Suggested:**
Two fixes: (1) Simplify to a single-chunk approach for now — instead of splitting into many chunks, treat the entire document as one chunk. This avoids the memory-intensive array operations. (2) Disable the n8n task runner by setting `N8N_RUNNERS_ENABLED=false` in Docker environment variables, which prevents the separate runner process from hitting memory limits.

**Did It Work?**
Yes. Disabling the task runner and using single-chunk embedding resolved all memory crashes. Documents are now embedded as a single vector, which works for the test file size (402 bytes). For larger documents, a proper chunking strategy with streaming would be needed.

**What Was Learned:**
n8n's Code node task runner has strict memory limits and can't handle large array operations well. For MVP/demo purposes, simplifying the approach is better than fighting the runtime. `N8N_RUNNERS_ENABLED=false` runs code in the main n8n process which has more memory available.

---

## Entry 3: CORS Between Next.js and n8n

**Prompt/Question Asked:**
Next.js frontend on port 3002 is getting CORS errors when calling n8n webhook endpoints on port 5678. The browser blocks the requests. How do I configure CORS for n8n in Docker?

**What the AI Suggested:**
Add the `N8N_CORS_ALLOW_ORIGIN` environment variable to the n8n Docker container, set to `http://localhost:3002` (the frontend's origin). This tells n8n to include the proper `Access-Control-Allow-Origin` header in webhook responses.

**Did It Work?**
Yes. After adding `N8N_CORS_ALLOW_ORIGIN=http://localhost:3002` to the Docker environment and restarting the container, all frontend-to-n8n webhook calls worked without CORS errors. The Next.js rewrite proxy (`/webhook/*` -> `localhost:5678/webhook/*`) also works as an alternative approach.

**What Was Learned:**
n8n has built-in CORS support via environment variables — no need for a reverse proxy or middleware. The `N8N_CORS_ALLOW_ORIGIN` variable accepts the exact origin (protocol + host + port). For production/demo with Cloudflare Tunnel, this will need to be updated to the tunnel URL.

---

## Entry 4: Health Check Parallel vs Sequential Execution

**Prompt/Question Asked:**
System Health Monitor workflow checks Ollama, Qdrant, Docling, and n8n health in parallel, then merges results in a Format Live Status node. But the Format node only receives data from whichever service responds first — the other three results are missing. Why?

**What the AI Suggested:**
n8n's parallel fan-in behavior only triggers the downstream node with data from the first completing branch. Switch from parallel HTTP requests to a sequential chain: check Ollama first, pass result to Qdrant check, then Docling, then n8n. Each node appends its result to the item, so Format Live Status gets all four results on a single item. Additionally, the self-health-check (n8n checking its own server) causes a deadlock — hardcode n8n as "up" since if the workflow is executing, n8n is provably running.

**Did It Work?**
Yes. Sequential chaining solved the data merging problem. All four service statuses now appear in the Format Live Status output. Hardcoding n8n status eliminated the self-call deadlock.

**What Was Learned:**
n8n doesn't have a true "wait for all branches" merge node for parallel HTTP requests. When multiple branches converge on one node, only the first-arriving data triggers execution. Sequential execution is more reliable for aggregating results from multiple service checks. Also, a workflow calling its own n8n server creates a deadlock — the request blocks the worker that needs to process it.

---

## Entry 5: Job Status Endpoint URL Mismatch

**Prompt/Question Asked:**
Frontend calls `GET /webhook/job/:job_id` to poll async job status, but gets 404 errors. The Job Status Endpoint workflow is active in n8n. Why can't the frontend reach it?

**What the AI Suggested:**
Check the actual production URL that n8n assigns to the webhook. n8n prepends the workflow name to webhook paths in production mode, so the actual URL is `/webhook/job-status/job/:job_id` instead of `/webhook/job/:job_id`. Update the frontend API client (`api.ts`) to use the full production path.

**Did It Work?**
Yes. After updating the `getJobStatus` function in `frontend/src/lib/api.ts` to call `/webhook/job-status/job/${jobId}` instead of `/webhook/job/${jobId}`, job polling worked correctly.

**What Was Learned:**
n8n production webhook URLs include the workflow name as a prefix in the path. The URL shown in the n8n webhook node configuration (test mode) differs from the production URL. Always check the actual production URL by looking at the webhook node's production tab or testing with curl. Frontend API clients must match the exact production paths.
