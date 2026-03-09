import { clsx, type ClassValue } from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { Hash, Loader2, Send, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import type { ContentType } from '../../../src/services/inputNormaliser';
import { FileDropzone } from '../components/FileDropzone';

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const AddPage: React.FC = () => {
	const [content, setContent] = useState('');
	const [project, setProject] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [fileBase64, setFileBase64] = useState<string | null>(null);

	const handleFileSelect = async (file: File | null) => {
		setSelectedFile(file);
		setFileBase64(null);

		if (!file) return;

		const reader = new FileReader();
		const isText =
			file.type.startsWith('text/') ||
			file.name.endsWith('.md') ||
			file.name.endsWith('.json') ||
			file.name.endsWith('.js') ||
			file.name.endsWith('.ts') ||
			file.name.endsWith('.tsx') ||
			file.name.endsWith('.jsx');

		if (isText) {
			reader.onload = (e) => setContent(e.target?.result as string);
			reader.readAsText(file);
		} else {
			reader.onload = (e) => {
				const base64 = (e.target?.result as string).split(',')[1];
				setFileBase64(base64);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		const finalContent = selectedFile && !fileBase64 ? content : fileBase64 || content;
		if (!finalContent.trim()) return;

		let contentType: ContentType = 'text';
		if (selectedFile) {
			if (selectedFile.type.startsWith('image/')) contentType = 'image';
			else if (selectedFile.type === 'application/pdf') contentType = 'pdf';
			else if (selectedFile.type.startsWith('audio/')) contentType = 'audio';
		}

		setIsSaving(true);
		setStatus('idle');
		try {
			const res = await fetch('/api/memory', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content: finalContent,
					contentType,
					metadata: {
						project: project || 'general',
						source: 'ui',
						fileName: selectedFile?.name,
					},
				}),
			});

			if (res.ok) {
				setStatus('success');
				setContent('');
				setProject('');
				setSelectedFile(null);
				setFileBase64(null);
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
		<div className="min-h-[80vh] flex flex-col items-center justify-center max-w-4xl mx-auto p-4">
			<motion.section
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				className="text-center space-y-4 mb-12"
			>
				<div className="inline-flex p-4 bg-primary/10 rounded-3xl border border-primary/20 text-primary mb-4 shadow-[0_0_30px_rgba(129,140,248,0.2)]">
					<Sparkles size={32} />
				</div>
				<h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
					Capture Knowledge
				</h2>
				<p className="text-slate-400 max-w-md mx-auto">
					Unify your documents, images, and thoughts into one persistent micro-knowledge base.
				</p>
			</motion.section>

			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				className="w-full glass-card-premium p-1 relative"
			>
				<form onSubmit={handleAdd} className="relative z-10 bg-surface/40 rounded-[calc(1.5rem-2px)] overflow-hidden">
					<div className="p-6 space-y-6">
						{/* Project Selection (Floating chip style) */}
						<div className="flex items-center gap-3 px-1">
							<div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 group focus-within:border-primary/50 focus-within:bg-primary/5 transition-all">
								<Hash size={14} className="group-focus-within:text-primary" />
								<input
									type="text"
									value={project}
									onChange={(e) => setProject(e.target.value)}
									placeholder="Project: general"
									className="bg-transparent border-none outline-none text-xs text-white placeholder:text-slate-600 w-24 focus:w-32 transition-all"
								/>
							</div>
						</div>

						{/* Main Text Input Area */}
						<div className="relative group">
							<textarea
								value={content}
								onChange={(e) => setContent(e.target.value)}
								placeholder={
									selectedFile ? 'Add a note to this file...' : 'What would you like to store? (Drop a file or type...)'
								}
								className="w-full min-h-[160px] bg-transparent text-white placeholder:text-slate-600 outline-none resize-none leading-relaxed text-lg"
							/>

							<AnimatePresence>
								{isSaving && (
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										className="absolute inset-0 bg-surface/60 backdrop-blur-sm flex items-center justify-center rounded-xl z-20"
									>
										<div className="flex flex-col items-center gap-4">
											<Loader2 className="animate-spin text-primary" size={40} />
											<p className="text-primary font-medium animate-pulse">Distilling Knowledge...</p>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>

						{/* Action Bar */}
						<div className="flex items-center gap-4 pt-4 border-t border-white/5">
							<div className="flex-1">
								<FileDropzone onFileSelect={handleFileSelect} selectedFile={selectedFile} />
							</div>

							<button
								type="submit"
								disabled={isSaving || (!content.trim() && !selectedFile)}
								className={cn(
									'h-12 px-8 rounded-xl font-bold flex items-center gap-3 transition-all active:scale-[0.95] shrink-0',
									status === 'success'
										? 'bg-success text-white'
										: 'bg-primary hover:bg-primary-dark text-white shadow-[0_4px_12px_rgba(129,140,248,0.3)]',
								)}
							>
								{status === 'success' ? (
									<>Saved!</>
								) : (
									<>
										<Send size={18} />
										Capture
									</>
								)}
							</button>
						</div>
					</div>
				</form>

				{/* Success/Error Toast-like notifications */}
				<AnimatePresence>
					{status === 'error' && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0 }}
							className="absolute -bottom-16 left-0 right-0 py-3 rounded-xl bg-error/20 border border-error/30 text-error text-center text-sm font-medium backdrop-blur-md"
						>
							Failed to save memory. Check service status.
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>

			<footer className="mt-12 text-slate-500 text-xs flex gap-6">
				<div className="flex items-center gap-1.5">
					<div className="w-1.5 h-1.5 rounded-full bg-success" />
					Ollama Ready
				</div>
				<div className="flex items-center gap-1.5">
					<div className="w-1.5 h-1.5 rounded-full bg-success" />
					SQLite-vec Active
				</div>
			</footer>
		</div>
	);
};

export default AddPage;
