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
    provider TEXT DEFAULT 'fal',
    text_model TEXT DEFAULT 'fal-ai/llama-3.2-3b-instruct',
    image_model TEXT DEFAULT 'fal-ai/fast-sdxl',
    video_model TEXT DEFAULT 'fal-ai/minimax-video-01',
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

  CREATE TABLE IF NOT EXISTS admin_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    default_credits INTEGER NOT NULL DEFAULT 100,
    cost_text INTEGER NOT NULL DEFAULT 1,
    cost_image INTEGER NOT NULL DEFAULT 2,
    cost_video INTEGER NOT NULL DEFAULT 10,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  INSERT OR IGNORE INTO admin_settings (id, default_credits, cost_text, cost_image, cost_video) VALUES (1, 100, 1, 2, 10);

  CREATE TABLE IF NOT EXISTS usage_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    cost INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

// Credits: add credits_balance to users if missing
const hasCreditsBalance = userColumns.some((col) => col.name === 'credits_balance');
if (!hasCreditsBalance) {
  db.exec(`ALTER TABLE users ADD COLUMN credits_balance INTEGER NOT NULL DEFAULT 0`);
  const row = db.prepare('SELECT default_credits FROM admin_settings WHERE id = 1').get() as { default_credits: number } | undefined;
  const defaultCredits = row?.default_credits ?? 100;
  db.prepare('UPDATE users SET credits_balance = ? WHERE credits_balance = 0').run(defaultCredits);
}

// Provider cleanup: drop legacy provider key columns if they still exist.
const settingsColumns = db.prepare('PRAGMA table_info(user_settings)').all() as { name: string }[];
const hasGeminiKey = settingsColumns.some((col) => col.name === 'gemini_key');
const hasKieKey = settingsColumns.some((col) => col.name === 'kie_key');

if (hasGeminiKey) {
  try { db.exec(`ALTER TABLE user_settings DROP COLUMN gemini_key`); } catch {}
}
if (hasKieKey) {
  try { db.exec(`ALTER TABLE user_settings DROP COLUMN kie_key`); } catch {}
}

// Provider migration: enforce fal-only settings for existing users
db.exec(`
  UPDATE user_settings
  SET
    provider = 'fal',
    text_model = COALESCE(NULLIF(text_model, ''), 'fal-ai/llama-3.2-3b-instruct'),
    image_model = COALESCE(NULLIF(image_model, ''), 'fal-ai/fast-sdxl'),
    video_model = COALESCE(NULLIF(video_model, ''), 'fal-ai/minimax-video-01')
`);

console.log('Database initialized at:', dbPath);

export default db;
