import { logger } from './logger.js';

interface RetryOptions {
	maxRetries?: number;
	delayMs?: number;
	factor?: number;
	onRetry?: (error: any, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
	maxRetries: 3, // 3 retries after first try = 4 total attempts
	delayMs: 1000,
	factor: 2,
};

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
	let lastError: any;
	const { maxRetries, delayMs, factor } = { ...DEFAULT_OPTIONS, ...options };
	let delay = delayMs;

	// total attempts = maxRetries + 1
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			if (attempt === maxRetries) {
				break;
			}

			if (options.onRetry) {
				options.onRetry(error, attempt + 1);
			} else {
				logger.warn(
					`Attempt ${attempt + 1} failed: ${error instanceof Error ? error.message : String(error)}. Retrying in ${delay}ms...`,
				);
			}

			await new Promise((resolve) => setTimeout(resolve, delay));
			delay *= factor;
		}
	}

	throw lastError;
}
