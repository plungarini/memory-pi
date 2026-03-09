import cron from 'node-cron';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { vectorStore } from './vectorStore.js';

export function setupExpiryCron() {
	// Default: every day at 3 AM
	const schedule = config.EXPIRY_CRON || '0 3 * * *';

	cron.schedule(schedule, async () => {
		logger.info('Running expired items cleanup...');

		try {
			const now = new Date().toISOString();
			const projects = await vectorStore.listProjects();

			for (const project of projects) {
				try {
					await vectorStore.purgeExpired(project, now);
					logger.debug(`Cleaned up expired items for project: ${project}`);
				} catch (err) {
					logger.warn(`Failed to cleanup project ${project}:`, err);
				}
			}

			logger.info('Cleanup finished.');
		} catch (err) {
			logger.error('Failed to run expiry cleanup:', err);
		}
	});
}
