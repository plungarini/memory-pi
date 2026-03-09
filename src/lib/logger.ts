import fs from 'node:fs';
import path from 'node:path';

import { config } from '../config.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
	level: LogLevel;
	timestamp: string;
	message: string;
	meta?: any;
}

class LoggerClient {
	private logs: LogEntry[] = [];
	private readonly projectId = config.LOGGER_PI_SERVICE_NAME;
	private readonly endpoint = `${config.LOGGER_PI_URL}/logs`;
	private readonly fallbackPath = config.LOG_FALLBACK_PATH;
	private readonly interval: any; // Using any to avoid NodeJS.Timeout issues without @types/node in some environments
	private flushing = false;

	private readonly origLog = console.log;
	private readonly origWarn = console.warn;
	private readonly origError = console.error;
	private readonly origInfo = console.info;
	private readonly origDebug = console.debug;

	constructor() {
		// Ensure fallback directory exists
		if (!fs.existsSync(this.fallbackPath)) {
			fs.mkdirSync(this.fallbackPath, { recursive: true });
		}

		// Override console methods to capture all logs
		console.log = (...args: any[]) => {
			this.origLog(...args);
			this.queue('info', args);
		};
		console.info = (...args: any[]) => {
			this.origInfo(...args);
			this.queue('info', args);
		};
		console.warn = (...args: any[]) => {
			this.origWarn(...args);
			this.queue('warn', args);
		};
		console.error = (...args: any[]) => {
			this.origError(...args);
			this.queue('error', args);
		};
		console.debug = (...args: any[]) => {
			this.origDebug(...args);
			this.queue('debug', args);
		};

		this.interval = setInterval(() => {
			this.flush().catch((err) => this.origError('Failed to flush logs:', err));
		}, 1000);

		process.on('uncaughtException', (err: Error) => {
			this.origError('Uncaught Exception:', err);
			this.queue('fatal', [err.stack || err.message || err]);
			this.flushSync();
			process.exit(1);
		});

		process.on('unhandledRejection', (reason: any) => {
			this.origError('Unhandled Rejection:', reason);
			const msg = reason instanceof Error ? reason.stack || reason.message : String(reason);
			this.queue('fatal', [msg]);
			this.flushSync();
			process.exit(1);
		});
	}

	// Explicit methods for convenience and typed usage
	public info(...args: any[]) {
		console.info(...args);
	}
	public warn(...args: any[]) {
		console.warn(...args);
	}
	public error(...args: any[]) {
		console.error(...args);
	}
	public debug(...args: any[]) {
		console.debug(...args);
	}
	public fatal(...args: any[]) {
		this.origError('FATAL:', ...args);
		this.queue('fatal', args);
		this.flushSync();
	}

	private queue(level: LogLevel, args: any[]) {
		const message = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');

		this.logs.push({
			level,
			timestamp: new Date().toISOString(),
			message,
		});

		if (this.logs.length > 5000) {
			this.logs = this.logs.slice(-1000);
		}
	}

	public async flush() {
		if (this.flushing || this.logs.length === 0) return;
		this.flushing = true;

		const batch = [...this.logs];
		this.logs = [];

		try {
			const response = await fetch(this.endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ projectId: this.projectId, logs: batch }),
			});

			if (!response.ok) {
				this.writeToFallback(batch);
				this.requeue(batch);
			}
		} catch (err) {
			// Handle network error (fetch throw) silently
			this.writeToFallback(batch);
			this.requeue(batch);
		} finally {
			this.flushing = false;
		}
	}

	private requeue(batch: LogEntry[]) {
		// Re-queue a portion to retry later (max 1000 items)
		this.logs = [...batch.slice(-500), ...this.logs].slice(-5000);
	}

	private writeToFallback(batch: LogEntry[]) {
		try {
			const logFile = path.join(this.fallbackPath, `fallback-${new Date().toISOString().split('T')[0]}.log`);
			const content = batch.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n') + '\n';
			fs.appendFileSync(logFile, content);
		} catch (e) {
			this.origError('Failed to write to fallback log:', e);
		}
	}

	private flushSync() {
		if (this.logs.length === 0) return;
		this.writeToFallback(this.logs);
	}

	public async close() {
		if (this.interval) clearInterval(this.interval);
		await this.flush();
	}
}

export const logger = new LoggerClient();
