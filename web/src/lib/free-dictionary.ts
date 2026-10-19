import { getFreeDictionaryUrl, parseFreeDictionaryJson } from '@shared/free-dictionary';
import type { WordEntry } from './types';

export async function lookupFreeDictionary(word: string): Promise<WordEntry> {
  const res = await fetch(getFreeDictionaryUrl(word));
  if (!res.ok) {
    throw new Error(`Word "${word}" not found`);
  }

  return parseFreeDictionaryJson(await res.text(), word);
}
