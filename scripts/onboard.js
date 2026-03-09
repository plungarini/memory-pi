import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { request } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), '.env.example');
const isWindows = os.platform() === 'win32';

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkCommand(cmd) {
	try {
		const checkCmd = isWindows ? `where ${cmd}` : `command -v ${cmd}`;
		execSync(checkCmd, { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

async function installOllama() {
	if (isWindows) {
		console.log('🌐 Installing Ollama via winget...');
		try {
			execSync('winget install ollama --accept-package-agreements --accept-source-agreements', { stdio: 'inherit' });
			return true;
		} catch (e) {
			console.error('❌ Failed to install Ollama via winget:', e instanceof Error ? e.message : String(e));
			return false;
		}
	} else {
		console.log('🌐 Installing Ollama via official script...');
		try {
			execSync('curl -fsSL https://ollama.com/install.sh | sh', { stdio: 'inherit' });
			return true;
		} catch (e) {
			console.error('❌ Failed to install Ollama via official script:', e instanceof Error ? e.message : String(e));
			return false;
		}
	}
}

async function waitForOllama(maxRetries = 20) {
	console.log('⏳ Waiting for Ollama service to be ready...');
	for (let i = 0; i < maxRetries; i++) {
		try {
			const isReady = await new Promise((resolve) => {
				const req = request('http://localhost:11434/api/tags', { method: 'GET', timeout: 2000 }, (res) => {
					resolve(res.statusCode === 200);
				});
				req.on('error', () => resolve(false));
				req.end();
			});
			if (isReady) return true;
		} catch {
			// Ignore errors during polling
		}
		await sleep(3000);
	}
	return false;
}

async function setupEnvironment() {
	console.log('\n📝 Configuring environment variables...');
	let env = {};
	if (fs.existsSync(envPath)) {
		const existingEnv = fs.readFileSync(envPath, 'utf8');
		existingEnv.split('\n').forEach((line) => {
			const parts = line.split('=');
			const key = parts[0];
			const value = parts.slice(1).join('=');
			if (key && value) env[key.trim()] = value.trim();
		});
	}

	const exampleEnv = fs.readFileSync(envExamplePath, 'utf8');
	const lines = exampleEnv.split('\n');

	for (const line of lines) {
		const trimmedLine = line.trim();
		if (!trimmedLine || trimmedLine.startsWith('#')) continue;

		const [key, ...valueParts] = trimmedLine.split('=');
		const trimmedKey = key.trim();
		const exampleValue = valueParts.join('=').trim();
		const defaultValue = env[trimmedKey] || exampleValue;

		if (!env[trimmedKey]) {
			if (defaultValue && !defaultValue.startsWith('your_')) {
				env[trimmedKey] = defaultValue;
			} else {
				const answer = await question(`${trimmedKey} [${defaultValue}]: `);
				env[trimmedKey] = answer || defaultValue;
			}
		}
	}

	const envContent = Object.entries(env)
		.map(([key, value]) => `${key}=${value}`)
		.join('\n');

	fs.writeFileSync(envPath, envContent);
	console.log('✅ .env file saved.');
}

async function provisionInfrastructure() {
	// 1. Install Ollama
	const ollamaExists = await checkCommand('ollama');
	if (!ollamaExists) {
		console.log('🤖 Ollama not found. Starting automated installation...');
		await installOllama();
		if (!isWindows) {
			console.log('🔄 Starting Ollama service...');
			try {
				execSync('sudo systemctl start ollama', { stdio: 'ignore' });
			} catch {
				/* Ignore start errors */
			}
		}
	} else {
		console.log('✅ Ollama is already installed.');
	}

	// 3. Model Pulling
	if (await waitForOllama()) {
		console.log('🤖 Pulling embedding model (nomic-embed-text)...');
		try {
			execSync('ollama pull nomic-embed-text', { stdio: 'inherit' });
			console.log('✅ Model is ready.');
		} catch (e) {
			console.error('❌ Failed to pull model:', e instanceof Error ? e.message : String(e));
		}
	} else {
		console.log(
			'⚠️  Ollama not responding. Please ensure it is running and pull manually: ollama pull nomic-embed-text',
		);
	}
}

async function onboard() {
	console.log(`\n🚀 Zero-Touch memory-pi Onboarding [System: ${os.platform()}]\n`);

	await provisionInfrastructure();
	await setupEnvironment();

	console.log('\n📦 Installing project dependencies...');
	try {
		execSync('npm install', { stdio: 'inherit' });
		console.log('✅ Dependencies installed.');
	} catch (e) {
		console.error('❌ Dependency installation failed:', e instanceof Error ? e.message : String(e));
	}

	console.log('\n🎉 Onboarding complete! memory-pi is ready.');
	console.log('👉 Start everything with one zero-touch command (Ollama, API, UI):');
	console.log('   npm start\n');

	rl.close();
}

try {
	await onboard();
} catch (err) {
	console.error('❌ Critical onboarding error:', err instanceof Error ? err.message : String(err));
	process.exit(1);
}
