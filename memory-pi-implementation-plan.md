# memory-pi — Implementation Plan

> Local vector memory backbone for the pi ecosystem, with LLM distillation before embedding.

---

## 1. Overview

memory-pi is a standalone microservice acting as the long-term memory layer for the entire pi ecosystem. Any service can write arbitrary content (text, images, audio, PDFs, files) to it with structured metadata, and query it semantically.

The write pipeline has one critical addition vs a naive RAG setup: **before embedding, a multimodal LLM distills the raw input into a structured JSON output** containing signal-only chunks, stripping filler, boilerplate, and noise. The model itself handles chunking semantically — it decides how many chunks the content warrants. This produces semantically coherent, dense chunks rather than arbitrary token-count splits.

Write latency is intentionally non-critical. Search latency is.

**Core responsibilities:**

- Accept multimodal input (text, images, PDFs, audio, files) from any pi service
- Distill raw input into structured JSON chunks via a cheap multimodal LLM (OpenRouter)
- Embed and store each chunk with rich metadata
- Expose a fast semantic search endpoint with filtering
- Serve a React admin UI at the root path
- Support project-scoped namespacing with zero hardcoding of project names
- Be storage-agnostic: all paths configurable, swappable to external SSD/HDD
- Integrate with logger-pi for all operational logging

---

## 2. Architecture

### 2.1 High-Level Stack

| Layer              | Choice                               | Rationale                                          |
| ------------------ | ------------------------------------ | -------------------------------------------------- |
| Runtime            | Node.js (TypeScript)                 | Matches existing pi stack                          |
| Framework          | Fastify                              | Low overhead, schema validation built-in           |
| LLM (distillation) | Gemini 2.0 Flash Lite via OpenRouter | $0.075/M input, $0.075/M audio, multimodal, 1M ctx |
| LLM gateway        | OpenRouter                           | Single API for any future model swap               |
| Vector DB          | ChromaDB (self-hosted)               | Simple, file-based persistence, good Node client   |
| Embedding model    | nomic-embed-text via Ollama          | Local, no cost, runs on Pi 5 8GB                   |
| Admin UI           | React (Vite)                         | Lightweight, fast build, no framework overhead     |
| Config             | .env + config.ts                     | All paths, models, prompts configurable            |
| Logging            | logger-pi HTTP client                | Shared log sink across ecosystem                   |

### 2.2 Routing Overview

The service runs on **port 3002** and is exposed at `http://memory.pi` via the reverse proxy.

| Path prefix | Handler        | Description                               |
| ----------- | -------------- | ----------------------------------------- |
| `/api/*`    | Fastify routes | All API endpoints                         |
| `/health`   | Fastify        | Health check (root level, not under /api) |
| `/*`        | Static files   | React admin UI (built into `src/public/`) |

No conflicts: `/api` is explicitly reserved for the backend. Everything else falls through to the React app, which handles its own client-side routing.

### 2.3 Write Pipeline

```
Raw input (text / image / audio / PDF / file)
        │
        ▼
[1] Input normalisation
    - Detect content type
    - Convert to OpenRouter multimodal message format
        │
        ▼
[2] Distillation (OpenRouter → Gemini 2.0 Flash Lite)
    - Apply distillation prompt (global or project-specific override)
    - Model returns structured JSON: { signal, chunks[] }
    - Validate JSON schema strictly — retry if invalid
    - Retry up to DISTILL_MAX_RETRIES on failure
    - Hard fail if all retries exhausted
        │
        ▼
[3] signal=false → reject 422, no further processing
    signal=true  → proceed with chunks array
        │
        ▼
[4] Embed each chunk independently (Ollama nomic-embed-text)
        │
        ▼
[5] Store each chunk in ChromaDB with full metadata envelope
    (chunkIndex, documentId, topic, and all caller metadata)
        │
        ▼
[6] Log write event to logger-pi
```

### 2.4 Read Pipeline

```
GET /api/memory/search?q=...&project=...&tags=...
        │
        ▼
[1] Embed query string (Ollama, local)
        │
        ▼
[2] ChromaDB similarity search
        │
        ▼
[3] Filter by metadata (project, tags, date, importance, expiry)
        │
        ▼
[4] Return ranked results with metadata
```

### 2.5 Storage Architecture

> All storage paths are defined in config. To migrate to a new SSD: mount the drive, copy `$BASE_STORAGE_PATH`, update one env variable, restart. Zero code changes.

```
$BASE_STORAGE_PATH/
  chroma/          ← ChromaDB persistent storage
  logs/            ← fallback logs if logger-pi is unreachable
  cache/           ← optional embedding cache
  prompts/         ← project-specific distillation prompt overrides
```

---

## 3. Distillation Layer

### 3.1 Model Choice: Gemini 2.0 Flash Lite via OpenRouter

**OpenRouter model ID:** `google/gemini-2.0-flash-lite-001`

| Property       | Value                            |
| -------------- | -------------------------------- |
| Input cost     | $0.075 / 1M tokens               |
| Output cost    | $0.30 / 1M tokens                |
| Audio input    | $0.075 / 1M tokens               |
| Context window | 1.05M tokens                     |
| Modalities     | Text, images, audio, PDFs, video |

Output is always structured JSON with short chunks, so the effective cost per write is negligible. Configurable via `DISTILL_MODEL` — one env var to upgrade.

### 3.2 Input Normalisation

The distiller auto-detects input type and builds the appropriate OpenRouter multimodal message:

| Input type | Detection                              | OpenRouter format                            |
| ---------- | -------------------------------------- | -------------------------------------------- |
| Plain text | `contentType: "text"`                  | Standard text message                        |
| Image      | `contentType: "image"` + base64 or URL | `image_url` content part                     |
| PDF        | `contentType: "pdf"` + base64          | `file` content part (OpenRouter PDF parsing) |
| Audio      | `contentType: "audio"` + base64        | `audio` content part                         |
| Mixed      | Array of content parts                 | Multiple content parts in one message        |

### 3.3 Structured JSON Output Schema

The distillation model is instructed to **always return valid JSON** matching this schema. No prose, no markdown, no preamble. The schema enforces both anti-hallucination (constrained output) and semantic chunking (model decides chunk boundaries, not a token splitter).

```typescript
// Zod schema used for validation
const DistillationOutputSchema = z.object({
	signal: z.boolean(), // false = no extractable signal
	chunks: z
		.array(
			z.object({
				content: z.string().min(1).max(DISTILL_MAX_CHUNK_CHARS),
				topic: z.string().optional(), // optional semantic label for the chunk
			}),
		)
		.min(0)
		.max(DISTILL_MAX_CHUNKS),
});

// signal=false → chunks must be empty []
// signal=true  → chunks must have at least 1 item
```

**Config for output constraints:**

| Env var                   | Default | Description                                |
| ------------------------- | ------- | ------------------------------------------ |
| `DISTILL_MAX_CHUNKS`      | `10`    | Max chunks the model can produce per write |
| `DISTILL_MAX_CHUNK_CHARS` | `800`   | Max characters per chunk                   |

These are injected into the system prompt so the model is aware of its own limits. If the model exceeds them, the response fails schema validation and triggers a retry.

**Example valid output — long article:**

```json
{
	"signal": true,
	"chunks": [
		{
			"topic": "Fed rate decision",
			"content": "Federal Reserve raised rates 25bps to 5.5%, unanimous vote. Signals one more hike possible in 2024 depending on inflation data."
		},
		{
			"topic": "Market reaction",
			"content": "S&P 500 dropped 1.2% immediately post-announcement. 10Y treasury yield rose to 4.8%. Dollar index gained 0.4%."
		}
	]
}
```

**Example valid output — short message:**

```json
{
	"signal": true,
	"chunks": [{ "content": "Fed raised rates 25bps." }]
}
```

**Example valid output — no signal:**

```json
{
	"signal": false,
	"chunks": []
}
```

### 3.4 Distillation Prompt System

Three levels, applied in priority order: **per-request > project-level > global default**

#### Level 1: Global Default System Prompt

```
You are a memory distillation engine. You extract signal from content and
return it as structured JSON. You never return anything except valid JSON.

OUTPUT SCHEMA:
{
  "signal": boolean,
  "chunks": [{ "content": string, "topic": string (optional) }]
}

CHUNKING RULES:
- Split content into semantically distinct chunks. Each chunk covers one
  topic, event, or concept. Do not mix unrelated facts in one chunk.
- Maximum {DISTILL_MAX_CHUNKS} chunks per response.
- Maximum {DISTILL_MAX_CHUNK_CHARS} characters per chunk content.
- If content is short and cohesive, one chunk is correct.

DISTILLATION RULES:
- Extract only: facts, decisions, conclusions, key data points, notable patterns,
  specific numbers, names, dates, relationships, action items, outcomes.
- Discard: pleasantries, filler, repetition, opinions without factual basis,
  formatting artefacts, metadata stored elsewhere (timestamps, author names, URLs).
- Be ruthlessly concise. Match chunk count and density to information content.
  A 1000-word article might produce 3-6 chunks. A short message produces 1.

SIGNAL RULES:
- Set signal=false if content contains no extractable signal (spam, noise,
  broken data, empty content). Return empty chunks array.
- Set signal=true for any content with at least one extractable fact.

NEVER:
- Return prose outside JSON
- Add markdown formatting inside chunk content
- Invent facts not present in the source content
- Exceed the chunk count or character limits
```

The `{DISTILL_MAX_CHUNKS}` and `{DISTILL_MAX_CHUNK_CHARS}` placeholders are replaced at runtime from config values.

#### Level 2: Project-Level Override

Stored at `$BASE_STORAGE_PATH/prompts/{projectName}.txt`. Loaded at startup, hot-reloaded if `PROMPT_HOT_RELOAD=true`. Not committed to git.

The project prompt **appends domain-specific extraction rules** to the global prompt. It does not replace the JSON schema or output rules — those are always enforced.

Example `reddit-pi.txt`:

```
DOMAIN RULES (append to global rules):
- Extract: main topic, core argument or consensus, notable dissenting views,
  specific data points cited, community sentiment.
- Discard: memes, jokes, rephrasing of the title, generic opinions.
- Each distinct sub-topic or perspective should be its own chunk.
```

Example `janus-pi.txt`:

```
DOMAIN RULES (append to global rules):
- Extract: trading pair, direction, entry condition, outcome, net result
  in pips or %, cycle status, anomalies.
- Discard: motivational commentary, UI notes, unrelated observations.
- Prefer a single chunk unless there are clearly distinct events to separate.
- Always include the pair name at the start of the first chunk content.
```

#### Level 3: Per-Request Override

Pass `distillPrompt` in the write request body. Replaces the project-level domain rules for that request only. JSON schema enforcement is always applied regardless.

### 3.5 NO_SIGNAL Handling

If `signal=false` in the validated response:

- Write rejected with HTTP 422 and `{ "error": "distillation_no_signal" }`
- Logged to logger-pi at `WARN` level
- No embedding or storage happens

### 3.6 Retry Logic

| Env var                  | Default | Description                          |
| ------------------------ | ------- | ------------------------------------ |
| `DISTILL_MAX_RETRIES`    | `3`     | Max attempts before hard fail        |
| `DISTILL_RETRY_DELAY_MS` | `1000`  | Base delay ms (doubles each attempt) |

Retry triggers: network error, non-200 from OpenRouter, response not valid JSON, response failing Zod schema validation.

After all retries exhausted: **hard fail**. HTTP 503 returned. Logged at `ERROR`. No partial writes ever.

---

## 4. Metadata Schema

Every stored chunk carries a structured metadata envelope. Namespacing is entirely metadata-driven — no project names hardcoded anywhere. New projects onboard by writing their name in `project`.

| Field        | Type                  | Required | Description                                                         |
| ------------ | --------------------- | -------- | ------------------------------------------------------------------- |
| `project`    | string                | Yes      | Arbitrary project identifier. e.g. `"reddit-pi"`. No allowlist.     |
| `source`     | string                | Yes      | Sub-identifier within project. e.g. `"feed-summary"`, `"cycle-log"` |
| `tags`       | string[]              | No       | Free-form cross-project tags. e.g. `["trading", "xauusd"]`          |
| `createdAt`  | ISO 8601              | Auto     | Set server-side. Client cannot override.                            |
| `expiresAt`  | ISO 8601              | No       | Optional TTL. Expired items excluded from search.                   |
| `importance` | float 0–1             | No       | Client weight hint. Boosts ranking in search results.               |
| `chunkIndex` | number                | Auto     | Chunk position within the distillation output (0-based).            |
| `chunkTotal` | number                | Auto     | Total chunks produced for this document.                            |
| `topic`      | string                | Auto     | Topic label from distillation model, if provided.                   |
| `documentId` | UUID                  | Auto     | Groups all chunks from one write operation.                         |
| `inputType`  | enum                  | Auto     | `text`, `image`, `audio`, `pdf`, `mixed`. Set by distiller.         |
| `extra`      | Record\<string, any\> | No       | Opaque passthrough bag. Stored and returned as-is.                  |

### Collection Strategy

Configurable via `COLLECTION_STRATEGY`:

- **`single`** (default): all projects in one collection, filtered by metadata at query time.
- **`per-project`**: each project gets its own ChromaDB collection. Better isolation at scale.

Start with `per-project`.

---

## 5. API Specification

All endpoints are prefixed with `/api`. The `/health` endpoint lives at root level outside `/api`.

### POST /api/memory — Write

```jsonc
// Request body
{
  "content": "raw text or base64-encoded file",    // required (or contentUrl)
  "contentUrl": "https://...",                      // alternative to content
  "contentType": "text",                            // "text"|"image"|"audio"|"pdf"|"mixed"
  "distillPrompt": "optional per-request override", // optional
  "metadata": {
    "project": "reddit-pi",                         // required
    "source": "post-summary",                       // required
    "tags": ["tech", "ai"],                         // optional
    "importance": 0.8,                              // optional
    "expiresAt": "2026-06-01T00:00:00Z",            // optional
    "extra": { "postId": "abc123" }                 // optional
  }
}

// Response 201
{
  "documentId": "uuid",
  "chunkCount": 3,          // how many chunks the distiller produced
  "storedAt": "2026-01-01T12:00:00Z",
  "chunks": [               // preview of distilled chunks (useful for debugging)
    { "topic": "Fed rate decision", "contentPreview": "Federal Reserve raised..." }
  ]
}

// Response 422 — no signal
{ "error": "distillation_no_signal" }

// Response 503 — distillation failed after all retries
{ "error": "distillation_failed", "retries": 3 }
```

### GET /api/memory/search — Query

| Parameter          | Type         | Default  | Description                                |
| ------------------ | ------------ | -------- | ------------------------------------------ |
| `q`                | string       | required | Query to embed and search                  |
| `project`          | string       | —        | Filter to one project (optional)           |
| `tags`             | string (CSV) | —        | AND filter on tags                         |
| `limit`            | number       | 5        | Results to return (max `MAX_SEARCH_LIMIT`) |
| `minImportance`    | float        | —        | Exclude items below this score             |
| `after` / `before` | ISO date     | —        | Filter by `createdAt` range                |
| `includeExpired`   | boolean      | false    | Include expired items                      |

```jsonc
// Response 200
{
  "results": [
    {
      "id": "uuid",
      "text": "distilled chunk content",
      "topic": "Fed rate decision",
      "score": 0.91,
      "metadata": { ...full metadata envelope }
    }
  ],
  "query": "original query string",
  "totalFound": 12,
  "returnedCount": 5
}
```

### Other Endpoints

| Method   | Path                        | Description                                        |
| -------- | --------------------------- | -------------------------------------------------- |
| `DELETE` | `/api/memory/:documentId`   | Remove all chunks for a document                   |
| `DELETE` | `/api/memory/project/:name` | Purge all data for a project                       |
| `DELETE` | `/api/memory/expired`       | Manual trigger for expired item cleanup            |
| `GET`    | `/api/memory/projects`      | List distinct project names (dynamic, from DB)     |
| `POST`   | `/api/memory/batch`         | Array of write items in one request (Phase 3)      |
| `GET`    | `/health`                   | Service status, ChromaDB, Ollama, OpenRouter, disk |

---

## 6. Admin UI

A lightweight React admin panel served by Fastify as static files. Accessible at `http://memory.pi` (root path). No separate service or repo.

### 6.1 Stack

| Layer        | Choice                               | Rationale                                                                    |
| ------------ | ------------------------------------ | ---------------------------------------------------------------------------- |
| Framework    | React (Vite)                         | Fast build, minimal overhead, no framework lock-in                           |
| Styling      | TailwindCSS                          | Utility-first, dark mode, mobile first, minimal, no component library needed |
| State        | React Query                          | Async data fetching, cache, loading/error states                             |
| Routing      | React Router                         | Client-side routing between views                                            |
| Build output | `ui/dist/` → copied to `src/public/` | Served as static files by Fastify                                            |

Fastify static serving:

```typescript
fastify.register(require('@fastify/static'), {
	root: path.join(__dirname, 'public'),
	prefix: '/',
	// Exclude /api and /health from static fallback
	decorateReply: false,
});

// SPA fallback — serve index.html for all non-api, non-health routes
fastify.setNotFoundHandler((req, reply) => {
	if (!req.url.startsWith('/api') && req.url !== '/health') {
		reply.sendFile('index.html');
	}
});
```

### 6.2 Views

Three views with client-side routing.

---

#### View: Search (`/`)

Default landing page. Semantic search across all stored memories.

**Controls:**

- Query input (full width, auto-focus)
- Project filter dropdown (populated from `GET /api/memory/projects`)
- Tags input (comma-separated badges)
- Limit selector (5 / 10 / 25 / 50)
- Date range pickers (after / before)

**Result card shows:**

- Chunk content (full text)
- Topic label badge (if present)
- Similarity score
- Project + source
- `inputType` icon
- `createdAt` timestamp
- `importance` if set
- Expandable `extra` section (raw JSON, collapsed by default)
- Delete button → calls `DELETE /api/memory/:documentId`, removes all chunks for that document, confirm dialog before action

---

#### View: Add Memory (`/add`)

Manual write form for adding context, notes, or one-off information directly.

**Fields:**

- Content: large textarea for text, or file upload for image/audio/PDF
- Content type: auto-detected on file upload, overridable
- Project: free text input with dropdown suggestions from known projects
- Source: free text
- Tags: comma-separated
- Importance: slider 0–1 (optional)
- Expires at: date picker (optional)
- Extra: JSON editor (optional, collapsible)
- Custom distill prompt: toggle + textarea (per-request override, optional)

**After submit:**

- Shows distilled chunk preview ("stored 3 chunks")
- Shows topic labels produced by the model
- Shows `NO_SIGNAL` warning inline if rejected with 422
- Shows retry error clearly if 503

---

#### View: Browse (`/browse`)

Browse all stored memories without a query. For auditing and inspection.

**Controls:**

- Project filter
- Tags filter
- Input type filter
- Date range
- Sort: newest / oldest / importance

**Display:**

- Paginated list, 20 per page
- Same result card as Search
- Project summary at top: project names with chunk counts (from `GET /api/memory/projects`)

---

### 6.3 Build Script

```json
// root package.json scripts
"build:ui": "cd ui && vite build --outDir ../src/public",
"dev:ui": "cd ui && vite --port 5173"
```

During `dev:ui`, Vite proxies `/api` and `/health` to `http://localhost:3002`:

```typescript
// ui/vite.config.ts
export default {
	server: {
		proxy: {
			'/api': 'http://localhost:3002',
			'/health': 'http://localhost:3002',
		},
	},
};
```

---

## 7. logger-pi Integration

| Event                                          | Level |
| ---------------------------------------------- | ----- |
| Service start / stop                           | INFO  |
| Write request received                         | DEBUG |
| Distillation started / completed (chunk count) | DEBUG |
| Distillation schema validation failure (retry) | WARN  |
| Distillation retry attempt                     | WARN  |
| Distillation hard fail (all retries exhausted) | ERROR |
| NO_SIGNAL response                             | WARN  |
| Embed + store complete                         | DEBUG |
| Search query received                          | DEBUG |
| ChromaDB unavailable                           | ERROR |
| Ollama unavailable                             | ERROR |
| OpenRouter unavailable                         | ERROR |
| Expired items purged (count)                   | INFO  |
| Storage path not writable                      | FATAL |
| Disk usage > threshold                         | WARN  |

> **Fallback:** if logger-pi is unreachable, logs write to `$BASE_STORAGE_PATH/logs/fallback.log`. The service never fails because of logger-pi.

---

## 8. Configuration Reference

| Variable                  | Default                            | Description                                                          |
| ------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `PORT`                    | `3002`                             | HTTP port                                                            |
| `BASE_STORAGE_PATH`       | `/data/memory-pi`                  | Root for all persistent storage. Change to new SSD mount to migrate. |
| `CHROMA_PATH`             | `$BASE/chroma`                     | ChromaDB persist directory                                           |
| `LOG_FALLBACK_PATH`       | `$BASE/logs`                       | Fallback log directory                                               |
| `PROMPT_PATH`             | `$BASE/prompts`                    | Project-specific prompt overrides directory                          |
| `OPENROUTER_API_KEY`      | —                                  | Required. OpenRouter API key.                                        |
| `DISTILL_MODEL`           | `google/gemini-2.0-flash-lite-001` | OpenRouter model ID                                                  |
| `DISTILL_MAX_RETRIES`     | `3`                                | Max distillation attempts before hard fail                           |
| `DISTILL_RETRY_DELAY_MS`  | `1000`                             | Base retry delay ms (doubles each attempt)                           |
| `DISTILL_MAX_CHUNKS`      | `10`                               | Max chunks the model can produce per write                           |
| `DISTILL_MAX_CHUNK_CHARS` | `800`                              | Max characters per chunk                                             |
| `PROMPT_HOT_RELOAD`       | `false`                            | Reload project prompts without restart                               |
| `OLLAMA_HOST`             | `http://localhost:11434`           | Ollama base URL                                                      |
| `EMBED_MODEL`             | `nomic-embed-text`                 | Ollama embedding model                                               |
| `COLLECTION_STRATEGY`     | `per-project`                      | `single` or `per-project`                                            |
| `COLLECTION_NAME`         | `memory_pi`                        | Collection name (single mode)                                        |
| `DEFAULT_SEARCH_LIMIT`    | `5`                                | Default results per search                                           |
| `MAX_SEARCH_LIMIT`        | `50`                               | Hard cap per search                                                  |
| `LOGGER_PI_URL`           | `http://localhost:4000`            | logger-pi endpoint                                                   |
| `LOGGER_PI_SERVICE_NAME`  | `memory-pi`                        | Service name sent to logger-pi                                       |
| `EXPIRY_CRON`             | `0 3 * * *`                        | Daily expired item cleanup cron                                      |
| `DISK_WARN_THRESHOLD_GB`  | `10`                               | Warn when free space drops below this                                |
| `API_KEY`                 | —                                  | Optional bearer token auth for `/api/*` endpoints                    |

---

## 9. Repo Structure

```
memory-pi/
  src/                            ← Fastify API
    index.ts                      ← App entry, static serving, SPA fallback
    config.ts                     ← All env vars parsed and typed (Zod)
    routes/
      memory.ts                   ← POST /api/memory, DELETE routes
      search.ts                   ← GET /api/memory/search
      projects.ts                 ← GET /api/memory/projects
      health.ts                   ← GET /health
    services/
      distiller.ts                ← OpenRouter distillation client
      inputNormaliser.ts          ← Detect content type, build multimodal message
      promptLoader.ts             ← Load global + project prompts, hot reload
      outputValidator.ts          ← Zod validation of distillation JSON output
      embedder.ts                 ← Ollama embedding client
      vectorStore.ts              ← ChromaDB abstraction layer
      metadataValidator.ts        ← Zod metadata schema validation
      expiryCron.ts               ← Expired item cleanup cron
    lib/
      logger.ts                   ← logger-pi HTTP client + fallback
      diskMonitor.ts              ← Storage path health checks
      retry.ts                    ← Generic retry with exponential backoff
    public/                       ← Built React UI output (gitignored)
  ui/                             ← React admin UI (Vite)
    src/
      pages/
        Search.tsx                ← Search view (default route /)
        Add.tsx                   ← Add memory view (/add)
        Browse.tsx                ← Browse view (/browse)
      components/
        MemoryCard.tsx            ← Shared result card
        MetadataBadge.tsx         ← Project/source/topic/tags display
        ExtraViewer.tsx           ← Collapsible JSON viewer
        ChunkPreview.tsx          ← Post-write chunk preview
      services/
        api.ts                    ← Typed HTTP client for all /api endpoints
      App.tsx
      main.tsx
    vite.config.ts
    package.json
  prompts/
    _default.txt                  ← Global distillation system prompt (committed)
    .gitignore                    ← Ignore project-specific overrides
  .env.example
  docker-compose.yml              ← memory-pi + ChromaDB + Ollama
  README.md
```

---

## 10. Build Phases

### Phase 1 — Core API, text only

- Fastify skeleton + `config.ts`
- `distiller.ts` with structured JSON output + Zod validation
- `outputValidator.ts` enforcing schema strictly
- `retry.ts` with exponential backoff + hard fail
- `embedder.ts` embedding each chunk from distillation output
- ChromaDB single collection
- `POST /api/memory` end-to-end (text only)
- `GET /api/memory/search` with `q`, `project`, `limit`
- logger-pi integration with fallback
- `GET /health`

**Exit condition:** reddit-pi writes a post summary, distiller returns 1-3 structured chunks, each is embedded and retrievable by semantic query. Schema violations trigger retries correctly.

### Phase 2 — Multimodal + Full Metadata + UI

- `inputNormaliser.ts` supporting image, audio, PDF, mixed
- `promptLoader.ts` with project-specific overrides + hot reload
- Full metadata schema (all fields, Zod)
- Search filters: tags, minImportance, after/before, includeExpired
- `expiresAt` + daily expiry cron
- `DELETE` endpoints
- `GET /api/memory/projects`
- Disk usage monitor
- React UI: all three views (Search, Add, Browse)
- Fastify static serving + SPA fallback
- Vite proxy config for local dev

**Exit condition:** any pi service can write any content type. UI is accessible at `http://memory.pi`. Project prompts work.

### Phase 3 — Scale + Polish

- Per-project ChromaDB collection mode
- Embedding cache (skip re-embedding identical chunks)
- `POST /api/memory/batch`
- `importance`-weighted result ranking
- Optional API key auth
- Docker Compose with volume mount for `BASE_STORAGE_PATH`

**Exit condition:** all pi services integrated. Storage migratable in one env var change.

---

## 11. Dependencies

### API (`src/`)

| Package           | Purpose                                                   |
| ----------------- | --------------------------------------------------------- |
| `fastify`         | HTTP server                                               |
| `@fastify/static` | Serve React UI static files                               |
| `chromadb`        | Vector DB client                                          |
| `ollama`          | Local embedding client                                    |
| `zod`             | Schema validation (config, metadata, distillation output) |
| `node-cron`       | Expiry cleanup scheduler                                  |
| `uuid`            | documentId generation                                     |
| `dotenv`          | Env var loading                                           |

### UI (`ui/`)

| Package                 | Purpose                       |
| ----------------------- | ----------------------------- |
| `react` + `react-dom`   | UI framework                  |
| `vite`                  | Build tool                    |
| `react-router-dom`      | Client-side routing           |
| `@tanstack/react-query` | Async data fetching + caching |
| `tailwindcss`           | Styling                       |

**External services required:**

- ChromaDB — Docker container, data at `$CHROMA_PATH`
- Ollama — running on Pi with `nomic-embed-text` pulled
- logger-pi — already running in ecosystem
- OpenRouter — API key required

---

## 12. Design Notes

**Why structured JSON output instead of free-form text?**
Free-form output from an LLM is unpredictable in length and structure. Enforcing a JSON schema does three things: prevents hallucinations that would expand beyond the source content, produces deterministic chunk boundaries that the code can process without guessing, and makes output validation trivial (Zod). If the model drifts outside the schema, it's a retry — not silent corruption of the index.

**Why let the model decide chunk boundaries?**
Sliding window chunking by token count is fast but dumb — it splits mid-sentence, mid-concept, arbitrarily. The distillation model understands semantics. It knows that "the rate decision" and "the market reaction" are two distinct retrievable concepts. Its chunks will always be semantically coherent. This is the core quality advantage of this architecture over standard RAG.

**Why Gemini 2.0 Flash Lite?**
Compression tasks don't need a frontier model. Flash Lite is 4x cheaper than Flash 2.5 on output, and for a task where output is always short structured JSON, quality is functionally identical. One env var to upgrade if that changes.

**Why hard fail on distillation exhaustion?**
Storing raw un-distilled content would pollute the vector DB with noise. Fail loudly, retry the write later, never silently degrade the index.

**Why React over Angular for the UI?**
The admin panel is a lightweight internal tool — three views, minimal state, no enterprise requirements. Angular's full framework overhead (modules, DI, CLI, change detection) is not justified here. React with Vite builds in seconds and the bundle is a fraction of the size. Angular stays where it belongs: Janus Gambit and other full-featured apps in the ecosystem.

**Why not hardcode project names?**
New services onboard by writing their `project` name. No migration, no allowlist, no code change required.

**Why the `extra` field?**
Services have domain-specific context that doesn't belong in the generic schema. `reddit-pi` needs `postId`. `janus-pi` needs `cycleId`. `extra` is a passthrough bag — stored, returned, never interpreted by memory-pi.
