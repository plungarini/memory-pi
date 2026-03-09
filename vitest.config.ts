import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		env: {
			OPENROUTER_API_KEY: 'test-key',
			NODE_ENV: 'test',
			BASE_STORAGE_PATH: './data/test',
		},
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
		},
	},
});
