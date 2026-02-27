// kie.ai Video Generation Service
// Fallback for when Gemini Veo fails due to content policy
// Supports Runway, Veo 3.1, and other models

const KIE_API_URL = 'https://api.kie.ai/api/v1';

interface KieTaskResponse {
  code: number;
  message: string;
  data: {
    taskId: string;
  };
}

interface KieStatusResponse {
  code: number;
  message: string;
  data: {
    status: string; // PENDING, PROCESSING, SUCCESS, FAILED
    videoUrl?: string;
    error?: string;
  };
}

const getKieKey = (): string => {
  const key = localStorage.getItem('KIE_API_KEY');
  if (!key) {
    throw new Error('مفتاح kie.ai API مفقود. الرجاء إدخاله في صفحة الإعدادات.');
  }
  return key;
};

// Helper to upload base64 image and get URL
const uploadImageToTemp = async (base64Image: string): Promise<string> => {
  // For kie.ai, we need a public URL. We'll use a data URL workaround
  // or upload to a temp service. For now, we'll use the base64 directly
  // if the API supports it, otherwise we need to handle this differently.
  
  // Check if it's already a URL
  if (base64Image.startsWith('http')) {
    return base64Image;
  }
  
  // For base64, we need to upload it somewhere
  // Using imgbb or similar free service as temp storage
  const base64Data = base64Image.split(',')[1];
  
  try {
    const formData = new FormData();
    formData.append('image', base64Data);
    
    const response = await fetch('https://api.imgbb.com/1/upload?key=00000000000000000000000000000000', {
      method: 'POST',
      body: formData,
    });
    
    if (response.ok) {
      const result = await response.json();
      return result.data?.url || base64Image;
    }
  } catch (e) {
    console.log('Image upload failed, using base64 directly');
  }
  
  // Return base64 as fallback (may not work with all endpoints)
  return base64Image;
};

export const KieService = {
  // Generate video using Runway model
  async generateVideoWithRunway(params: {
    imageUrl: string;
    prompt: string;
    aspectRatio?: '16:9' | '9:16' | '1:1';
    duration?: '5' | '10';
    resolution?: '720p' | '1080p';
  }): Promise<string> {
    const apiKey = getKieKey();
    const { imageUrl, prompt, aspectRatio = '16:9', duration = '5', resolution = '720p' } = params;
    
    console.log('Starting kie.ai Runway video generation...');
    
    // Upload image if it's base64
    let finalImageUrl = imageUrl;
    if (imageUrl.startsWith('data:')) {
      console.log('Converting base64 image...');
      finalImageUrl = await uploadImageToTemp(imageUrl);
    }
    
    // Submit to Runway
    const submitResponse = await fetch(`${KIE_API_URL}/runway/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        imageUrl: finalImageUrl,
        model: 'runway-duration-5-generate',
        duration: duration,
        resolution: resolution,
        aspectRatio: aspectRatio,
      }),
    });
    
    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('Runway submit error:', errorText);
      throw new Error(`فشل إرسال طلب الفيديو: ${submitResponse.status}`);
    }
    
    const queueResult: KieTaskResponse = await submitResponse.json();
    console.log('Task submitted:', queueResult);
    
    if (queueResult.code !== 200 && queueResult.code !== 0) {
      throw new Error(queueResult.message || 'فشل إرسال الطلب');
    }
    
    const taskId = queueResult.data.taskId;
    
    // Poll for completion
    return await this.pollForCompletion(taskId, 'runway');
  },

  // Generate video using Veo 3.1 via kie.ai (may have different content policies)
  async generateVideoWithVeo(params: {
    imageUrls: string[];
    prompt: string;
    mode?: 'TEXT_2_VIDEO' | 'REFERENCE_2_VIDEO' | 'FIRST_AND_LAST_FRAMES_2_VIDEO';
  }): Promise<string> {
    const apiKey = getKieKey();
    const { imageUrls, prompt, mode = 'REFERENCE_2_VIDEO' } = params;
    
    console.log('Starting kie.ai Veo 3.1 video generation...');
    
    // Convert base64 images to URLs
    const finalImageUrls: string[] = [];
    for (const img of imageUrls) {
      if (img.startsWith('data:')) {
        const url = await uploadImageToTemp(img);
        finalImageUrls.push(url);
      } else {
        finalImageUrls.push(img);
      }
    }
    
    // Submit to Veo
    const submitResponse = await fetch(`${KIE_API_URL}/veo/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        imageUrls: finalImageUrls.length > 0 ? finalImageUrls : undefined,
        model: 'veo3_fast',
        mode: finalImageUrls.length > 0 ? mode : 'TEXT_2_VIDEO',
      }),
    });
    
    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('Veo submit error:', errorText);
      throw new Error(`فشل إرسال طلب الفيديو: ${submitResponse.status}`);
    }
    
    const queueResult: KieTaskResponse = await submitResponse.json();
    console.log('Task submitted:', queueResult);
    
    if (queueResult.code !== 200 && queueResult.code !== 0) {
      throw new Error(queueResult.message || 'فشل إرسال الطلب');
    }
    
    const taskId = queueResult.data.taskId;
    
    // Poll for completion
    return await this.pollForCompletion(taskId, 'veo');
  },

  // Poll for task completion
  async pollForCompletion(taskId: string, model: 'runway' | 'veo'): Promise<string> {
    const apiKey = getKieKey();
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max (5 second intervals)
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await fetch(`${KIE_API_URL}/${model}/record-detail?taskId=${taskId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      
      if (!statusResponse.ok) {
        console.error('Status check failed:', statusResponse.status);
        attempts++;
        continue;
      }
      
      const statusResult: KieStatusResponse = await statusResponse.json();
      console.log(`Attempt ${attempts + 1}: Status = ${statusResult.data?.status}`);
      
      if (statusResult.data?.status === 'SUCCESS') {
        const videoUrl = statusResult.data.videoUrl;
        if (!videoUrl) {
          throw new Error('لم يتم إرجاع رابط الفيديو');
        }
        console.log('Video generated successfully:', videoUrl);
        return videoUrl;
      }
      
      if (statusResult.data?.status === 'FAILED') {
        throw new Error(`فشل توليد الفيديو: ${statusResult.data.error || 'خطأ غير معروف'}`);
      }
      
      attempts++;
    }
    
    throw new Error('انتهت مهلة توليد الفيديو');
  },

  // Generate video with character reference images
  async generateCharacterVideo(params: {
    referenceImages: string[];
    prompt: string;
    aspectRatio?: '16:9' | '9:16';
  }): Promise<string> {
    const { referenceImages, prompt, aspectRatio = '16:9' } = params;
    
    if (referenceImages.length === 0) {
      throw new Error('يجب توفير صورة مرجعية واحدة على الأقل');
    }
    
    // Try Runway first (better for character animation)
    try {
      return await this.generateVideoWithRunway({
        imageUrl: referenceImages[0],
        prompt: prompt,
        aspectRatio: aspectRatio,
        duration: '5',
        resolution: '720p',
      });
    } catch (error: any) {
      console.log('Runway failed, trying Veo via kie.ai...');
      // Fallback to Veo via kie.ai
      return await this.generateVideoWithVeo({
        imageUrls: referenceImages,
        prompt: prompt,
        mode: 'REFERENCE_2_VIDEO',
      });
    }
  },
  
  // Check if kie.ai is configured
  isConfigured(): boolean {
    return !!localStorage.getItem('KIE_API_KEY');
  }
};
