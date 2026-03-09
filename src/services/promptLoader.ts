import fs from 'node:fs';
import path from 'node:path';

import { config } from '../config.js';

export class PromptLoader {
	private globalPrompt: string = '';
	private projectPrompts: Map<string, string> = new Map();

	constructor() {
		this.loadGlobalPrompt();
		if (!fs.existsSync(config.PROMPT_PATH)) {
			fs.mkdirSync(config.PROMPT_PATH, { recursive: true });
		}
	}

	private loadGlobalPrompt() {
		// Look for _default.txt in prompts folder or fallback to embedded
		const defaultPath = path.join(config.PROMPT_PATH, '_default.txt');
		if (fs.existsSync(defaultPath)) {
			this.globalPrompt = fs.readFileSync(defaultPath, 'utf8');
		} else {
			this.globalPrompt = this.getDefaultPrompt();
		}
	}

	public getPromptForProject(project: string): string {
		if (config.PROMPT_HOT_RELOAD) {
			this.loadProjectPrompt(project);
		} else if (!this.projectPrompts.has(project)) {
			this.loadProjectPrompt(project);
		}

		const domainRules = this.projectPrompts.get(project) || '';
		return (
			this.globalPrompt
				.replace('{DISTILL_MAX_CHUNKS}', config.DISTILL_MAX_CHUNKS.toString())
				.replace('{DISTILL_MAX_CHUNK_CHARS}', config.DISTILL_MAX_CHUNK_CHARS.toString()) +
			'\n\n' +
			domainRules
		);
	}

	private loadProjectPrompt(project: string) {
		const projectPath = path.join(config.PROMPT_PATH, `${project}.txt`);
		if (fs.existsSync(projectPath)) {
			this.projectPrompts.set(project, fs.readFileSync(projectPath, 'utf8'));
		}
	}

	private getDefaultPrompt(): string {
		return `You are a memory distillation engine. You extract signal from content and
return it as structured JSON. You never return anything except valid JSON.

OUTPUT SCHEMA:
{
  "signal": boolean,
  "chunks": [{ "content": string, "topic": string (optional) }]
}

CHUNKING RULES:
- Split content into semantically distinct chunks. Each chunk covers one
  topic, event, or concept. Do not mix unrelated facts in one chunk.
- Maximum {DISTILL_MAX_CHUNKS} chunks per response.
- Maximum {DISTILL_MAX_CHUNK_CHARS} characters per chunk content.
- If content is short and cohesive, one chunk is correct.

DISTILLATION RULES:
- Extract only: facts, decisions, conclusions, key data points, notable patterns,
  specific numbers, names, dates, relationships, action items, outcomes.
- Discard: pleasantries, filler, repetition, opinions without factual basis,
  formatting artefacts, metadata stored elsewhere (timestamps, author names, URLs).
- Be ruthlessly concise. Match chunk count and density to information content.
  A 1000-word article might produce 3-6 chunks. A short message produces 1.

SIGNAL RULES:
- Set signal=false if content contains no extractable signal (spam, noise,
  broken data, empty content). Return empty chunks array.
- Set signal=true for any content with at least one extractable fact.

NEVER:
- Return prose outside JSON
- Add markdown formatting inside chunk content
- Invent facts not present in the source content
- Exceed the chunk count or character limits`;
	}
}

export const promptLoader = new PromptLoader();
