import Database from 'better-sqlite3';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize DB inside the root directory or server directory
const dbPath = join(__dirname, '../database.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Initialize base schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY,
    provider TEXT DEFAULT 'gemini',
    text_model TEXT DEFAULT 'gemini-2.5-flash',
    image_model TEXT DEFAULT 'gemini-3-pro-image-preview',
    video_model TEXT DEFAULT 'veo3_fast',
    gemini_key TEXT,
    kie_key TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payload TEXT,
    result_url TEXT,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Lightweight migration: ensure tenant_id column exists and is populated
const userColumns = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
const hasTenantId = userColumns.some((col) => col.name === 'tenant_id');

if (!hasTenantId) {
  db.exec(`ALTER TABLE users ADD COLUMN tenant_id TEXT`);
  db.exec(`UPDATE users SET tenant_id = id WHERE tenant_id IS NULL`);
}

console.log('Database initialized at:', dbPath);

export default db;
