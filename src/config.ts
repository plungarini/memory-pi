import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
	PORT: z.coerce.number().default(3002),
	API_KEY: z.string().optional(),

	BASE_STORAGE_PATH: z.string().default('./data'),
	DB_PATH: z.string().optional(),
	PROMPT_PATH: z.string().optional(),

	LOG_FALLBACK_PATH: z.string().optional(),

	OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required'),
	DISTILL_MODEL: z.string().default('google/gemini-2.0-flash-lite-001'),
	OLLAMA_HOST: z.string().default('http://localhost:11434'),
	EMBED_MODEL: z.string().default('nomic-embed-text'),

	LOGGER_PI_URL: z.string().default('http://localhost:4000'),
	LOGGER_PI_SERVICE_NAME: z.string().default('memory-pi'),

	DISTILL_MAX_RETRIES: z.coerce.number().default(3),
	DISTILL_RETRY_DELAY_MS: z.coerce.number().default(1000),
	DISTILL_MAX_CHUNKS: z.coerce.number().default(10),
	DISTILL_MAX_CHUNK_CHARS: z.coerce.number().default(800),

	COLLECTION_STRATEGY: z.enum(['single', 'per-project']).default('per-project'),
	COLLECTION_NAME: z.string().default('pi_memory_global'),
	EXPIRY_CRON: z.string().default('0 3 * * *'),
	DEFAULT_SEARCH_LIMIT: z.coerce.number().default(5),
	MAX_SEARCH_LIMIT: z.coerce.number().default(50),
	DISK_WARN_THRESHOLD_GB: z.coerce.number().default(10),
	PROMPT_HOT_RELOAD: z.preprocess((val) => val === 'true', z.boolean()).default(false),
	NODE_ENV: z.string().default('development'),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
	console.error('❌ Invalid configuration:', parsed.error.format());
	process.exit(1);
}

const baseConfig = parsed.data;

// Resolve paths relative to BASE_STORAGE_PATH if not provided
const resolvePath = (p: string | undefined, defaultSuffix: string) =>
	p ? path.resolve(p) : path.resolve(baseConfig.BASE_STORAGE_PATH, defaultSuffix);

export const config = {
	...baseConfig,
	DB_PATH: resolvePath(baseConfig.DB_PATH, 'memory-pi.db'),
	PROMPT_PATH: resolvePath(baseConfig.PROMPT_PATH, 'prompts'),
	LOG_FALLBACK_PATH: resolvePath(baseConfig.LOG_FALLBACK_PATH, 'logs'),
	ENV: baseConfig.NODE_ENV,
};
