import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { config } from '../../config.js';
import { logger } from '../../lib/logger.js';
import { embedder } from '../../services/embedder.js';
import { vectorStore } from '../../services/vectorStore.js';

export default async function searchRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
	// GET /api/memory/search - Query memories
	fastify.get('/memory/search', async (request, reply) => {
		const query = request.query as any;

		try {
			const { q, project, limit, tags, minImportance, after, before, includeExpired } = query;

			if (!q) {
				return reply.status(400).send({ error: 'query_q_required' });
			}

			if (!project && config.COLLECTION_STRATEGY === 'per-project') {
				return reply.status(400).send({ error: 'project_required_in_per_project_mode' });
			}

			// 1. Embed query
			const queryEmbedding = await embedder.embed(q);

			// 2. Build filters
			const filter: any = {};

			if (tags) {
				const tagList = Array.isArray(tags) ? tags : tags.split(',');
				filter.tags = { $all: tagList };
			}

			if (minImportance) {
				filter.importance = { $gte: Number.parseFloat(minImportance) };
			}

			if (after || before) {
				filter.createdAt = {};
				if (after) filter.createdAt['$gte'] = after;
				if (before) filter.createdAt['$lte'] = before;
			}

			// 3. Search
			const searchLimit = limit
				? Math.min(Number.parseInt(limit), config.MAX_SEARCH_LIMIT)
				: config.DEFAULT_SEARCH_LIMIT;

			const results = await vectorStore.search(project || 'all', queryEmbedding, searchLimit, filter);

			// 4. Transform results
			const transformed = results.ids[0].map((id, i) => ({
				id,
				text: results.documents[0]![i],
				score: results.distances ? 1 - results.distances[0]![i] : undefined, // Assuming cosine distance
				metadata: results.metadatas[0]![i],
			}));

			return {
				results: transformed,
				query: q,
				returnedCount: transformed.length,
			};
		} catch (err) {
			logger.error('Search failed:', err);
			return reply
				.status(500)
				.send({ error: 'search_failed', message: err instanceof Error ? err.message : String(err) });
		}
	});
}
