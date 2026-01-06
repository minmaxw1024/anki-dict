export interface WordEntry {
  word: string;
  timestamp: number;
  pronunciations: {
    uk?: {
      ipa: string;
      audioUrl?: string;
    };
    us?: {
      ipa: string;
      audioUrl?: string;
    };
  };
  definitions: Definition[];
  sourceUrl: string;
  lastAccessed: number;
}

export interface Definition {
  partOfSpeech: string;
  level?: string;
  category?: string;
  meaning: string;
  examples: string[];
}

export interface StorageSchema {
  words: {
    [word: string]: WordEntry;
  };
  settings: {
    autoSave: boolean;
    maxCacheAge: number;
  };
}

export interface LookupRequest {
  action: 'lookup';
  word: string;
}

export interface LookupResponse {
  success: boolean;
  data?: WordEntry;
  error?: string;
}

export type MessageRequest = LookupRequest;
