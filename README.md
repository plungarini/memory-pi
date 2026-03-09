# Memory-Pi 🧠

`memory-pi` is a lightweight, high-performance vector memory microservice. It serves as the long-term semantic storage for the Pi ecosystem, enabling "zero-touch" knowledge capture from text, images, and PDFs.

## 🚀 Key Features

- **SQLite-vec Powered**: Native vector storage within Node.js. No external database (like ChromaDB) required.
- **Multimodal Distillation**: Leverages Gemini 2.0 (via OpenRouter) to extract structured insights from diverse media.
- **Local Embeddings**: High-efficiency vector generation via Ollama (`nomic-embed-text`).
- **Global Search**: Search across specific projects or the entire knowledge base semantically.
- **Magic Input UI**: A premium, focused dashboard for manual capture and library auditing.

## 🛠️ Tech Stack

- **Runtime**: Node.js (Fastify)
- **Vector DB**: `sqlite-vec` (Native extension)
- **LLM/Vision**: OpenRouter (Gemini 2.0 Flash)
- **Embeddings**: Ollama (Local)

## 📦 Getting Started

1.  **Install**: `npm install`
2.  **Onboard**: `node scripts/onboard.js` (Automates Ollama setup and model pulling).
3.  **Start**: `npm start` (Runs API and UI concurrently).

---

## 🔌 API Specification

Other microservices can integrate with `memory-pi` using the following REST JSON API.

### 1. Store Knowledge

**`POST /api/memory`**

Stores and distills new information into vector chunks.

| Field           | Type       | Required | Description                                                    |
| :-------------- | :--------- | :------- | :------------------------------------------------------------- |
| `content`       | String/Arr | Yes      | Raw text or Base64 data. If `mixed`, pass an array of parts.   |
| `contentType`   | Enum       | No       | `text` (default), `image`, `pdf`, `audio`, `mixed`.            |
| `metadata`      | Object     | Yes      | Must include `project`. Can include `tags`, `importance`, etc. |
| `distillPrompt` | String     | No       | Custom instructions for the distillation LLM.                  |

**Example (Text):**

```json
{
	"content": "The CEO's favorite coffee is Dark Roast.",
	"metadata": { "project": "general", "importance": 0.8, "tags": ["preferences"] }
}
```

---

### 2. Semantic Search

**`GET /api/search`**

Find memories by meaning. Supports global or per-project filtering.

| Query Param        | Type     | Required | Description                                     |
| :----------------- | :------- | :------- | :---------------------------------------------- |
| `q`                | String   | Yes      | The natural language query.                     |
| `project`          | String   | No       | Filter by project name. Omit for Global Search. |
| `limit`            | Number   | No       | Max results (default: 5, max: 50).              |
| `minImportance`    | Number   | No       | Filter by importance score (0.0 to 1.0).        |
| `tags`             | String   | No       | CSV list of tags (e.g., `work,urgent`).         |
| `after` / `before` | ISO Date | No       | Filter by creation date range.                  |

---

### 3. Management & Health

- **`GET /api/projects`**: Returns all unique project names.
- **`GET /api/projects/:name/memories`**: Paginated list of raw memories. Params: `limit`, `offset`.
- **`DELETE /api/memory/:docId?project=NAME`**: Delete a document and its chunks.
- **`DELETE /api/memory/project/:name`**: Purge an entire project.
- **`GET /api/health`**: Returns system stats, disk usage, and service status.

---

## 🤝 Integration

When contributing to the Pi ecosystem, use the `memory-pi` for any persistent knowledge that requires semantic retrieval rather than simple key-value lookups.
