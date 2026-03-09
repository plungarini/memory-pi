import { ChromaClient, Collection } from 'chromadb';
import { config } from '../config.js';

export class VectorStore {
	private readonly client: ChromaClient;
	private readonly projectCollections: Map<string, Collection> = new Map();

	constructor() {
		this.client = new ChromaClient({
			path: config.CHROMA_URL || config.CHROMA_PATH,
		});
	}

	private async getCollection(projectName: string): Promise<Collection> {
		const collectionName =
			config.COLLECTION_STRATEGY === 'per-project'
				? `pi_memory_${projectName.replaceAll(/[^a-zA-Z0-9]/g, '_')}`
				: config.COLLECTION_NAME;

		if (this.projectCollections.has(collectionName)) {
			return this.projectCollections.get(collectionName)!;
		}

		const collection = await this.client.getOrCreateCollection({
			name: collectionName,
			metadata: { 'hnsw:space': 'cosine' },
		});

		this.projectCollections.set(collectionName, collection);
		return collection;
	}

	public async add(projectName: string, ids: string[], embeddings: number[][], metadatas: any[], documents: string[]) {
		const collection = await this.getCollection(projectName);
		await collection.add({
			ids,
			embeddings,
			metadatas,
			documents,
		});
	}

	public async search(projectName: string, queryEmbedding: number[], limit: number = 5, filter: any = {}) {
		const collection = await this.getCollection(projectName);

		// Combine project filter if strategy is 'single'
		const finalFilter = config.COLLECTION_STRATEGY === 'single' ? { ...filter, project: projectName } : filter;

		return await collection.query({
			queryEmbeddings: [queryEmbedding],
			nResults: limit,
			where: finalFilter,
		});
	}

	public async deleteDocument(projectName: string, documentId: string) {
		const collection = await this.getCollection(projectName);
		await collection.delete({
			where: { documentId: { $eq: documentId } },
		});
	}

	public async purgeProject(projectName: string) {
		if (config.COLLECTION_STRATEGY === 'per-project') {
			const collectionName = `pi_memory_${projectName.replaceAll(/[^a-zA-Z0-9]/g, '_')}`;
			await this.client.deleteCollection({ name: collectionName });
			this.projectCollections.delete(collectionName);
		} else {
			const collection = await this.getCollection(projectName);
			await collection.delete({
				where: { project: { $eq: projectName } },
			});
		}
	}

	/**
	 * Deletes items where expiresAt < now
	 */
	public async purgeExpired(projectName: string, now: string): Promise<number> {
		const collection = await this.getCollection(projectName);
		await collection.delete({
			where: { expiresAt: { $lt: now } },
		});
		return 0;
	}

	public async listProjects(): Promise<string[]> {
		const collections = await this.client.listCollections();
		if (config.COLLECTION_STRATEGY === 'per-project') {
			// Newer Chroma versions return objects with name, older return strings
			const names = collections.map((c: any) => (typeof c === 'string' ? c : c.name));
			return names
				.filter((name: string) => name.startsWith('pi_memory_'))
				.map((name: string) => name.replace('pi_memory_', ''));
		} else {
			return ['unknown (single-collection-mode)'];
		}
	}
}

export const vectorStore = new VectorStore();
