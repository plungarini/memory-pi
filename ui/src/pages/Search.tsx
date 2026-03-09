import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Filter, Info, Search as SearchIcon, Shield, Tag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api, type SearchResult } from '../services/api';

const MemoryCard = ({
	result,
	onDelete,
}: {
	result: SearchResult;
	onDelete: (id: string, project: string) => void;
}) => {
	const [showExtra, setShowExtra] = useState(false);
	const m = result.metadata;

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.95 }}
			className="glass-card p-6 mb-4 hover:bg-surface/70 transition-colors group"
		>
			<div className="flex justify-between items-start mb-4">
				<div className="flex flex-wrap gap-2">
					<span className="bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
						{m.project}
					</span>
					{result.topic && (
						<span className="bg-accent/20 text-accent text-xs font-bold px-2 py-1 rounded-md">{result.topic}</span>
					)}
					<span className="bg-white/5 text-secondary text-xs px-2 py-1 rounded-md flex items-center gap-1">
						<Info size={12} /> {m.source}
					</span>
				</div>
				<div className="flex items-center gap-3">
					<div className="text-right">
						<div className="text-xs text-secondary mb-1">Score</div>
						<div className="text-sm font-mono font-bold text-accent">{(result.score * 100).toFixed(1)}%</div>
					</div>
					<button
						onClick={() => onDelete(m.documentId, m.project)}
						className="p-2 rounded-lg text-secondary hover:bg-danger/10 hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
					>
						<Trash2 size={18} />
					</button>
				</div>
			</div>

			<p className="text-lg leading-relaxed text-white/90 mb-4">{result.text}</p>

			<div className="flex flex-wrap items-center gap-4 text-xs text-secondary">
				<div className="flex items-center gap-1.5">
					<Calendar size={14} />
					{new Date(m.createdAt).toLocaleString()}
				</div>
				{m.tags && m.tags.length > 0 && (
					<div className="flex items-center gap-1.5">
						<Tag size={14} />
						{m.tags.join(', ')}
					</div>
				)}
				<div className="flex items-center gap-1.5">
					<Shield size={14} />
					Importance: {m.importance}
				</div>
			</div>

			<div className="mt-4 pt-4 border-t border-white/5">
				<button
					onClick={() => setShowExtra(!showExtra)}
					className="text-primary hover:text-primary/80 transition-colors"
				>
					{showExtra ? 'Hide Details' : 'View Raw Metadata'}
				</button>

				<AnimatePresence>
					{showExtra && (
						<motion.pre
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: 'auto', opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							className="mt-4 p-4 bg-black/30 rounded-xl overflow-x-auto text-xs font-mono text-accent/80 border border-white/5"
						>
							{JSON.stringify(m, null, 2)}
						</motion.pre>
					)}
				</AnimatePresence>
			</div>
		</motion.div>
	);
};

const SearchPage = () => {
	const [query, setQuery] = useState('');
	const [project, setProject] = useState('');

	const { data, isLoading, refetch } = useQuery({
		queryKey: ['search', query, project],
		queryFn: () => api.search({ q: query, project }),
		enabled: !!query,
	});

	const { data: projectsData } = useQuery({
		queryKey: ['projects'],
		queryFn: () => api.getProjects(),
	});

	const handleDelete = async (id: string, proj: string) => {
		if (confirm('Are you sure you want to delete this memory?')) {
			await api.deleteDocument(id, proj);
			refetch();
		}
	};

	return (
		<div className="space-y-8">
			<header>
				<h2 className="text-3xl font-bold text-white mb-2">Semantic Search</h2>
				<p className="text-secondary">Explore the ecosystem's long-term memory</p>
			</header>

			<div className="flex flex-col md:flex-row gap-4 items-end">
				<div className="flex-1 relative">
					<SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={20} />
					<input
						type="text"
						placeholder="Search anything..."
						className="input-field w-full pl-12 py-3 text-lg"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>

				<div className="w-full md:w-64">
					<label
						htmlFor="namespace-filter"
						className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2 px-1"
					>
						Namespace
					</label>
					<div className="relative">
						<Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" size={16} />
						<select
							id="namespace-filter"
							className="input-field w-full pl-10 appearance-none bg-surface"
							value={project}
							onChange={(e) => setProject(e.target.value)}
						>
							<option value="">All Projects</option>
							{projectsData?.projects.map((p) => (
								<option key={p} value={p}>
									{p}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			<div className="space-y-4">
				{isLoading && (
					<div className="flex justify-center py-20">
						<div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
					</div>
				)}

				{data?.results && (
					<div className="flex justify-between items-center mb-6">
						<div className="text-sm text-secondary">
							Found <span className="text-white font-bold">{data.results.length}</span> results
						</div>
					</div>
				)}

				<AnimatePresence>
					{data?.results.map((result) => (
						<MemoryCard key={result.id} result={result} onDelete={handleDelete} />
					))}
				</AnimatePresence>

				{!isLoading && query && data?.results.length === 0 && (
					<div className="text-center py-20 glass-card">
						<div className="text-secondary mb-2">No matches found for "{query}"</div>
						<p className="text-sm text-secondary/60">Try a different query or adjust filters.</p>
					</div>
				)}

				{!query && !isLoading && (
					<div className="text-center py-32 border-2 border-dashed border-white/5 rounded-3xl">
						<SearchIcon size={48} className="mx-auto text-white/5 mb-4" />
						<div className="text-secondary">Type a query above to search memory</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default SearchPage;
