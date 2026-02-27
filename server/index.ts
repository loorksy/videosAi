import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import * as AI from './ai.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const prisma = new PrismaClient()
const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Serve uploaded files
const uploadsDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}
app.use('/uploads', express.static(uploadsDir))

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.body.folder || 'general'
    const dir = path.join(uploadsDir, folder)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } })

// ============ CHARACTERS API ============

// Get all characters
app.get('/api/characters', async (req, res) => {
  try {
    const characters = await prisma.character.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json(characters)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch characters' })
  }
})

// Get single character
app.get('/api/characters/:id', async (req, res) => {
  try {
    const character = await prisma.character.findUnique({
      where: { id: req.params.id }
    })
    if (!character) {
      return res.status(404).json({ error: 'Character not found' })
    }
    res.json(character)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch character' })
  }
})

// Create character
app.post('/api/characters', async (req, res) => {
  try {
    const character = await prisma.character.create({
      data: req.body
    })
    res.json(character)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create character' })
  }
})

// Update character
app.put('/api/characters/:id', async (req, res) => {
  try {
    const character = await prisma.character.update({
      where: { id: req.params.id },
      data: req.body
    })
    res.json(character)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update character' })
  }
})

// Delete character
app.delete('/api/characters/:id', async (req, res) => {
  try {
    await prisma.character.delete({
      where: { id: req.params.id }
    })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete character' })
  }
})

// ============ UPLOAD API ============

// Upload image (saves to disk and returns path)
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }
    const folder = req.body.folder || 'general'
    const filePath = `/uploads/${folder}/${req.file.filename}`
    res.json({ path: filePath, filename: req.file.filename })
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload file' })
  }
})

// Upload base64 image
app.post('/api/upload/base64', async (req, res) => {
  try {
    const { base64, folder = 'general', filename } = req.body
    
    if (!base64) {
      return res.status(400).json({ error: 'No base64 data provided' })
    }

    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    
    // Create directory
    const dir = path.join(uploadsDir, folder)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    // Generate filename
    const ext = base64.match(/^data:image\/(\w+);base64,/) ? 
      '.' + base64.match(/^data:image\/(\w+);base64,/)![1] : '.png'
    const finalFilename = filename || `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`
    
    // Save file
    const filePath = path.join(dir, finalFilename)
    fs.writeFileSync(filePath, buffer)
    
    res.json({ path: `/uploads/${folder}/${finalFilename}`, filename: finalFilename })
  } catch (error) {
    res.status(500).json({ error: 'Failed to save image' })
  }
})

// ============ STORYBOARDS API ============

// Get all storyboards
app.get('/api/storyboards', async (req, res) => {
  try {
    const storyboards = await prisma.storyboard.findMany({
      include: {
        characters: { include: { character: true } },
        scenes: { orderBy: { orderIndex: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(storyboards)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch storyboards' })
  }
})

// Get single storyboard
app.get('/api/storyboards/:id', async (req, res) => {
  try {
    const storyboard = await prisma.storyboard.findUnique({
      where: { id: req.params.id },
      include: {
        characters: { include: { character: true } },
        scenes: { 
          orderBy: { orderIndex: 'asc' },
          include: { characters: { include: { character: true } } }
        }
      }
    })
    if (!storyboard) {
      return res.status(404).json({ error: 'Storyboard not found' })
    }
    res.json(storyboard)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch storyboard' })
  }
})

// Create storyboard
app.post('/api/storyboards', async (req, res) => {
  try {
    const { title, script, aspectRatio, style, characterIds, scenes } = req.body
    
    const storyboard = await prisma.storyboard.create({
      data: {
        title,
        script,
        aspectRatio,
        style,
        characters: {
          create: characterIds?.map((id: string) => ({ characterId: id })) || []
        },
        scenes: {
          create: scenes?.map((scene: any, index: number) => ({
            orderIndex: index,
            description: scene.description,
            dialogue: scene.dialogue,
            cameraMotion: scene.cameraMotion,
            characters: {
              create: scene.characterIds?.map((id: string) => ({ characterId: id })) || []
            }
          })) || []
        }
      },
      include: {
        characters: { include: { character: true } },
        scenes: { orderBy: { orderIndex: 'asc' } }
      }
    })
    res.json(storyboard)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to create storyboard' })
  }
})

// Update scene
app.put('/api/scenes/:id', async (req, res) => {
  try {
    const scene = await prisma.scene.update({
      where: { id: req.params.id },
      data: req.body
    })
    res.json(scene)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update scene' })
  }
})

// Delete storyboard
app.delete('/api/storyboards/:id', async (req, res) => {
  try {
    await prisma.storyboard.delete({
      where: { id: req.params.id }
    })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete storyboard' })
  }
})

// ============ GALLERY API ============

app.get('/api/gallery', async (req, res) => {
  try {
    const items = await prisma.galleryItem.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json(items)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch gallery' })
  }
})

app.post('/api/gallery', async (req, res) => {
  try {
    const item = await prisma.galleryItem.create({
      data: req.body
    })
    res.json(item)
  } catch (error) {
    res.status(500).json({ error: 'Failed to add to gallery' })
  }
})

app.delete('/api/gallery/:id', async (req, res) => {
  try {
    await prisma.galleryItem.delete({
      where: { id: req.params.id }
    })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete from gallery' })
  }
})

// ============ SETTINGS API ============

app.get('/api/settings', async (req, res) => {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: 'default' }
    })
    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: 'default' }
      })
    }
    res.json(settings)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

app.put('/api/settings', async (req, res) => {
  try {
    const settings = await prisma.settings.upsert({
      where: { id: 'default' },
      update: req.body,
      create: { id: 'default', ...req.body }
    })
    res.json(settings)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' })
  }
})

// ============ AI API ============

// Generate script and scenes
app.post('/api/ai/generate-script', async (req, res) => {
  try {
    const { idea, characterIds, numScenes } = req.body
    
    // Get characters with their images
    const characters = await prisma.character.findMany({
      where: { id: { in: characterIds || [] } }
    })
    
    const charsForAI = characters.map(c => ({
      name: c.name,
      description: c.description || '',
      imagePath: c.imageFront || c.imageReference || c.imageThreeQuarter
    }))
    
    const result = await AI.generateScriptAndScenes(idea, charsForAI, numScenes || 5)
    res.json(result)
  } catch (error: any) {
    console.error('AI Error:', error)
    res.status(500).json({ error: error.message || 'Failed to generate script' })
  }
})

// Generate scene image
app.post('/api/ai/generate-scene-image', async (req, res) => {
  try {
    const { 
      sceneDescription, 
      characterIds, 
      firstSceneImage, 
      previousSceneImage, 
      sceneIndex, 
      totalScenes,
      aspectRatio 
    } = req.body
    
    // Get character images
    const characters = await prisma.character.findMany({
      where: { id: { in: characterIds || [] } }
    })
    
    const characterImages = characters
      .map(c => c.imageFront || c.imageReference || c.imageThreeQuarter)
      .filter(Boolean) as string[]
    
    const imagePath = await AI.generateSceneImage(
      sceneDescription,
      characterImages,
      firstSceneImage,
      previousSceneImage,
      sceneIndex || 0,
      totalScenes || 1,
      aspectRatio || '16:9'
    )
    
    res.json({ path: imagePath })
  } catch (error: any) {
    console.error('AI Error:', error)
    res.status(500).json({ error: error.message || 'Failed to generate scene image' })
  }
})

// Generate character angle
app.post('/api/ai/generate-character', async (req, res) => {
  try {
    const { description, angle } = req.body
    const imagePath = await AI.generateCharacterAngle(description, angle)
    res.json({ path: imagePath })
  } catch (error: any) {
    console.error('AI Error:', error)
    res.status(500).json({ error: error.message || 'Failed to generate character' })
  }
})

// Analyze character image
app.post('/api/ai/analyze-character', async (req, res) => {
  try {
    const { imagePath } = req.body
    const description = await AI.analyzeCharacter(imagePath)
    res.json({ description })
  } catch (error: any) {
    console.error('AI Error:', error)
    res.status(500).json({ error: error.message || 'Failed to analyze character' })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
