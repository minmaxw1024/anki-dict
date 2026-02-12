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

export type ThemeId = 'duolingo' | 'british';

export interface StorageSchema {
  words: {
    [word: string]: WordEntry;
  };
  settings: {
    autoSave: boolean;
    maxCacheAge: number;
    theme: ThemeId;
  };
}

export interface LookupRequest {
  action: "lookup";
  word: string;
}

export interface FetchHtmlRequest {
  action: "fetch-html";
  url: string;
}

export interface SaveWordRequest {
  action: "save";
  data: WordEntry;
}

export interface LookupResponse {
  success: boolean;
  data?: WordEntry;
  error?: string;
}

export interface FetchHtmlResponse {
  success: boolean;
  html?: string;
  error?: string;
}

export interface FetchAudioRequest {
  action: "fetch-audio";
  url: string;
}

export interface FetchAudioResponse {
  success: boolean;
  dataUrl?: string;
  error?: string;
}

export type MessageRequest = LookupRequest | FetchHtmlRequest | SaveWordRequest | FetchAudioRequest;
