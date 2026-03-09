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

function getSqliteVecVersion() {
	if (!fs.existsSync(packageJsonPath)) {
		throw new Error('sqlite-vec package.json not found. Run npm install first.');
	}
	return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).version;
}

function installSo(soSrc, version) {
	fs.mkdirSync(targetDir, { recursive: true });
	fs.copyFileSync(soSrc, targetSo);
	fs.writeFileSync(
		path.join(targetDir, 'package.json'),
		JSON.stringify({ name: 'sqlite-vec-linux-arm64', version, description: 'sqlite-vec for linux-arm64' }, null, 2),
	);
}

function testVec() {
	try {
		const pkgPath = path.join(process.cwd(), 'package.json').replace(/\\/g, '/');
		const testScript =
			"const {createRequire}=require('module');const r=createRequire('" +
			pkgPath +
			"');r('sqlite-vec').load(r('better-sqlite3')(':memory:'))";
		execSync('node -e "' + testScript + '"', { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

function cleanup(...paths) {
	for (const p of paths) {
		try {
			fs.rmSync(p, { recursive: true, force: true });
		} catch {}
	}
}

// Strategy 1: try npm install
function tryNpm() {
	console.log('\n[1/3] Attempting npm install...');
	try {
		execSync('npm install sqlite-vec-linux-arm64 --no-save --include=optional', { stdio: 'inherit' });
	} catch {
		// npm may exit non-zero; continue regardless
	}
}

// Strategy 2: download prebuilt binary from GitHub
function tryPrebuilt(version) {
	console.log('\n[2/3] Downloading prebuilt binary from GitHub...');
	const url = `https://github.com/asg017/sqlite-vec/releases/download/v${version}/sqlite-vec-${version}-loadable-linux-aarch64.tar.gz`;
	const tarball = path.join(os.tmpdir(), `sqlite-vec-${version}-prebuilt.tar.gz`);
	const extractDir = path.join(os.tmpdir(), `sqlite-vec-${version}-prebuilt`);
	console.log(`  URL: ${url}`);
	try {
		execSync(`curl -fsSL -o "${tarball}" "${url}"`, { stdio: 'inherit' });
		fs.mkdirSync(extractDir, { recursive: true });
		execSync(`tar -xzf "${tarball}" -C "${extractDir}"`);

		// Search for vec0.so (may be at root or in sub-dir)
		let soSrc = path.join(extractDir, 'vec0.so');
		if (!fs.existsSync(soSrc)) {
			for (const entry of fs.readdirSync(extractDir)) {
				const candidate = path.join(extractDir, entry, 'vec0.so');
				if (fs.existsSync(candidate)) {
					soSrc = candidate;
					break;
				}
			}
		}
		if (!fs.existsSync(soSrc)) throw new Error('vec0.so not found in tarball');

		// Check it's a 64-bit ELF before installing
		const fileInfo = execSync(`file "${soSrc}"`).toString();
		if (fileInfo.includes('32-bit')) {
			console.log('  ⚠️  Prebuilt binary is 32-bit ELF — skipping (known upstream bug in v0.1.6).');
			cleanup(tarball, extractDir);
			return false;
		}

		installSo(soSrc, version);
		cleanup(tarball, extractDir);
		return true;
	} catch (e) {
		console.log('  Prebuilt download failed:', e.message);
		cleanup(tarball, extractDir);
		return false;
	}
}

// Strategy 3: compile from source using the amalgamation tarball
function tryCompileFromSource(version) {
	console.log('\n[3/3] Compiling from source (amalgamation)...');

	// Check gcc is available
	try {
		execSync('gcc --version', { stdio: 'ignore' });
	} catch {
		console.log('  gcc not found. Install it with: sudo apt-get install -y gcc');
		return false;
	}

	const url = `https://github.com/asg017/sqlite-vec/releases/download/v${version}/sqlite-vec-${version}-amalgamation.tar.gz`;
	const tarball = path.join(os.tmpdir(), `sqlite-vec-${version}-amalgamation.tar.gz`);
	const buildDir = path.join(os.tmpdir(), `sqlite-vec-${version}-src`);
	console.log(`  URL: ${url}`);
	try {
		execSync(`curl -fsSL -o "${tarball}" "${url}"`, { stdio: 'inherit' });
		fs.mkdirSync(buildDir, { recursive: true });
		execSync(`tar -xzf "${tarball}" -C "${buildDir}"`);

		// The amalgamation contains sqlite-vec.c (may be at root or in a sub-dir)
		let srcFile = path.join(buildDir, 'sqlite-vec.c');
		if (!fs.existsSync(srcFile)) {
			for (const entry of fs.readdirSync(buildDir)) {
				const candidate = path.join(buildDir, entry, 'sqlite-vec.c');
				if (fs.existsSync(candidate)) {
					srcFile = candidate;
					break;
				}
			}
		}
		if (!fs.existsSync(srcFile)) throw new Error('sqlite-vec.c not found in amalgamation');

		const compiledSo = path.join(buildDir, 'vec0.so');
		console.log(`  Compiling ${srcFile}...`);
		// -DSQLITE_VEC_ENABLE_NEON enables ARM NEON SIMD optimisations
		execSync(`gcc -O2 -fPIC -shared -DSQLITE_VEC_ENABLE_NEON "${srcFile}" -o "${compiledSo}"`, { stdio: 'inherit' });

		installSo(compiledSo, version);
		cleanup(tarball, buildDir);
		return true;
	} catch (e) {
		console.log('  Compilation failed:', e.message);
		cleanup(tarball, buildDir);
		return false;
	}
}

async function main() {
	console.log('🔍 Checking sqlite-vec installation...');
	if (testVec()) {
		console.log('✅ sqlite-vec is already installed and working.');
		process.exit(0);
	}

	const version = getSqliteVecVersion();
	console.log(`   Targeting sqlite-vec v${version} for linux/arm64`);

	tryNpm();
	if (testVec()) {
		console.log('\n✅ sqlite-vec installed successfully via npm.');
		process.exit(0);
	}

	if (tryPrebuilt(version) && testVec()) {
		console.log('\n✅ sqlite-vec installed successfully via prebuilt binary.');
		process.exit(0);
	}

	if (tryCompileFromSource(version) && testVec()) {
		console.log('\n✅ sqlite-vec compiled and installed from source.');
		process.exit(0);
	}

	console.error('\n❌ All installation strategies failed.');
	console.error('   Please ensure gcc is installed: sudo apt-get install -y gcc');
	console.error('   Then retry: npm run setup:vec');
	process.exit(1);
}

main();
