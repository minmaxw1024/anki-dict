import browser from 'webextension-polyfill';
import type { WordEntry, FetchAudioResponse } from '../lib/types';

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
  closeButton.innerHTML = '×';
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

  content.innerHTML = `
    <div class="anki-dict-loading">
      <div class="anki-dict-spinner"></div>
      <p>Looking up "${word}"...</p>
    </div>
  `;
}

export function updateModalError(modal: HTMLElement, error: string): void {
  const content = modal.querySelector('.anki-dict-content');
  if (!content) return;

  content.innerHTML = `
    <div class="anki-dict-error">
      <h3>Error</h3>
      <p>${escapeHtml(error)}</p>
    </div>
  `;
}

export function updateModalContent(modal: HTMLElement, wordEntry: WordEntry): void {
  const content = modal.querySelector('.anki-dict-content');
  if (!content) return;

  const pronunciationHTML = createPronunciationHTML(wordEntry);
  const definitionsHTML = createDefinitionsHTML(wordEntry);

  content.innerHTML = `
    <div class="anki-dict-word">
      <h2>${escapeHtml(wordEntry.word)}</h2>
      ${pronunciationHTML}
    </div>
    ${definitionsHTML}
    <div class="anki-dict-source">
      <a href="${escapeHtml(wordEntry.sourceUrl)}" target="_blank" rel="noopener">View on Cambridge Dictionary</a>
    </div>
  `;

  const audioButtons = content.querySelectorAll('.anki-dict-audio-btn');
  audioButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const audioUrl = (e.target as HTMLElement).dataset.audioUrl;
      if (audioUrl) {
        playAudio(audioUrl);
      }
    });
  });
}

function createPronunciationHTML(wordEntry: WordEntry): string {
  const parts: string[] = [];

  if (wordEntry.pronunciations.uk) {
    const { ipa, audioUrl } = wordEntry.pronunciations.uk;
    const audioBtn = audioUrl
      ? `<button class="anki-dict-audio-btn" data-audio-url="${escapeHtml(audioUrl)}">🔊</button>`
      : '';
    parts.push(`<div class="anki-dict-pronunciation">
      <span class="anki-dict-pron-label">UK</span>
      <span class="anki-dict-pron-ipa">${escapeHtml(ipa)}</span>
      ${audioBtn}
    </div>`);
  }

  if (wordEntry.pronunciations.us) {
    const { ipa, audioUrl } = wordEntry.pronunciations.us;
    const audioBtn = audioUrl
      ? `<button class="anki-dict-audio-btn" data-audio-url="${escapeHtml(audioUrl)}">🔊</button>`
      : '';
    parts.push(`<div class="anki-dict-pronunciation">
      <span class="anki-dict-pron-label">US</span>
      <span class="anki-dict-pron-ipa">${escapeHtml(ipa)}</span>
      ${audioBtn}
    </div>`);
  }

  return parts.length > 0
    ? `<div class="anki-dict-pronunciations">${parts.join('')}</div>`
    : '';
}

function createDefinitionsHTML(wordEntry: WordEntry): string {
  return wordEntry.definitions
    .map((def, index) => {
      const header = [
        `<span class="anki-dict-pos">${escapeHtml(def.partOfSpeech)}</span>`,
        def.level ? `<span class="anki-dict-level">${escapeHtml(def.level)}</span>` : '',
        def.category ? `<span class="anki-dict-category">${escapeHtml(def.category)}</span>` : ''
      ].filter(Boolean).join(' ');

      const examples = def.examples.length > 0
        ? `<ul class="anki-dict-examples">
            ${def.examples.slice(0, 3).map(ex => `<li>${escapeHtml(ex)}</li>`).join('')}
          </ul>`
        : '';

      return `
        <div class="anki-dict-definition">
          <div class="anki-dict-def-header">${header}</div>
          <p class="anki-dict-meaning">${escapeHtml(def.meaning)}</p>
          ${examples}
        </div>
      `;
    })
    .join('');
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function playAudio(url: string): Promise<void> {
  try {
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
