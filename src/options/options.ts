import { getSettings, saveSettings } from '../lib/storage';
import { THEMES, THEME_IDS, applyThemeToDocument, type ThemeColors } from '../lib/themes';
import { ANKI_TEMPLATE_SECTIONS } from '../lib/anki-template';
import { testConnection, getDeckNames, getModelNames } from '../lib/anki-connect';
import { el } from '../lib/dom';
import type { ThemeId } from '../lib/types';

let currentTheme: ThemeId = 'duolingo';

async function init(): Promise<void> {
  const settings = await getSettings();
  currentTheme = settings.theme;

  applyThemeToDocument(currentTheme);
  renderThemeCards();
  renderTemplateSteps();
  initAnkiConnect(settings);
}

function renderThemeCards(): void {
  const container = document.getElementById('theme-list');
  if (!container) return;

  const swatches: [keyof ThemeColors, string][] = [
    ['primary', 'Primary'],
    ['primaryLight', 'Light'],
    ['accentBlue', 'Accent'],
    ['accentYellow', 'Accent 2'],
    ['bgAlt', 'Background'],
  ];

  container.replaceChildren(...THEME_IDS.map((id) => {
    const theme = THEMES[id];
    const card = el('div', { class: `theme-card${id === currentTheme ? ' active' : ''}`, 'data-theme': id },
      el('div', { class: 'theme-radio' }),
      el('div', { class: 'theme-info' },
        el('div', { class: 'theme-name' }, theme.name),
        el('div', { class: 'theme-desc' }, theme.description),
      ),
      el('div', { class: 'theme-preview' },
        ...swatches.map(([key, title]) =>
          el('div', { class: 'theme-swatch', style: `background: ${theme.colors[key]};`, title }),
        ),
      ),
    );
    card.addEventListener('click', () => selectTheme(id));
    return card;
  }));
}

async function selectTheme(themeId: ThemeId): Promise<void> {
  if (themeId === currentTheme) return;

  currentTheme = themeId;

  // Apply theme to the options page itself
  applyThemeToDocument(themeId);

  // Update UI
  renderThemeCards();

  // Save to storage
  await saveSettings({ theme: themeId });

  // Show toast
  showSaveToast();
}

function showSaveToast(): void {
  const toast = document.getElementById('save-toast');
  if (!toast) return;

  toast.classList.add('visible');

  setTimeout(() => {
    toast.classList.remove('visible');
  }, 2000);
}

function renderTemplateSteps(): void {
  const container = document.getElementById('template-steps');
  if (!container) return;

  const copyLabel = (icon: string, text: string) => [el('span', { class: 'template-copy-icon' }, icon), ` ${text}`];

  container.replaceChildren(...ANKI_TEMPLATE_SECTIONS.map((section, index) => {
    const langLabel = section.language === 'text' ? 'FIELDS' : section.language.toUpperCase();

    const btn = el('button', { id: `template-btn-${index}`, class: 'template-copy-btn' }, ...copyLabel('⎘', 'Copy'));
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(section.content).then(() => {
        btn.classList.add('copied');
        btn.replaceChildren(...copyLabel('✓', 'Copied!'));
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.replaceChildren(...copyLabel('⎘', 'Copy'));
        }, 2000);
      });
    });

    return el('div', { class: 'template-step' },
      el('div', { class: 'template-step-header' },
        el('span', { class: 'template-step-label' }, section.label),
        el('span', { class: 'template-lang-tag' }, langLabel),
      ),
      el('p', { class: 'template-step-desc' }, section.description),
      el('div', { class: 'template-code-wrap' },
        el('pre', { id: `template-code-${index}`, class: 'template-code' }, section.content),
        btn,
      ),
    );
  }));
}

function initAnkiConnect(settings: { ankiConnectUrl?: string; ankiDeckName?: string; ankiModelName?: string }): void {
  const urlInput = document.getElementById('anki-connect-url') as HTMLInputElement | null;
  const deckInput = document.getElementById('anki-deck-name') as HTMLInputElement | null;
  const modelInput = document.getElementById('anki-model-name') as HTMLInputElement | null;
  const testBtn = document.getElementById('anki-connect-test') as HTMLButtonElement | null;

  if (!urlInput || !deckInput || !modelInput || !testBtn) return;

  if (settings.ankiConnectUrl) urlInput.value = settings.ankiConnectUrl;
  if (settings.ankiDeckName) deckInput.value = settings.ankiDeckName;
  if (settings.ankiModelName) modelInput.value = settings.ankiModelName;

  // Save on change
  urlInput.addEventListener('change', async () => {
    const url = urlInput.value.trim() || 'http://127.0.0.1:8765';
    urlInput.value = url;
    await saveSettings({ ankiConnectUrl: url });
    showSaveToast();
  });

  deckInput.addEventListener('change', async () => {
    const name = deckInput.value.trim() || 'Anki Dict';
    deckInput.value = name;
    await saveSettings({ ankiDeckName: name });
    showSaveToast();
  });

  modelInput.addEventListener('change', async () => {
    const name = modelInput.value.trim() || 'Anki Dict';
    modelInput.value = name;
    await saveSettings({ ankiModelName: name });
    showSaveToast();
  });

  testBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';

    setAnkiStatus('testing', 'Testing connection...');

    const result = await testConnection(url);

    if (result.success) {
      setAnkiStatus('success', `Connected — AnkiConnect v${result.version}`);
      populateAnkiLists();
    } else {
      setAnkiStatus('error', result.error || 'Connection failed');
    }

    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
  });
}

async function populateAnkiLists(): Promise<void> {
  try {
    const [decks, models] = await Promise.all([getDeckNames(), getModelNames()]);

    const deckList = document.getElementById('anki-deck-list');
    const modelList = document.getElementById('anki-model-list');

    if (deckList) {
      deckList.replaceChildren(...decks.map(d => el('option', { value: d })));
    }
    if (modelList) {
      modelList.replaceChildren(...models.map(m => el('option', { value: m })));
    }
  } catch {
    // silently fail - datalist is just a convenience
  }
}

function setAnkiStatus(state: 'success' | 'error' | 'testing', message: string): void {
  const statusEl = document.getElementById('anki-connect-status');
  if (!statusEl) return;

  statusEl.className = `anki-connect-status ${state}`;

  const iconMap = { success: '\u2714', error: '\u2718', testing: '\u23F3' };
  const iconEl = statusEl.querySelector('.status-icon');
  const textEl = statusEl.querySelector('.status-text');

  if (iconEl) iconEl.textContent = iconMap[state];
  if (textEl) textEl.textContent = message;
}

init();
