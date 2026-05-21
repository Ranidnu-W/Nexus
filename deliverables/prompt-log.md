# Checkpoint 2 — AI Prompt Log

> Development journal documenting AI-assisted debugging sessions across the Nexus platform build. Each entry captures a real problem encountered, the AI tool used, and the resolution.

---

## Entry 1: Binary Data Loss Through Airtable Nodes
**Date:** April 28, 2026  
**AI Tool Used:** Claude (Anthropic)

**Prompt/Question Asked:**  
File Intake Pipeline uploads a file via webhook, but after the Airtable "Create Document Record" node, the binary data (file content) is gone. Downstream nodes can't access the uploaded file text. How do I preserve file data through Airtable operations?

**What It Suggested:**  
Move the text extraction step earlier in the pipeline — extract the file's text content in the Generate Job ID Code node, before any Airtable writes happen. Store the extracted text as a JSON property on the item so it survives Airtable node execution, which strips binary data from the item.

**Did It Work?**  
Yes. By extracting the text content in the Generate Job ID node (which runs before Airtable), the text was available as a regular JSON string property throughout the rest of the workflow. Binary data was no longer needed downstream.

**What I Learned:**  
n8n Airtable nodes strip binary data from items after execution. Any binary content (uploaded files, images) must be read and converted to text/JSON before passing through Airtable nodes. Design pipelines to extract what you need from binaries early.

---

## Entry 2: n8n Code Node Memory Errors on Chunking
**Date:** April 30, 2026  
**AI Tool Used:** Claude (Anthropic)

**Prompt/Question Asked:**  
The Code node that chunks document text into 500-token segments with 50-token overlap is throwing memory errors and crashing the n8n worker. The task runner process dies. How do I fix chunking in n8n?

**What It Suggested:**  
Two fixes: (1) Simplify to a single-chunk approach for now — instead of splitting into many chunks, treat the entire document as one chunk. This avoids the memory-intensive array operations. (2) Disable the n8n task runner by setting `N8N_RUNNERS_ENABLED=false` in Docker environment variables, which prevents the separate runner process from hitting memory limits.

**Did It Work?**  
Yes. Disabling the task runner and using single-chunk embedding resolved all memory crashes. Documents are now embedded as a single vector, which works for the test file size. For larger documents, a proper chunking strategy with streaming would be needed.

**What I Learned:**  
n8n's Code node task runner has strict memory limits and can't handle large array operations well. For MVP/demo purposes, simplifying the approach is better than fighting the runtime. `N8N_RUNNERS_ENABLED=false` runs code in the main n8n process which has more memory available.

---

## Entry 3: CORS Between Next.js and n8n
**Date:** May 2, 2026  
**AI Tool Used:** Claude (Anthropic)

**Prompt/Question Asked:**  
Next.js frontend on port 3002 is getting CORS errors when calling n8n webhook endpoints on port 5678. The browser blocks the requests. How do I configure CORS for n8n in Docker?

**What It Suggested:**  
Add the `N8N_CORS_ALLOW_ORIGIN` environment variable to the n8n Docker container, set to `http://localhost:3002` (the frontend's origin). This tells n8n to include the proper `Access-Control-Allow-Origin` header in webhook responses.

**Did It Work?**  
Yes. After adding `N8N_CORS_ALLOW_ORIGIN=http://localhost:3002` to the Docker environment and restarting the container, all frontend-to-n8n webhook calls worked without CORS errors. The Next.js rewrite proxy (`/webhook/*` -> `localhost:5678/webhook/*`) also works as an alternative approach.

**What I Learned:**  
n8n has built-in CORS support via environment variables — no need for a reverse proxy or middleware. The `N8N_CORS_ALLOW_ORIGIN` variable accepts the exact origin (protocol + host + port). For production with Cloudflare Tunnel, this will need to be updated to the tunnel URL.

---

## Entry 4: Health Check Parallel vs Sequential Execution
**Date:** May 5, 2026  
**AI Tool Used:** Claude (Anthropic)

**Prompt/Question Asked:**  
System Health Monitor workflow checks Ollama, Qdrant, Docling, and n8n health in parallel, then merges results in a Format Live Status node. But the Format node only receives data from whichever service responds first — the other three results are missing. Why?

**What It Suggested:**  
n8n's parallel fan-in behavior only triggers the downstream node with data from the first completing branch. Switch from parallel HTTP requests to a sequential chain: check Ollama first, pass result to Qdrant check, then Docling, then n8n. Each node appends its result to the item, so Format Live Status gets all four results on a single item. Additionally, the self-health-check (n8n checking its own server) causes a deadlock — hardcode n8n as "up" since if the workflow is executing, n8n is provably running.

**Did It Work?**  
Yes. Sequential chaining solved the data merging problem. All four service statuses now appear in the Format Live Status output. Hardcoding n8n status eliminated the self-call deadlock.

**What I Learned:**  
n8n doesn't have a true "wait for all branches" merge node for parallel HTTP requests. When multiple branches converge on one node, only the first-arriving data triggers execution. Sequential execution is more reliable for aggregating results. Also, a workflow calling its own n8n server creates a deadlock — the request blocks the worker that needs to process it.

---

## Entry 5: Job Status Endpoint URL Mismatch
**Date:** May 7, 2026  
**AI Tool Used:** Claude (Anthropic)

**Prompt/Question Asked:**  
Frontend calls `GET /webhook/job/:job_id` to poll async job status, but gets 404 errors. The Job Status Endpoint workflow is active in n8n. Why can't the frontend reach it?

**What It Suggested:**  
Check the actual production URL that n8n assigns to the webhook. n8n prepends the workflow name to webhook paths in production mode, so the actual URL is `/webhook/job-status/job/:job_id` instead of `/webhook/job/:job_id`. Update the frontend API client to use the full production path.

**Did It Work?**  
Yes. After updating the `getJobStatus` function in `api.ts` to call `/webhook/job-status/job/${jobId}`, job polling worked correctly.

**What I Learned:**  
n8n production webhook URLs include the workflow name as a prefix. The URL shown in the webhook node's test mode differs from production. Always verify the actual production URL before wiring up the frontend.

---

## Entry 6: Gmail SMTP Authentication Failure for Digest Emails
**Date:** May 12, 2026  
**AI Tool Used:** Claude (Anthropic)

**Prompt/Question Asked:**  
The Digest Agent workflow has email nodes for sending digest summaries, but they're connected to Gmail SMTP and failing with "535-5.7.8 Username and Password not accepted." I don't want to set up a Gmail App Password. Is there a simpler way to get email sending working for development?

**What It Suggested:**  
Use Ethereal Email — a free SMTP testing service from the Nodemailer team that requires no signup. Generate throwaway credentials via their API (`POST https://api.nodemailer.com/user`), configure n8n with `smtp.ethereal.email:587` (STARTTLS), and emails get captured in Ethereal's web UI instead of real inboxes. Created the credential via n8n's REST API and wired it to both the on-demand and scheduled email nodes.

**Did It Work?**  
Yes. Emails now send successfully through Ethereal. After configuring topics and hitting "Save & Activate," the digest email shows up in the Ethereal web inbox within seconds. Both email nodes also have `onError: continueRegularOutput` so the pipeline still completes even if SMTP has issues.

**What I Learned:**  
Ethereal Email is perfect for development/demo — zero signup, free, and emails are viewable in a web UI. For production you'd swap to real SMTP (Gmail with App Password, SendGrid, etc.), but for demos and testing Ethereal removes all friction. n8n credentials can be created and updated entirely through its REST API.

---

## Entry 7: Orchestrator Routing News Queries to Wrong Agent
**Date:** May 14, 2026  
**AI Tool Used:** Claude (Anthropic)

**Prompt/Question Asked:**  
When I ask "What is the latest news on Bitcoin?" in the Nexus chat, the Orchestrator routes it to the general Ollama agent (which has no internet access and hallucinates answers) instead of the Digest agent. Sometimes it shows stale data from the digest page. How do I make real-time news queries work in the chat?

**What It Suggested:**  
The problem had two parts: (1) The Orchestrator's intent classifier (Llama 3 via Ollama) was classifying news queries as "general" instead of "digest." Fix by adding keyword-based fallback detection in the Parse Intent node — if the LLM says "general" but the message contains news keywords (latest, news, trending, headlines, etc.), override to "digest." (2) The Digest call was hitting `GET /digest/latest` which returns stale saved digests. Build a new real-time query pipeline: `POST /digest/query` → extract topic → fetch Google News RSS → parse articles → summarize with Ollama → return results inline.

**Did It Work?**  
Yes. Built a 7-node query pipeline in the Digest Agent workflow and updated the Orchestrator to call it. Now asking "latest news on Bitcoin" in chat returns fresh RSS-sourced news with AI summaries directly in the conversation.

**What I Learned:**  
LLMs are unreliable intent classifiers for ambiguous queries — keyword-based fallbacks are essential as a safety net. Google News RSS (`news.google.com/rss/search?q=...`) is a free, no-API-key way to get real-time news. Building the real-time pipeline as a separate webhook path keeps it decoupled from the scheduled digest flow.

---

## Entry 8: Intent Classifier Hijacking DocMentor Queries
**Date:** May 14, 2026  
**AI Tool Used:** Claude (Anthropic)

**Prompt/Question Asked:**  
After adding the news keyword fallback, the classifier is now too aggressive — it routes "do you have any docs related to AI?" to the Digest agent instead of DocMentor. The keyword "AI" triggers the news fallback even though the user is clearly asking about their uploaded documents. How do I make the routing smarter?

**What It Suggested:**  
Three-layer fix: (1) Rewrite the Classify Intent prompt with explicit priority ordering — DocMentor before Digest — and add critical rules like "questions about uploaded documents or files always go to docmentor." (2) In Parse Intent, narrow the doc keywords to strong signals ("my doc", "my document", "uploaded", "file I") and add a safety guard: if agent=digest but doc keywords are also present, override to docmentor. (3) Add explicit agent name detection as highest priority — if the user literally says "docmentor" (including typos like "docmenotr"), route there regardless of what the LLM classified.

**Did It Work?**  
Yes. The three-layer approach handles all the edge cases: explicit agent requests are caught first, then the LLM classification runs, then keyword fallbacks apply with the safety guard preventing false positives. "Do you have docs about AI" now correctly routes to DocMentor.

**What I Learned:**  
Intent classification is a layered problem — no single approach handles all cases. Explicit pattern matching > LLM classification > keyword fallback is a robust ordering. Safety guards (override rules that prevent misclassification) are critical when adding aggressive fallbacks. Testing with adversarial examples ("AI docs" vs "AI news") exposes edge cases early.

---

## Entry 9: Agent Tag Showing Wrong Name in Chat
**Date:** May 15, 2026  
**AI Tool Used:** Claude (Anthropic)

**Prompt/Question Asked:**  
In the chat UI, when I type "as the docmentor agent, what can you tell me about web3?" the response comes back tagged as "NEXUS" (the general agent) instead of "DOCMENTOR." The explicit agent request is being ignored by the classifier. Why?

**What It Suggested:**  
The Parse Intent node was only checking the LLM's classification output, not scanning the original message for explicit agent names. Added a first-pass regex check: before any LLM classification, scan the user's message for agent name patterns (including common typos like "docmenotr", "doc mentor"). If found, immediately return that agent — skip the LLM entirely. The frontend AGENT_TAGS map then displays the correct tag based on the `agent` field in the response.

**Did It Work?**  
Yes. Messages like "as the docmentor agent..." now correctly route to DocMentor with the proper tag displayed. The explicit name check runs before everything else, so typos and variations are handled.

**What I Learned:**  
When users explicitly name an agent, that should always take priority over any AI classification. Pattern matching with typo tolerance (regex alternation for common misspellings) is more reliable than hoping the LLM picks up on the instruction. The frontend tag display is only as good as the backend routing — fix routing first, UI follows.

---

## Entry 10: Analytics Page Showing Inaccurate Data
**Date:** May 19, 2026  
**AI Tool Used:** Claude (Anthropic)

**Prompt/Question Asked:**  
The Analytics page shows wrong numbers — the average response time was 80 seconds, the by_agent breakdown returned plain numbers instead of proper stat objects, and recent_activity, top_queries, and total_documents were all missing. The time range selector (7d/30d/all) also didn't filter anything. How do I fix the analytics pipeline?

**What It Suggested:**  
The root cause was that the analytics workflow relied on pre-computed hourly snapshots stored in an Airtable analytics table, but those snapshots were incomplete and stale. The fix was to restructure the entire GET pipeline: (1) Read all interactions directly from the interactions table on every request. (2) Compute fresh analytics in a Code node — filter by time range, build by_agent as proper `{total, avg_response_ms, error_count}` objects, filter outlier response times >300,000ms, generate recent_activity time series with day-fill, extract top_queries. (3) Add a separate Read Documents node to get total_documents count. (4) Merge everything in a Final Format node.

**Did It Work?**  
Yes. After restructuring from pre-computed snapshots to fresh computation, all analytics numbers are accurate. The average response time dropped from 80s to a realistic value once outliers were filtered. Time range filtering works, all dashboard sections populate correctly.

**What I Learned:**  
Pre-computed analytics are only useful if the computation is correct and complete — stale/broken snapshots are worse than no cache at all. For a demo-scale app, computing fresh from source data on every request is perfectly fine and guarantees accuracy. Outlier filtering (removing response times >5 minutes from averages) is essential when some agent pipelines legitimately take a long time.

---

## Entry 11: n8n Parallel Fan-In Bug in Analytics Pipeline
**Date:** May 19, 2026  
**AI Tool Used:** Claude (Anthropic)

**Prompt/Question Asked:**  
While restructuring the analytics workflow, I tried running "Read All Interactions" and "Read Documents" in parallel branches that converge on a Code node. The Code node throws: "Cannot assign to read only property 'name' of object 'Error: Node Read Documents hasn't been executed.'" What's going on?

**What It Suggested:**  
This is the same parallel fan-in issue from Entry 4 but manifesting differently. n8n Code nodes that reference `$('NodeName').all()` from a parallel branch fail because the other branch hasn't completed when the Code node executes. The fix is to restructure as a sequential chain: Read Interactions → Compute Analytics → Read Documents → Final Format. Each step passes its data forward on the item.

**Did It Work?**  
Yes. Converting from parallel to sequential execution resolved the error. The pipeline takes slightly longer (sequential HTTP calls to Airtable) but is completely reliable.

**What I Learned:**  
n8n's `$('NodeName')` references only work for nodes that have already executed in the current item's path. Parallel branches create separate execution contexts that can't cross-reference each other. This is a fundamental n8n limitation — any time you need data from multiple sources, chain them sequentially or use a Merge node at the fan-in point.

---

## Entry 12: n8n API Key Invalid After Container Restart
**Date:** May 20, 2026  
**AI Tool Used:** Claude (Anthropic)

**Prompt/Question Asked:**  
The n8n REST API returns 401 Unauthorized with the API key I had from the previous session. I need to update workflows programmatically but can't authenticate. How do I get a valid API key?

**What It Suggested:**  
The API key from the previous session was likely regenerated or invalidated after a container restart. Extract the current valid key directly from n8n's internal SQLite database: `docker cp` the database file out of the container, then query the `user_api_keys` table with sqlite3. The key is stored as a JWT in the `apiKey` column.

**Did It Work?**  
Yes. Copied `/home/node/.n8n/database.sqlite` out of the Docker container, queried it with `sqlite3`, and got the current valid JWT. All subsequent API calls to n8n worked with the new key.

**What I Learned:**  
n8n stores API keys in its internal SQLite database. When keys become invalid (container rebuild, settings reset), you can extract the current one from the database rather than regenerating through the UI. The key is a standard JWT with `sub`, `iss`, `aud`, and `exp` claims.

---

## Entry 13: n8n Credential API Requires disableStartTls Field
**Date:** May 20, 2026  
**AI Tool Used:** Claude (Anthropic)

**Prompt/Question Asked:**  
When creating SMTP credentials via the n8n REST API (`POST /api/v1/credentials`), the request fails with "request.body.data requires property disableStartTls." I included host, port, user, and password — what's missing?

**What It Suggested:**  
The n8n credential schema for SMTP requires the `disableStartTls` boolean field in the data object, even though it's not documented. For Ethereal Email on port 587 with STARTTLS, set `disableStartTls: false`. The full data object needs: `user`, `password`, `host`, `port`, `secure` (false for STARTTLS), and `disableStartTls`.

**Did It Work?**  
Yes. Adding `disableStartTls: false` to the credential data object allowed the credential to be created successfully. The SMTP connection to Ethereal worked on first try after that.

**What I Learned:**  
n8n's credential API has stricter validation than what's shown in the UI. Required fields that have defaults in the UI still need to be explicitly provided in API calls. When creating credentials programmatically, inspect an existing credential's data structure first (via GET) to know exactly which fields are required.
