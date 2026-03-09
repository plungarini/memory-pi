export type ContentType = 'text' | 'image' | 'audio' | 'pdf' | 'mixed';

export interface MultimodalContent {
	type: string;
	source?: {
		type: string;
		media_type: string;
		data: string;
	};
	text?: string;
	image_url?: {
		url: string;
	};
}

export const inputNormalizer = {
	normalize(content: any, type: ContentType): any[] {
		switch (type) {
			case 'text':
				return [{ type: 'text', text: content }];
			case 'image':
				return [
					{
						type: 'image_url',
						image_url: { url: content.startsWith('http') ? content : `data:image/jpeg;base64,${content}` },
					},
				];
			case 'pdf':
				return [
					{
						type: 'file',
						file: { url: content.startsWith('http') ? content : `data:application/pdf;base64,${content}` },
					},
				];
			case 'audio':
				return [
					{
						type: 'audio',
						audio: { url: content.startsWith('http') ? content : `data:audio/mpeg;base64,${content}` },
					},
				];
			case 'mixed':
				if (Array.isArray(content))
					return content.map((part) => {
						if (part.type === 'image')
							return { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${part.content}` } };
						return part;
					});
				try {
					return JSON.parse(content);
				} catch (e) {
					throw new Error('Invalid JSON or array for mixed content type');
				}
			default:
				throw new Error(`Unsupported content type: ${type}`);
		}
	},
};
