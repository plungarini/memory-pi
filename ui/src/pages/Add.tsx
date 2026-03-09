import { clsx, type ClassValue } from 'clsx';
import { motion } from 'framer-motion';
import { FileText, Hash, Loader2, Save, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const AddPage: React.FC = () => {
	const [content, setContent] = useState('');
	const [project, setProject] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

	const handleAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!content.trim()) return;

		setIsSaving(true);
		setStatus('idle');
		try {
			const res = await fetch('/api/memory', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content,
					contentType: 'text',
					metadata: {
						project: project || 'general',
						source: 'ui',
					},
				}),
			});

			if (res.ok) {
				setStatus('success');
				setContent('');
				setProject('');
				setTimeout(() => setStatus('idle'), 3000);
			} else {
				setStatus('error');
			}
		} catch (err) {
			console.error('Save failed:', err);
			setStatus('error');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="max-w-2xl mx-auto space-y-8">
			<section className="text-center space-y-2">
				<div className="inline-flex p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary mb-2">
					<Sparkles size={24} />
				</div>
				<h2 className="text-3xl font-bold text-white">Capture Knowledge</h2>
				<p className="text-slate-400">
					Add a new memory to the vector store. It will be automatically indexed and ready for semantic lookup.
				</p>
			</section>

			<form onSubmit={handleAdd} className="space-y-6">
				<div className="space-y-2">
					<label className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
						<FileText size={14} />
						Content
					</label>
					<textarea
						value={content}
						onChange={(e) => setContent(e.target.value)}
						placeholder="What would you like to store in the long-term memory?"
						className="w-full min-h-[200px] bg-surface/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-white placeholder:text-slate-600 focus:ring-4 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all shadow-xl resize-none leading-relaxed"
					/>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
						<Hash size={14} />
						Project / Category (Optional)
					</label>
					<input
						type="text"
						value={project}
						onChange={(e) => setProject(e.target.value)}
						placeholder="e.g. general, work, personal"
						className="w-full bg-surface/40 backdrop-blur-xl border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-600 focus:ring-4 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all shadow-xl"
					/>
				</div>

				<button
					type="submit"
					disabled={isSaving || !content.trim()}
					className={cn(
						'w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl',
						status === 'success' ? 'bg-success text-white' : 'bg-primary hover:bg-primary-dark text-white',
					)}
				>
					{isSaving ? (
						<Loader2 className="animate-spin" size={24} />
					) : status === 'success' ? (
						<>Successfully Saved!</>
					) : (
						<>
							<Save size={20} />
							Save to Memory
						</>
					)}
				</button>

				{status === 'error' && (
					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="text-error text-center text-sm font-medium"
					>
						Failed to save memory. Please check if the services are running.
					</motion.p>
				)}
			</form>
		</div>
	);
};

export default AddPage;
