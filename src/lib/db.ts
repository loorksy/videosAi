import { openDB, DBSchema } from 'idb';

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
  };
  createdAt: number;
}

export interface Storyboard {
  id: string;
  title: string;
  script: string;
  characters: string[]; // Character IDs
  scenes: Scene[];
  aspectRatio?: '16:9' | '9:16';
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
}

const dbPromise = openDB<StoryWeaverDB>('storyweaver-db', 3, {
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
};
