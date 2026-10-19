import browser from 'webextension-polyfill';
import type { WordEntry, StorageSchema } from './types';

// Each word lives under its own key so concurrent writes from different
// extension contexts (service worker, popup) can't clobber each other.
const WORD_KEY_PREFIX = 'word:';
const LEGACY_WORDS_KEY = 'words';
const SETTINGS_KEY = 'settings';
const EXPORTED_WORDS_KEY = 'exportedWords';

export const DEFAULT_SETTINGS: StorageSchema['settings'] = {
  autoSave: true,
  maxCacheAge: 30,
  theme: 'duolingo',
  ankiConnectUrl: 'http://127.0.0.1:8765',
  ankiDeckName: 'Anki Dict',
  ankiModelName: 'Anki Dict',
};

function wordKey(word: string): string {
  return WORD_KEY_PREFIX + word.toLowerCase().trim();
}

let migration: Promise<void> | null = null;

// Older versions stored every word inside one `words` object.
function migrateLegacyWords(): Promise<void> {
  migration ??= (async () => {
    const data = await browser.storage.local.get(LEGACY_WORDS_KEY) as { words?: Record<string, WordEntry> };
    if (!data.words) return;

    const entries: Record<string, WordEntry> = {};
    for (const entry of Object.values(data.words)) {
      entries[wordKey(entry.word)] = entry;
    }
    await browser.storage.local.set(entries);
    await browser.storage.local.remove(LEGACY_WORDS_KEY);
  })();
  return migration;
}

async function getAllWordKeys(): Promise<string[]> {
  const all = await browser.storage.local.get(null);
  return Object.keys(all).filter(key => key.startsWith(WORD_KEY_PREFIX));
}

export async function saveWord(wordEntry: WordEntry): Promise<void> {
  await migrateLegacyWords();
  await browser.storage.local.set({ [wordKey(wordEntry.word)]: wordEntry });
}

export async function getWord(word: string): Promise<WordEntry | null> {
  await migrateLegacyWords();
  const key = wordKey(word);
  const data = await browser.storage.local.get(key) as Record<string, WordEntry | undefined>;
  const wordEntry = data[key];

  if (!wordEntry) {
    return null;
  }

  wordEntry.lastAccessed = Date.now();
  await browser.storage.local.set({ [key]: wordEntry });

  return wordEntry;
}

export async function getAllWords(): Promise<WordEntry[]> {
  await migrateLegacyWords();
  const all = await browser.storage.local.get(null) as Record<string, unknown>;

  return Object.entries(all)
    .filter(([key]) => key.startsWith(WORD_KEY_PREFIX))
    .map(([, value]) => value as WordEntry)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export async function deleteWord(word: string): Promise<void> {
  await migrateLegacyWords();
  await browser.storage.local.remove(wordKey(word));
}

export async function clearAllWords(): Promise<void> {
  await migrateLegacyWords();
  await browser.storage.local.remove(await getAllWordKeys());
}

export async function getSettings(): Promise<StorageSchema['settings']> {
  const { settings } = await browser.storage.local.get(SETTINGS_KEY) as { settings?: Partial<StorageSchema['settings']> };

  // Merge so settings saved by older versions pick up newly added keys.
  return { ...DEFAULT_SETTINGS, ...settings };
}

export async function saveSettings(settings: Partial<StorageSchema['settings']>): Promise<void> {
  const currentSettings = await getSettings();
  const newSettings = { ...currentSettings, ...settings };

  await browser.storage.local.set({ [SETTINGS_KEY]: newSettings });
}

export async function getExportedWords(): Promise<Set<string>> {
  const data = await browser.storage.local.get(EXPORTED_WORDS_KEY) as { exportedWords?: string[] };
  return new Set(data.exportedWords || []);
}

export async function markWordsExported(words: string[]): Promise<void> {
  const existing = await getExportedWords();
  words.forEach(w => existing.add(w));
  await browser.storage.local.set({ [EXPORTED_WORDS_KEY]: [...existing] });
}

const CHROME_LOCAL_STORAGE_QUOTA = 10_485_760; // 10 MB

export async function getStorageUsage(): Promise<{ bytesInUse: number; quota: number }> {
  const bytesInUse = await browser.storage.local.getBytesInUse(null);

  return {
    bytesInUse,
    quota: CHROME_LOCAL_STORAGE_QUOTA,
  };
}
