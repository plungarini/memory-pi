# Memory-Pi

Memory-Pi is a high-performance vector memory microservice designed as the long-term storage backbone for the "Pi" ecosystem.

## Overview

This module enables other services in the ecosystem to persist and retrieve semantic knowledge. It orchestrates multimodal data distillation (extracting insights from text, images, and PDFs) and stores them in a standalone ChromaDB instance to power Retrieval-Augmented Generation (RAG) workflows.

## Key Features

- **Multimodal Distillation**: Integrated with OpenRouter (Gemini 2.0) for structured semantic chunking.
- **Local Embeddings**: High-efficiency vector generation using a standalone Ollama instance (`nomic-embed-text`).
- **Zero-Touch Setup**: An interactive onboarding script that automatically installs Ollama and ChromaDB on both Windows and Raspberry Pi (Linux).
- **Admin Dashboard**: A premium, dark-themed React UI for semantic search, manual memory injection, and project auditing.
- **Lifecycle Management**: Automated TTL-based cleanup of temporary or expired memories via internal cron jobs.

## Getting Started

1.  **Install dependencies**: `npm install`
2.  **Zero-Touch Onboarding**: Run `node scripts/onboard.js` for a fully automated setup. This will install:
    - **Ollama** (via official script or winget)
    - **ChromaDB** (via pip)
    - **nomic-embed-text model**
3.  **Start Everything**: `npm start`
    - This will automatically launch **ChromaDB**, **Ollama**, the **Backend server**, and the **Admin UI** concurrently.

The Admin UI will be available at `http://localhost:3002`.
