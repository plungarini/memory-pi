import fs from 'node:fs';
import os from 'node:os';

import { config } from '../config.js';
import { logger } from './logger.js';

export function checkDiskSpace() {
	try {
		// Note: Node doesn't have a built-in cross-platform df command.
		// For now, we'll just check if the base path is writable.
		// In a more robust implementation, we could use a package like 'diskusage'.

		if (!fs.existsSync(config.BASE_STORAGE_PATH)) {
			fs.mkdirSync(config.BASE_STORAGE_PATH, { recursive: true });
		}

		const testFile = `${config.BASE_STORAGE_PATH}/.healthcheck`;
		fs.writeFileSync(testFile, 'ok');
		fs.unlinkSync(testFile);

		// Basic heuristic: check if we are running low on memory/simulated disk alert
		// (This is a placeholder for real disk space checking)
	} catch (err) {
		logger.error('CRITICAL: Storage path is not writable!', err);
		throw err;
	}
}

export function getSystemStats() {
	return {
		freeMem: os.freemem(),
		totalMem: os.totalmem(),
		uptime: os.uptime(),
		loadAvg: os.loadavg(),
	};
}
