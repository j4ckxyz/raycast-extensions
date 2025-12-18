# Open WebUI API Documentation

This guide covers interacting with Open WebUI endpoints for integration and automation.

---

## 🛡️ Authentication

Requests require a **Bearer Token**.

* **How to obtain:** Go to `Settings > Account` in Open WebUI to get your API Key.
* **Alternative:** JWT (JSON Web Token) is also supported.

---

## 📖 Swagger Documentation

To view interactive API docs:

1. Set environment variable `ENV=dev`.
2. Access via path: `/docs` (e.g., `http://localhost:3000/docs`).

---

## 🚀 Notable API Endpoints

### 📜 Retrieve All Models

Fetches all models (Ollama, OpenAI, or Open WebUI Functions).

* **Endpoint:** `GET /api/models`

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:3000/api/models

```

### 💬 Chat Completions

OpenAI-compatible endpoint.

* **Endpoint:** `POST /api/chat/completions`

**Example Payload:**

```json
{
  "model": "llama3.1",
  "messages": [
    { "role": "user", "content": "Why is the sky blue?" }
  ]
}

```

---

## 🦙 Ollama API Proxy

Direct passthrough to native Ollama features (streaming, embeddings).

* **Base URL:** `/ollama/api`

| Feature | Endpoint |
| --- | --- |
| **Generate (Stream)** | `POST /ollama/api/generate` |
| **List Models** | `GET /ollama/api/tags` |
| **Embeddings** | `POST /ollama/api/embed` |

---

## 🧩 Retrieval Augmented Generation (RAG)

### 1. Uploading Files

Automatically extracts content and stores it in the vector database.

* **Endpoint:** `POST /api/v1/files/`

```bash
curl -X POST -H "Authorization: Bearer YOUR_API_KEY" -F "file=@/path/to/file" http://localhost:3000/api/v1/files/

```

### 2. Organizing Knowledge

Group files into collections.

* **Endpoint:** `POST /api/v1/knowledge/{id}/file/add`
* **Body:** `{"file_id": "uuid-here"}`

### 3. Using RAG in Chat

Reference specific files or collections in your chat request.

**Referencing a File:**

```json
{
  "model": "gpt-4-turbo",
  "messages": [{"role": "user", "content": "Analyze this."}],
  "files": [{ "type": "file", "id": "your-file-id" }]
}

```

**Referencing a Collection:**

```json
{
  "model": "gpt-4-turbo",
  "messages": [{"role": "user", "content": "Search the archive."}],
  "files": [{ "type": "collection", "id": "your-collection-id" }]
}

```

---

## 💡 Benefits

* **Unified Interface:** One API for multiple providers (Ollama, OpenAI, etc.).
* **Easy RAG:** Simplified file-to-vector pipeline.