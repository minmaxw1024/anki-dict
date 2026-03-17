import type { WordEntry } from './types';
import { escapeHtml } from './utils';

const CAMBRIDGE_BASE = 'https://dictionary.cambridge.org';

function getFullAudioUrl(audioUrl: string | undefined): string {
  if (!audioUrl) return '';
  return audioUrl.startsWith('http') ? audioUrl : `${CAMBRIDGE_BASE}${audioUrl}`;
}

export function formatDefinitions(word: WordEntry): string {
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

export function formatExamples(word: WordEntry): string {
  const allExamples = word.definitions
    .flatMap(def => def.examples)
    .slice(0, 5);

  if (allExamples.length === 0) return '';

  const listItems = allExamples
    .map(ex => `<li>${escapeHtml(ex)}</li>`)
    .join('');

  return `<ul>${listItems}</ul>`;
}

function escapeCSVField(text: string): string {
  if (text.includes('\t') || text.includes('\n') || text.includes('"')) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

export function generateAnkiCSV(words: WordEntry[]): string {
  const header = [
    '# separator:tab',
    '# html:true',
    '# tags:cambridge-dictionary anki-dict-web',
    'Word\tBritish Pronunciation\tAmerican Pronunciation\tBritish Audio\tAmerican Audio\tDefinitions\tExamples\tSource',
  ].join('\n');

  const rows = words.map(word => {
    const ukPron = word.pronunciations.uk?.ipa || '';
    const usPron = word.pronunciations.us?.ipa || '';
    const ukAudio = getFullAudioUrl(word.pronunciations.uk?.audioUrl);
    const usAudio = getFullAudioUrl(word.pronunciations.us?.audioUrl);
    const definitions = formatDefinitions(word);
    const examples = formatExamples(word);

    return [
      word.word,
      ukPron,
      usPron,
      ukAudio,
      usAudio,
      escapeCSVField(definitions),
      escapeCSVField(examples),
      word.sourceUrl,
    ].join('\t');
  });

  return '\uFEFF' + header + '\n' + rows.join('\n');
}
