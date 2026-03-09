import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { clsx, type ClassValue } from 'clsx';
import { Database, Github, LayoutDashboard, PlusCircle, Search, Settings } from 'lucide-react';
import React from 'react';
import { Link, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';

// Pages (will implement next)
import AddPage from './pages/Add';
import BrowsePage from './pages/Browse';
import SearchPage from './pages/Search';
import SettingsPage from './pages/Settings';

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const queryClient = new QueryClient();

const SidebarLink = ({ to, icon: Icon, children }: { to: string; icon: any; children: React.ReactNode }) => {
	const location = useLocation();
	const isActive = location.pathname === to;

	return (
		<Link
			to={to}
			className={cn(
				'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
				isActive
					? 'bg-primary/10 text-primary shadow-[0_0_20px_rgba(59,130,246,0.1)]'
					: 'text-secondary hover:bg-white/5 hover:text-white',
			)}
		>
			<Icon size={20} className={cn('transition-transform group-hover:scale-110', isActive && 'text-primary')} />
			<span className="font-medium">{children}</span>
		</Link>
	);
};

const App: React.FC = () => {
	return (
		<QueryClientProvider client={queryClient}>
			<Router>
				<div className="flex h-screen bg-background overflow-hidden">
					{/* Sidebar */}
					<aside className="w-64 border-r border-white/5 flex flex-col p-4 bg-background/50 backdrop-blur-xl">
						<div className="flex items-center gap-3 px-4 py-6 mb-4">
							<div className="w-8 h-8 bg-linear-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
								<Database size={18} className="text-white" />
							</div>
							<h1 className="text-xl font-bold tracking-tight text-white">memory-pi</h1>
						</div>

						<nav className="flex-1 flex flex-col gap-2">
							<SidebarLink to="/" icon={Search}>
								Search
							</SidebarLink>
							<SidebarLink to="/add" icon={PlusCircle}>
								Add Memory
							</SidebarLink>
							<SidebarLink to="/browse" icon={LayoutDashboard}>
								Browse
							</SidebarLink>
						</nav>

						<div className="mt-auto flex flex-col gap-2 border-t border-white/5 pt-4">
							<SidebarLink to="/settings" icon={Settings}>
								Settings
							</SidebarLink>
							<a
								href="https://github.com/plungarini/pi"
								target="_blank"
								className="flex items-center gap-3 px-4 py-3 rounded-xl text-secondary hover:text-white transition-colors"
								rel="noreferrer"
							>
								<Github size={20} />
								<span className="font-medium">Repository</span>
							</a>
						</div>
					</aside>

					{/* Content */}
					<main className="flex-1 overflow-y-auto relative custom-scrollbar">
						<div className="p-8 max-w-6xl mx-auto">
							<Routes>
								<Route path="/" element={<SearchPage />} />
								<Route path="/add" element={<AddPage />} />
								<Route path="/browse" element={<BrowsePage />} />
								<Route path="/settings" element={<SettingsPage />} />
								<Route path="*" element={<SearchPage />} />
							</Routes>
						</div>
					</main>
				</div>
			</Router>
		</QueryClientProvider>
	);
};

export default App;
