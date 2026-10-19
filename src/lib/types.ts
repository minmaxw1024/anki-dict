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

// 'duolingo' is kept as the ID so saved settings still match; it's shown as "Fresh Green".
export type ThemeId = 'duolingo' | 'british';

export interface StorageSchema {
  /** Stored as one `word:<word>` key per entry. */
  words: {
    [word: string]: WordEntry;
  };
  settings: {
    autoSave: boolean;
    maxCacheAge: number;
    theme: ThemeId;
    ankiConnectUrl: string;
    ankiDeckName: string;
    ankiModelName: string;
  };
  exportedWords: string[];
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

export interface PlayAudioRequest {
  action: "play-audio";
  url: string;
}

export interface PlayAudioResponse {
  success: boolean;
  error?: string;
}

export type MessageRequest =
  | LookupRequest
  | FetchHtmlRequest
  | SaveWordRequest
  | FetchAudioRequest
  | PlayAudioRequest;
