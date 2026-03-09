import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Database, History, Loader2, Search as SearchIcon } from 'lucide-react';
import React, { useState } from 'react';

const SearchPage: React.FC = () => {
	const [query, setQuery] = useState('');
	const [isSearching, setIsSearching] = useState(false);
	const [results, setResults] = useState<any[]>([]);

	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!query.trim()) return;

		setIsSearching(true);
		try {
			const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
			const data = await res.json();
			setResults(data.results || []);
		} catch (err) {
			console.error('Search failed:', err);
		} finally {
			setIsSearching(false);
		}
	};

	return (
		<div className="space-y-8">
			<section className="text-center md:text-left space-y-2">
				<h2 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-white to-slate-400 bg-clip-text text-transparent text-center md:text-left">
					Search Memorable Moments
				</h2>
				<p className="text-slate-400 max-w-2xl mx-auto md:mx-0">
					Semantic search powered by Ollama & ChromaDB. Find anything by meaning, not just keywords.
				</p>
			</section>

			<form onSubmit={handleSearch} className="relative group">
				<div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary transition-colors">
					<SearchIcon size={22} />
				</div>
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="What do you want to remember?"
					className="w-full bg-surface/40 backdrop-blur-xl border border-white/10 rounded-2xl py-5 pl-14 pr-32 text-lg text-white placeholder:text-slate-500 focus:ring-4 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all shadow-2xl"
				/>
				<button
					type="submit"
					disabled={isSearching}
					className="absolute right-2 top-2 bottom-2 bg-primary hover:bg-primary-dark text-white px-6 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
				>
					{isSearching ? <Loader2 className="animate-spin" size={20} /> : 'Search'}
				</button>
			</form>

			<div className="space-y-4">
				<div className="flex items-center justify-between px-2">
					<h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
						<Database size={14} />
						{results.length > 0 ? `Results (${results.length})` : 'Recent Queries'}
					</h3>
				</div>

				<AnimatePresence mode="popLayout">
					{results.length > 0 ? (
						<div className="grid gap-4">
							{results.map((result, i) => (
								<motion.div
									key={i}
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: i * 0.05 }}
									className="glass-card p-6 flex flex-col md:flex-row gap-4 group cursor-pointer"
								>
									<div className="flex-1 space-y-3">
										<div className="flex items-center justify-between">
											<span className="text-xs font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
												Score: {(result.score * 100).toFixed(0)}%
											</span>
											<span className="text-[10px] text-slate-500 font-mono">ID: {result.id.split('-')[0]}...</span>
										</div>
										<p className="text-slate-200 leading-relaxed italic">"{result.content}"</p>
										<div className="flex flex-wrap gap-2">
											{Object.entries(result.metadata || {}).map(([k, v]: [string, any]) => (
												<span
													key={k}
													className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded text-slate-400"
												>
													{k}: {v}
												</span>
											))}
										</div>
									</div>
									<div className="md:border-l border-white/5 md:pl-4 flex items-center justify-center">
										<ChevronRight className="text-slate-600 group-hover:text-primary transition-colors" size={24} />
									</div>
								</motion.div>
							))}
						</div>
					) : (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="flex flex-col items-center justify-center py-20 text-slate-600 space-y-4"
						>
							<div className="p-2 md:p-4 bg-white/[0.02] rounded-full border border-white/5">
								<History size={48} className="w-10 h-10 md:w-12 md:h-12" strokeWidth={1} />
							</div>
							<p className="font-medium text-sm md:text-base">No results found or no query entered.</p>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
};

export default SearchPage;
