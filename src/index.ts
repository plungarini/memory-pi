import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from './config.js';
import { logger } from './lib/logger.js';
import { setupExpiryCron } from './services/expiryCron.js';

// Routes
import healthRoutes from './api/routes/health.js';
import memoryRoutes from './api/routes/memory.js';
import projectRoutes from './api/routes/projects.js';
import searchRoutes from './api/routes/search.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
	logger: false, // We use our own globalLogger
});

// Register routes
fastify.register(memoryRoutes, { prefix: '/api' });
fastify.register(searchRoutes, { prefix: '/api' });
fastify.register(projectRoutes, { prefix: '/api' });
fastify.register(healthRoutes); // /health at root level

// Static files for React UI
const publicPath = path.join(__dirname, 'public');
fastify.register(fastifyStatic, {
	root: publicPath,
	prefix: '/',
	decorateReply: false,
});

// SPA fallback - serve index.html for non-api/non-health routes
fastify.setNotFoundHandler((req, reply) => {
	if (!req.url.startsWith('/api') && req.url !== '/health') {
		return reply.sendFile('index.html');
	}
	reply.status(404).send({ error: 'Not Found' });
});

// Graceful shutdown
const shutdown = async () => {
	logger.info('Shutting down memory-pi...');
	await fastify.close();
	await logger.close();
	process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const start = async () => {
	try {
		// Setup background tasks
		setupExpiryCron();

		await fastify.listen({ port: config.PORT, host: '0.0.0.0' });
		logger.info(`memory-pi running on port ${config.PORT}`);
		console.log(`🚀 memory-pi running on http://localhost:${config.PORT}`);
	} catch (err) {
		logger.error('Failed to start server:', err);
		process.exit(1);
	}
};

start();
