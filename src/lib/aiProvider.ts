// AI Provider - fal.ai only via Backend /api/ai/* (credits + JWT)

const API = window.location.origin;

let _authToken: string | null = null;

export function setAIAuthToken(token: string | null) {
  _authToken = token;
}

function getAuthHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_authToken) h['Authorization'] = `Bearer ${_authToken}`;
  return h;
}

export class InsufficientCreditsError extends Error {
  constructor() {
    super('Insufficient credits');
    this.name = 'InsufficientCreditsError';
  }
}

// Kept for compatibility with pages/components that still catch this error type.
export class MissingApiKeyError extends Error {
  provider: 'fal';

  constructor(provider: 'fal' = 'fal') {
    super('Missing API key');
    this.name = 'MissingApiKeyError';
    this.provider = provider;
  }
}

/** Text generation via Backend (fal + credits) */
export async function falGenerateText(
  userPrompt: string,
  systemPrompt?: string,
  featureKey?: string,
): Promise<string> {
  const resp = await fetch(`${API}/api/ai/generate-text`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ user: userPrompt, system: systemPrompt ?? undefined, featureKey }),
  });
  if (resp.status === 402) throw new InsufficientCreditsError();
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `خطأ ${resp.status}`);
  }
  const data = await resp.json();
  return data.text ?? '';
}

/** JSON generation (text + parse) */
export async function falGenerateJSON<T>(
  prompt: string,
  systemPrompt = '',
  featureKey?: string,
): Promise<T> {
  const fullSystem = `${systemPrompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no explanations.`;
  const text = await falGenerateText(prompt, fullSystem, featureKey);
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error('فشل تحليل الرد كـ JSON');
  }
}

/** Image generation via Backend (fal + credits). Returns first image URL or empty. */
export async function falGenerateImage(
  prompt: string,
  imageSize = 'landscape_16_9',
  featureKey?: string,
): Promise<string> {
  const resp = await fetch(`${API}/api/ai/generate-image`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ prompt, image_size: imageSize, featureKey }),
  });
  if (resp.status === 402) throw new InsufficientCreditsError();
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `خطأ توليد الصورة: ${resp.status}`);
  }
  const data = await resp.json();
  const images = data.images;
  if (Array.isArray(images) && images.length > 0) return images[0];
  return '';
}

/** Video generation via Backend (fal + credits). Returns video_url. */
export async function falGenerateVideo(params: {
  prompt?: string;
  image_url?: string;
  duration?: number;
  featureKey?: string;
}): Promise<string> {
  const resp = await fetch(`${API}/api/ai/generate-video`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (resp.status === 402) throw new InsufficientCreditsError();
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `خطأ توليد الفيديو: ${resp.status}`);
  }
  const data = await resp.json();
  return data.video_url ?? '';
}

/** Upload base64 media to Backend; returns public URL (e.g. /api/uploads/xxx). */
export async function uploadMediaBase64(data: string, type: 'image' | 'video' = 'image'): Promise<string> {
  const resp = await fetch(`${API}/api/media/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ data, type, title: '', description: '', aspectRatio: '16:9' }),
  });
  if (!resp.ok) throw new Error('فشل رفع الملف');
  const json = await resp.json();
  const url = json.url || json.path;
  if (typeof url === 'string') return url.startsWith('http') ? url : `${API}${url.startsWith('/') ? '' : '/'}${url}`;
  throw new Error('لم يتم إرجاع رابط');
}
