import type { WordEntry } from './types';
import { formatDefinitions, formatExamples, getFullAudioUrl } from './csv-exporter';
import { ANKI_TEMPLATE_SECTIONS, AUDIO_TEMPLATE_MARKER, LEGACY_BACK_TEMPLATE } from './anki-template';
import { getSettings } from './storage';
import { arrayBufferToBase64 } from './utils';

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

export interface ModelInfo {
  /** Whether the note type's template can play `[sound:]` audio fields. */
  mediaAudio: boolean;
}

const normalizeTemplate = (template: string) => template.replace(/\s+/g, ' ').trim();

export async function ensureDeckAndModel(): Promise<ModelInfo> {
  const { deckName, modelName } = await getAnkiConfig();

  await invoke('createDeck', { deck: deckName });

  // Sections: [fields, front, back, css]
  const frontTemplate = ANKI_TEMPLATE_SECTIONS[1].content;
  const backTemplate = ANKI_TEMPLATE_SECTIONS[2].content;
  const css = ANKI_TEMPLATE_SECTIONS[3].content;

  const models = await invoke<string[]>('modelNames');
  if (!models.includes(modelName)) {
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
    return { mediaAudio: true };
  }

  const templates = await invoke<Record<string, { Front: string; Back: string }>>(
    'modelTemplates', { modelName },
  );
  const cards = Object.entries(templates);

  if (cards.every(([, card]) => card.Back.includes(AUDIO_TEMPLATE_MARKER))) {
    return { mediaAudio: true };
  }

  // Upgrade note types created by older versions, but leave templates the
  // user has customised alone and keep sending plain audio URLs to them.
  const legacyBack = normalizeTemplate(LEGACY_BACK_TEMPLATE);
  if (cards.every(([, card]) => normalizeTemplate(card.Back) === legacyBack)) {
    await invoke('updateModelTemplates', {
      model: {
        name: modelName,
        templates: Object.fromEntries(
          cards.map(([name, card]) => [name, { Front: card.Front, Back: backTemplate }]),
        ),
      },
    });
    await invoke('updateModelStyling', { model: { name: modelName, css } });
    return { mediaAudio: true };
  }

  return { mediaAudio: false };
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

interface NoteAudio {
  data: string;
  filename: string;
  fields: string[];
}

interface Note {
  deckName: string;
  modelName: string;
  fields: Record<string, string>;
  options: Record<string, unknown>;
  tags: string[];
  audio?: NoteAudio[];
}

function buildNote(word: WordEntry, deckName: string, modelName: string): Note {
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

async function fetchBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return arrayBufferToBase64(await response.arrayBuffer());
  } catch {
    return null;
  }
}

export function mediaFilename(word: string, region: 'uk' | 'us'): string {
  return `anki-dict-${word.replace(/[^a-z0-9-]/gi, '_')}-${region}.mp3`;
}

/**
 * Downloads the pronunciation audio so Anki stores it in its media folder.
 * AnkiConnect appends a `[sound:...]` tag to each listed field. If a download
 * fails the field keeps its URL, which the template still plays online.
 */
async function attachAudio(note: Note, word: WordEntry): Promise<void> {
  const regions = [
    { region: 'uk', field: 'British Audio' },
    { region: 'us', field: 'American Audio' },
  ] as const;

  const audio = await Promise.all(regions.map(async ({ region, field }): Promise<NoteAudio | null> => {
    const url = note.fields[field];
    if (!url) return null;

    const data = await fetchBase64(url);
    if (!data) return null;

    note.fields[field] = '';
    return { data, filename: mediaFilename(word.word, region), fields: [field] };
  }));

  note.audio = audio.filter((a): a is NoteAudio => a !== null);
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
  failed: number;
}

const AUDIO_FETCH_BATCH_SIZE = 5;

export async function addNotes(words: WordEntry[], { mediaAudio }: ModelInfo): Promise<AddNotesResult> {
  const { deckName, modelName } = await getAnkiConfig();
  const candidates = words.map(word => ({ word, note: buildNote(word, deckName, modelName) }));

  // Filter duplicates first so we don't download audio that Anki would discard.
  const canAdd = await invoke<boolean[]>('canAddNotes', { notes: candidates.map(c => c.note) });
  const addable = candidates.filter((_, i) => canAdd[i]);

  if (mediaAudio) {
    for (let i = 0; i < addable.length; i += AUDIO_FETCH_BATCH_SIZE) {
      await Promise.all(
        addable.slice(i, i + AUDIO_FETCH_BATCH_SIZE).map(({ note, word }) => attachAudio(note, word)),
      );
    }
  }

  const results = addable.length > 0
    ? await invoke<(number | null)[]>('addNotes', { notes: addable.map(c => c.note) })
    : [];
  const added = results.filter(r => r !== null).length;

  return {
    total: words.length,
    added,
    duplicates: words.length - addable.length,
    failed: addable.length - added,
  };
}
