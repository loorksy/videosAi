import { Router } from 'express';
import db from '../db.js';

const router = Router();

// /api/jobs/active
router.get('/active', (req: any, res) => {
    try {
        const jobs = db.prepare(`
      SELECT id, type, status, result_url, error, created_at, updated_at 
      FROM jobs 
      WHERE user_id = ? AND status IN ('pending', 'processing')
      ORDER BY created_at DESC
    `).all(req.user.id);
        res.json(jobs);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// /api/jobs
router.get('/', (req: any, res) => {
    try {
        const jobs = db.prepare(`
      SELECT id, type, status, result_url, error, created_at, updated_at 
      FROM jobs 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(req.user.id);
        res.json(jobs);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a job
router.delete('/:id', (req: any, res) => {
    try {
        db.prepare('DELETE FROM jobs WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
