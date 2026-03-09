import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withRetry } from '../lib/retry.js';

// Mock logger to avoid side effects/noise during tests
vi.mock('../lib/logger.js', () => ({
	logger: {
		warn: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		debug: vi.fn(),
	},
}));

describe('withRetry', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return result if fn succeeds on first try', async () => {
		const fn = vi.fn().mockResolvedValue('success');
		const result = await withRetry(fn);
		expect(result).toBe('success');
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('should retry and eventually succeed', async () => {
		const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce('success');

		// Using small delayMs and maxRetries=1 (2 total attempts)
		const result = await withRetry(fn, { maxRetries: 1, delayMs: 1 });
		expect(result).toBe('success');
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('should throw error after max retries', async () => {
		const fn = vi.fn().mockRejectedValue(new Error('fail'));

		// maxRetries=2 means 3 total attempts
		await expect(withRetry(fn, { maxRetries: 2, delayMs: 1 })).rejects.toThrow('fail');
		expect(fn).toHaveBeenCalledTimes(3);
	});
});
