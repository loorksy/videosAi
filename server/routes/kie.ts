import { Router } from 'express';
import db from '../db.js';
import crypto from 'crypto';

const router = Router();
const KIE_BASE_URL = 'https://api.kie.ai/api/v1';

function getKieApiKey(userId: string): string | null {
    const settings = db.prepare('SELECT kie_key FROM user_settings WHERE user_id = ?').get(userId) as any;
    if (settings && settings.kie_key) return settings.kie_key;
    return process.env.KIE_API_KEY || null;
}

// Polling loop for Video Tasks (Veo, Kling, Sora)
async function processKieVideoJob(jobId: string, taskId: string, apiKey: string) {
    const maxPolls = 150; // up to 12.5 mins
    for (let i = 0; i < maxPolls; i++) {
        await new Promise(r => setTimeout(r, 5000));
        try {
            const resp = await fetch(`${KIE_BASE_URL}/veo/record-info?taskId=${taskId}`, {
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
            });
            if (!resp.ok) continue;

            const result = await resp.json() as any;
            const data = result.data || {};
            const sf = data.successFlag || 0;

            if (sf === 1) {
                const urls = (data.response?.resultUrls) || [];
                const videoUrl = urls[0] || '';
                db.prepare(`UPDATE jobs SET status = 'completed', result_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(videoUrl, jobId);
                return;
            } else if (sf === 2 || sf === 3) {
                const errorMsg = data.response?.error || 'Video generation failed';
                db.prepare(`UPDATE jobs SET status = 'failed', error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(errorMsg, jobId);
                return;
            }
        } catch (e) {
            console.error('Error polling Video API:', e);
        }
    }
    db.prepare(`UPDATE jobs SET status = 'failed', error = 'Timeout waiting for generation', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(jobId);
}

// Upload local image to KIE CDN so their API can read it
async function uploadImageToKie(base64Data: string, filename: string, apiKey: string): Promise<string> {
    const base64Part = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(base64Part, 'base64');

    const blob = new Blob([buffer], { type: 'image/jpeg' });
    const fd = new FormData();
    fd.append('file', blob, filename);
    fd.append('uploadPath', 'storyweaver/images');
    fd.append('fileName', filename);

    const resp = await fetch('https://kieai.redpandaai.co/api/file-stream-upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: fd
    });

    if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Failed to upload image: ${txt}`);
    }
    const result = await resp.json() as any;
    const url = result.data?.downloadUrl;
    if (!url) throw new Error('No URL returned from upload');
    return url;
}


// POST /api/kie/generate-video
router.post('/generate-video', async (req: any, res: any) => {
    const apiKey = getKieApiKey(req.user.id);
    if (!apiKey) return res.status(500).json({ error: 'KIE_API_KEY not configured' });

    const { prompt, model = 'veo3_fast', aspect_ratio = '16:9' } = req.body;
    const jobId = crypto.randomUUID();

    // 1. Create Job Document
    db.prepare(`INSERT INTO jobs (id, user_id, type, status, payload) VALUES (?, ?, 'video', 'pending', ?)`).run(
        jobId, req.user.id, JSON.stringify({ prompt, model, aspect_ratio })
    );

    // 2. Respond to client
    res.status(202).json({ jobId, status: 'pending' });

    // 3. Spawning Background Worker
    (async () => {
        try {
            db.prepare(`UPDATE jobs SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(jobId);

            const payload = { prompt, model, aspect_ratio };
            const resp = await fetch(`${KIE_BASE_URL}/veo/generate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await resp.json() as any;
            if (!resp.ok) throw new Error(result.message || 'Error generating video');

            const taskId = result.data?.taskId || result.taskId;
            if (!taskId) throw new Error('No taskId returned');

            await processKieVideoJob(jobId, taskId, apiKey);
        } catch (err: any) {
            db.prepare(`UPDATE jobs SET status = 'failed', error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(err.message, jobId);
        }
    })();
});

// POST /api/kie/image-to-video
router.post('/image-to-video', async (req: any, res: any) => {
    const apiKey = getKieApiKey(req.user.id);
    if (!apiKey) return res.status(500).json({ error: 'KIE_API_KEY not configured' });

    const { prompt, image_base64, model = 'veo3_fast', aspect_ratio = '16:9' } = req.body;
    const jobId = crypto.randomUUID();

    db.prepare(`INSERT INTO jobs (id, user_id, type, status, payload) VALUES (?, ?, 'video', 'pending', ?)`).run(
        jobId, req.user.id, JSON.stringify({ prompt, model, aspect_ratio, hasImage: true })
    );

    res.status(202).json({ jobId, status: 'pending' });

    (async () => {
        try {
            db.prepare(`UPDATE jobs SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(jobId);

            const fileName = `${crypto.randomUUID()}.jpg`;
            const uploadedUrl = await uploadImageToKie(image_base64, fileName, apiKey);

            const payload = { prompt, model, aspect_ratio, imageUrls: [uploadedUrl] };
            const resp = await fetch(`${KIE_BASE_URL}/veo/generate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await resp.json() as any;
            if (!resp.ok) throw new Error(result.message || 'Error generating video');

            const taskId = result.data?.taskId || result.taskId;
            if (!taskId) throw new Error('No taskId returned');

            await processKieVideoJob(jobId, taskId, apiKey);
        } catch (err: any) {
            db.prepare(`UPDATE jobs SET status = 'failed', error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(err.message, jobId);
        }
    })();
});

// Polling loop for Image Tasks (GPT-Image, FLUX, etc)
async function processKieImageJob(jobId: string, taskId: string, apiKey: string, model: string) {
    const isGptModel = model.includes('gpt-image') || model.includes('4o-image');
    const statusEndpoint = isGptModel
        ? `${KIE_BASE_URL}/gpt4o-image/record-info`
        : `${KIE_BASE_URL}/jobs/recordInfo`;

    const maxPolls = 60; // Up to 3 minutes
    for (let i = 0; i < maxPolls; i++) {
        await new Promise(r => setTimeout(r, 3000));
        try {
            const resp = await fetch(`${statusEndpoint}?taskId=${taskId}`, {
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
            });
            if (!resp.ok) continue;

            const result = await resp.json() as any;
            const data = result.data || {};
            const sf = data.successFlag || 0;

            if (sf === 1) {
                let urls = data.response?.resultUrls || data.response?.imageUrls || data.response?.images || [];
                if (!urls.length && Array.isArray(data.response)) urls = data.response;
                const imageUrl = urls[0] || '';
                db.prepare(`UPDATE jobs SET status = 'completed', result_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(imageUrl, jobId);
                return;
            } else if (sf === 2 || sf === 3) {
                const errorMsg = data.response?.error || 'Image generation failed';
                db.prepare(`UPDATE jobs SET status = 'failed', error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(errorMsg, jobId);
                return;
            }
        } catch (e) {
            console.error('Error polling Image API:', e);
        }
    }
    db.prepare(`UPDATE jobs SET status = 'failed', error = 'Timeout waiting for image', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(jobId);
}

// POST /api/kie/generate-image
router.post('/generate-image', async (req: any, res: any) => {
    const apiKey = getKieApiKey(req.user.id);
    if (!apiKey) return res.status(500).json({ error: 'KIE_API_KEY not configured' });

    const { prompt, model = 'gpt-image-1', size = '1:1', image_urls = [] } = req.body;
    const jobId = crypto.randomUUID();

    db.prepare(`INSERT INTO jobs (id, user_id, type, status, payload) VALUES (?, ?, 'image', 'pending', ?)`).run(
        jobId, req.user.id, JSON.stringify({ prompt, model, size })
    );

    res.status(202).json({ jobId, status: 'pending' });

    (async () => {
        try {
            db.prepare(`UPDATE jobs SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(jobId);

            let endpoint = '';
            let payload: any = {};

            if (model.includes('gpt-image') || model.includes('4o-image')) {
                endpoint = `${KIE_BASE_URL}/gpt4o-image/generate`;
                payload = { prompt, size };
                if (image_urls.length > 0) payload.filesUrl = image_urls;
            } else if (model.includes('nano-banana')) {
                endpoint = `${KIE_BASE_URL}/jobs/createTask`;
                payload = {
                    model,
                    input: {
                        prompt,
                        aspect_ratio: size.includes(':') ? size : '1:1',
                        resolution: '2K',
                        output_format: 'jpg',
                        google_search: false,
                    }
                };
                if (image_urls.length > 0) payload.input.image_urls = image_urls;
            } else {
                // generic jobs endpoint
                endpoint = `${KIE_BASE_URL}/jobs/createTask`;
                payload = { model, input: { prompt, aspect_ratio: size.includes(':') ? size : '1:1' } };
                if (image_urls.length > 0) payload.input.image_urls = image_urls;
            }

            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await resp.json() as any;
            if (!resp.ok) throw new Error(result.msg || result.message || 'Error generating image');

            const taskId = result.data?.taskId || result.taskId;
            if (!taskId) throw new Error('No taskId returned');

            await processKieImageJob(jobId, taskId, apiKey, model);
        } catch (err: any) {
            db.prepare(`UPDATE jobs SET status = 'failed', error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(err.message, jobId);
        }
    })();
});

// POST /api/kie/generate-text (Synchronous since text is usually fast, but we can return immediately if we want)
router.post('/generate-text', async (req: any, res: any) => {
    const apiKey = getKieApiKey(req.user.id);
    if (!apiKey) return res.status(500).json({ error: 'KIE_API_KEY not configured' });

    const { prompt, system_prompt = '', model = 'gemini-2.5-flash' } = req.body;

    const messages = [];
    if (system_prompt) messages.push({ role: 'system', content: system_prompt });
    messages.push({ role: 'user', content: prompt });

    try {
        const resp = await fetch(`https://api.kie.ai/${model}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, stream: false })
        });

        if (!resp.ok) {
            const err = await resp.json() as any;
            throw new Error(err.error?.message || 'Error generating text');
        }
        const result = await resp.json() as any;
        const content = result.choices?.[0]?.message?.content || '';
        res.json({ text: content });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// TEST CONNECTION
router.post('/test-connection', async (req: any, res: any) => {
    const apiKey = getKieApiKey(req.user.id);
    if (!apiKey) return res.status(400).json({ error: 'No KIE API Key' });

    try {
        const resp = await fetch(`${KIE_BASE_URL}/chat/credit`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (resp.status === 200) {
            const data = await resp.json() as any;
            return res.json({ ok: true, message: `Key works. Credits: ${data.data}` });
        }
        throw new Error('Invalid key');
    } catch (err: any) {
        res.status(401).json({ error: err.message });
    }
});

export default router;
