import browser from 'webextension-polyfill';
import type { WordEntry, StorageSchema } from './types';

const WORDS_KEY = 'words';
const SETTINGS_KEY = 'settings';

const DEFAULT_SETTINGS: StorageSchema['settings'] = {
  autoSave: true,
  maxCacheAge: 30,
  theme: 'duolingo',
};

export async function saveWord(wordEntry: WordEntry): Promise<void> {
  const { words } = await browser.storage.local.get(WORDS_KEY) as { words?: StorageSchema['words'] };
  const allWords = words || {};

  allWords[wordEntry.word] = wordEntry;

  await browser.storage.local.set({ [WORDS_KEY]: allWords });
}

export async function getWord(word: string): Promise<WordEntry | null> {
  const cleanWord = word.toLowerCase().trim();
  const { words } = await browser.storage.local.get(WORDS_KEY) as { words?: StorageSchema['words'] };

  if (!words || !words[cleanWord]) {
    return null;
  }

  const wordEntry = words[cleanWord];
  wordEntry.lastAccessed = Date.now();

  await saveWord(wordEntry);

  return wordEntry;
}

export async function getAllWords(): Promise<WordEntry[]> {
  const { words } = await browser.storage.local.get(WORDS_KEY) as { words?: StorageSchema['words'] };

  if (!words) {
    return [];
  }

  return Object.values(words).sort((a, b) => b.timestamp - a.timestamp);
}

export async function deleteWord(word: string): Promise<void> {
  const cleanWord = word.toLowerCase().trim();
  const { words } = await browser.storage.local.get(WORDS_KEY) as { words?: StorageSchema['words'] };

  if (!words) {
    return;
  }

  delete words[cleanWord];

  await browser.storage.local.set({ [WORDS_KEY]: words });
}

export async function clearAllWords(): Promise<void> {
  await browser.storage.local.set({ [WORDS_KEY]: {} });
}

export async function getSettings(): Promise<StorageSchema['settings']> {
  const { settings } = await browser.storage.local.get(SETTINGS_KEY) as { settings?: StorageSchema['settings'] };

  return settings || DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Partial<StorageSchema['settings']>): Promise<void> {
  const currentSettings = await getSettings();
  const newSettings = { ...currentSettings, ...settings };

  await browser.storage.local.set({ [SETTINGS_KEY]: newSettings });
}

export async function getStorageUsage(): Promise<{ bytesInUse: number; quota: number }> {
  const bytesInUse = await browser.storage.local.getBytesInUse(null);

  return {
    bytesInUse,
    quota: (browser.storage.local as any).QUOTA_BYTES || Infinity
  };
}
