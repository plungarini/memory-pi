import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../lib/logger.js';
import { distiller } from '../../services/distiller.js';
import { embedder } from '../../services/embedder.js';
import { inputNormalizer, type ContentType } from '../../services/inputNormaliser.js';

import { validateMetadata } from '../../services/metadataValidator.js';
import { vectorStore } from '../../services/vectorStore.js';

export default async function memoryRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
	// POST /api/memory - Write a new memory
	fastify.post('/memory', async (request, reply) => {
		const body = request.body as any;

		try {
			const { content, contentType = 'text', distillPrompt, metadata: rawMetadata } = body;

			// 1. Validate metadata
			const metadata = validateMetadata(rawMetadata);
			const documentId = uuidv4();
			const createdAt = new Date().toISOString();

			// 2. Normalise input
			const normalisedContent = inputNormalizer.normalize(content, contentType as ContentType);

			// 3. Distill
			logger.debug(`Distilling content for project ${metadata.project}...`);
			const { signal, chunks } = await distiller.distill(normalisedContent, metadata.project, distillPrompt);

			if (!signal) {
				logger.warn(`No signal detected for project ${metadata.project}. Rejecting.`);
				return reply.status(422).send({ error: 'distillation_no_signal' });
			}

			// 4. Embed chunks
			logger.debug(`Embedding ${chunks.length} chunks...`);
			const contents = chunks.map((c) => c.content);
			const embeddings = await embedder.embedBatch(contents);

			// 5. Store in VectorStore
			const ids = chunks.map((_, i) => `${documentId}_${i}`);
			const metadatas = chunks.map((c, i) => ({
				...metadata,
				documentId,
				createdAt,
				chunkIndex: i,
				chunkTotal: chunks.length,
				topic: c.topic || '',
				inputType: contentType,
			}));

			await vectorStore.add(metadata.project, ids, embeddings, metadatas, contents);

			logger.info(`Stored ${chunks.length} chunks for document ${documentId} (${metadata.project})`);

			return {
				documentId,
				chunkCount: chunks.length,
				storedAt: createdAt,
				chunks: chunks.map((c) => ({ topic: c.topic, contentPreview: c.content.substring(0, 100) + '...' })),
			};
		} catch (err: any) {
			logger.error('Write failed:', err);
			if (err.name === 'ZodError') {
				return reply.status(400).send({ error: 'validation_error', details: err.format() });
			}
			return reply.status(503).send({ error: 'distillation_failed', message: err.message });
		}
	});

	// DELETE /api/memory/:documentId - Remove a document
	fastify.delete('/memory/:documentId', async (request, reply) => {
		const { documentId } = request.params as { documentId: string };
		const { project } = request.query as { project: string };

		if (!project) {
			return reply.status(400).send({ error: 'project_required' });
		}

		try {
			await vectorStore.deleteDocument(project, documentId);
			logger.info(`Deleted document ${documentId} for project ${project}`);
			return { success: true };
		} catch (err) {
			logger.error(`Failed to delete document ${documentId}:`, err);
			return reply.status(500).send({ error: 'delete_failed' });
		}
	});

	// DELETE /api/memory/project/:name - Purge project
	fastify.delete('/memory/project/:name', async (request, reply) => {
		const { name } = request.params as { name: string };

		try {
			await vectorStore.purgeProject(name);
			logger.info(`Purged all data for project ${name}`);
			return { success: true };
		} catch (err) {
			logger.error(`Failed to purge project ${name}:`, err);
			return reply.status(500).send({ error: 'purge_failed' });
		}
	});
}
