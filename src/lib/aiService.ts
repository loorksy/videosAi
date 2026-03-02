// Unified AI Service - Routes to Gemini or kie.ai based on provider settings
import { isKieProvider, kieGenerateText, kieGenerateJSON, kieGenerateImage } from './aiProvider';
import { GeminiService } from './gemini';

const API = window.location.origin;

// Helper: Convert a URL to base64 data URL
async function urlToBase64(url: string): Promise<string> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Helper: Upload base64 image to kie.ai CDN for reference
async function uploadBase64ToKie(base64: string): Promise<string> {
  const resp = await fetch(`${API}/api/kie/upload-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: base64 }),
  });
  if (!resp.ok) throw new Error('فشل رفع الصورة');
  const data = await resp.json();
  return data.url;
}

export const AIService = {
  // ==================== TEXT GENERATION ====================

  async generateScriptAndScenes(
    idea: string,
    characters: { name: string; description: string; visualTraits?: string }[]
  ): Promise<{ script: string; scenes: { description: string; characters: string[]; dialogue: string }[] }> {
    if (!isKieProvider()) {
      return GeminiService.generateScriptAndScenes(idea, characters);
    }

    const charContext = characters.map(c =>
      `- ${c.name}: ${c.description}${c.visualTraits ? `. المظهر: ${c.visualTraits}` : ''}`
    ).join('\n');

    const langMatch = idea.match(/لغة الحوار: (.+?)\./);
    const dialogueLang = langMatch ? langMatch[1] : 'العربية';
    const sceneCountMatch = idea.match(/عدد المشاهد: (\d+)/);
    const sceneCount = sceneCountMatch ? sceneCountMatch[1] : '5';

    const prompt = `أنت مخرج أفلام أطفال محترف. أنشئ سيناريو كامل بناءً على: "${idea}".

عدد المشاهد بالضبط: ${sceneCount} مشهد.

الشخصيات:
${charContext}

قواعد:
- ثبات الشخصية: نفس الملابس والمظهر في كل مشهد
- ألوان زاهية مناسبة للأطفال
- كل مشهد 8 ثوانٍ، متصل بالذي قبله
- لغة الحوار: ${dialogueLang}
- حوار كامل لكل مشهد مع اسم الشخصية

أخرج JSON فقط:
{"script": "القصة الكاملة بالعربية", "scenes": [{"description": "وصف بصري بالإنجليزية مع اسم الشخصية وملابسها", "characters": ["اسم الشخصية"], "dialogue": "الحوار بـ${dialogueLang}"}]}`;

    const result = await kieGenerateJSON<{ script: string; scenes: any[] }>(prompt);
    return {
      script: result.script || '',
      scenes: Array.isArray(result.scenes) ? result.scenes : [],
    };
  },

  async generateStoryIdea(charNames: string[], genre: string, hint?: string): Promise<string> {
    if (!isKieProvider()) {
      return GeminiService.generateStoryIdea(charNames, genre, hint);
    }

    const prompt = `أنت كاتب سيناريو محترف. اكتب فكرة قصة قصيرة (3-4 جمل) من نوع "${genre}" تتضمن الشخصيات: ${charNames.join(' و ')}.
${hint ? `ملاحظة: ${hint}` : ''}
اكتب الفكرة بالعربية فقط. لا تكتب أي شيء آخر.`;

    return kieGenerateText(prompt);
  },

  async generateStoryMetadata(story: any): Promise<{ videoTitle: string; videoDescription: string; hashtags: string }> {
    if (!isKieProvider()) {
      return GeminiService.generateStoryMetadata(story);
    }

    const sceneSummary = (story.scenes || []).map((s: any, i: number) =>
      `مشهد ${i + 1}: ${s.description || ''}. الحوار: ${s.dialogue || 'بدون'}`
    ).join('\n');

    const prompt = `حلل هذه القصة وأنشئ بيانات الفيديو:
القصة: ${story.script || story.title || ''}
المشاهد:
${sceneSummary}

أنشئ JSON:
{"videoTitle": "عنوان جذاب أقل من 70 حرف", "videoDescription": "وصف مفصل 3-5 أسطر", "hashtags": "15-20 هاشتاق مفصول بمسافات"}`;

    return kieGenerateJSON(prompt);
  },

  // ==================== IMAGE GENERATION ====================

  async generateStoryboardFrame(params: {
    sceneDescription: string;
    characterImages: string[];
    firstSceneImage?: string;
    previousSceneImage?: string;
    sceneIndex: number;
    totalScenes: number;
    style: string;
    aspectRatio: '16:9' | '9:16' | '1:1';
    characterDNA: string;
  }): Promise<string> {
    if (!isKieProvider()) {
      return GeminiService.generateStoryboardFrame(params);
    }

    // Upload reference images to kie.ai CDN
    const refUrls: string[] = [];
    for (const img of params.characterImages.slice(0, 2)) {
      if (img && img.length > 100) {
        try {
          const url = await uploadBase64ToKie(img);
          refUrls.push(url);
        } catch { /* skip */ }
      }
    }
    if (params.previousSceneImage && params.previousSceneImage.length > 100) {
      try {
        const url = await uploadBase64ToKie(params.previousSceneImage);
        refUrls.push(url);
      } catch { /* skip */ }
    }

    const sizeMap: Record<string, string> = { '16:9': '16:9', '9:16': '9:16', '1:1': '1:1' };
    const size = sizeMap[params.aspectRatio] || '16:9';

    let prompt = `Scene ${params.sceneIndex + 1} of ${params.totalScenes}. Style: ${params.style}.
CHARACTER DNA: ${params.characterDNA}
SCENE: ${params.sceneDescription}
RULES: Character must match reference images exactly. Kid-friendly bright pastel colors. Warm lighting. Pixar quality. Characters speaking with mouth open.`;

    if (params.sceneIndex === 0) {
      prompt += ' This is the ESTABLISHING SHOT.';
    } else {
      prompt += ' Continue from the previous scene image.';
    }

    const imageUrl = await kieGenerateImage(prompt, size, refUrls);
    // Convert URL to base64 for component compatibility
    if (imageUrl.startsWith('http')) {
      return urlToBase64(imageUrl);
    }
    return imageUrl;
  },

  async generateCharacterAngle(description: string, angle: string): Promise<string> {
    if (!isKieProvider()) {
      return GeminiService.generateCharacterAngle(description, angle as any);
    }

    const prompt = `Generate a character image: ${description}. View Angle: ${angle}. Background: Neutral white. Style: Consistent character design sheet. High quality 8k.`;
    const imageUrl = await kieGenerateImage(prompt, '1:1');
    if (imageUrl.startsWith('http')) {
      return urlToBase64(imageUrl);
    }
    return imageUrl;
  },

  async analyzeCharacter(imageBase64: string): Promise<string> {
    if (!isKieProvider()) {
      return GeminiService.analyzeCharacter(imageBase64);
    }

    // For kie.ai, upload image and ask text model to describe
    // kie.ai text models don't support inline images, so we describe what we need
    const prompt = `أنت خبير تحليل شخصيات رسوم متحركة. اكتب وصفاً مفصلاً بالعربية لشخصية بناءً على تصميمها:
- ملامح الوجه (شكل العيون، لون الشعر، شكل الوجه)
- الملابس بالتفصيل (الألوان، الأسلوب)
- الإكسسوارات المميزة
- أسلوب الرسم (بيكسار، أنمي، واقعي)

اكتب وصفاً شاملاً يمكن استخدامه لإعادة رسم الشخصية.`;

    return kieGenerateText(prompt);
  },

  async generateSurrealObject(params: any): Promise<{ surreal: string; normal?: string }> {
    if (!isKieProvider()) {
      return GeminiService.generateSurrealObject(params);
    }

    const prompt = `Hyper-realistic anthropomorphic ${params.objectName} character. Face made entirely of ${params.objectName} material. Expression: ${params.emotion}. Body: ${params.body}. Limbs: ${params.limbs}. Hair: ${params.hair}. Camera: ${params.cameraAngle}. Lighting: ${params.lighting}. Environment: ${params.environment}. Style: ${params.style}, 8k, cinematic.`;
    const surreal = await kieGenerateImage(prompt, '3:4');
    const surrealB64 = surreal.startsWith('http') ? await urlToBase64(surreal) : surreal;

    if (params.generateNormal) {
      const normalPrompt = `Hyper-realistic normal ${params.objectName}. No face, no human features. Camera: ${params.cameraAngle}. Lighting: ${params.lighting}. Environment: ${params.environment}. Style: ${params.style}, 8k.`;
      const normal = await kieGenerateImage(normalPrompt, '3:4');
      const normalB64 = normal.startsWith('http') ? await urlToBase64(normal) : normal;
      return { surreal: surrealB64, normal: normalB64 };
    }
    return { surreal: surrealB64 };
  },

  async generateCreatureCharacter(params: any): Promise<string> {
    if (!isKieProvider()) {
      return GeminiService.generateCreatureCharacter(params);
    }

    const prompt = `Character design of a creature. Base: ${params.baseCreature}. ${params.hybridCreature ? `Hybrid with: ${params.hybridCreature}.` : ''} Body: ${params.bodyType}. Outfit: ${params.outfit}. Accessories: ${params.accessories}. Expression: ${params.expression}. Style: ${params.style}. Background: ${params.background}. 8k, masterpiece, 1:1 aspect ratio.`;
    const url = await kieGenerateImage(prompt, '1:1');
    return url.startsWith('http') ? await urlToBase64(url) : url;
  },

  async generateFunnyHuman(params: any): Promise<string> {
    if (!isKieProvider()) {
      return GeminiService.generateFunnyHuman(params);
    }

    const prompt = `Hilarious surreal image. Base: ${params.baseHuman}. Merged with: ${params.mergedWith}. Feature: ${params.crazyFeature}. Expression: ${params.expression}. Environment: ${params.environment}. Style: ${params.style}. 8k, convincing but absurd.`;
    const url = await kieGenerateImage(prompt, '3:4');
    return url.startsWith('http') ? await urlToBase64(url) : url;
  },

  async generateHumanCharacter(params: any): Promise<string> {
    if (!isKieProvider()) {
      return GeminiService.generateHumanCharacter(params);
    }

    const prompt = `Hyper-realistic human portrait. Gender: ${params.gender}. Age: ${params.age}. Ethnicity: ${params.ethnicity}. Hair: ${params.hair}. Eyes: ${params.eyeColor}. Body: ${params.bodyType}. Clothing: ${params.clothing}. Expression: ${params.expression}. Camera: ${params.cameraAngle}. Environment: ${params.environment}. Style: ${params.style}. 8k, cinematic.`;
    const url = await kieGenerateImage(prompt, '3:4');
    return url.startsWith('http') ? await urlToBase64(url) : url;
  },

  async generateCharacter(prompt: string): Promise<any> {
    if (!isKieProvider()) {
      return GeminiService.generateCharacter(prompt);
    }

    // Generate profile text
    const profileResult = await kieGenerateJSON<{ name: string; description: string }>(
      `${prompt}\n\nOutput JSON: {"name": "اسم عربي إبداعي", "description": "وصف قصير بالعربية"}`
    );

    // Generate front view image
    const imagePrompt = `${prompt}. Character design sheet, front view. Neutral background. 8k, masterpiece. 1:1 aspect ratio.`;
    const imageUrl = await kieGenerateImage(imagePrompt, '1:1');
    const frontImage = imageUrl.startsWith('http') ? await urlToBase64(imageUrl) : imageUrl;

    return {
      name: profileResult.name || 'شخصية هجينة',
      description: profileResult.description || 'شخصية تم توليدها بالذكاء الاصطناعي',
      front: frontImage,
      side: frontImage,
      back: frontImage,
    };
  },

  async generateThumbnail(params: any): Promise<string> {
    if (!isKieProvider()) {
      return GeminiService.generateThumbnail(params);
    }

    let prompt = '';
    if (params.baseThumbnail) {
      prompt = `Enhance YouTube thumbnail. Style: ${params.style}. ${params.elements ? `Elements: ${params.elements}.` : ''} ${params.imageText ? `Text: "${params.imageText}".` : ''} Cinematic 8k, vibrant colors, high contrast.`;
    } else {
      prompt = `YouTube thumbnail. ${params.title ? `Title: "${params.title}".` : ''} Style: ${params.style}. Background: ${params.background}. Elements: ${params.elements}. ${params.facialExpression ? `Expression: ${params.facialExpression}.` : ''} ${params.emotion ? `Emotion: ${params.emotion}.` : ''} ${params.imageText ? `Prominent text: "${params.imageText}".` : ''} Eye-catching, high contrast, 8k, cinematic.`;
    }

    const refUrls: string[] = [];
    if (params.referenceImages?.length) {
      for (const img of params.referenceImages.slice(0, 2)) {
        try {
          const url = await uploadBase64ToKie(img.dataUrl);
          refUrls.push(url);
        } catch { /* skip */ }
      }
    }

    const ratio = params.aspectRatio?.includes('9:16') ? '9:16' : params.aspectRatio?.includes('1:1') ? '1:1' : '16:9';
    const imageUrl = await kieGenerateImage(prompt, ratio, refUrls);
    return imageUrl.startsWith('http') ? await urlToBase64(imageUrl) : imageUrl;
  },

  async analyzeThumbnail(imageBase64: string): Promise<any> {
    if (!isKieProvider()) {
      return GeminiService.analyzeThumbnail(imageBase64);
    }

    const result = await kieGenerateJSON<any>(
      `حلل صورة يوتيوب مصغرة وأخرج JSON:
{"critique": "نقد قصير بالعربية", "suggestedElements": "عناصر بصرية مقترحة", "suggestedText": "نص clickbait قصير", "suggestedStyle": "أسلوب مقترح"}`
    );
    return result;
  },

  // ==================== IDEA GENERATORS ====================

  async generateRandomSurrealIdea(hint?: string): Promise<any> {
    if (!isKieProvider()) {
      return GeminiService.generateRandomSurrealIdea(hint);
    }

    const prompt = `Generate a surreal anthropomorphic character idea. ${hint ? `Based on: "${hint}"` : 'Random and unexpected.'}
Output JSON with English values: {"objectName": "", "emotion": "", "style": "", "body": "", "limbs": "", "hair": "", "cameraAngle": "Front-facing", "lighting": "", "environment": "Pure White"}`;

    return kieGenerateJSON(prompt);
  },

  async generateRandomFunnyHumanIdea(): Promise<any> {
    if (!isKieProvider()) {
      return GeminiService.generateRandomFunnyHumanIdea();
    }

    return kieGenerateJSON(
      `Generate a hilarious human-hybrid character. Output JSON with Arabic values:
{"baseHuman": "", "mergedWith": "", "crazyFeature": "", "expression": "", "style": "", "environment": ""}`
    );
  },

  async generateRandomHumanIdea(): Promise<any> {
    if (!isKieProvider()) {
      return GeminiService.generateRandomHumanIdea();
    }

    return kieGenerateJSON(
      `Generate a unique human character. Output JSON with Arabic values:
{"gender": "", "age": "", "ethnicity": "", "hair": "", "eyeColor": "", "bodyType": "", "clothing": "", "expression": "", "style": "", "environment": "", "cameraAngle": ""}`
    );
  },

  async generateViralShortIdea(params: any): Promise<any> {
    if (!isKieProvider()) {
      return GeminiService.generateViralShortIdea(params);
    }

    const prompt = `Create a viral YouTube Shorts script in Arabic. Niche: ${params.niche}. Tone: ${params.tone}. Topic: ${params.topic || 'trending'}. ${params.characters ? `Characters: ${params.characters}` : ''}
Output JSON: {"title": "عنوان", "hook": "hook 3 ثوان", "visualConcept": "مفهوم بصري", "script": [{"time": "0:00-0:03", "visual": "", "audio": ""}], "cta": "دعوة للإجراء", "tags": ["tag1"]}`;

    return kieGenerateJSON(prompt);
  },

  // ==================== PASSTHROUGH (always use Gemini for these) ====================

  testConnection: GeminiService.testConnection.bind(GeminiService),
  generateVoiceover: GeminiService.generateVoiceover.bind(GeminiService),
  generateVideoClip: GeminiService.generateVideoClip.bind(GeminiService),

  async generateCharacterSheet(params: any): Promise<any> {
    if (!isKieProvider()) {
      return GeminiService.generateCharacterSheet(params);
    }
    const prompt = `Character design sheet. Character: ${params.description || params.name}. Style: ${params.style || 'Pixar'}. Views: front, side, back, 3/4 angle. Neutral background. Professional character reference sheet. 8k.`;
    const url = await kieGenerateImage(prompt, '1:1');
    const b64 = url.startsWith('http') ? await urlToBase64(url) : url;
    return { front: b64, side: b64, back: b64, threeQuarter: b64 };
  },

  async regenerateCharacterView(params: any): Promise<string> {
    if (!isKieProvider()) {
      return GeminiService.regenerateCharacterView(params);
    }
    const prompt = `Character view: ${params.description}. Angle: ${params.view}. Style: ${params.style || 'Pixar'}. Neutral background. 8k.`;
    const url = await kieGenerateImage(prompt, '1:1');
    return url.startsWith('http') ? await urlToBase64(url) : url;
  },

  async improveAdCopy(topic: string, industry: string): Promise<any> {
    if (!isKieProvider()) {
      return GeminiService.improveAdCopy(topic, industry);
    }
    return kieGenerateJSON(`Improve ad copy for: "${topic}" in ${industry} industry. Output JSON: {"headline": "", "body": "", "cta": "", "tone": ""}`);
  },

  async generateAdCampaign(params: any): Promise<any> {
    if (!isKieProvider()) {
      return GeminiService.generateAdCampaign(params);
    }
    const prompt = `Create ad campaign images for: ${JSON.stringify(params)}. Professional advertising quality, eye-catching, modern design.`;
    const url = await kieGenerateImage(prompt, '1:1');
    const b64 = url.startsWith('http') ? await urlToBase64(url) : url;
    return [{ image: b64, headline: params.headline || 'Ad Campaign' }];
  },

  async generateAdPoster(params: any): Promise<any> {
    if (!isKieProvider()) {
      return GeminiService.generateAdPoster(params);
    }
    const prompt = `Professional advertising poster. ${params.headline || ''}. Product: ${params.product || ''}. Style: ${params.style || 'modern'}. Cinematic 8k.`;
    const url = await kieGenerateImage(prompt, '1:1');
    const b64 = url.startsWith('http') ? await urlToBase64(url) : url;
    return { image: b64 };
  },

  async generateProductShot(params: any): Promise<any> {
    if (!isKieProvider()) {
      return GeminiService.generateProductShot(params);
    }
    const prompt = `Professional product photography. Product: ${params.productDescription || ''}. Setting: ${params.setting || 'studio'}. Style: ${params.style || 'commercial'}. Lighting: professional studio. 8k.`;
    const url = await kieGenerateImage(prompt, '1:1');
    const b64 = url.startsWith('http') ? await urlToBase64(url) : url;
    return { image: b64 };
  },

  async generateBrandIdentity(description: string): Promise<any> {
    if (!isKieProvider()) {
      return GeminiService.generateBrandIdentity(description);
    }
    const result = await kieGenerateJSON(`Create brand identity for: "${description}". Output JSON: {"name": "", "tagline": "", "colors": ["#hex1","#hex2","#hex3"], "typography": "", "style": ""}`);
    return result;
  },

  async generateVideoIdeaFromCharacters(params: any): Promise<any> {
    if (!isKieProvider()) {
      return GeminiService.generateVideoIdeaFromCharacters(params);
    }
    const prompt = `Create a video idea with these characters: ${JSON.stringify(params.characters)}. Genre: ${params.genre || 'comedy'}. Duration: short video.
Output JSON: {"title": "", "description": "", "scenes": [{"description": "", "duration": "5s"}]}`;
    return kieGenerateJSON(prompt);
  },

  async generateCharacterAnimation(params: any): Promise<any> {
    if (!isKieProvider()) {
      return GeminiService.generateCharacterAnimation(params);
    }
    return params;
  },
};
