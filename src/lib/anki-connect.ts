import type { WordEntry } from './types';
import { formatDefinitions, formatExamples, getFullAudioUrl } from './csv-exporter';
import { ANKI_TEMPLATE_SECTIONS } from './anki-template';

const ANKI_CONNECT_URL = 'http://127.0.0.1:8765';
const DECK_NAME = 'Anki Dict';
const MODEL_NAME = 'Anki Dict';

interface AnkiConnectResponse {
  result: unknown;
  error: string | null;
}

async function invoke<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(ANKI_CONNECT_URL, {
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

export async function ensureDeckAndModel(): Promise<void> {
  await invoke('createDeck', { deck: DECK_NAME });

  const models = await invoke<string[]>('modelNames');
  if (models.includes(MODEL_NAME)) return;

  // Sections: [fields, front, back, css]
  const frontTemplate = ANKI_TEMPLATE_SECTIONS[1].content;
  const backTemplate = ANKI_TEMPLATE_SECTIONS[2].content;
  const css = ANKI_TEMPLATE_SECTIONS[3].content;
  const fields = ANKI_TEMPLATE_SECTIONS[0].content.split('\n');

  await invoke('createModel', {
    modelName: MODEL_NAME,
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

function buildNote(word: WordEntry) {
  return {
    deckName: DECK_NAME,
    modelName: MODEL_NAME,
    fields: wordToNoteFields(word),
    options: {
      allowDuplicate: false,
      duplicateScope: 'deck',
      duplicateScopeOptions: {
        deckName: DECK_NAME,
        checkChildren: false,
        checkAllModels: false,
      },
    },
    tags: ['cambridge-dictionary', 'anki-dict-extension'],
  };
}

export interface AddNotesResult {
  total: number;
  added: number;
  duplicates: number;
}

export async function addNotes(words: WordEntry[]): Promise<AddNotesResult> {
  const notes = words.map(buildNote);
  const results = await invoke<(number | null)[]>('addNotes', { notes });

  const added = results.filter(r => r !== null).length;
  return {
    total: words.length,
    added,
    duplicates: words.length - added,
  };
}
