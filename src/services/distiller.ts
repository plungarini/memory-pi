import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { withRetry } from '../lib/retry.js';
import { outputValidator, type DistillationOutput } from './outputValidator.js';
import { promptLoader } from './promptLoader.js';

export class Distiller {
	private readonly apiKey = config.OPENROUTER_API_KEY;
	private readonly endpoint = 'https://openrouter.ai/api/v1/chat/completions';

	public async distill(content: any[], project: string, customPrompt?: string): Promise<DistillationOutput> {
		const systemPrompt = customPrompt
			? promptLoader.getPromptForProject(project) + '\n\n' + customPrompt
			: promptLoader.getPromptForProject(project);

		return withRetry(
			async () => {
				const response = await fetch(this.endpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${this.apiKey}`,
						'HTTP-Referer': 'http://memory.pi',
						'X-Title': 'memory-pi',
					},
					body: JSON.stringify({
						model: config.DISTILL_MODEL,
						messages: [
							{ role: 'system', content: systemPrompt },
							{ role: 'user', content: content },
						],
						response_format: { type: 'json_object' },
						provider: {
							prompt_caching: true,
						},
					}),
				});

				if (!response.ok) {
					const body = await response.text();
					throw new Error(`OpenRouter error (${response.status}): ${body}`);
				}

				const data = await response.json();
				const rawContent = data.choices[0]?.message?.content;

				if (!rawContent) {
					throw new Error('OpenRouter returned empty content');
				}

				try {
					return outputValidator.parse(rawContent);
				} catch (e) {
					logger.warn(
						`Distillation schema validation failed, retrying... Error: ${e instanceof Error ? e.message : String(e)}`,
					);
					throw e; // trigger retry
				}
			},
			{
				maxRetries: config.DISTILL_MAX_RETRIES,
				delayMs: config.DISTILL_RETRY_DELAY_MS,
			},
		);
	}
}

export const distiller = new Distiller();
