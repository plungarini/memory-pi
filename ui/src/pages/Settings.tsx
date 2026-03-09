import { Bell, Database, HardDrive, Settings as SettingsIcon, Shield } from 'lucide-react';

const SettingsPage = () => {
	const sections = [
		{ title: 'Security', icon: Shield, desc: 'API keys and access control' },
		{ title: 'Notifications', icon: Bell, desc: 'Alerts and system health' },
		{ title: 'Vector Store', icon: Database, desc: 'Namespace and collection management' },
		{ title: 'Storage', icon: HardDrive, desc: 'Disk usage and cleanup policies' },
	];

	return (
		<div className="space-y-8">
			<header>
				<h2 className="text-3xl font-bold text-white mb-2">Settings</h2>
				<p className="text-secondary">Configure your memory-pi instance</p>
			</header>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{sections.map((s) => (
					<div
						key={s.title}
						className="glass-card p-6 flex items-start gap-4 hover:bg-white/5 transition-colors cursor-pointer group"
					>
						<div className="p-3 bg-secondary/10 text-secondary rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
							<s.icon size={24} />
						</div>
						<div>
							<h3 className="text-lg font-bold text-white mb-1">{s.title}</h3>
							<p className="text-sm text-secondary">{s.desc}</p>
						</div>
					</div>
				))}
			</div>

			<div className="p-8 glass-card border-primary/20 bg-primary/5">
				<h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
					<SettingsIcon size={20} className="text-primary" />
					System Information
				</h3>
				<div className="grid grid-cols-2 gap-y-4 text-sm font-mono">
					<div className="text-secondary">Version:</div>
					<div className="text-white">1.0.0-alpha</div>
					<div className="text-secondary">Uptime:</div>
					<div className="text-white">2h 45m</div>
					<div className="text-secondary">Environment:</div>
					<div className="text-white">Production</div>
				</div>
			</div>
		</div>
	);
};

export default SettingsPage;
