import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { checkDiskSpace, getSystemStats } from '../../lib/diskMonitor.js';

export default async function healthRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
	fastify.get('/health', async () => {
		try {
			checkDiskSpace();
			return {
				status: 'ok',
				timestamp: new Date().toISOString(),
				stats: getSystemStats(),
			};
		} catch (err) {
			return {
				status: 'error',
				error: err instanceof Error ? err.message : String(err),
			};
		}
	});
}
