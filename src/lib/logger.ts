import fs from 'node:fs';
import path from 'node:path';
import { format } from 'node:util';

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

	private readonly origLog = console.log.bind(console);
	private readonly origWarn = console.warn.bind(console);
	private readonly origError = console.error.bind(console);
	private readonly origInfo = console.info.bind(console);
	private readonly origDebug = console.debug.bind(console);

	constructor() {
		// Ensure fallback directory exists
		if (!fs.existsSync(this.fallbackPath)) {
			fs.mkdirSync(this.fallbackPath, { recursive: true });
		}

		// Override console methods to capture all logs
		console.log = (...args: any[]) => {
			try {
				this.origLog(...args);
				this.queue('info', args);
			} catch (e) {
				this.origLog('Error in console.log override:', e);
			}
		};
		console.info = (...args: any[]) => {
			try {
				this.origInfo(...args);
				this.queue('info', args);
			} catch (e) {
				this.origLog('Error in console.info override:', e);
			}
		};
		console.warn = (...args: any[]) => {
			try {
				this.origWarn(...args);
				this.queue('warn', args);
			} catch (e) {
				this.origLog('Error in console.warn override:', e);
			}
		};
		console.error = (...args: any[]) => {
			try {
				this.origError(...args);
				this.queue('error', args);
			} catch (e) {
				this.origLog('Error in console.error override:', e);
			}
		};
		console.debug = (...args: any[]) => {
			try {
				this.origDebug(...args);
				this.queue('debug', args);
			} catch (e) {
				this.origLog('Error in console.debug override:', e);
			}
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
		try {
			const message = format(...args);

			this.logs.push({
				level,
				timestamp: new Date().toISOString(),
				message,
			});

			if (this.logs.length > 5000) {
				this.logs = this.logs.slice(-1000);
			}
		} catch (e) {
			this.origLog('Failed to queue log:', e);
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
