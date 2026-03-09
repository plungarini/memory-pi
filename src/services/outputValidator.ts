import { z } from 'zod';
import { config } from '../config.js';

export const DistillationOutputSchema = z
	.object({
		signal: z.boolean(),
		chunks: z
			.array(
				z.object({
					content: z.string().min(1).max(config.DISTILL_MAX_CHUNK_CHARS),
					topic: z.string().optional(),
				}),
			)
			.min(0)
			.max(config.DISTILL_MAX_CHUNKS),
	})
	.refine(
		(data) => {
			if (data.signal === false) {
				return data.chunks.length === 0;
			}
			return data.chunks.length > 0;
		},
		{
			message: 'If signal is false, chunks must be empty. If signal is true, chunks must not be empty.',
			path: ['chunks'],
		},
	);

export type DistillationOutput = z.infer<typeof DistillationOutputSchema>;

export const outputValidator = {
	parse(data: any): DistillationOutput {
		const parsed = typeof data === 'string' ? JSON.parse(data) : data;
		return DistillationOutputSchema.parse(parsed);
	},
};
