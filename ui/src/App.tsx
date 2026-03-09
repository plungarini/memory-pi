import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { clsx, type ClassValue } from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { Database, Github, LayoutDashboard, PlusCircle, Search, Settings } from 'lucide-react';
import React from 'react';
import { Link, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';

// Pages
import AddPage from './pages/Add';
import BrowsePage from './pages/Browse';
import SearchPage from './pages/Search';
import SettingsPage from './pages/Settings';

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const queryClient = new QueryClient();

const NavItem = ({
	to,
	icon: Icon,
	children,
	mobile,
}: {
	to: string;
	icon: any;
	children: React.ReactNode;
	mobile?: boolean;
}) => {
	const location = useLocation();
	const isActive = location.pathname === to;

	return (
		<Link
			to={to}
			className={cn(
				'flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl transition-all duration-200 group relative',
				isActive ? 'text-primary' : 'text-slate-400 hover:text-white',
				!mobile && isActive && 'bg-primary/5 border border-primary/10 shadow-[0_0_20px_rgba(129,140,248,0.1)]',
			)}
		>
			<Icon
				size={mobile ? 24 : 20}
				className={cn('transition-transform group-hover:scale-110', isActive && 'text-primary')}
			/>
			<span
				className={cn(
					'text-[10px] md:text-sm font-medium transition-colors',
					isActive ? 'text-primary' : 'text-slate-400',
				)}
			>
				{children}
			</span>
			{isActive && mobile && (
				<motion.div
					layoutId="nav-glow"
					className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(129,140,248,0.8)]"
				/>
			)}
		</Link>
	);
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const location = useLocation();

	return (
		<div className="flex h-[100dvh] bg-background text-slate-200 overflow-hidden flex-col md:flex-row">
			{/* Desktop Sidebar */}
			<aside className="hidden md:flex w-72 border-r border-white/5 flex-col p-6 bg-surface/20 backdrop-blur-3xl">
				<div className="flex items-center gap-3 px-2 py-4 mb-8">
					<div className="w-10 h-10 bg-linear-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
						<Database size={22} className="text-white" />
					</div>
					<div>
						<h1 className="text-xl font-bold tracking-tight text-white leading-tight">memory-pi</h1>
						<p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Local Vector Store</p>
					</div>
				</div>

				<nav className="flex-1 flex flex-col gap-1.5">
					<NavItem to="/" icon={Search}>
						Search
					</NavItem>
					<NavItem to="/add" icon={PlusCircle}>
						Add Memory
					</NavItem>
					<NavItem to="/browse" icon={LayoutDashboard}>
						Browse
					</NavItem>
				</nav>

				<div className="mt-auto flex flex-col gap-1.5 border-t border-white/5 pt-6">
					<NavItem to="/settings" icon={Settings}>
						Settings
					</NavItem>
					<a
						href="https://github.com/plungarini/pi"
						target="_blank"
						className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white transition-colors group"
						rel="noreferrer"
					>
						<Github size={20} className="group-hover:rotate-12 transition-transform" />
						<span className="text-sm font-medium">Repository</span>
					</a>
				</div>
			</aside>

			{/* Main Content Area */}
			<main className="flex-1 overflow-y-auto relative custom-scrollbar flex flex-col pb-20 md:pb-0">
				<header className="md:hidden flex items-center justify-between p-4 sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-white/5">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
							<Database size={16} className="text-white" />
						</div>
						<span className="font-bold text-white tracking-tight">memory-pi</span>
					</div>
					<Link to="/settings" className="text-slate-400 p-2">
						<Settings size={20} />
					</Link>
				</header>

				<div className="p-4 md:p-10 max-w-5xl mx-auto w-full">
					<AnimatePresence mode="wait">
						<motion.div
							key={location.pathname}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							transition={{ duration: 0.2, ease: 'easeOut' }}
						>
							{children}
						</motion.div>
					</AnimatePresence>
				</div>
			</main>

			{/* Mobile Bottom Navigation */}
			<nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-2xl border-t border-white/5 px-4 h-16 flex items-center justify-around shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
				<NavItem to="/" icon={Search} mobile>
					Search
				</NavItem>
				<NavItem to="/add" icon={PlusCircle} mobile>
					Add
				</NavItem>
				<NavItem to="/browse" icon={LayoutDashboard} mobile>
					Browse
				</NavItem>
			</nav>
		</div>
	);
};

const App: React.FC = () => {
	return (
		<QueryClientProvider client={queryClient}>
			<Router>
				<Layout>
					<Routes>
						<Route path="/" element={<SearchPage />} />
						<Route path="/add" element={<AddPage />} />
						<Route path="/browse" element={<BrowsePage />} />
						<Route path="/settings" element={<SettingsPage />} />
						<Route path="*" element={<SearchPage />} />
					</Routes>
				</Layout>
			</Router>
		</QueryClientProvider>
	);
};

export default App;
