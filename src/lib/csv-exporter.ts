import type { WordEntry } from './types';

export function generateAnkiCSV(words: WordEntry[]): string {
  const header = [
    '# separator:tab',
    '# html:true',
    '# tags:cambridge-dictionary anki-dict-extension',
    'Word\tBritish Pronunciation\tAmerican Pronunciation\tDefinitions\tExamples\tSource'
  ].join('\n');

  const rows = words.map(word => formatWordRow(word));

  return '\uFEFF' + header + '\n' + rows.join('\n');
}

function formatWordRow(word: WordEntry): string {
  const ukPron = word.pronunciations.uk?.ipa || '';
  const usPron = word.pronunciations.us?.ipa || '';

  const definitions = formatDefinitions(word);

  const examples = formatExamples(word);

  const fields = [
    word.word,
    ukPron,
    usPron,
    escapeCSVField(definitions),
    escapeCSVField(examples),
    word.sourceUrl
  ];

  return fields.join('\t');
}

function formatDefinitions(word: WordEntry): string {
  return word.definitions
    .map(def => {
      const parts: string[] = [];

      parts.push(`<b>${escapeHtml(def.partOfSpeech)}</b>`);

      if (def.level) {
        parts.push(` <span class="level">(${escapeHtml(def.level)})</span>`);
      }

      if (def.category) {
        parts.push(`<br><b>${escapeHtml(def.category)}:</b>`);
      }

      parts.push(`<br>${escapeHtml(def.meaning)}`);

      return parts.join('');
    })
    .join('<br><br>');
}

function formatExamples(word: WordEntry): string {
  const allExamples = word.definitions
    .flatMap(def => def.examples)
    .slice(0, 5);

  if (allExamples.length === 0) {
    return '';
  }

  const listItems = allExamples
    .map(ex => `<li>${escapeHtml(ex)}</li>`)
    .join('');

  return `<ul>${listItems}</ul>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeCSVField(text: string): string {
  if (text.includes('\t') || text.includes('\n') || text.includes('"')) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}
