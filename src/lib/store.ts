import Database from 'better-sqlite3';
import { createRequire } from 'node:module';
import os from 'node:os';
import { config } from '../config.js';

const require = createRequire(import.meta.url);

export const db: Database.Database = new Database(config.DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        project TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT NOT NULL, -- JSON string
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME
    );

    CREATE INDEX IF NOT EXISTS idx_memories_project ON memories(project);
    CREATE INDEX IF NOT EXISTS idx_memories_expires ON memories(expires_at);
`);

// Vector table for semantic search (using sqlite-vec)
try {
	const sqliteVec = require('sqlite-vec');
	sqliteVec.load(db);

	db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS memories_vec USING vec0(
            id TEXT PRIMARY KEY,
            embedding FLOAT[768]
        );
    `);
} catch (e: any) {
	console.error(`❌ Failed to load sqlite-vec: ${e.message}`);
	if (os.platform() === 'linux' && os.arch() === 'arm64') {
		console.error('💡 TIP: If you are on Raspberry Pi, please run: npm run setup:vec');
	}
	process.exit(1);
}

// Helper to determine embedding dimension dynamically or from config
// nomic-embed-text: 768
// mxbai-embed-large: 1024
// We'll stick to 768 for now as it's the default in our config.
