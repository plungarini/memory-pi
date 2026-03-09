import { config } from '../config.js';

export class Embedder {
	private readonly host = config.OLLAMA_HOST;
	private readonly model = config.EMBED_MODEL;

	public async embed(text: string): Promise<number[]> {
		const response = await fetch(`${this.host}/api/embeddings`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: this.model,
				prompt: text,
			}),
		});

		if (!response.ok) {
			const body = await response.text();
			throw new Error(`Ollama error (${response.status}): ${body}`);
		}

		const data = await response.json();
		return data.embedding;
	}

	public async embedBatch(texts: string[]): Promise<number[][]> {
		// Current Ollama API might not support batch embeddings in one call depending on version
		// We'll do them sequentially or in parallel for now.
		return Promise.all(texts.map((text) => this.embed(text)));
	}
}

export const embedder = new Embedder();
