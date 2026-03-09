import { Cpu, Globe, Info, Server, Shield } from 'lucide-react';
import React from 'react';

const SettingItem = ({
	icon: Icon,
	label,
	value,
	description,
}: {
	icon: any;
	label: string;
	value: string;
	description?: string;
}) => (
	<div className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div className="flex items-start gap-4">
			<div className="p-3 bg-white/5 rounded-xl text-slate-400 border border-white/5">
				<Icon size={20} />
			</div>
			<div>
				<h4 className="font-bold text-white mb-0.5">{label}</h4>
				<p className="text-xs text-slate-500 leading-relaxed max-w-sm">{description}</p>
			</div>
		</div>
		<div className="flex items-center gap-2 pl-14 md:pl-0">
			<span className="text-sm font-mono bg-primary/10 text-primary px-3 py-1 rounded-lg border border-primary/20">
				{value}
			</span>
		</div>
	</div>
);

const SettingsPage: React.FC = () => {
	return (
		<div className="space-y-8 pb-10">
			<section className="space-y-2">
				<h2 className="text-3xl font-bold text-white">Settings</h2>
				<p className="text-slate-400">Manage your long-term memory configuration and system parameters.</p>
			</section>

			<div className="space-y-6">
				<div className="space-y-4">
					<h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
						<Globe size={14} />
						API Configuration
					</h3>
					<div className="grid gap-3">
						<SettingItem
							icon={Server}
							label="API Endpoint"
							value="http://localhost:3002/api"
							description="The primary entry point for memory storage and retrieval."
						/>
						<SettingItem
							icon={Cpu}
							label="Ollama Node"
							value="http://localhost:11434"
							description="Local LLM service for semantic embeddings."
						/>
						<SettingItem
							icon={Globe}
							label="UI Port"
							value="3002"
							description="The port this dashboard is strictly running on."
						/>
					</div>
				</div>

				<div className="space-y-4 pt-4">
					<h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
						<Shield size={14} />
						Security & Privacy
					</h3>
					<div className="glass-card p-8 text-center space-y-4">
						<div className="p-4 bg-primary/10 rounded-full inline-block text-primary border border-primary/20">
							<Shield size={32} />
						</div>
						<div className="max-w-md mx-auto">
							<h4 className="font-bold text-white mb-2">Zero-Touch Local Security</h4>
							<p className="text-sm text-slate-500">
								All memory data remains local on your Raspberry Pi. No data is sent to external cloud services unless
								explicitly configured through OpenRouter for distillation.
							</p>
						</div>
					</div>
				</div>

				<footer className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-600">
					<div className="flex items-center gap-2 text-xs">
						<Info size={14} />
						<span>memory-pi version 1.0.0 (Release)</span>
					</div>
					<div className="text-[10px] uppercase tracking-tighter">Designed for the Pi Ecosystem</div>
				</footer>
			</div>
		</div>
	);
};

export default SettingsPage;
