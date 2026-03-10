import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jwt-simple';
import db from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'internal-change-in-prod';

// ====== MIDDLEWARE ======
function requireInternal(req: any, res: any, next: any) {
    const key = req.headers['x-internal-key'] || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '');
    if (key !== INTERNAL_API_KEY) return res.status(401).json({ error: 'Unauthorized' });
    next();
}
function requireAuth(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.decode(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

function requireAdmin(req: any, res: any, next: any) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// ====== AUTH ROUTES ======
app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) return res.status(400).json({ error: 'Username already exists' });

    const id = crypto.randomUUID();
        const hash = bcrypt.hashSync(password, 10);
        // First user is automatically admin, others pending
    const isFirst = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
    const role = isFirst.count === 0 ? 'admin' : 'user';
    const status = isFirst.count === 0 ? 'approved' : 'pending';

    // For الآن كل مستخدم يكون مستأجر مستقل، نربط tenant_id = id
    const tenantId = id;
    const settingsRow = db.prepare('SELECT default_credits FROM admin_settings WHERE id = 1').get() as { default_credits: number } | undefined;
    const initialCredits = settingsRow?.default_credits ?? 100;

    db.prepare('INSERT INTO users (id, username, password_hash, role, status, tenant_id, credits_balance) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, username, hash, role, status, tenantId, initialCredits);

    // Create initial empty settings
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(id);

    res.json({ message: 'Registration successful. Status: ' + status, status });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'approved') {
      return res.status(403).json({ error: `Account status is ${user.status}. Please wait for admin approval.` });
    }

    const token = jwt.encode(
      { id: user.id, username: user.username, role: user.role, tenantId: user.tenant_id },
      JWT_SECRET
    );

    const totalUsage = (db.prepare('SELECT COALESCE(SUM(cost), 0) as total FROM usage_log WHERE user_id = ?').get(user.id) as { total: number }).total;
    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        tenantId: user.tenant_id,
        creditsBalance: user.credits_balance ?? 0,
        totalUsage: totalUsage ?? 0,
      },
      settings,
    });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/auth/me', requireAuth, (req: any, res) => {
  const user = db
    .prepare('SELECT id, username, role, status, tenant_id, credits_balance FROM users WHERE id = ?')
    .get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });

    const totalUsage = (db.prepare('SELECT COALESCE(SUM(cost), 0) as total FROM usage_log WHERE user_id = ?').get(user.id) as { total: number }).total;
    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(user.id);
  res.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
      tenantId: user.tenant_id,
      creditsBalance: user.credits_balance ?? 0,
      totalUsage: totalUsage ?? 0,
    },
    settings,
  });
});


// ====== ADMIN ROUTES ======
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
    const users = db.prepare('SELECT id, username, role, status, created_at, credits_balance FROM users ORDER BY created_at DESC').all() as any[];
    const withUsage = users.map((u) => {
        const row = db.prepare('SELECT COALESCE(SUM(cost), 0) as total FROM usage_log WHERE user_id = ?').get(u.id) as { total: number };
        return { ...u, creditsBalance: u.credits_balance ?? 0, totalUsage: row?.total ?? 0 };
    });
    res.json(withUsage);
});

app.get('/api/admin/credits/settings', requireAuth, requireAdmin, (req, res) => {
    const row = db.prepare('SELECT default_credits, cost_text, cost_image, cost_video, updated_at FROM admin_settings WHERE id = 1').get();
    res.json(row || { default_credits: 100, cost_text: 1, cost_image: 2, cost_video: 10, updated_at: null });
});

app.put('/api/admin/credits/settings', requireAuth, requireAdmin, (req: any, res) => {
    const { default_credits, cost_text, cost_image, cost_video } = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    if (default_credits !== undefined) { updates.push('default_credits = ?'); params.push(default_credits); }
    if (cost_text !== undefined) { updates.push('cost_text = ?'); params.push(cost_text); }
    if (cost_image !== undefined) { updates.push('cost_image = ?'); params.push(cost_image); }
    if (cost_video !== undefined) { updates.push('cost_video = ?'); params.push(cost_video); }
    if (updates.length) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        db.prepare(`UPDATE admin_settings SET ${updates.join(', ')} WHERE id = 1`).run(...params);
    }
    const row = db.prepare('SELECT default_credits, cost_text, cost_image, cost_video, updated_at FROM admin_settings WHERE id = 1').get();
    res.json(row);
});

app.put('/api/admin/users/:id/credits', requireAuth, requireAdmin, (req: any, res) => {
    const { credits } = req.body;
    if (typeof credits !== 'number' || credits < 0) return res.status(400).json({ error: 'Invalid credits value' });
    db.prepare('UPDATE users SET credits_balance = ? WHERE id = ?').run(credits, req.params.id);
    const user = db.prepare('SELECT id, credits_balance FROM users WHERE id = ?').get(req.params.id);
    res.json(user);
});

app.put('/api/admin/users/:id/status', requireAuth, requireAdmin, (req, res) => {
    const { status } = req.body;
    if (!['pending', 'approved', 'banned'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true, status });
});

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});


// ====== SETTINGS ROUTES (fal-only; no provider/keys) ======
app.get('/api/settings', requireAuth, (_req: any, res) => {
    res.json({ provider: 'fal' });
});

app.post('/api/settings', requireAuth, (_req: any, res) => {
    res.json({ success: true });
});

// ====== INTERNAL (Backend calls for credits) ======
app.get('/api/internal/credits/check', requireInternal, (req: any, res) => {
    const userId = req.query.user_id as string;
    const type = req.query.type as string; // text | image | video
    if (!userId || !type) return res.status(400).json({ error: 'user_id and type required' });
    const user = db.prepare('SELECT credits_balance FROM users WHERE id = ?').get(userId) as { credits_balance: number } | undefined;
    const settings = db.prepare('SELECT cost_text, cost_image, cost_video FROM admin_settings WHERE id = 1').get() as { cost_text: number; cost_image: number; cost_video: number };
    if (!user || !settings) return res.status(404).json({ error: 'User or settings not found' });
    const cost = type === 'text' ? settings.cost_text : type === 'image' ? settings.cost_image : type === 'video' ? settings.cost_video : 0;
    const ok = user.credits_balance >= cost;
    res.json({ ok, balance: user.credits_balance, cost });
});

app.post('/api/internal/credits/deduct', requireInternal, (req: any, res) => {
    const { user_id: userId, type, cost } = req.body;
    if (!userId || !type || typeof cost !== 'number' || cost < 0) return res.status(400).json({ error: 'user_id, type, cost required' });
    const user = db.prepare('SELECT credits_balance FROM users WHERE id = ?').get(userId) as { credits_balance: number } | undefined;
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.credits_balance < cost) return res.status(402).json({ error: 'Insufficient credits', balance: user.credits_balance });
    db.prepare('UPDATE users SET credits_balance = credits_balance - ? WHERE id = ?').run(cost, userId);
    const logId = crypto.randomUUID();
    db.prepare('INSERT INTO usage_log (id, user_id, type, cost) VALUES (?, ?, ?, ?)').run(logId, userId, type, cost);
    const updated = db.prepare('SELECT credits_balance FROM users WHERE id = ?').get(userId) as { credits_balance: number };
    res.json({ ok: true, newBalance: updated.credits_balance });
});

// ====== JOBS ROUTES ======
import jobsRouter from './routes/jobs.js';

app.use('/api/jobs', requireAuth, jobsRouter);

// Create basic health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

export default app;
