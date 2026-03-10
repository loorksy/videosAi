/**
 * إنشاء أو ترقية مستخدم ليكون أدمن/صاحب النظام.
 * الاستخدام: npx tsx scripts/seed-admin.ts <username> <password>
 * مثال: npx tsx scripts/seed-admin.ts loorksy@gmail.com Ahmetlork0009
 */
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const username = process.argv[2] || process.env.SEED_ADMIN_USERNAME;
const password = process.argv[3] || process.env.SEED_ADMIN_PASSWORD;

if (!username || !password) {
  console.error('Usage: npx tsx scripts/seed-admin.ts <username> <password>');
  console.error('Example: npx tsx scripts/seed-admin.ts loorksy@gmail.com YourPassword');
  process.exit(1);
}

const dbPath = join(__dirname, '../database.sqlite');
const db = new Database(dbPath);

// Ensure users table has tenant_id (migration)
const userColumns = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
if (!userColumns.some((c) => c.name === 'tenant_id')) {
  db.exec(`ALTER TABLE users ADD COLUMN tenant_id TEXT`);
}

const existing = db.prepare('SELECT id, role, status FROM users WHERE username = ?').get(username) as
  | { id: string; role: string; status: string }
  | undefined;

const hash = bcrypt.hashSync(password, 10);

if (existing) {
  db.prepare('UPDATE users SET password_hash = ?, role = ?, status = ? WHERE username = ?').run(
    hash,
    'admin',
    'approved',
    username
  );
  console.log('تم تحديث المستخدم إلى أدمن:', username);
} else {
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO users (id, username, password_hash, role, status, tenant_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, username, hash, 'admin', 'approved', id);
  db.prepare('INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)').run(id);
  console.log('تم إنشاء أدمن جديد:', username);
}

console.log('يمكنك الآن تسجيل الدخول بـ', username, 'كمدير للنظام.');
db.close();
