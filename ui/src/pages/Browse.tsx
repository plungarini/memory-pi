import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Database, Folder, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import { api } from '../services/api';

const BrowsePage: React.FC = () => {
	const [selectedProject, setSelectedProject] = useState<string | null>(null);
	const [page, setPage] = useState(0);
	const limit = 10;

	const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
		queryKey: ['projects'],
		queryFn: () => api.getProjects(),
	});

	const { data: memoriesData, isLoading: isLoadingMemories } = useQuery({
		queryKey: ['memories', selectedProject, page],
		queryFn: async () => {
			if (!selectedProject) return null;
			return api.getMemories(selectedProject, { limit, offset: page * limit });
		},
		enabled: !!selectedProject,
	});

	const projects = projectsData?.projects || [];
	const memories = memoriesData?.memories || [];
	const totalMemories = memoriesData?.total || 0;
	const totalPages = Math.ceil(totalMemories / limit);

	return (
		<div className="space-y-8">
			<AnimatePresence mode="wait">
				{selectedProject ? (
					<motion.div
						key="memories"
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: 20 }}
						className="space-y-6"
					>
						<button
							onClick={() => setSelectedProject(null)}
							className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group mb-2"
						>
							<ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
							Back to Projects
						</button>

						<section className="space-y-2">
							<div className="flex items-center gap-3 text-primary">
								<Folder size={24} />
								<h2 className="text-3xl font-bold text-white">{selectedProject}</h2>
							</div>
							<p className="text-slate-400">Viewing {totalMemories} memories in this project.</p>
						</section>

						{isLoadingMemories ? (
							<div className="flex flex-col items-center justify-center py-20 text-slate-500">
								<Loader2 className="animate-spin mb-4" size={32} />
								<p>Loading memories...</p>
							</div>
						) : (
							<div className="space-y-4">
								<div className="grid gap-4">
									{memories.map((memory: any, i: number) => (
										<motion.div
											key={memory.id}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: i * 0.05 }}
											className="glass-card p-6 space-y-3"
										>
											<div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
												<span>ID: {memory.id.split('-')[0]}...</span>
												<span>{new Date(memory.created_at).toLocaleString()}</span>
											</div>
											<p className="text-slate-200 leading-relaxed italic">"{memory.content}"</p>
											<div className="flex flex-wrap gap-2">
												{Object.entries(memory.metadata || {}).map(([k, v]: [string, any]) => (
													<span
														key={k}
														className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded text-slate-400"
													>
														{k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
													</span>
												))}
											</div>
										</motion.div>
									))}
								</div>

								{totalPages > 1 && (
									<div className="flex items-center justify-between pt-6">
										<button
											onClick={() => setPage((p) => Math.max(0, p - 1))}
											disabled={page === 0}
											className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
										>
											<ChevronLeft size={20} />
											Previous
										</button>
										<span className="text-slate-500 text-sm font-medium">
											Page {page + 1} of {totalPages}
										</span>
										<button
											onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
											disabled={page >= totalPages - 1}
											className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
										>
											Next
											<ChevronRight size={20} />
										</button>
									</div>
								)}
							</div>
						)}
					</motion.div>
				) : (
					<motion.div
						key="projects"
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -20 }}
						className="space-y-8"
					>
						<section className="space-y-2">
							<h2 className="text-3xl font-bold text-white">Browse Memory</h2>
							<p className="text-slate-400">
								Explore all memory namespaces and projects stored in the vector database.
							</p>
						</section>

						{isLoadingProjects && (
							<div className="flex flex-col items-center justify-center py-20 text-slate-500">
								<Loader2 className="animate-spin mb-4" size={32} />
								<p>Loading projects...</p>
							</div>
						)}

						{!isLoadingProjects && projects.length > 0 && (
							<div className="grid gap-4 sm:grid-cols-2">
								{projects.map((project: string, i: number) => (
									<motion.div
										key={project}
										initial={{ opacity: 0, scale: 0.95 }}
										animate={{ opacity: 1, scale: 1 }}
										transition={{ delay: i * 0.05 }}
										onClick={() => {
											setSelectedProject(project);
											setPage(0);
										}}
										className="glass-card p-6 flex items-center justify-between group cursor-pointer"
									>
										<div className="flex items-center gap-4">
											<div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-primary/30 transition-colors">
												<Folder className="text-slate-400 group-hover:text-primary transition-colors" size={24} />
											</div>
											<div>
												<h4 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
													{project}
												</h4>
												<p className="text-xs text-slate-500 font-mono">projects/{project}</p>
											</div>
										</div>
										<ChevronRight
											className="text-slate-700 group-hover:text-primary transition-transform group-hover:translate-x-1"
											size={20}
										/>
									</motion.div>
								))}
							</div>
						)}

						{!isLoadingProjects && projects.length === 0 && (
							<div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl space-y-4">
								<div className="p-4 bg-white/2 inline-block rounded-full">
									<Database size={48} className="text-slate-700" />
								</div>
								<div className="text-slate-500">No projects found. Add your first memory to create a project.</div>
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default BrowsePage;
