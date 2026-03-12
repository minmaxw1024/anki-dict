import type { WordEntry } from './types';
import { formatDefinitions, formatExamples, getFullAudioUrl } from './csv-exporter';
import { ANKI_TEMPLATE_SECTIONS } from './anki-template';
import { getSettings } from './storage';

const DEFAULT_ANKI_CONNECT_URL = 'http://127.0.0.1:8765';
const DEFAULT_DECK_NAME = 'Anki Dict';
const DEFAULT_MODEL_NAME = 'Anki Dict';

interface AnkiConnectResponse {
  result: unknown;
  error: string | null;
}

async function getAnkiConfig() {
  const settings = await getSettings();
  return {
    url: settings.ankiConnectUrl || DEFAULT_ANKI_CONNECT_URL,
    deckName: settings.ankiDeckName || DEFAULT_DECK_NAME,
    modelName: settings.ankiModelName || DEFAULT_MODEL_NAME,
  };
}

async function invoke<T = unknown>(action: string, params: Record<string, unknown> = {}, url?: string): Promise<T> {
  const ankiUrl = url || (await getAnkiConfig()).url;
  const response = await fetch(ankiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, version: 6, params }),
  });
  const json: AnkiConnectResponse = await response.json();
  if (json.error) {
    throw new Error(json.error);
  }
  return json.result as T;
}

export async function isAvailable(): Promise<boolean> {
  try {
    const version = await invoke<number>('version');
    return version >= 6;
  } catch {
    return false;
  }
}

export interface TestConnectionResult {
  success: boolean;
  version?: number;
  error?: string;
}

export async function testConnection(url?: string): Promise<TestConnectionResult> {
  try {
    const version = await invoke<number>('version', {}, url);
    if (version >= 6) {
      return { success: true, version };
    }
    return { success: false, error: `AnkiConnect version ${version} is too old (need v6+)` };
  } catch {
    return { success: false, error: 'Cannot connect to AnkiConnect. Make sure Anki is running and AnkiConnect add-on is installed.' };
  }
}

export async function ensureDeckAndModel(): Promise<void> {
  const { deckName, modelName } = await getAnkiConfig();

  await invoke('createDeck', { deck: deckName });

  const models = await invoke<string[]>('modelNames');
  if (models.includes(modelName)) return;

  // Sections: [fields, front, back, css]
  const frontTemplate = ANKI_TEMPLATE_SECTIONS[1].content;
  const backTemplate = ANKI_TEMPLATE_SECTIONS[2].content;
  const css = ANKI_TEMPLATE_SECTIONS[3].content;
  const fields = ANKI_TEMPLATE_SECTIONS[0].content.split('\n');

  await invoke('createModel', {
    modelName,
    inOrderFields: fields,
    css,
    isCloze: false,
    cardTemplates: [
      { Name: 'Anki Dict Card', Front: frontTemplate, Back: backTemplate },
    ],
  });
}

function wordToNoteFields(word: WordEntry): Record<string, string> {
  return {
    'Word': word.word,
    'British Pronunciation': word.pronunciations.uk?.ipa || '',
    'American Pronunciation': word.pronunciations.us?.ipa || '',
    'British Audio': getFullAudioUrl(word.pronunciations.uk?.audioUrl),
    'American Audio': getFullAudioUrl(word.pronunciations.us?.audioUrl),
    'Definitions': formatDefinitions(word),
    'Examples': formatExamples(word),
    'Source': word.sourceUrl,
  };
}

function buildNote(word: WordEntry, deckName: string, modelName: string) {
  return {
    deckName,
    modelName,
    fields: wordToNoteFields(word),
    options: {
      allowDuplicate: false,
      duplicateScope: 'deck',
      duplicateScopeOptions: {
        deckName,
        checkChildren: false,
        checkAllModels: false,
      },
    },
    tags: ['cambridge-dictionary', 'anki-dict-extension'],
  };
}

export async function getDeckNames(): Promise<string[]> {
  return invoke<string[]>('deckNames');
}

export async function getModelNames(): Promise<string[]> {
  return invoke<string[]>('modelNames');
}

export interface AddNotesResult {
  total: number;
  added: number;
  duplicates: number;
}

export async function addNotes(words: WordEntry[]): Promise<AddNotesResult> {
  const { deckName, modelName } = await getAnkiConfig();
  const notes = words.map(w => buildNote(w, deckName, modelName));
  const results = await invoke<(number | null)[]>('addNotes', { notes });

  const added = results.filter(r => r !== null).length;
  return {
    total: words.length,
    added,
    duplicates: words.length - added,
  };
}
