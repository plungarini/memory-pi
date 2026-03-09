import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';

const [, , serviceName, port, ...cmdParts] = process.argv;
const cmd = cmdParts.join(' ');

if (!serviceName || !port || !cmd) {
	console.error('Usage: node start-service.js <name> <port> <command>');
	process.exit(1);
}

function checkPort(portNum) {
	return new Promise((resolve) => {
		const socket = createConnection(Number(portNum), '127.0.0.1');
		socket.on('connect', () => {
			socket.destroy();
			resolve(true);
		});
		socket.on('error', () => {
			resolve(false);
		});
	});
}

try {
	const isRunning = await checkPort(port);

	if (isRunning) {
		console.log(`✅ [${serviceName.toUpperCase()}] already running on port ${port}. Skipping start.`);
		// Keep the process alive so concurrently doesn't think we "finished" and signal others
		await new Promise(() => {
			setInterval(() => {}, 1000 * 60 * 60);
		});
	} else {
		console.log(`🚀 [${serviceName.toUpperCase()}] starting on port ${port}...`);
		const child = spawn(cmd, { shell: true, stdio: 'inherit' });

		child.on('exit', (code) => {
			console.log(`[${serviceName.toUpperCase()}] process exited with code ${code}`);
			process.exit(code || 0);
		});
	}
} catch (err) {
	console.error(`❌ [${serviceName.toUpperCase()}] failed to start:`, err instanceof Error ? err.message : String(err));
	process.exit(1);
}
