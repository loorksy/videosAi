import { openDB, DBSchema } from 'idb';

export type TaskType = 'video' | 'image' | 'audio' | 'script' | 'character' | 'storyboard';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface BackgroundTask {
  id: string;
  type: TaskType;
  title: string;
  description?: string;
  status: TaskStatus;
  progress: number; // 0-100
  error?: string;
  result?: any; // The generated content (image URL, video URL, etc.)
  relatedId?: string; // ID of related storyboard/character
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  visualTraits: string; // JSON string or text description of visual traits
  images: {
    front?: string;
    back?: string;
    closeup?: string;
    left?: string;
    right?: string;
    threeQuarter?: string;
    reference?: string; // Original uploaded reference image
    normal?: string; // Normal/original version (for surreal characters)
    surreal?: string; // Surreal version
  };
  createdAt: number;
}

export interface Storyboard {
  id: string;
  title: string;
  script: string;
  characters: string[]; // Character IDs
  scenes: Scene[];
  aspectRatio?: '16:9' | '9:16' | '1:1';
  style?: string; // Visual style for consistency across scenes
  createdAt: number;
}

export interface Scene {
  id: string;
  description: string;
  characterIds: string[];
  dialogue?: string; // The spoken text for this scene
  frameImage?: string; // The generated master frame
  videoClip?: string; // The generated video clip URL/Blob
  audioClip?: string; // The generated voiceover audio URL/Blob
}

export interface AdCampaign {
  id: string;
  title: string;
  images: string[];
  createdAt: number;
}

export interface MediaItem {
  id: string;
  type: 'video' | 'image' | 'thumbnail';
  title: string;
  description?: string;
  data: string; // base64 or blob URL
  source: 'animation' | 'product' | 'thumbnail' | 'brand' | 'storyboard';
  characterName?: string;
  aspectRatio?: string;
  createdAt: number;
}

interface StoryWeaverDB extends DBSchema {
  characters: {
    key: string;
    value: Character;
  };
  storyboards: {
    key: string;
    value: Storyboard;
  };
  adCampaigns: {
    key: string;
    value: AdCampaign;
  };
  mediaGallery: {
    key: string;
    value: MediaItem;
  };
  backgroundTasks: {
    key: string;
    value: BackgroundTask;
    indexes: { 'by-status': TaskStatus };
  };
}

const dbPromise = openDB<StoryWeaverDB>('storyweaver-db', 4, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      db.createObjectStore('characters', { keyPath: 'id' });
      db.createObjectStore('storyboards', { keyPath: 'id' });
    }
    if (oldVersion < 2) {
      db.createObjectStore('adCampaigns', { keyPath: 'id' });
    }
    if (oldVersion < 3) {
      db.createObjectStore('mediaGallery', { keyPath: 'id' });
    }
    if (oldVersion < 4) {
      const taskStore = db.createObjectStore('backgroundTasks', { keyPath: 'id' });
      taskStore.createIndex('by-status', 'status');
    }
  },
});

export const db = {
  async getCharacter(id: string) {
    return (await dbPromise).get('characters', id);
  },
  async getAllCharacters() {
    return (await dbPromise).getAll('characters');
  },
  async saveCharacter(character: Character) {
    return (await dbPromise).put('characters', character);
  },
  async deleteCharacter(id: string) {
    return (await dbPromise).delete('characters', id);
  },
  async getStoryboard(id: string) {
    return (await dbPromise).get('storyboards', id);
  },
  async getAllStoryboards() {
    return (await dbPromise).getAll('storyboards');
  },
  async saveStoryboard(storyboard: Storyboard) {
    return (await dbPromise).put('storyboards', storyboard);
  },
  async deleteStoryboard(id: string) {
    return (await dbPromise).delete('storyboards', id);
  },
  async getAdCampaign(id: string) {
    return (await dbPromise).get('adCampaigns', id);
  },
  async getAllAdCampaigns() {
    return (await dbPromise).getAll('adCampaigns');
  },
  async saveAdCampaign(campaign: AdCampaign) {
    return (await dbPromise).put('adCampaigns', campaign);
  },
  async deleteAdCampaign(id: string) {
    return (await dbPromise).delete('adCampaigns', id);
  },

  // Media Gallery
  async getMediaItem(id: string) {
    return (await dbPromise).get('mediaGallery', id);
  },
  async getAllMedia() {
    return (await dbPromise).getAll('mediaGallery');
  },
  async saveMediaItem(item: MediaItem) {
    return (await dbPromise).put('mediaGallery', item);
  },
  async deleteMediaItem(id: string) {
    return (await dbPromise).delete('mediaGallery', id);
  },

  // Background Tasks
  async getTask(id: string) {
    return (await dbPromise).get('backgroundTasks', id);
  },
  async getAllTasks() {
    const tasks = await (await dbPromise).getAll('backgroundTasks');
    return tasks.sort((a, b) => b.createdAt - a.createdAt);
  },
  async getActiveTasks() {
    const tasks = await (await dbPromise).getAll('backgroundTasks');
    return tasks.filter(t => t.status === 'pending' || t.status === 'running');
  },
  async saveTask(task: BackgroundTask) {
    return (await dbPromise).put('backgroundTasks', task);
  },
  async deleteTask(id: string) {
    return (await dbPromise).delete('backgroundTasks', id);
  },
  async clearCompletedTasks() {
    const db = await dbPromise;
    const tasks = await db.getAll('backgroundTasks');
    const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'failed');
    for (const task of completedTasks) {
      await db.delete('backgroundTasks', task.id);
    }
  },
};
