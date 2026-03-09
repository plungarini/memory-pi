import { useQuery } from '@tanstack/react-query';
import { ArrowUpDown, Database, Filter } from 'lucide-react';
import { api } from '../services/api';

const BrowsePage = () => {
	const { data: projectsData } = useQuery({
		queryKey: ['projects'],
		queryFn: () => api.getProjects(),
	});

	return (
		<div className="space-y-8">
			<header>
				<h2 className="text-3xl font-bold text-white mb-2">Browse Store</h2>
				<p className="text-secondary">Audit and inspect all stored namespaces</p>
			</header>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{projectsData?.projects.map((project) => (
					<div
						key={project}
						className="glass-card p-6 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group"
					>
						<div className="flex items-center gap-4">
							<div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform">
								<Database size={24} />
							</div>
							<div>
								<h3 className="text-lg font-bold text-white">{project}</h3>
							</div>
						</div>
						<div className="text-right">
							<ArrowUpDown size={18} className="text-white/10" />
						</div>
					</div>
				))}
			</div>

			<div className="flex flex-col items-center justify-center py-20 bg-black/20 rounded-3xl border border-dashed border-white/5">
				<Filter size={48} className="text-white/5 mb-4" />
				<p className="text-secondary">Select a project above to browse its content</p>
			</div>
		</div>
	);
};

export default BrowsePage;
