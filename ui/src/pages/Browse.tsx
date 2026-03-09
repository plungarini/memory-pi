import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronRight, Database, Folder, Loader2 } from 'lucide-react';
import React from 'react';

const BrowsePage: React.FC = () => {
	const { data, isLoading } = useQuery({
		queryKey: ['projects'],
		queryFn: async () => {
			const res = await fetch('/api/projects');
			return res.json();
		},
	});

	const projects = data?.projects || [];

	return (
		<div className="space-y-8">
			<section className="space-y-2">
				<h2 className="text-3xl font-bold text-white">Browse Memory</h2>
				<p className="text-slate-400">Explore all memory namespaces and projects stored in the vector database.</p>
			</section>

			{isLoading ? (
				<div className="flex flex-col items-center justify-center py-20 text-slate-500">
					<Loader2 className="animate-spin mb-4" size={32} />
					<p>Loading projects...</p>
				</div>
			) : projects.length > 0 ? (
				<div className="grid gap-4 sm:grid-cols-2">
					{projects.map((project: string, i: number) => (
						<motion.div
							key={project}
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: i * 0.05 }}
							className="glass-card p-6 flex items-center justify-between group cursor-pointer"
						>
							<div className="flex items-center gap-4">
								<div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-primary/30 transition-colors">
									<Folder className="text-slate-400 group-hover:text-primary transition-colors" size={24} />
								</div>
								<div>
									<h4 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{project}</h4>
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
			) : (
				<div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl space-y-4">
					<div className="p-4 bg-white/[0.02] inline-block rounded-full">
						<Database size={48} className="text-slate-700" />
					</div>
					<div className="text-slate-500">No projects found. Add your first memory to create a project.</div>
				</div>
			)}
		</div>
	);
};

export default BrowsePage;
