import type { WordEntry, Definition } from './types';

interface ScraperConfig {
  selectors: {
    entryBody: string[];
    pronunciation: string[];
    audioSource: string[];
    definitionBlocks: string[];
    partOfSpeech: string[];
    meaning: string[];
    examples: string[];
    level: string[];
  };
}

const CAMBRIDGE_SELECTORS: ScraperConfig = {
  selectors: {
    entryBody: [
      '.entry-body__el',
      '.entry-body',
      '.dictionary',
      'article.entry',
      '[data-id]'
    ],
    pronunciation: [
      '.uk.dpron-i .ipa',
      '.us.dpron-i .ipa',
      '.dpron-i .ipa',
      '.pron .ipa',
      '.ipa'
    ],
    audioSource: [
      '.uk.dpron-i source[type="audio/mpeg"]',
      '.us.dpron-i source[type="audio/mpeg"]',
      'audio source[type="audio/mpeg"]',
      '.daud source'
    ],
    definitionBlocks: [
      '.def-block',
      '.sense-body',
      '.dsense'
    ],
    partOfSpeech: [
      '.pos',
      '.posgram'
    ],
    meaning: [
      '.def',
      '.ddef_d'
    ],
    examples: [
      '.examp',
      '.eg'
    ],
    level: [
      '.epp-xref',
      '.def-info'
    ]
  }
};

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
        audioUrl: audioElement?.getAttribute('src') || undefined
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
        audioUrl: audioElement?.getAttribute('src') || undefined
      };
    }
  }

  return pronunciations;
}

function extractDefinitions(container: Element): Definition[] {
  const definitions: Definition[] = [];

  const posElement = findElement(container, CAMBRIDGE_SELECTORS.selectors.partOfSpeech);
  const partOfSpeech = posElement?.textContent?.trim() || 'unknown';

  const defBlocks = findElements(container, CAMBRIDGE_SELECTORS.selectors.definitionBlocks);

  if (defBlocks.length === 0) {
    const meaningElement = findElement(container, CAMBRIDGE_SELECTORS.selectors.meaning);
    if (meaningElement) {
      const examples = findElements(container, CAMBRIDGE_SELECTORS.selectors.examples)
        .map(el => el.textContent?.trim() || '')
        .filter(text => text.length > 0);

      definitions.push({
        partOfSpeech,
        meaning: meaningElement.textContent?.trim() || '',
        examples
      });
    }
  } else {
    for (const block of defBlocks) {
      const meaningElement = findElement(block, CAMBRIDGE_SELECTORS.selectors.meaning);
      const levelElement = findElement(block, CAMBRIDGE_SELECTORS.selectors.level);

      if (meaningElement) {
        const examples = findElements(block, CAMBRIDGE_SELECTORS.selectors.examples)
          .map(el => el.textContent?.trim() || '')
          .filter(text => text.length > 0);

        const headElement = block.querySelector('.def-head .guideword');
        const category = headElement?.textContent?.trim();

        definitions.push({
          partOfSpeech,
          level: levelElement?.textContent?.trim(),
          category,
          meaning: meaningElement.textContent?.trim() || '',
          examples
        });
      }
    }
  }

  return definitions;
}

export async function scrapeCambridgeWord(word: string): Promise<WordEntry> {
  const cleanWord = word.toLowerCase().trim();
  const url = `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(cleanWord)}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Word "${word}" not found in Cambridge Dictionary`);
      }
      throw new Error(`Failed to fetch dictionary page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const entryBody = findElement(doc, CAMBRIDGE_SELECTORS.selectors.entryBody);

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
      lastAccessed: Date.now()
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Unknown error while scraping "${word}"`);
  }
}
