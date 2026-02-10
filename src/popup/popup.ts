import browser from 'webextension-polyfill';
import { getAllWords, deleteWord, clearAllWords, getSettings } from '../lib/storage';
import { generateAnkiCSV } from '../lib/csv-exporter';
import { applyThemeToDocument } from '../lib/themes';
import type { WordEntry } from '../lib/types';

let allWords: WordEntry[] = [];
const selectedWords = new Set<string>();

async function loadTheme(): Promise<void> {
  const settings = await getSettings();
  applyThemeToDocument(settings.theme);
}

async function loadWords(): Promise<void> {
  allWords = await getAllWords();
  renderWordList();
  updateStats();
}

function renderWordList(): void {
  const wordListEl = document.getElementById('word-list');
  const emptyStateEl = document.getElementById('empty-state');

  if (!wordListEl || !emptyStateEl) return;

  if (allWords.length === 0) {
    wordListEl.innerHTML = '';
    emptyStateEl.style.display = 'block';
    return;
  }

  emptyStateEl.style.display = 'none';

  wordListEl.innerHTML = allWords
    .map(word => createWordItem(word))
    .join('');

  wordListEl.querySelectorAll('.word-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', handleCheckboxChange);
  });

  wordListEl.querySelectorAll('.delete-word-btn').forEach(btn => {
    btn.addEventListener('click', handleDeleteWord);
  });
}

function createWordItem(word: WordEntry): string {
  const isChecked = selectedWords.has(word.word);
  const firstDef = word.definitions[0];
  const dateStr = new Date(word.timestamp).toLocaleDateString();

  return `
    <div class="word-item">
      <input
        type="checkbox"
        class="word-checkbox"
        data-word="${escapeHtml(word.word)}"
        ${isChecked ? 'checked' : ''}
      >
      <div class="word-info">
        <div class="word-header">
          <span class="word-title">${escapeHtml(word.word)}</span>
          ${word.pronunciations.uk ? `<span class="word-pronunciation">${escapeHtml(word.pronunciations.uk.ipa)}</span>` : ''}
        </div>
        <div class="word-meta">
          <span class="word-pos">${escapeHtml(firstDef.partOfSpeech)}</span>
          <span class="word-date">${dateStr}</span>
          <span class="word-def-count">${word.definitions.length} definition${word.definitions.length > 1 ? 's' : ''}</span>
        </div>
        <div class="word-preview">
          ${escapeHtml(firstDef.meaning.substring(0, 100))}${firstDef.meaning.length > 100 ? '...' : ''}
        </div>
      </div>
      <button class="delete-word-btn" data-word="${escapeHtml(word.word)}" title="Delete this word">×</button>
    </div>
  `;
}

function handleCheckboxChange(event: Event): void {
  const checkbox = event.target as HTMLInputElement;
  const word = checkbox.dataset.word;

  if (!word) return;

  if (checkbox.checked) {
    selectedWords.add(word);
  } else {
    selectedWords.delete(word);
  }

  updateExportButton();
}

async function handleDeleteWord(event: Event): Promise<void> {
  const btn = event.target as HTMLElement;
  const word = btn.dataset.word;

  if (!word) return;

  if (!confirm(`Delete "${word}" from your saved words?`)) {
    return;
  }

  await deleteWord(word);
  selectedWords.delete(word);

  await loadWords();
}

function updateStats(): void {
  const wordCountEl = document.getElementById('word-count');
  if (wordCountEl) {
    const count = allWords.length;
    wordCountEl.textContent = `${count} word${count !== 1 ? 's' : ''} saved`;
  }
}

function updateExportButton(): void {
  const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
  if (exportBtn) {
    exportBtn.disabled = selectedWords.size === 0;
  }
}

function selectAll(): void {
  allWords.forEach(word => selectedWords.add(word.word));
  renderWordList();
  updateExportButton();
}

function selectNone(): void {
  selectedWords.clear();
  renderWordList();
  updateExportButton();
}

async function exportToAnki(): Promise<void> {
  if (selectedWords.size === 0) {
    alert('Please select at least one word to export');
    return;
  }

  const wordsToExport = allWords.filter(word => selectedWords.has(word.word));

  try {
    const csv = generateAnkiCSV(wordsToExport);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `anki-words-${new Date().toISOString().split('T')[0]}.csv`;

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);

    alert(`Successfully exported ${wordsToExport.length} word${wordsToExport.length !== 1 ? 's' : ''} to ${filename}`);
  } catch (error) {
    console.error('Export error:', error);
    alert('Failed to export words. Please try again.');
  }
}

async function clearAll(): Promise<void> {
  if (!confirm(`Are you sure you want to delete all ${allWords.length} saved words? This cannot be undone.`)) {
    return;
  }

  await clearAllWords();
  selectedWords.clear();
  await loadWords();
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.getElementById('select-all')?.addEventListener('click', selectAll);
document.getElementById('select-none')?.addEventListener('click', selectNone);
document.getElementById('export-btn')?.addEventListener('click', exportToAnki);
document.getElementById('clear-all')?.addEventListener('click', clearAll);
document.getElementById('settings-btn')?.addEventListener('click', () => {
  browser.runtime.openOptionsPage();
});

loadTheme();
loadWords();
