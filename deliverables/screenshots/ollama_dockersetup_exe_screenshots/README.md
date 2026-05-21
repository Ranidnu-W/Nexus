# Ollama & Docker Setup Screenshots

Screenshots showing the infrastructure setup — Ollama model serving, Docker containers for n8n/Qdrant/Docling, and GPU utilization.

### ollama_list_models.png
Output of `ollama list` on the ASUS gaming laptop (Windows, RTX 4060). Shows 5 models installed locally: **nomic-embed-text:latest** (274 MB — text embeddings for RAG), **gemma3:12b-it-qat** (8.9 GB — potential future model), **mxbai-embed-large:latest** (669 MB — alternative embedding model), **deepseek-r1:8b** (5.2 GB — alternative reasoning model), and **llama3:latest** (4.7 GB — the primary model used by all Nexus agents).

### ollama_ps_llama3_nomic_gpu_running.png
Multiple snapshots of `ollama ps` over time showing active model usage. Llama 3 (5.2 GB) is loaded at 100% GPU with 4096 context window. At one point both **llama3:latest** and **nomic-embed-text:latest** (595 MB) are loaded simultaneously — llama3 handling agent inference while nomic-embed-text processes document embeddings for RAG. Both running at 100% GPU. This demonstrates the dual-model GPU sharing that happens during file intake + query operations.

### ollama_ps_no_models_running.png
Output of `ollama ps` showing no models currently loaded in memory. This is the idle state — Ollama automatically unloads models after a timeout period to free VRAM. Models are loaded on-demand when the next request arrives.

### docker_compose_n8n_started.png
Terminal on the MacBook Air (macOS) showing `docker compose up -d` from the `/Users/deyon/n8n` directory. The n8n container (`n8n-n8n-1`) starts successfully in 0.1s. n8n runs on the Mac and connects to the backend services on the ASUS laptop over LAN.

### docker_compose_qdrant_docling_started.png
PowerShell on the ASUS gaming laptop (Windows) showing `docker compose up -d` from `D:\nexus-ai-server`. Two containers start: **nexus-docling** (document parsing service) and **nexus-qdrant** (vector database for similarity search), both in 0.5s. These run alongside Ollama on the GPU machine to keep all AI/ML workloads on the same host.
