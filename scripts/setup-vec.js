import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Only run on linux/arm64
if (os.platform() !== 'linux' || os.arch() !== 'arm64') {
	process.exit(0);
}

const packageJsonPath = path.join(process.cwd(), 'node_modules', 'sqlite-vec', 'package.json');
const targetDir = path.join(process.cwd(), 'node_modules', 'sqlite-vec-linux-arm64');
const targetSo = path.join(targetDir, 'vec0.so');

function testVec() {
	try {
		const pkgPath = path.join(process.cwd(), 'package.json').replace(/\\/g, '/');
		const testScript =
			"const {createRequire}=require('module');const r=createRequire('" +
			pkgPath +
			"');r('sqlite-vec').load(r('better-sqlite3')(':memory:'))";
		// Use a self-contained one-liner that loads the sqlite-vec extension in an in-memory db
		execSync('node -e "' + testScript + '"', { stdio: 'ignore' });
		return true;
	} catch (e) {
		return false;
	}
}

async function downloadFallback() {
	if (!fs.existsSync(packageJsonPath)) {
		throw new Error('sqlite-vec package.json not found. Run npm install first.');
	}
	const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
	const version = pkg.version;
	const url = `https://github.com/asg017/sqlite-vec/releases/download/v${version}/sqlite-vec-${version}-loadable-linux-aarch64.tar.gz`;
	const tarballDest = path.join(os.tmpdir(), `sqlite-vec-${version}.tar.gz`);
	const extractDir = path.join(os.tmpdir(), `sqlite-vec-${version}`);

	console.log(`Downloading sqlite-vec v${version} from GitHub...`);
	console.log(`URL: ${url}`);

	// curl is always available on Raspberry Pi OS and handles redirects natively
	execSync(`curl -fsSL -o ${tarballDest} "${url}"`, { stdio: 'inherit' });

	console.log('Extracting tarball...');
	fs.mkdirSync(extractDir, { recursive: true });
	execSync(`tar -xzf ${tarballDest} -C ${extractDir}`);

	// The tarball may contain vec0.so directly or in a subdirectory
	let soSrc = path.join(extractDir, 'vec0.so');
	if (!fs.existsSync(soSrc)) {
		// try one level deep
		const entries = fs.readdirSync(extractDir);
		for (const entry of entries) {
			const candidate = path.join(extractDir, entry, 'vec0.so');
			if (fs.existsSync(candidate)) {
				soSrc = candidate;
				break;
			}
		}
	}
	if (!fs.existsSync(soSrc)) {
		throw new Error(`vec0.so not found in extracted tarball at ${extractDir}`);
	}

	console.log('Installing vec0.so...');
	fs.mkdirSync(targetDir, { recursive: true });
	fs.copyFileSync(soSrc, targetSo);
	fs.writeFileSync(
		path.join(targetDir, 'package.json'),
		JSON.stringify(
			{
				name: 'sqlite-vec-linux-arm64',
				version: version,
				description: 'Pre-compiled sqlite-vec for linux-arm64',
			},
			null,
			2,
		),
	);

	console.log('Cleaning up...');
	try {
		fs.unlinkSync(tarballDest);
	} catch {}
	try {
		fs.rmSync(extractDir, { recursive: true, force: true });
	} catch {}
}

async function main() {
	console.log('Checking sqlite-vec installation...');
	if (testVec()) {
		console.log('✅ sqlite-vec is already installed and working.');
		process.exit(0);
	}

	console.log('Attempting to install via npm...');
	try {
		execSync('npm install sqlite-vec-linux-arm64 --no-save --include=optional', { stdio: 'inherit' });
	} catch (e) {
		console.log('npm install failed or returned error.');
	}

	if (testVec()) {
		console.log('✅ sqlite-vec installed successfully via npm.');
		process.exit(0);
	}

	console.log('npm install did not resolve the issue. Falling back to direct download...');
	try {
		await downloadFallback();
		if (testVec()) {
			console.log('✅ sqlite-vec installed successfully via direct download.');
			process.exit(0);
		} else {
			console.error('❌ sqlite-vec download succeeded, but test failed.');
			process.exit(1);
		}
	} catch (e) {
		console.error('❌ Fallback download failed:', e instanceof Error ? e.message : String(e));
		process.exit(1);
	}
}

main();
