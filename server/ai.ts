import { GoogleGenAI, Type } from '@google/genai'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, '../uploads')

// Initialize AI client
let ai: GoogleGenAI | null = null

export function initAI(apiKey: string) {
  ai = new GoogleGenAI({ apiKey })
}

function getAI(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not set')
    }
    ai = new GoogleGenAI({ apiKey })
  }
  return ai
}

// Helper: Read image file and convert to base64
async function imageFileToBase64(filePath: string): Promise<string> {
  const fullPath = path.join(__dirname, '..', filePath)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Image file not found: ${fullPath}`)
  }
  const buffer = fs.readFileSync(fullPath)
  return buffer.toString('base64')
}

// Helper: Save base64 image to file
function saveBase64Image(base64: string, folder: string, filename?: string): string {
  const dir = path.join(uploadsDir, folder)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')
  
  const finalFilename = filename || `${Date.now()}-${Math.round(Math.random() * 1E9)}.png`
  const filePath = path.join(dir, finalFilename)
  fs.writeFileSync(filePath, buffer)
  
  return `/uploads/${folder}/${finalFilename}`
}

// Helper: Extract image from Gemini response
function extractImage(result: any): string {
  const parts = result.candidates?.[0]?.content?.parts || []
  for (const part of parts) {
    if (part.inlineData) {
      const { mimeType, data } = part.inlineData
      return `data:${mimeType};base64,${data}`
    }
  }
  throw new Error('No image in response')
}

// ============ AI FUNCTIONS ============

export async function generateScriptAndScenes(
  idea: string,
  characters: { name: string; description?: string; imagePath?: string }[],
  numScenes: number = 5
): Promise<{ script: string; scenes: { description: string; characters: string[]; dialogue: string }[] }> {
  const genai = getAI()
  
  const parts: any[] = []
  
  // Add character images so AI can SEE them
  for (const char of characters) {
    if (char.imagePath) {
      try {
        const base64 = await imageFileToBase64(char.imagePath)
        parts.push({ text: `[صورة الشخصية: ${char.name}]` })
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } })
      } catch (e) {
        console.warn(`Could not load image for ${char.name}:`, e)
      }
    }
  }
  
  const charContext = characters.map(c => `- ${c.name}: ${c.description || 'شخصية'}`).join('\n')
  
  const prompt = `أنت مخرج أفلام ومصور سينمائي محترف. أنشئ سيناريو قصير بناءً على هذه الفكرة: "${idea}".

${characters.some(c => c.imagePath) ? `مهم جداً: لقد رأيت صور الشخصيات أعلاه. يجب أن تصف مظهرهم في كل مشهد بالضبط كما تراهم في الصور - نفس الملابس، نفس الشعر، نفس ملامح الوجه.` : ''}

الشخصيات المتاحة:
${charContext}

المطلوب: سيناريو من ${numScenes} مشاهد بالضبط.

لكل مشهد، اكتب وصفاً بصرياً مفصلاً بالإنجليزية يتضمن:
- نوع اللقطة (wide, medium, close-up)
- زاوية الكاميرا
- وصف دقيق للشخصيات (الملابس، الشعر، تعابير الوجه)
- وصف المكان والإضاءة
- حركة الشخصيات في الكادر

أخرج JSON فقط:
{
  "script": "السيناريو الكامل بالعربية",
  "scenes": [
    {
      "description": "وصف بصري سينمائي مفصل بالإنجليزية",
      "characters": ["اسم الشخصية"],
      "dialogue": "الحوار بالعربية"
    }
  ]
}`

  parts.push({ text: prompt })
  
  const result = await genai.models.generateContent({
    model: 'gemini-3-flash',
    contents: [{ role: 'user', parts }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          script: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                characters: { type: Type.ARRAY, items: { type: Type.STRING } },
                dialogue: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  })
  
  const text = result.text || ''
  return JSON.parse(text)
}

export async function generateSceneImage(
  sceneDescription: string,
  characterImages: string[], // File paths
  firstSceneImage?: string,  // File path
  previousSceneImage?: string, // File path
  sceneIndex: number = 0,
  totalScenes: number = 1,
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<string> {
  const genai = getAI()
  
  const parts: any[] = []
  let validCharImages = 0
  
  // Add character reference images
  if (characterImages.length > 0) {
    parts.push({ text: '[CHARACTER REFERENCE - MANDATORY]\nThe following images show EXACTLY how the characters must look. Copy their appearance EXACTLY:' })
    
    for (const imgPath of characterImages.slice(0, 3)) {
      try {
        const base64 = await imageFileToBase64(imgPath)
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } })
        validCharImages++
      } catch (e) {
        console.warn('Could not load character image:', e)
      }
    }
    
    if (validCharImages > 0) {
      parts.push({ text: `[END CHARACTER REFERENCE - ${validCharImages} character(s)]` })
    }
  }
  
  // Add scene 1 as master reference
  if (sceneIndex > 0 && firstSceneImage) {
    try {
      parts.push({ text: '[SCENE 1 - MASTER REFERENCE]\nMatch the art style, colors, and atmosphere:' })
      const base64 = await imageFileToBase64(firstSceneImage)
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } })
    } catch (e) {
      console.warn('Could not load first scene image:', e)
    }
  }
  
  // Add previous scene
  if (sceneIndex > 0 && previousSceneImage && previousSceneImage !== firstSceneImage) {
    try {
      parts.push({ text: '[PREVIOUS SCENE]\nContinue from this frame:' })
      const base64 = await imageFileToBase64(previousSceneImage)
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } })
    } catch (e) {
      console.warn('Could not load previous scene image:', e)
    }
  }
  
  // Scene prompt
  const scenePrompt = `
[GENERATE SCENE ${sceneIndex + 1} OF ${totalScenes}]

SCENE DESCRIPTION:
${sceneDescription}

ASPECT RATIO: ${aspectRatio}

CRITICAL INSTRUCTIONS:
${validCharImages > 0 ? `- The ${validCharImages} character reference image(s) above show EXACTLY how the characters must look
- Copy their face, hair, clothing, and colors EXACTLY - do not redesign them` : ''}
${sceneIndex === 0 ? '- This is the ESTABLISHING SHOT - define the visual world clearly' : '- Continue from the previous scene(s) shown above'}
- Frame the shot cinematically
- Generate the image now`

  parts.push({ text: scenePrompt })
  
  const result = await genai.models.generateContent({
    model: 'gemini-3.1-flash-preview-image-generation',
    contents: [{ role: 'user', parts }],
    config: {
      responseModalities: ['IMAGE', 'TEXT'],
    }
  })
  
  const imageData = extractImage(result)
  // Save the generated image
  const savedPath = saveBase64Image(imageData, 'scenes')
  return savedPath
}

export async function generateCharacterAngle(
  description: string,
  angle: string
): Promise<string> {
  const genai = getAI()
  
  const prompt = `Generate a character portrait.

CHARACTER DESCRIPTION:
${description}

CAMERA ANGLE: ${angle}

Requirements:
- High quality, detailed character portrait
- Clean background (white or solid color)
- Consistent with the description
- Professional illustration style`

  const result = await genai.models.generateContent({
    model: 'gemini-3.1-flash-preview-image-generation',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseModalities: ['IMAGE', 'TEXT'],
    }
  })
  
  const imageData = extractImage(result)
  const savedPath = saveBase64Image(imageData, 'characters')
  return savedPath
}

export async function analyzeCharacter(imagePath: string): Promise<string> {
  const genai = getAI()
  
  const base64 = await imageFileToBase64(imagePath)
  
  const result = await genai.models.generateContent({
    model: 'gemini-3-flash',
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64 } },
        { text: 'Describe this character in detail for image generation. Include: gender, age, hair style and color, eye color, facial features, clothing, accessories, body type. Be specific and detailed. Output in English.' }
      ]
    }]
  })
  
  return result.text || ''
}
