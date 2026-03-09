import { describe, expect, it } from 'vitest';
import { outputValidator } from '../services/outputValidator.js';

describe('outputValidator', () => {
	it('should validate correct JSON output', () => {
		const valid = JSON.stringify({
			signal: true,
			chunks: [{ content: 'test chunk', topic: 'test' }],
		});
		const result = outputValidator.parse(valid);
		expect(result.signal).toBe(true);
		expect(result.chunks).toHaveLength(1);
	});

	it('should throw on invalid schema', () => {
		const invalid = JSON.stringify({ signal: 'yes' });
		expect(() => outputValidator.parse(invalid)).toThrow();
	});

	it('should handle no-signal case', () => {
		const noSignal = JSON.stringify({ signal: false, chunks: [] });
		const result = outputValidator.parse(noSignal);
		expect(result.signal).toBe(false);
	});
});
