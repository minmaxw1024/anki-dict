import { JSDOM } from 'jsdom';
import { getCambridgeUrl, parseCambridgeHtml } from '@shared/dictionary-scraper';
import type { WordEntry } from './types';

export async function lookupCambridge(word: string): Promise<WordEntry> {
  const res = await fetch(getCambridgeUrl(word), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!res.ok) {
    throw new Error(`Cambridge lookup failed for "${word}"`);
  }

  return parseCambridgeHtml(await res.text(), word, (html) => new JSDOM(html).window.document);
}
