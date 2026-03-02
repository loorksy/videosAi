// AI Provider - Routes calls to Gemini or kie.ai based on user settings

const API = window.location.origin;

export type Provider = 'gemini' | 'kie';

export function getProviderSettings() {
  return {
    provider: (localStorage.getItem('AI_PROVIDER') || 'gemini') as Provider,
    textModel: localStorage.getItem('AI_TEXT_MODEL') || 'gemini-2.5-flash',
    imageModel: localStorage.getItem('AI_IMAGE_MODEL') || 'gemini-3-pro-image-preview',
    videoModel: localStorage.getItem('AI_VIDEO_MODEL') || 'veo3_fast',
  };
}

export class MissingApiKeyError extends Error {
  provider: Provider;
  constructor(provider: Provider) {
    const msg = provider === 'kie'
      ? 'مفتاح kie.ai API غير مضاف. اذهب للإعدادات لإضافته.'
      : 'مفتاح Gemini API غير مضاف. اذهب للإعدادات لإضافته.';
    super(msg);
    this.name = 'MissingApiKeyError';
    this.provider = provider;
  }
}

/** Check if the required API key is set. Throws MissingApiKeyError if not. */
export function requireApiKey(): void {
  const { provider } = getProviderSettings();
  if (provider === 'kie') {
    const key = localStorage.getItem('KIE_API_KEY');
    if (!key) throw new MissingApiKeyError('kie');
  } else {
    const key = localStorage.getItem('GEMINI_API_KEY');
    if (!key) throw new MissingApiKeyError('gemini');
  }
}

/** Check if kie.ai key exists (for video/motion which always need it) */
export function requireKieKey(): void {
  const key = localStorage.getItem('KIE_API_KEY');
  if (!key) throw new MissingApiKeyError('kie');
}

export function isKieProvider(): boolean {
  return getProviderSettings().provider === 'kie';
}

// kie.ai text generation via backend
export async function kieGenerateText(prompt: string, systemPrompt = ''): Promise<string> {
  const { textModel } = getProviderSettings();
  const resp = await fetch(`${API}/api/kie/generate-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, system_prompt: systemPrompt, model: textModel }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `خطأ ${resp.status}`);
  }
  const data = await resp.json();
  return data.text || '';
}

// kie.ai JSON text generation (parse JSON from response)
export async function kieGenerateJSON<T>(prompt: string, systemPrompt = ''): Promise<T> {
  const fullSystem = `${systemPrompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no explanations.`;
  const text = await kieGenerateText(prompt, fullSystem);
  // Try to extract JSON from the response
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find JSON in the text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('فشل تحليل الرد كـ JSON');
  }
}

// kie.ai image generation via backend (synchronous - waits for result)
export async function kieGenerateImage(
  prompt: string,
  size = '1:1',
  imageUrls: string[] = [],
): Promise<string> {
  const { imageModel } = getProviderSettings();
  const resp = await fetch(`${API}/api/kie/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model: imageModel, size, image_urls: imageUrls }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `خطأ توليد الصورة: ${resp.status}`);
  }
  const data = await resp.json();
  return data.imageUrl || '';
}
