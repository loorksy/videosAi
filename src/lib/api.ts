// API Client for Backend Communication

const API_BASE = '/api'

// ============ CHARACTERS ============

export interface Character {
  id: string
  name: string
  description?: string
  visualTraits?: string
  type: string
  imageFront?: string
  imageBack?: string
  imageLeft?: string
  imageRight?: string
  imageThreeQuarter?: string
  imageCloseup?: string
  imageReference?: string
  createdAt: string
  updatedAt: string
}

export const charactersApi = {
  getAll: async (): Promise<Character[]> => {
    const res = await fetch(`${API_BASE}/characters`)
    if (!res.ok) throw new Error('Failed to fetch characters')
    return res.json()
  },

  getById: async (id: string): Promise<Character> => {
    const res = await fetch(`${API_BASE}/characters/${id}`)
    if (!res.ok) throw new Error('Failed to fetch character')
    return res.json()
  },

  create: async (data: Partial<Character>): Promise<Character> => {
    const res = await fetch(`${API_BASE}/characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to create character')
    return res.json()
  },

  update: async (id: string, data: Partial<Character>): Promise<Character> => {
    const res = await fetch(`${API_BASE}/characters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update character')
    return res.json()
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/characters/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete character')
  },
}

// ============ UPLOAD ============

export const uploadApi = {
  // Upload file directly
  uploadFile: async (file: File, folder = 'general'): Promise<{ path: string; filename: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) throw new Error('Failed to upload file')
    return res.json()
  },

  // Upload base64 image
  uploadBase64: async (base64: string, folder = 'general', filename?: string): Promise<{ path: string; filename: string }> => {
    const res = await fetch(`${API_BASE}/upload/base64`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, folder, filename }),
    })
    if (!res.ok) throw new Error('Failed to upload image')
    return res.json()
  },
}

// ============ STORYBOARDS ============

export interface Scene {
  id: string
  storyboardId: string
  orderIndex: number
  description: string
  dialogue?: string
  cameraMotion?: string
  frameImage?: string
  videoClip?: string
  audioClip?: string
  characters?: { character: Character }[]
}

export interface Storyboard {
  id: string
  title: string
  script?: string
  aspectRatio: string
  style: string
  status: string
  characters?: { character: Character }[]
  scenes?: Scene[]
  createdAt: string
  updatedAt: string
}

export const storyboardsApi = {
  getAll: async (): Promise<Storyboard[]> => {
    const res = await fetch(`${API_BASE}/storyboards`)
    if (!res.ok) throw new Error('Failed to fetch storyboards')
    return res.json()
  },

  getById: async (id: string): Promise<Storyboard> => {
    const res = await fetch(`${API_BASE}/storyboards/${id}`)
    if (!res.ok) throw new Error('Failed to fetch storyboard')
    return res.json()
  },

  create: async (data: {
    title: string
    script?: string
    aspectRatio?: string
    style?: string
    characterIds?: string[]
    scenes?: { description: string; dialogue?: string; characterIds?: string[] }[]
  }): Promise<Storyboard> => {
    const res = await fetch(`${API_BASE}/storyboards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to create storyboard')
    return res.json()
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/storyboards/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete storyboard')
  },
}

export const scenesApi = {
  update: async (id: string, data: Partial<Scene>): Promise<Scene> => {
    const res = await fetch(`${API_BASE}/scenes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update scene')
    return res.json()
  },
}

// ============ GALLERY ============

export interface GalleryItem {
  id: string
  title?: string
  type: string
  filePath: string
  sourceType?: string
  sourceId?: string
  createdAt: string
}

export const galleryApi = {
  getAll: async (): Promise<GalleryItem[]> => {
    const res = await fetch(`${API_BASE}/gallery`)
    if (!res.ok) throw new Error('Failed to fetch gallery')
    return res.json()
  },

  add: async (data: Partial<GalleryItem>): Promise<GalleryItem> => {
    const res = await fetch(`${API_BASE}/gallery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to add to gallery')
    return res.json()
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/gallery/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete from gallery')
  },
}

// ============ SETTINGS ============

export interface Settings {
  id: string
  apiKey?: string
  quality: string
}

export const settingsApi = {
  get: async (): Promise<Settings> => {
    const res = await fetch(`${API_BASE}/settings`)
    if (!res.ok) throw new Error('Failed to fetch settings')
    return res.json()
  },

  update: async (data: Partial<Settings>): Promise<Settings> => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update settings')
    return res.json()
  },
}

// ============ HELPER: Get image URL ============
export function getImageUrl(path: string | undefined | null): string {
  if (!path) return ''
  // If it's already a full URL or data URL, return as is
  if (path.startsWith('http') || path.startsWith('data:')) return path
  // If it's a local path, prepend the API base
  return path
}

// ============ HELPER: Get first character image ============
export function getCharacterImage(character: Character): string | undefined {
  return character.imageFront || 
         character.imageReference || 
         character.imageCloseup || 
         character.imageThreeQuarter ||
         character.imageLeft ||
         character.imageRight ||
         character.imageBack
}

// ============ AI API ============

export interface GeneratedScene {
  description: string
  characters: string[]
  dialogue: string
}

export interface GeneratedScript {
  script: string
  scenes: GeneratedScene[]
}

export const aiApi = {
  // Generate script and scenes using AI
  generateScript: async (
    idea: string, 
    characterIds: string[], 
    numScenes: number = 5
  ): Promise<GeneratedScript> => {
    const res = await fetch(`${API_BASE}/ai/generate-script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea, characterIds, numScenes }),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to generate script')
    }
    return res.json()
  },

  // Generate scene image
  generateSceneImage: async (params: {
    sceneDescription: string
    characterIds: string[]
    firstSceneImage?: string
    previousSceneImage?: string
    sceneIndex: number
    totalScenes: number
    aspectRatio?: '16:9' | '9:16'
  }): Promise<{ path: string }> => {
    const res = await fetch(`${API_BASE}/ai/generate-scene-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to generate scene image')
    }
    return res.json()
  },

  // Generate character angle
  generateCharacter: async (description: string, angle: string): Promise<{ path: string }> => {
    const res = await fetch(`${API_BASE}/ai/generate-character`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, angle }),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to generate character')
    }
    return res.json()
  },

  // Analyze character from image
  analyzeCharacter: async (imagePath: string): Promise<{ description: string }> => {
    const res = await fetch(`${API_BASE}/ai/analyze-character`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagePath }),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to analyze character')
    }
    return res.json()
  },
}
