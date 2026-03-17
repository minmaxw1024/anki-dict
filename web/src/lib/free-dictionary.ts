import type { WordEntry, Definition } from './types';

interface FreeDictPhonetic {
  text?: string;
  audio?: string;
}

interface FreeDictDefinition {
  definition: string;
  synonyms: string[];
  antonyms: string[];
  example?: string;
}

interface FreeDictMeaning {
  partOfSpeech: string;
  definitions: FreeDictDefinition[];
}

interface FreeDictEntry {
  word: string;
  phonetic?: string;
  phonetics: FreeDictPhonetic[];
  meanings: FreeDictMeaning[];
  sourceUrls?: string[];
}

export async function lookupFreeDictionary(word: string): Promise<WordEntry> {
  const cleanWord = word.toLowerCase().trim();
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Word "${word}" not found`);
  }

  const entries: FreeDictEntry[] = await res.json();
  if (!entries || entries.length === 0) {
    throw new Error(`No definitions found for "${word}"`);
  }

  const entry = entries[0];
  const pronunciations: WordEntry['pronunciations'] = {};

  for (const phonetic of entry.phonetics) {
    const audio = phonetic.audio || '';
    const ipa = phonetic.text || entry.phonetic || '';

    if (audio.includes('-us') || audio.includes('-us.')) {
      pronunciations.us = { ipa, audioUrl: audio || undefined };
    } else if (audio.includes('-uk') || audio.includes('-uk.')) {
      pronunciations.uk = { ipa, audioUrl: audio || undefined };
    }
  }

  if (!pronunciations.us && !pronunciations.uk) {
    const ipa = entry.phonetic || entry.phonetics.find(p => p.text)?.text || '';
    const audio = entry.phonetics.find(p => p.audio)?.audio || undefined;
    if (ipa) {
      pronunciations.us = { ipa, audioUrl: audio };
    }
  }

  const definitions: Definition[] = [];

  for (const e of entries) {
    for (const meaning of e.meanings) {
      for (const def of meaning.definitions) {
        definitions.push({
          partOfSpeech: meaning.partOfSpeech,
          meaning: def.definition,
          examples: def.example ? [def.example] : [],
        });
      }
    }
  }

  if (definitions.length === 0) {
    throw new Error(`No definitions found for "${word}"`);
  }

  return {
    word: cleanWord,
    timestamp: Date.now(),
    pronunciations,
    definitions,
    sourceUrl: `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`,
    lastAccessed: Date.now(),
  };
}
