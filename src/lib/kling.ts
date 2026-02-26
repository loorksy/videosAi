// Kling AI Motion Control Service via fal.ai
// Docs: https://fal.ai/learn/devs/kling-video-2-6-motion-control-prompt-guide
// Pricing: Standard $0.07/sec, Pro $0.112/sec
// Supports direct file upload via fal.storage.upload() -> auto URL

import { fal } from "@fal-ai/client";

function initFal(): void {
  const key = localStorage.getItem('KLING_API_KEY');
  if (!key) throw new Error("مفتاح fal.ai غير مضاف. اذهب الى الاعدادات واضف المفتاح.");
  fal.config({ credentials: key });
}

export interface KlingMotionParams {
  prompt: string;
  // Accept either a File (will be uploaded) or a public URL string
  image_input: File | string;
  video_input: File | string;
  mode?: 'standard' | 'pro';
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  duration?: '5' | '10';
  negative_prompt?: string;
  character_orientation?: 'image' | 'video';
}

// Upload a File to fal.ai Storage and return a public CDN URL
async function uploadToFalStorage(file: File, onProgress?: (msg: string) => void): Promise<string> {
  onProgress?.(`جاري رفع ${file.type.startsWith('video') ? 'الفيديو' : 'الصورة'} (${(file.size / 1024 / 1024).toFixed(1)} MB)...`);
  const url = await fal.storage.upload(file);
  onProgress?.('اكتمل الرفع.');
  return url;
}

interface FalMotionResult {
  video: {
    url: string;
    content_type: string;
    file_name: string;
    file_size: number;
  };
}

export const KlingService = {

  // Full workflow: upload files if needed -> submit -> auto-poll -> return video URL
  async generateMotionVideo(
    params: KlingMotionParams,
    onProgress?: (status: string, elapsed: number) => void
  ): Promise<string> {
    initFal();

    const {
      prompt,
      image_input,
      video_input,
      mode = 'standard',
      aspect_ratio = '16:9',
      duration = '5',
      negative_prompt = '',
      character_orientation = 'video',
    } = params;

    // Upload files to fal.ai Storage if they are File objects, otherwise use URL directly
    let image_url: string;
    let video_url: string;

    if (image_input instanceof File) {
      image_url = await uploadToFalStorage(image_input, (msg) => onProgress?.(msg, 0));
    } else {
      image_url = image_input;
    }

    if (video_input instanceof File) {
      video_url = await uploadToFalStorage(video_input, (msg) => onProgress?.(msg, 0));
    } else {
      video_url = video_input;
    }

    // Build endpoint based on mode
    const endpoint = mode === 'pro'
      ? 'fal-ai/kling-video/v2.6/pro/motion-control'
      : 'fal-ai/kling-video/v2.6/standard/motion-control';

    const startTime = Date.now();

    onProgress?.('جاري ارسال المهمة الى Kling AI عبر fal.ai...', 0);

    try {
      const result = await fal.subscribe(endpoint, {
        input: {
          image_url,
          video_url,
          prompt,
          negative_prompt: negative_prompt || undefined,
          aspect_ratio,
          duration: duration,
          character_orientation,
        },
        pollInterval: 5000,
        logs: true,
        onQueueUpdate: (update) => {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          if (update.status === 'IN_QUEUE') {
            const pos = (update as any).queue_position;
            onProgress?.(
              pos !== undefined
                ? `في قائمة الانتظار (الموقع: ${pos})... (${elapsed} ث)`
                : `في قائمة الانتظار... (${elapsed} ث)`,
              elapsed
            );
          } else if (update.status === 'IN_PROGRESS') {
            onProgress?.(`جاري توليد الفيديو... (${elapsed} ث)`, elapsed);
          }
        },
      }) as { data: FalMotionResult; requestId: string };

      const videoUrl = result.data?.video?.url;
      if (!videoUrl) {
        throw new Error("اكتملت المهمة لكن لم يتم ارجاع رابط الفيديو.");
      }

      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      onProgress?.('اكتمل التوليد!', elapsed);
      return videoUrl;

    } catch (error: any) {
      // Handle fal.ai specific errors
      if (error?.status === 401 || error?.status === 403) {
        throw new Error("مفتاح fal.ai غير صالح. تحقق من المفتاح في الاعدادات.");
      }
      if (error?.status === 402) {
        throw new Error("رصيد fal.ai غير كاف. قم بشحن حسابك على fal.ai");
      }
      if (error?.status === 422) {
        const detail = error?.body?.detail || '';
        if (typeof detail === 'string' && detail.includes('image_url')) {
          throw new Error("رابط الصورة غير صالح. تاكد من انه رابط URL عام مباشر لصورة (png/jpg).");
        }
        if (typeof detail === 'string' && detail.includes('video_url')) {
          throw new Error("رابط الفيديو غير صالح. تاكد من انه رابط URL عام مباشر لفيديو (mp4).");
        }
        throw new Error(`خطا في المدخلات: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
      }
      // Re-throw with Arabic message
      throw new Error(error?.message || 'حدث خطا غير متوقع اثناء التوليد.');
    }
  },

  // Estimate cost
  estimateCost(duration: number, mode: 'standard' | 'pro'): { label: string; usd: string } {
    const rate = mode === 'standard' ? 0.07 : 0.112;
    const cost = duration * rate;
    return {
      label: `~$${cost.toFixed(2)}`,
      usd: `$${cost.toFixed(3)}`,
    };
  },
};
