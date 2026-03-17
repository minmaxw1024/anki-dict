import type { WordEntry, Definition } from './types';
import { JSDOM } from 'jsdom';

export function getCambridgeUrl(word: string): string {
  const cleanWord = word.toLowerCase().trim();
  return `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(cleanWord)}`;
}

function findElement(container: Document | Element, selectors: string[]): Element | null {
  for (const selector of selectors) {
    const element = container.querySelector(selector);
    if (element) return element;
  }
  return null;
}

function findElements(container: Document | Element, selectors: string[]): Element[] {
  for (const selector of selectors) {
    const elements = Array.from(container.querySelectorAll(selector));
    if (elements.length > 0) return elements;
  }
  return [];
}

function extractPronunciations(doc: Document): WordEntry['pronunciations'] {
  const pronunciations: WordEntry['pronunciations'] = {};

  const ukPronContainer = doc.querySelector('.uk.dpron-i');
  if (ukPronContainer) {
    const ipaElement = ukPronContainer.querySelector('.ipa');
    const audioElement = ukPronContainer.querySelector('source[type="audio/mpeg"]');

    if (ipaElement?.textContent) {
      pronunciations.uk = {
        ipa: ipaElement.textContent.trim(),
        audioUrl: audioElement?.getAttribute('src') || undefined,
      };
    }
  }

  const usPronContainer = doc.querySelector('.us.dpron-i');
  if (usPronContainer) {
    const ipaElement = usPronContainer.querySelector('.ipa');
    const audioElement = usPronContainer.querySelector('source[type="audio/mpeg"]');

    if (ipaElement?.textContent) {
      pronunciations.us = {
        ipa: ipaElement.textContent.trim(),
        audioUrl: audioElement?.getAttribute('src') || undefined,
      };
    }
  }

  return pronunciations;
}

const SELECTORS = {
  entryBody: ['.entry-body__el', '.entry-body', '.dictionary', 'article.entry', '[data-id]'],
  definitionBlocks: ['.def-block', '.sense-body', '.dsense'],
  partOfSpeech: ['.pos', '.posgram'],
  meaning: ['.def', '.ddef_d'],
  examples: ['.examp', '.eg'],
  level: ['.epp-xref', '.def-info'],
};

function extractDefinitions(container: Element): Definition[] {
  const definitions: Definition[] = [];

  const posElement = findElement(container, SELECTORS.partOfSpeech);
  const partOfSpeech = posElement?.textContent?.trim() || 'unknown';

  const defBlocks = findElements(container, SELECTORS.definitionBlocks);

  if (defBlocks.length === 0) {
    const meaningElement = findElement(container, SELECTORS.meaning);
    if (meaningElement) {
      const examples = findElements(container, SELECTORS.examples)
        .map(el => el.textContent?.trim() || '')
        .filter(text => text.length > 0);

      definitions.push({
        partOfSpeech,
        meaning: meaningElement.textContent?.trim() || '',
        examples,
      });
    }
  } else {
    for (const block of defBlocks) {
      const meaningElement = findElement(block, SELECTORS.meaning);
      const levelElement = findElement(block, SELECTORS.level);

      if (meaningElement) {
        const examples = findElements(block, SELECTORS.examples)
          .map(el => el.textContent?.trim() || '')
          .filter(text => text.length > 0);

        const headElement = block.querySelector('.def-head .guideword');
        const category = headElement?.textContent?.trim();

        definitions.push({
          partOfSpeech,
          level: levelElement?.textContent?.trim(),
          category,
          meaning: meaningElement.textContent?.trim() || '',
          examples,
        });
      }
    }
  }

  return definitions;
}

export async function lookupCambridge(word: string): Promise<WordEntry> {
  const cleanWord = word.toLowerCase().trim();
  const url = getCambridgeUrl(cleanWord);

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!res.ok) {
    throw new Error(`Cambridge lookup failed for "${word}"`);
  }

  const html = await res.text();
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const entryBody = findElement(doc, SELECTORS.entryBody);

  if (!entryBody) {
    throw new Error(`Could not parse dictionary entry for "${word}"`);
  }

  const pronunciations = extractPronunciations(doc);
  const definitions = extractDefinitions(entryBody);

  if (definitions.length === 0) {
    throw new Error(`No definitions found for "${word}"`);
  }

  return {
    word: cleanWord,
    timestamp: Date.now(),
    pronunciations,
    definitions,
    sourceUrl: url,
    lastAccessed: Date.now(),
  };
}
