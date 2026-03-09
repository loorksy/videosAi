import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jwt-simple';
import db from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';

// ====== MIDDLEWARE ======
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

    db.prepare('INSERT INTO users (id, username, password_hash, role, status, tenant_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, username, hash, role, status, tenantId);

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

    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        tenantId: user.tenant_id,
      },
      settings,
    });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/auth/me', requireAuth, (req: any, res) => {
  const user = db
    .prepare('SELECT id, username, role, status, tenant_id FROM users WHERE id = ?')
    .get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });

    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(user.id);
  res.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
      tenantId: user.tenant_id,
    },
    settings,
  });
});


// ====== ADMIN ROUTES ======
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
    const users = db.prepare('SELECT id, username, role, status, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
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


// ====== SETTINGS ROUTES ======
app.get('/api/settings', requireAuth, (req: any, res) => {
    const settings = db.prepare('SELECT provider, text_model, image_model, video_model, gemini_key, kie_key FROM user_settings WHERE user_id = ?').get(req.user.id);
    res.json(settings);
});

app.post('/api/settings', requireAuth, (req: any, res) => {
    const { provider, text_model, image_model, video_model, gemini_key, kie_key } = req.body;

    // We allow partial updates
    const setClauses: string[] = [];
    const params: any[] = [];

    if (provider !== undefined) { setClauses.push('provider = ?'); params.push(provider); }
    if (text_model !== undefined) { setClauses.push('text_model = ?'); params.push(text_model); }
    if (image_model !== undefined) { setClauses.push('image_model = ?'); params.push(image_model); }
    if (video_model !== undefined) { setClauses.push('video_model = ?'); params.push(video_model); }
    if (gemini_key !== undefined) { setClauses.push('gemini_key = ?'); params.push(gemini_key); }
    if (kie_key !== undefined) { setClauses.push('kie_key = ?'); params.push(kie_key); }

    if (setClauses.length > 0) {
        params.push(req.user.id);
        db.prepare(`UPDATE user_settings SET ${setClauses.join(', ')} WHERE user_id = ?`).run(...params);
    }


    res.json({ success: true });
});

// ====== JOBS & KIE ROUTES ======
import jobsRouter from './routes/jobs.js';
import kieRouter from './routes/kie.js';

app.use('/api/jobs', requireAuth, jobsRouter);
app.use('/api/kie', requireAuth, kieRouter);

// Create basic health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

export default app;
