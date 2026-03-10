// Unified AI Service - fal.ai only via Backend /api/ai/* (credits + JWT)
import {
  falGenerateText,
  falGenerateJSON,
  falGenerateImage,
  falGenerateVideo,
  uploadMediaBase64,
} from './aiProvider';

const API = window.location.origin;

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

export const AIService = {
  // ==================== TEXT GENERATION ====================

  async generateScriptAndScenes(
    idea: string,
    characters: { name: string; description: string; visualTraits?: string }[]
  ): Promise<{ script: string; scenes: { description: string; characters: string[]; dialogue: string }[] }> {
    const charContext = characters.map(c =>
      `- ${c.name}: ${c.description}${c.visualTraits ? `. المظهر: ${c.visualTraits}` : ''}`
    ).join('\n');

    const langMatch = idea.match(/لغة الحوار: (.+?)\./);
    const dialogueLang = langMatch ? langMatch[1] : 'العربية';
    const sceneCountMatch = idea.match(/عدد المشاهد: (\d+)/);
    const sceneCount = sceneCountMatch ? sceneCountMatch[1] : '5';

    const prompt = `أنت مخرج أفلام أطفال ومصور سينمائي محترف. أنشئ سيناريو كامل ومفصل بناءً على هذه الفكرة: "${idea}".

⚠️ يجب أن يكون عدد المشاهد بالضبط: ${sceneCount} مشهد. لا أقل ولا أكثر!

الشخصيات المتاحة:
${charContext}

⛔ قاعدة ثبات الشخصية (الأهم):
- ملابس الشخصية وتفاصيلها لا تتغير أبداً بين المشاهد
- نفس الشعر، نفس لون العيون، نفس الملابس بالضبط في كل مشهد
- في وصف المشهد الإنجليزي: استخدم اسم الشخصية ثم اذكر ملابسها بالضبط بين قوسين
- مثال: "Hero (wearing the same black ninja outfit and glasses as in Scene 1)"

🎨 قاعدة الألوان والبيئة (محتوى أطفال):
- الألوان يجب أن تكون زاهية ومريحة للعين مثل فيديوهات الأطفال على يوتيوب
- خلفيات بألوان باستيل دافئة (أصفر فاتح، أزرق سماوي، أخضر فاتح، وردي هادئ)
- إضاءة مشرقة ودافئة في كل المشاهد
- البيئة مرحة ومبهجة مناسبة للأطفال

⚡ قاعدة الاستمرارية: كل مشهد مدته 8 ثوانٍ. المشاهد لقطات متتالية متصلة.
- المشهد الثاني يبدأ من حيث انتهى الأول بالضبط

🗣️ قاعدة الحوار:
- لغة الحوار: ${dialogueLang}
- كل مشهد يجب أن يحتوي على حوار كامل ومفصل بـ${dialogueLang}
- إذا كان أكثر من شخصية في المشهد، اكتب حوار لكل شخصية
- اكتب اسم الشخصية قبل حوارها مثل: "أحمد: مرحباً!"
- الحوار يبدأ من بداية المشهد وينتهي في نهايته
- الحوار يكون طويل ومفصل وليس جملة واحدة

أخرج JSON فقط بدون أي نص إضافي:
{
  "script": "القصة الكاملة المفصلة بالعربية (ليس ملخص! بل كل تفاصيل القصة والأحداث)",
  "scenes": [
    {
      "description": "وصف بصري سينمائي مفصل بالإنجليزية يتضمن: اسم الشخصية + (ملابسها الثابتة)، نوع اللقطة، ألوان زاهية، الفم مفتوح يتكلم",
      "characters": ["اسم الشخصية 1", "اسم الشخصية 2"],
      "dialogue": "الحوار الكامل مع ذكر اسم كل شخصية قبل كلامها"
    }
  ]
}`;

    const result = await falGenerateJSON<{ script: string; scenes: any[] }>(prompt, '', 'text_script');
    return {
      script: result.script || '',
      scenes: Array.isArray(result.scenes) ? result.scenes : [],
    };
  },

  async generateStoryIdea(charNames: string[], genre: string, hint?: string): Promise<string> {
    const prompt = `أنت كاتب سيناريو محترف. اكتب فكرة قصة قصيرة (3-4 جمل) من نوع "${genre}" تتضمن الشخصيات: ${charNames.join(' و ')}.
${hint ? `ملاحظة: ${hint}` : ''}
اكتب الفكرة بالعربية فقط. لا تكتب أي شيء آخر.`;

    return falGenerateText(prompt, undefined, 'text_thinking');
  },

  async generateStoryMetadata(story: any): Promise<{ videoTitle: string; videoDescription: string; hashtags: string }> {
    const sceneSummary = (story.scenes || []).map((s: any, i: number) =>
      `مشهد ${i + 1}: ${s.description || ''}. الحوار: ${s.dialogue || 'بدون'}`
    ).join('\n');

    const prompt = `حلل هذه القصة وأنشئ بيانات الفيديو:
القصة: ${story.script || story.title || ''}
المشاهد:
${sceneSummary}

أنشئ JSON:
{"videoTitle": "عنوان جذاب أقل من 70 حرف", "videoDescription": "وصف مفصل 3-5 أسطر", "hashtags": "15-20 هاشتاق مفصول بمسافات"}`;

    return falGenerateJSON(prompt, '', 'text_metadata');
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
    const sizeMap: Record<string, string> = { '16:9': 'landscape_16_9', '9:16': 'portrait_9_16', '1:1': 'square_hd' };
    const imageSize = sizeMap[params.aspectRatio] || 'landscape_16_9';

    let prompt = `Scene ${params.sceneIndex + 1} of ${params.totalScenes}. Style: ${params.style}.
CHARACTER DNA: ${params.characterDNA}
SCENE: ${params.sceneDescription}
RULES: Character must match. Kid-friendly bright pastel colors. Warm lighting. Pixar quality. Characters speaking with mouth open.`;

    if (params.sceneIndex === 0) {
      prompt += ' This is the ESTABLISHING SHOT.';
    } else {
      prompt += ' Continue from the previous scene image.';
    }

    const imageUrl = await falGenerateImage(prompt, imageSize, 'image_storyboard');
    // Convert URL to base64 for component compatibility
    if (imageUrl.startsWith('http')) {
      return urlToBase64(imageUrl);
    }
    return imageUrl;
  },

  async generateCharacterAngle(description: string, angle: string): Promise<string> {
    const prompt = `Generate a character image: ${description}. View Angle: ${angle}. Background: Neutral white. Style: Consistent character design sheet. High quality 8k.`;
    const imageUrl = await falGenerateImage(prompt, 'square_hd', 'image_character');
    if (imageUrl.startsWith('http')) {
      return urlToBase64(imageUrl);
    }
    return imageUrl;
  },

  async analyzeCharacter(_imageBase64: string): Promise<string> {
    const prompt = `أنت خبير تحليل شخصيات رسوم متحركة. اكتب وصفاً مفصلا�� بالعربية لشخصية بناءً على تصميمها:
- ملامح الوجه (شكل العيون، لون الشعر، شكل الوجه)
- الملابس بالتفصيل (الألوان، الأسلوب)
- الإكسسوارات المميزة
- أسلوب الرسم (بيكسار، أنمي، واقعي)

اكتب وصفاً شاملاً يمكن استخدامه لإعادة رسم الشخصية.`;

    return falGenerateText(prompt, undefined, 'text_thinking');
  },

  async generateSurrealObject(params: any): Promise<{ surreal: string; normal?: string }> {
    const prompt = `Hyper-realistic anthropomorphic ${params.objectName} character. Face made entirely of ${params.objectName} material. Expression: ${params.emotion}. Body: ${params.body}. Limbs: ${params.limbs}. Hair: ${params.hair}. Camera: ${params.cameraAngle}. Lighting: ${params.lighting}. Environment: ${params.environment}. Style: ${params.style}, 8k, cinematic.`;
    const surreal = await falGenerateImage(prompt, 'portrait_4_3', 'image_product');
    const surrealB64 = surreal.startsWith('http') ? await urlToBase64(surreal) : surreal;

    if (params.generateNormal) {
      const normalPrompt = `Hyper-realistic normal ${params.objectName}. No face, no human features. Camera: ${params.cameraAngle}. Lighting: ${params.lighting}. Environment: ${params.environment}. Style: ${params.style}, 8k.`;
      const normal = await falGenerateImage(normalPrompt, 'portrait_4_3', 'image_product');
      const normalB64 = normal.startsWith('http') ? await urlToBase64(normal) : normal;
      return { surreal: surrealB64, normal: normalB64 };
    }
    return { surreal: surrealB64 };
  },

  async generateCreatureCharacter(params: any): Promise<string> {
    const prompt = `Character design of a creature. Base: ${params.baseCreature}. ${params.hybridCreature ? `Hybrid with: ${params.hybridCreature}.` : ''} Body: ${params.bodyType}. Outfit: ${params.outfit}. Accessories: ${params.accessories}. Expression: ${params.expression}. Style: ${params.style}. Background: ${params.background}. 8k, masterpiece, 1:1 aspect ratio.`;
    const url = await falGenerateImage(prompt, 'square_hd', 'image_product');
    return url.startsWith('http') ? await urlToBase64(url) : url;
  },

  async generateFunnyHuman(params: any): Promise<string> {
    const prompt = `Hilarious surreal image. Base: ${params.baseHuman}. Merged with: ${params.mergedWith}. Feature: ${params.crazyFeature}. Expression: ${params.expression}. Environment: ${params.environment}. Style: ${params.style}. 8k, convincing but absurd.`;
    const url = await falGenerateImage(prompt, 'portrait_4_3', 'image_product');
    return url.startsWith('http') ? await urlToBase64(url) : url;
  },

  async generateHumanCharacter(params: any): Promise<string> {
    const prompt = `Hyper-realistic human portrait. Gender: ${params.gender}. Age: ${params.age}. Ethnicity: ${params.ethnicity}. Hair: ${params.hair}. Eyes: ${params.eyeColor}. Body: ${params.bodyType}. Clothing: ${params.clothing}. Expression: ${params.expression}. Camera: ${params.cameraAngle}. Environment: ${params.environment}. Style: ${params.style}. 8k, cinematic.`;
    const url = await falGenerateImage(prompt, 'portrait_4_3', 'image_product');
    return url.startsWith('http') ? await urlToBase64(url) : url;
  },

  async generateCharacter(prompt: string): Promise<any> {
    const profileResult = await falGenerateJSON<{ name: string; description: string }>(
      `${prompt}\n\nOutput JSON: {"name": "اسم عربي إبداعي", "description": "وصف قصير بالعربية"}`,
      '',
      'text_thinking'
    );

    const imagePrompt = `${prompt}. Character design sheet, front view. Neutral background. 8k, masterpiece. 1:1 aspect ratio.`;
    const imageUrl = await falGenerateImage(imagePrompt, 'square_hd', 'image_character');
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
    let prompt = '';
    if (params.baseThumbnail) {
      prompt = `Enhance YouTube thumbnail. Style: ${params.style}. ${params.elements ? `Elements: ${params.elements}.` : ''} ${params.imageText ? `Text: "${params.imageText}".` : ''} Cinematic 8k, vibrant colors, high contrast.`;
    } else {
      prompt = `YouTube thumbnail. ${params.title ? `Title: "${params.title}".` : ''} Style: ${params.style}. Background: ${params.background}. Elements: ${params.elements}. ${params.facialExpression ? `Expression: ${params.facialExpression}.` : ''} ${params.emotion ? `Emotion: ${params.emotion}.` : ''} ${params.imageText ? `Prominent text: "${params.imageText}".` : ''} Eye-catching, high contrast, 8k, cinematic.`;
    }

    const ratio = params.aspectRatio?.includes('9:16') ? 'portrait_9_16' : params.aspectRatio?.includes('1:1') ? 'square_hd' : 'landscape_16_9';
    const imageUrl = await falGenerateImage(prompt, ratio);
    return imageUrl.startsWith('http') ? await urlToBase64(imageUrl) : imageUrl;
  },

  async analyzeThumbnail(_imageBase64: string): Promise<any> {
    const result = await falGenerateJSON<any>(
      `حلل صورة يوتيوب مصغرة وأخرج JSON:
{"critique": "نقد قصير بالعربية", "suggestedElements": "عناصر بصرية مقترحة", "suggestedText": "نص clickbait قصير", "suggestedStyle": "أسلوب مقترح"}`
    );
    return result;
  },

  // ==================== IDEA GENERATORS ====================

  async generateRandomSurrealIdea(hint?: string): Promise<any> {
    const prompt = `Generate a surreal anthropomorphic character idea. ${hint ? `Based on: "${hint}"` : 'Random and unexpected.'}
Output JSON with English values: {"objectName": "", "emotion": "", "style": "", "body": "", "limbs": "", "hair": "", "cameraAngle": "Front-facing", "lighting": "", "environment": "Pure White"}`;

    return falGenerateJSON(prompt);
  },

  async generateRandomFunnyHumanIdea(): Promise<any> {
    return falGenerateJSON(
      `Generate a hilarious human-hybrid character. Output JSON with Arabic values:
{"baseHuman": "", "mergedWith": "", "crazyFeature": "", "expression": "", "style": "", "environment": ""}`
    );
  },

  async generateRandomHumanIdea(): Promise<any> {
    return falGenerateJSON(
      `Generate a unique human character. Output JSON with Arabic values:
{"gender": "", "age": "", "ethnicity": "", "hair": "", "eyeColor": "", "bodyType": "", "clothing": "", "expression": "", "style": "", "environment": "", "cameraAngle": ""}`
    );
  },

  async generateViralShortIdea(params: any): Promise<any> {
    const prompt = `Create a viral YouTube Shorts script in Arabic. Niche: ${params.niche}. Tone: ${params.tone}. Topic: ${params.topic || 'trending'}. ${params.characters ? `Characters: ${params.characters}` : ''}
Output JSON: {"title": "عنوان", "hook": "hook 3 ثوان", "visualConcept": "مفهوم بصري", "script": [{"time": "0:00-0:03", "visual": "", "audio": ""}], "cta": "دعوة للإجراء", "tags": ["tag1"]}`;

    return falGenerateJSON(prompt);
  },

  async testConnection(): Promise<boolean> {
    try {
      const r = await fetch(`${API}/api/health`);
      return r.ok;
    } catch {
      return false;
    }
  },

  async generateVoiceover(_text: string, _voiceName?: string): Promise<string> {
    throw new Error('التعليق الصوتي غير متاح حالياً');
  },

  async generateVideoClip(startFrame: string, _endFrame: string, _aspectRatio: '16:9' | '9:16' = '16:9', motionPrompt?: string): Promise<string> {
    let imageUrl: string | undefined;
    if (startFrame.startsWith('data:')) {
      const base64 = startFrame.includes(',') ? startFrame.split(',')[1] : startFrame;
      imageUrl = await uploadMediaBase64(base64, 'image');
      if (!imageUrl.startsWith('http')) imageUrl = `${API}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }
    return falGenerateVideo({ prompt: motionPrompt || 'Smooth motion', image_url: imageUrl, duration: 5 });
  },

  async generateCharacterSheet(params: any): Promise<any> {
    const prompt = `Character design sheet. Character: ${params.description || params.name}. Style: ${params.style || 'Pixar'}. Views: front, side, back, 3/4 angle. Neutral background. Professional character reference sheet. 8k.`;
    const url = await falGenerateImage(prompt, 'square_hd');
    const b64 = url.startsWith('http') ? await urlToBase64(url) : url;
    return { front: b64, side: b64, back: b64, threeQuarter: b64 };
  },

  async regenerateCharacterView(params: any): Promise<string> {
    const prompt = `Character view: ${params.description}. Angle: ${params.view}. Style: ${params.style || 'Pixar'}. Neutral background. 8k.`;
    const url = await falGenerateImage(prompt, 'square_hd');
    return url.startsWith('http') ? await urlToBase64(url) : url;
  },

  async improveAdCopy(topic: string, industry: string): Promise<any> {
    return falGenerateJSON(`Improve ad copy for: "${topic}" in ${industry} industry. Output JSON: {"headline": "", "body": "", "cta": "", "tone": ""}`);
  },

  async generateAdCampaign(params: any): Promise<string[]> {
    const prompt = `Create ad campaign images for: ${JSON.stringify(params)}. Professional advertising quality, eye-catching, modern design.`;
    const url = await falGenerateImage(prompt, 'square_hd');
    const b64 = url.startsWith('http') ? await urlToBase64(url) : url;
    return [b64, b64, b64, b64]; // Return 4 identical images to fulfill type for fallback
  },

  async generateAdPoster(params: any): Promise<any> {
    const prompt = `Professional advertising poster. ${params.headline || ''}. Product: ${params.product || ''}. Style: ${params.style || 'modern'}. Cinematic 8k.`;
    const url = await falGenerateImage(prompt, 'square_hd');
    const b64 = url.startsWith('http') ? await urlToBase64(url) : url;
    return { image: b64 };
  },

  async generateProductShot(params: any): Promise<any> {
    const prompt = `Professional product photography. Product: ${params.productDescription || ''}. Setting: ${params.setting || 'studio'}. Style: ${params.style || 'commercial'}. Lighting: professional studio. 8k.`;
    const url = await falGenerateImage(prompt, 'square_hd');
    const b64 = url.startsWith('http') ? await urlToBase64(url) : url;
    return { image: b64 };
  },

  async generateBrandIdentity(description: string): Promise<any> {
    const result = await falGenerateJSON(`Create brand identity for: "${description}". Output JSON: {"name": "", "tagline": "", "colors": ["#hex1","#hex2","#hex3"], "typography": "", "style": ""}`);
    return result;
  },

  async generateWallpaper(params: any): Promise<string> {
    const ratio = params.aspectRatio?.includes('9:16') ? 'portrait_9_16' : params.aspectRatio?.includes('1:1') ? 'square_hd' : 'landscape_16_9';
    const prompt = `Beautiful wallpaper. Topic: ${params.topic}. Style: ${params.style}. Colors: ${params.colorPalette}. Masterpiece, 8k resolution, highly detailed.`;
    const url = await falGenerateImage(prompt, ratio);
    return url.startsWith('http') ? await urlToBase64(url) : url;
  },

  async generateWallpaperIdea(topic: string): Promise<string> {
    const prompt = `You are a creative director. Enhance this wallpaper idea into a highly detailed, professional prompt in Arabic. Return JSON with a single key "idea" containing the enhanced Arabic text. Idea to enhance: "${topic}"`;
    const result: any = await falGenerateJSON(prompt);
    return result.idea || result;
  },

  async generateSticker(params: any): Promise<string> {
    const { topic, style, emotion, purpose, primaryColor, secondaryColor, industry, brandName } = params;
    let prompt = `Sticker design, white background. Topic: ${topic}. Style: ${style}. Emotion: ${emotion}. Clear subject, suitable for WhatsApp sticker.`;

    if (purpose === 'شركات / بزنس') {
      prompt += ` This is a corporate/business sticker for brand: "${brandName || 'N/A'}" working in the industry: "${industry || 'General'}". Primary Color: ${primaryColor || 'N/A'}, Secondary Color: ${secondaryColor || 'N/A'}. Include professional, cohesive branding elements reflecting this business's visual identity.`;
    }

    const url = await falGenerateImage(prompt, 'square_hd');
    return url.startsWith('http') ? await urlToBase64(url) : url;
  },

  async generateVideoIdeaFromCharacters(params: any): Promise<any> {
    const prompt = `Create a video idea with these characters: ${JSON.stringify(params.characters)}. Genre: ${params.genre || 'comedy'}. Duration: short video.
Output JSON: {"title": "", "description": "", "scenes": [{"description": "", "duration": "5s"}]}`;
    return falGenerateJSON(prompt);
  },

  async generateCharacterAnimation(params: any): Promise<any> {
    return params;
  },
};
