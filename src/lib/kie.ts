// kie.ai Video Generation Service via Backend API

const getApiBase = () => {
  // Use the same origin in production, or REACT_APP_BACKEND_URL
  return window.location.origin;
};

export interface KieVideoTask {
  taskId: string;
  imageUrl?: string;
}

export interface KieTaskStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  progress?: number;
  error?: string;
}

export const KieService = {
  // Generate video from text prompt only
  async generateTextToVideo(prompt: string, model = 'veo3_fast', aspectRatio = '9:16'): Promise<KieVideoTask> {
    const resp = await fetch(`${getApiBase()}/api/kie/generate-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model, aspect_ratio: aspectRatio }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `خطأ ${resp.status}`);
    }
    const data = await resp.json();
    return { taskId: data.data?.taskId || data.taskId };
  },

  // Generate video from image + prompt (all-in-one)
  async generateImageToVideo(imageBase64: string, prompt: string, model = 'veo3_fast', aspectRatio = '9:16'): Promise<KieVideoTask> {
    const resp = await fetch(`${getApiBase()}/api/kie/image-to-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: imageBase64,
        prompt,
        model,
        aspect_ratio: aspectRatio,
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || `خطأ ${resp.status}`);
    }
    const data = await resp.json();
    return { taskId: data.taskId, imageUrl: data.imageUrl };
  },

  // Poll task status until done
  async pollTaskStatus(taskId: string, onProgress?: (status: string) => void): Promise<string> {
    const maxPolls = 120; // 10 minutes max (5s intervals)
    for (let i = 0; i < maxPolls; i++) {
      await new Promise(r => setTimeout(r, 5000));
      
      const resp = await fetch(`${getApiBase()}/api/kie/task-status/${taskId}`);
      if (!resp.ok) continue;
      
      const result = await resp.json();
      const status = result.status || '';
      
      if (onProgress) {
        onProgress(`${status} (${i + 1}/${maxPolls})`);
      }
      
      if (status === 'completed' && result.videoUrl) {
        return result.videoUrl;
      }
      
      if (status === 'failed') {
        throw new Error('فشل توليد الفيديو');
      }
    }
    throw new Error('انتهت مهلة توليد الفيديو (10 دقائق)');
  },

  // Upload image and get URL
  async uploadImage(imageBase64: string): Promise<string> {
    const resp = await fetch(`${getApiBase()}/api/kie/upload-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: imageBase64 }),
    });
    if (!resp.ok) throw new Error('فشل رفع الصورة');
    const data = await resp.json();
    return data.url;
  },
};
