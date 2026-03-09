export interface SearchResult {
	id: string;
	text: string;
	score: number;
	topic?: string;
	metadata: any;
}

export interface SearchResponse {
	results: SearchResult[];
	query: string;
	returnedCount: number;
}

export const api = {
	async search(params: Record<string, any>): Promise<SearchResponse> {
		const searchParams = new URLSearchParams();
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== '') searchParams.append(key, String(value));
		});

		const response = await fetch(`/api/search?${searchParams.toString()}`);
		if (!response.ok) throw new Error('Search failed');
		return response.json();
	},

	async addMemory(data: any) {
		const response = await fetch('/api/memory', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		});
		if (!response.ok) throw new Error('Failed to add memory');
		return response.json();
	},

	async getProjects(): Promise<{ projects: string[] }> {
		const response = await fetch('/api/projects');
		if (!response.ok) throw new Error('Failed to fetch projects');
		return response.json();
	},

	async getMemories(project: string, params: { limit?: number; offset?: number } = {}) {
		const query = new URLSearchParams();
		if (params.limit !== undefined) query.append('limit', String(params.limit));
		if (params.offset !== undefined) query.append('offset', String(params.offset));

		const response = await fetch(`/api/projects/${encodeURIComponent(project)}/memories?${query.toString()}`);
		if (!response.ok) throw new Error('Failed to fetch memories');
		return response.json();
	},

	async deleteDocument(documentId: string, project: string) {
		const response = await fetch(`/api/memory/${documentId}?project=${project}`, {
			method: 'DELETE',
		});
		if (!response.ok) throw new Error('Delete failed');
		return response.json();
	},
};
