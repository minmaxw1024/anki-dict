import browser from 'webextension-polyfill';
import { getAllWords, deleteWord, clearAllWords, getSettings, getExportedWords, markWordsExported } from '../lib/storage';
import { generateAnkiCSV } from '../lib/csv-exporter';
import { applyThemeToDocument } from '../lib/themes';
import { el } from '../lib/dom';
import { isAvailable, ensureDeckAndModel, addNotes } from '../lib/anki-connect';
import type { WordEntry } from '../lib/types';

let allWords: WordEntry[] = [];
let exportedWords = new Set<string>();
const selectedWords = new Set<string>();

async function loadTheme(): Promise<void> {
  const settings = await getSettings();
  applyThemeToDocument(settings.theme);
}

async function loadWords(): Promise<void> {
  allWords = await getAllWords();
  exportedWords = await getExportedWords();
  renderWordList();
  updateStats();
}

function renderWordList(): void {
  const wordListEl = document.getElementById('word-list');
  const emptyStateEl = document.getElementById('empty-state');

  if (!wordListEl || !emptyStateEl) return;

  emptyStateEl.style.display = allWords.length === 0 ? 'block' : 'none';
  wordListEl.replaceChildren(...allWords.map(createWordItem));
}

function createWordItem(word: WordEntry): HTMLElement {
  const isExported = exportedWords.has(word.word);
  const firstDef = word.definitions[0];
  const dateStr = new Date(word.timestamp).toLocaleDateString();
  const defCount = word.definitions.length;
  const preview = firstDef.meaning.length > 100 ? `${firstDef.meaning.substring(0, 100)}...` : firstDef.meaning;

  const checkbox = el('input', {
    type: 'checkbox',
    class: 'word-checkbox',
    'data-word': word.word,
    checked: selectedWords.has(word.word),
  });
  checkbox.addEventListener('change', handleCheckboxChange);

  const deleteBtn = el('button', { class: 'delete-word-btn', 'data-word': word.word, title: 'Delete this word' }, '×');
  deleteBtn.addEventListener('click', handleDeleteWord);

  return el('div', { class: 'word-item' },
    checkbox,
    el('div', { class: 'word-info' },
      el('div', { class: 'word-header' },
        el('span', { class: 'word-title' }, word.word),
        word.pronunciations.uk && ' ',
        word.pronunciations.uk && el('span', { class: 'word-pronunciation' }, word.pronunciations.uk.ipa),
      ),
      el('div', { class: 'word-meta' },
        el('span', { class: 'word-pos' }, firstDef.partOfSpeech), ' ',
        el('span', { class: 'word-date' }, dateStr), ' ',
        el('span', { class: 'word-def-count' }, `${defCount} definition${defCount > 1 ? 's' : ''}`),
        isExported && ' ',
        isExported && el('span', { class: 'word-exported-badge' }, 'Exported'),
      ),
      el('div', { class: 'word-preview' }, preview),
    ),
    deleteBtn,
  );
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

  updateActionButtons();
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

function updateActionButtons(): void {
  const noSelection = selectedWords.size === 0;
  const exportBtn = document.getElementById('export-btn') as HTMLButtonElement | null;
  const sendToAnkiBtn = document.getElementById('send-to-anki') as HTMLButtonElement | null;
  const deleteSelectedBtn = document.getElementById('delete-selected') as HTMLButtonElement | null;

  if (exportBtn) exportBtn.disabled = noSelection;
  if (sendToAnkiBtn) sendToAnkiBtn.disabled = noSelection;
  if (deleteSelectedBtn) deleteSelectedBtn.disabled = noSelection;
}

function selectAll(): void {
  allWords.forEach(word => selectedWords.add(word.word));
  renderWordList();
  updateActionButtons();
}

function selectNone(): void {
  selectedWords.clear();
  renderWordList();
  updateActionButtons();
}

function selectUnexported(): void {
  selectedWords.clear();
  allWords.forEach(word => {
    if (!exportedWords.has(word.word)) {
      selectedWords.add(word.word);
    }
  });
  renderWordList();
  updateActionButtons();
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

    await markWordsExported(wordsToExport.map(w => w.word));
    exportedWords = await getExportedWords();
    renderWordList();

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

async function sendToAnki(): Promise<void> {
  if (selectedWords.size === 0) {
    alert('Please select at least one word');
    return;
  }

  const btn = document.getElementById('send-to-anki') as HTMLButtonElement | null;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Connecting...';
  }

  try {
    const available = await isAvailable();
    if (!available) {
      alert('Cannot connect to AnkiConnect.\n\nMake sure:\n1. Anki is running\n2. AnkiConnect add-on is installed (code: 2055492159)');
      return;
    }

    if (btn) btn.textContent = 'Sending...';

    const modelInfo = await ensureDeckAndModel();

    const wordsToSend = allWords.filter(w => selectedWords.has(w.word));
    const result = await addNotes(wordsToSend, modelInfo);

    await markWordsExported(wordsToSend.map(w => w.word));
    exportedWords = await getExportedWords();
    renderWordList();

    let message = `Added ${result.added} word${result.added !== 1 ? 's' : ''} to Anki.`;
    if (result.duplicates > 0) {
      message += `\n${result.duplicates} duplicate${result.duplicates !== 1 ? 's' : ''} skipped.`;
    }
    if (result.failed > 0) {
      message += `\n${result.failed} word${result.failed !== 1 ? 's' : ''} could not be added.`;
    }
    alert(message);
  } catch (error) {
    console.error('AnkiConnect error:', error);
    alert(`Failed to send to Anki: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (btn) {
      btn.textContent = 'Send to Anki';
      btn.disabled = selectedWords.size === 0;
    }
  }
}

async function deleteSelected(): Promise<void> {
  if (selectedWords.size === 0) return;

  const count = selectedWords.size;
  if (!confirm(`Delete ${count} selected word${count !== 1 ? 's' : ''}? This cannot be undone.`)) {
    return;
  }

  await Promise.all([...selectedWords].map(word => deleteWord(word)));
  selectedWords.clear();
  await loadWords();
}

// Every origin the extension relies on: dictionary/AnkiConnect hosts plus the
// pages the content script runs on. Firefox lets users revoke these.
function requiredOrigins(): string[] {
  const manifest = browser.runtime.getManifest();
  const origins = new Set(manifest.host_permissions ?? []);
  manifest.content_scripts?.forEach(script => script.matches?.forEach(match => origins.add(match)));
  return [...origins];
}

async function checkPermissions(): Promise<void> {
  const banner = document.getElementById('permission-banner');
  if (!banner) return;
  banner.hidden = await browser.permissions.contains({ origins: requiredOrigins() });
}

function grantPermissions(): void {
  // Must be called straight from the click handler to count as a user action.
  browser.permissions.request({ origins: requiredOrigins() }).then(checkPermissions);
}

document.getElementById('select-all')?.addEventListener('click', selectAll);
document.getElementById('select-none')?.addEventListener('click', selectNone);
document.getElementById('select-unexported')?.addEventListener('click', selectUnexported);
document.getElementById('export-btn')?.addEventListener('click', exportToAnki);
document.getElementById('send-to-anki')?.addEventListener('click', sendToAnki);
document.getElementById('delete-selected')?.addEventListener('click', deleteSelected);
document.getElementById('clear-all')?.addEventListener('click', clearAll);
document.getElementById('grant-permissions')?.addEventListener('click', grantPermissions);
document.getElementById('settings-btn')?.addEventListener('click', () => {
  browser.runtime.openOptionsPage();
});

loadTheme();
loadWords();
checkPermissions();
