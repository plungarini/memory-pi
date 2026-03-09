import { File as FileIcon, FileText, Image as ImageIcon, Loader2, Music, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const AddPage = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		content: '',
		contentType: 'text',
		project: '',
		source: 'manual-entry',
		tags: '',
		importance: 0.5,
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			await api.addMemory({
				...formData,
				tags: formData.tags
					.split(',')
					.map((t) => t.trim())
					.filter(Boolean),
				metadata: {
					project: formData.project,
					source: formData.source,
					importance: Number.parseFloat(formData.importance as any),
				},
			});
			navigate('/');
		} catch (err) {
			alert('Failed to add memory');
		} finally {
			setLoading(false);
		}
	};

	const types = [
		{ id: 'text', icon: FileText, label: 'Text' },
		{ id: 'image', icon: ImageIcon, label: 'Image' },
		{ id: 'audio', icon: Music, label: 'Audio' },
		{ id: 'pdf', icon: FileIcon, label: 'PDF' },
	];

	return (
		<div className="max-w-3xl space-y-8">
			<header>
				<h2 className="text-3xl font-bold text-white mb-2">Add New Memory</h2>
				<p className="text-secondary">Manually inject knowledge into the ecosystem</p>
			</header>

			<form onSubmit={handleSubmit} className="space-y-6">
				<div className="glass-card p-8 space-y-6">
					{/* Content Type Selector */}
					<div>
						<label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-4">Content Type</label>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
							{types.map((t) => (
								<button
									key={t.id}
									type="button"
									onClick={() => setFormData({ ...formData, contentType: t.id })}
									className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
										formData.contentType === t.id
											? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10'
											: 'bg-black/20 border-white/5 text-secondary hover:border-white/10 hover:bg-black/30'
									}`}
								>
									<t.icon size={24} className="mb-2" />
									<span className="text-sm font-medium">{t.label}</span>
								</button>
							))}
						</div>
					</div>

					<div>
						<label
							htmlFor="raw-content"
							className="block text-sm font-bold uppercase tracking-wider text-secondary mb-2"
						>
							Content
						</label>
						<textarea
							id="raw-content"
							required
							className="input-field w-full min-h-[200px] py-4 resize-none"
							placeholder={
								formData.contentType === 'text' ? 'Paste your text here...' : 'Paste base64 encoded data here...'
							}
							value={formData.content}
							onChange={(e) => setFormData({ ...formData, content: e.target.value })}
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label
								htmlFor="project-name"
								className="block text-sm font-bold uppercase tracking-wider text-secondary mb-2"
							>
								Project Name
							</label>
							<input
								id="project-name"
								required
								type="text"
								className="input-field w-full"
								placeholder="e.g. general-knowledge"
								value={formData.project}
								onChange={(e) => setFormData({ ...formData, project: e.target.value })}
							/>
						</div>
						<div>
							<label
								htmlFor="source-name"
								className="block text-sm font-bold uppercase tracking-wider text-secondary mb-2"
							>
								Source
							</label>
							<input
								id="source-name"
								type="text"
								className="input-field w-full"
								value={formData.source}
								onChange={(e) => setFormData({ ...formData, source: e.target.value })}
							/>
						</div>
					</div>

					<div>
						<label
							htmlFor="tags-input"
							className="block text-sm font-bold uppercase tracking-wider text-secondary mb-2"
						>
							Tags (CSV)
						</label>
						<input
							id="tags-input"
							type="text"
							className="input-field w-full"
							placeholder="news, economics, fed..."
							value={formData.tags}
							onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
						/>
					</div>

					<div>
						<div className="flex justify-between items-center mb-2">
							<label className="block text-sm font-bold uppercase tracking-wider text-secondary">Importance</label>
							<span className="text-accent font-mono text-sm">{formData.importance}</span>
						</div>
						<input
							type="range"
							min="0"
							max="1"
							step="0.1"
							className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary"
							value={formData.importance}
							onChange={(e) => setFormData({ ...formData, importance: Number.parseFloat(e.target.value) })}
						/>
					</div>
				</div>

				<div className="flex justify-end gap-4">
					<button
						type="button"
						onClick={() => navigate('/')}
						className="px-6 py-3 text-secondary hover:text-white transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={loading}
						className="btn-primary flex items-center gap-2 min-w-[160px] justify-center disabled:opacity-50"
					>
						{loading ? (
							<Loader2 className="animate-spin" size={20} />
						) : (
							<>
								<Sparkles size={18} />
								<span>Distill & Save</span>
							</>
						)}
					</button>
				</div>
			</form>
		</div>
	);
};

export default AddPage;
