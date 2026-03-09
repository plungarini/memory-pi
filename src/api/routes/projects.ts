import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { vectorStore } from '../../services/vectorStore.js';

export default async function projectRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
	fastify.get('/memory/projects', async () => {
		const projects = await vectorStore.listProjects();
		return { projects };
	});
}
