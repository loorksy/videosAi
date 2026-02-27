// fal.ai Video Generation Service
// Fallback for when Gemini Veo fails due to content policy

const FAL_API_URL = 'https://queue.fal.run';

interface FalVideoResult {
  video: {
    url: string;
  };
}

interface FalQueueResponse {
  request_id: string;
  status: string;
  response_url?: string;
}

const getFalKey = (): string => {
  const key = localStorage.getItem('FAL_API_KEY');
  if (!key) {
    throw new Error('مفتاح fal.ai API مفقود. الرجاء إدخاله في صفحة الإعدادات.');
  }
  return key;
};

// Helper to convert base64 image to URL via fal.ai upload
const uploadImageToFal = async (base64Image: string): Promise<string> => {
  const apiKey = getFalKey();
  
  // Extract base64 data
  const base64Data = base64Image.split(',')[1];
  const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || 'image/png';
  
  // Convert base64 to blob
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  
  // Upload to fal.ai
  const formData = new FormData();
  formData.append('file', blob, 'image.png');
  
  const response = await fetch('https://fal.run/fal-ai/image-upload', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    // If upload fails, try using data URL directly (some models support it)
    console.log('Direct upload failed, using base64 directly');
    return base64Image;
  }
  
  const result = await response.json();
  return result.url || base64Image;
};

export const FalService = {
  // Generate video using Kling model
  async generateVideoWithKling(params: {
    imageUrl: string;
    prompt: string;
    aspectRatio?: '16:9' | '9:16' | '1:1';
    duration?: '5' | '10';
  }): Promise<string> {
    const apiKey = getFalKey();
    const { imageUrl, prompt, aspectRatio = '16:9', duration = '5' } = params;
    
    console.log('Starting fal.ai Kling video generation...');
    
    // Upload image if it's base64
    let finalImageUrl = imageUrl;
    if (imageUrl.startsWith('data:')) {
      console.log('Uploading image to fal.ai...');
      finalImageUrl = await uploadImageToFal(imageUrl);
    }
    
    // Submit to Kling queue
    const submitResponse = await fetch(`${FAL_API_URL}/fal-ai/kling-video/v1.6/standard/image-to-video`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        image_url: finalImageUrl,
        duration: duration,
        aspect_ratio: aspectRatio,
      }),
    });
    
    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('Kling submit error:', errorText);
      throw new Error(`فشل إرسال طلب الفيديو: ${submitResponse.status}`);
    }
    
    const queueResult: FalQueueResponse = await submitResponse.json();
    console.log('Queue response:', queueResult);
    
    // Poll for completion
    const requestId = queueResult.request_id;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max (5 second intervals)
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await fetch(`${FAL_API_URL}/fal-ai/kling-video/v1.6/standard/image-to-video/requests/${requestId}/status`, {
        headers: {
          'Authorization': `Key ${apiKey}`,
        },
      });
      
      if (!statusResponse.ok) {
        console.error('Status check failed:', statusResponse.status);
        attempts++;
        continue;
      }
      
      const statusResult = await statusResponse.json();
      console.log(`Attempt ${attempts + 1}: Status = ${statusResult.status}`);
      
      if (statusResult.status === 'COMPLETED') {
        // Get the result
        const resultResponse = await fetch(`${FAL_API_URL}/fal-ai/kling-video/v1.6/standard/image-to-video/requests/${requestId}`, {
          headers: {
            'Authorization': `Key ${apiKey}`,
          },
        });
        
        if (!resultResponse.ok) {
          throw new Error('فشل الحصول على نتيجة الفيديو');
        }
        
        const result: FalVideoResult = await resultResponse.json();
        console.log('Video generated successfully:', result.video?.url);
        return result.video?.url || '';
      }
      
      if (statusResult.status === 'FAILED') {
        throw new Error(`فشل توليد الفيديو: ${statusResult.error || 'خطأ غير معروف'}`);
      }
      
      attempts++;
    }
    
    throw new Error('انتهت مهلة توليد الفيديو');
  },

  // Generate video with character reference images using Kling
  async generateCharacterVideo(params: {
    referenceImages: string[];
    prompt: string;
    aspectRatio?: '16:9' | '9:16';
  }): Promise<string> {
    const { referenceImages, prompt, aspectRatio = '16:9' } = params;
    
    if (referenceImages.length === 0) {
      throw new Error('يجب توفير صورة مرجعية واحدة على الأقل');
    }
    
    // Use the first reference image
    const mainImage = referenceImages[0];
    
    return this.generateVideoWithKling({
      imageUrl: mainImage,
      prompt: prompt,
      aspectRatio: aspectRatio,
      duration: '5',
    });
  },
  
  // Check if fal.ai is configured
  isConfigured(): boolean {
    return !!localStorage.getItem('FAL_API_KEY');
  }
};
