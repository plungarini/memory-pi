import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { logger } from '../../lib/logger.js';
import { vectorStore } from '../../services/vectorStore.js';

export default async function projectRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
	fastify.get('/projects', async () => {
		const projects = await vectorStore.listProjects();
		return { projects };
	});

	fastify.get('/projects/:name/memories', async (request, reply) => {
		const { name } = request.params as { name: string };
		const { limit, offset } = request.query as { limit?: string; offset?: string };

		try {
			const result = await vectorStore.listMemories(name, {
				limit: limit ? Number.parseInt(limit, 10) : 20,
				offset: offset ? Number.parseInt(offset, 10) : 0,
			});
			return result;
		} catch (err) {
			logger.error(`Failed to list memories for project ${name}:`, err);
			return reply.status(500).send({ error: 'failed_to_list_memories' });
		}
	});
}
