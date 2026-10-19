import browser from 'webextension-polyfill';
import type { Definition, WordEntry, FetchAudioResponse, PlayAudioResponse } from '../lib/types';
import { append, el } from '../lib/dom';

const MODAL_ID = 'anki-dict-modal';

export function createModal(): HTMLElement {
  const existingModal = document.getElementById(MODAL_ID);
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = MODAL_ID;
  modal.className = 'anki-dict-modal';
  modal.style.display = 'none';

  const closeButton = document.createElement('button');
  closeButton.className = 'anki-dict-close';
  closeButton.textContent = '×';
  closeButton.onclick = () => hideModal(modal);

  const content = document.createElement('div');
  content.className = 'anki-dict-content';

  modal.appendChild(closeButton);
  modal.appendChild(content);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideModal(modal);
    }
  });

  return modal;
}

export function showModal(modal: HTMLElement, x: number, y: number): void {
  modal.style.display = 'block';
  modal.dataset.anchorX = String(x);
  modal.dataset.anchorY = String(y);
  positionModal(modal, x, y);
}

// The modal is first placed while it only shows the loading spinner, so it
// has to be placed again once the (taller) definition replaces it.
function repositionModal(modal: HTMLElement): void {
  if (modal.style.display === 'none') return;
  positionModal(modal, Number(modal.dataset.anchorX), Number(modal.dataset.anchorY));
}

function positionModal(modal: HTMLElement, x: number, y: number): void {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const modalRect = modal.getBoundingClientRect();

  let left = x + 10;
  let top = y + 10;

  if (left + modalRect.width > viewportWidth) {
    left = x - modalRect.width - 10;
  }

  if (top + modalRect.height > viewportHeight) {
    top = y - modalRect.height - 10;
  }

  left = Math.max(10, Math.min(left, viewportWidth - modalRect.width - 10));
  top = Math.max(10, Math.min(top, viewportHeight - modalRect.height - 10));

  modal.style.left = `${left + window.scrollX}px`;
  modal.style.top = `${top + window.scrollY}px`;
}

export function hideModal(modal: HTMLElement): void {
  modal.style.display = 'none';
}

export function updateModalLoading(modal: HTMLElement, word: string): void {
  const content = modal.querySelector('.anki-dict-content');
  if (!content) return;

  content.replaceChildren(
    el('div', { class: 'anki-dict-loading' },
      el('div', { class: 'anki-dict-spinner' }),
      el('p', {}, `Looking up "${word}"...`),
    ),
  );
}

export function updateModalError(modal: HTMLElement, error: string): void {
  const content = modal.querySelector('.anki-dict-content');
  if (!content) return;

  content.replaceChildren(
    el('div', { class: 'anki-dict-error' },
      el('h3', {}, 'Error'),
      el('p', {}, error),
    ),
  );
  repositionModal(modal);
}

export function updateModalContent(modal: HTMLElement, wordEntry: WordEntry): void {
  const content = modal.querySelector('.anki-dict-content');
  if (!content) return;

  const sourceUrl = /^https?:\/\//.test(wordEntry.sourceUrl) ? wordEntry.sourceUrl : null;

  content.replaceChildren();
  append(content,
    el('div', { class: 'anki-dict-word' },
      el('h2', {}, wordEntry.word),
      createPronunciations(wordEntry),
    ),
    ...wordEntry.definitions.map(createDefinition),
    sourceUrl && el('div', { class: 'anki-dict-source' },
      el('a', { href: sourceUrl, target: '_blank', rel: 'noopener' }, 'View on Cambridge Dictionary'),
    ),
  );

  repositionModal(modal);
}

function createPronunciation(label: string, pron: { ipa: string; audioUrl?: string }): HTMLElement {
  const audioBtn = pron.audioUrl ? el('button', { class: 'anki-dict-audio-btn' }, '🔊') : null;
  const audioUrl = pron.audioUrl;
  if (audioBtn && audioUrl) {
    audioBtn.addEventListener('click', () => playAudio(audioUrl));
  }

  return el('div', { class: 'anki-dict-pronunciation' },
    el('span', { class: 'anki-dict-pron-label' }, label),
    el('span', { class: 'anki-dict-pron-ipa' }, pron.ipa),
    audioBtn,
  );
}

function createPronunciations(wordEntry: WordEntry): HTMLElement | null {
  const { uk, us } = wordEntry.pronunciations;
  if (!uk && !us) return null;

  return el('div', { class: 'anki-dict-pronunciations' },
    uk && createPronunciation('UK', uk),
    us && createPronunciation('US', us),
  );
}

function createDefinition(def: Definition): HTMLElement {
  return el('div', { class: 'anki-dict-definition' },
    el('div', { class: 'anki-dict-def-header' },
      el('span', { class: 'anki-dict-pos' }, def.partOfSpeech),
      def.level && ' ',
      def.level && el('span', { class: 'anki-dict-level' }, def.level),
      def.category && ' ',
      def.category && el('span', { class: 'anki-dict-category' }, def.category),
    ),
    el('p', { class: 'anki-dict-meaning' }, def.meaning),
    def.examples.length > 0 && el('ul', { class: 'anki-dict-examples' },
      ...def.examples.slice(0, 3).map(example => el('li', {}, example)),
    ),
  );
}

async function playAudio(url: string): Promise<void> {
  try {
    const played: PlayAudioResponse = await browser.runtime.sendMessage({
      action: "play-audio",
      url,
    });
    if (played.success) return;

    // Fetch audio through the service worker to bypass page CSP restrictions
    const response: FetchAudioResponse = await browser.runtime.sendMessage({
      action: "fetch-audio",
      url,
    });

    if (response.success && response.dataUrl) {
      const audio = new Audio(response.dataUrl);
      await audio.play();
    } else {
      console.error("Failed to fetch audio:", response.error);
    }
  } catch (err) {
    console.error("Error playing audio:", err instanceof Error ? err.message : err);
  }
}
