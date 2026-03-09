import { describe, expect, it } from 'vitest';
import { inputNormalizer } from '../services/inputNormaliser.js';

describe('inputNormalizer', () => {
	it('should normalize pure text input', () => {
		const result = inputNormalizer.normalize('Hello world', 'text');
		expect(result).toEqual([{ type: 'text', text: 'Hello world' }]);
	});

	it('should normalize image input', () => {
		const result = inputNormalizer.normalize('base64data', 'image');
		expect(result[0].type).toBe('image_url');
		expect((result[0] as any).image_url.url).toBe('data:image/jpeg;base64,base64data');
	});

	it('should normalize multimodal array input', () => {
		const mixed = [
			{ type: 'text', text: 'Analyze this:' },
			{ type: 'image', content: 'imgdata' },
		];
		const result = inputNormalizer.normalize(mixed, 'mixed');
		expect(result).toHaveLength(2);
		expect(result[0].type).toBe('text');
		expect(result[1].type).toBe('image_url');
	});
});
