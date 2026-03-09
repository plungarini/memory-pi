import { config } from '../config.js';
import { db } from '../lib/store.js';

export class VectorStore {
	public async add(projectName: string, ids: string[], embeddings: number[][], metadatas: any[], documents: string[]) {
		const insertMemory = db.prepare(`
            INSERT INTO memories (id, project, content, metadata, expires_at)
            VALUES (?, ?, ?, ?, ?)
        `);
		const insertVec = db.prepare(`
            INSERT INTO memories_vec (id, embedding)
            VALUES (?, ?)
        `);

		const transaction = db.transaction((items: any[]) => {
			for (const item of items) {
				try {
					insertMemory.run(
						item.id,
						projectName,
						item.content,
						JSON.stringify(item.metadata),
						item.metadata.expiresAt || null,
					);

					const vector = new Float32Array(item.embedding);
					insertVec.run(item.id, new Uint8Array(vector.buffer));
				} catch (err: any) {
					console.error(`Failed to insert item ${item.id}:`, err);
					console.error('Item types:', {
						id: typeof item.id,
						content: typeof item.content,
						metadata: typeof item.metadata,
						embedding: Array.isArray(item.embedding) ? `Array(${item.embedding.length})` : typeof item.embedding,
					});
					throw err;
				}
			}
		});

		const items = ids.map((id, i) => ({
			id,
			content: documents[i],
			metadata: metadatas[i],
			embedding: embeddings[i],
		}));

		transaction(items);
	}

	public async search(projectName: string, queryEmbedding: number[], limit: number = 5, filter: any = {}) {
		// Basic search using sqlite-vec vec0 MATCH syntax
		// Join with memories table to get metadata and content
		const k = limit || config.DEFAULT_SEARCH_LIMIT;

		const isGlobal = projectName === 'all' || !projectName;
		const query = `
            SELECT 
                m.id,
                m.content as document,
                m.metadata,
                v.distance
            FROM memories_vec v
            JOIN memories m ON v.id = m.id
            WHERE v.embedding MATCH ?
              ${isGlobal ? '' : 'AND m.project = ?'}
              AND k = ?
            ORDER BY v.distance ASC
        `;

		const params = [Buffer.from(new Float32Array(queryEmbedding).buffer)];
		if (!isGlobal) params.push(projectName as any);
		params.push(k as any);

		const results = db.prepare(query).all(...params) as any[];

		return {
			ids: [results.map((r) => r.id)],
			distances: [results.map((r) => r.distance)],
			metadatas: [results.map((r) => JSON.parse(r.metadata))],
			documents: [results.map((r) => r.document)],
		};
	}

	public async deleteDocument(projectName: string, documentId: string) {
		const transaction = db.transaction(() => {
			db.prepare('DELETE FROM memories_vec WHERE id LIKE ?').run(`${documentId}_%`);
			db.prepare('DELETE FROM memories WHERE id LIKE ? AND project = ?').run(`${documentId}_%`, projectName);
		});
		transaction();
	}

	public async purgeProject(projectName: string) {
		const transaction = db.transaction(() => {
			db.prepare(
				`
                DELETE FROM memories_vec 
                WHERE id IN (SELECT id FROM memories WHERE project = ?)
            `,
			).run(projectName);
			db.prepare('DELETE FROM memories WHERE project = ?').run(projectName);
		});
		transaction();
	}

	public async purgeExpired(projectName: string, now: string): Promise<number> {
		const result = db.transaction(() => {
			const expiredIds = db
				.prepare('SELECT id FROM memories WHERE project = ? AND expires_at < ?')
				.all(projectName, now) as { id: string }[];

			if (expiredIds.length === 0) return 0;

			const ids = expiredIds.map((r) => r.id);
			db.prepare(`DELETE FROM memories_vec WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
			db.prepare(`DELETE FROM memories WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);

			return ids.length;
		})();

		return result;
	}

	public async listMemories(projectName: string, options: { limit?: number; offset?: number } = {}) {
		const limit = options.limit || 20;
		const offset = options.offset || 0;

		const query = `
            SELECT id, content, metadata, expires_at, created_at
            FROM memories
            WHERE project = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;

		const countQuery = `SELECT COUNT(*) as count FROM memories WHERE project = ?`;

		const results = db.prepare(query).all(projectName, limit, offset) as any[];
		const total = (db.prepare(countQuery).get(projectName) as any).count;

		return {
			memories: results.map((r) => ({
				...r,
				metadata: JSON.parse(r.metadata),
			})),
			total,
			limit,
			offset,
		};
	}

	public async listProjects(): Promise<string[]> {
		const results = db.prepare('SELECT DISTINCT project FROM memories').all() as { project: string }[];
		return results.map((r) => r.project);
	}
}

export const vectorStore = new VectorStore();
