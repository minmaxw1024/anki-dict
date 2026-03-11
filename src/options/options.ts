import { getSettings, saveSettings } from '../lib/storage';
import { THEMES, THEME_IDS, applyThemeToDocument } from '../lib/themes';
import { ANKI_TEMPLATE_SECTIONS } from '../lib/anki-template';
import { escapeHtml } from '../lib/utils';
import type { ThemeId } from '../lib/types';

let currentTheme: ThemeId = 'duolingo';

async function init(): Promise<void> {
  const settings = await getSettings();
  currentTheme = settings.theme;

  applyThemeToDocument(currentTheme);
  renderThemeCards();
  renderTemplateSteps();
}

function renderThemeCards(): void {
  const container = document.getElementById('theme-list');
  if (!container) return;

  container.innerHTML = THEME_IDS.map((id) => {
    const theme = THEMES[id];
    const isActive = id === currentTheme;
    const c = theme.colors;

    return `
      <div class="theme-card ${isActive ? 'active' : ''}" data-theme="${id}">
        <div class="theme-radio"></div>
        <div class="theme-info">
          <div class="theme-name">${escapeHtml(theme.name)}</div>
          <div class="theme-desc">${escapeHtml(theme.description)}</div>
        </div>
        <div class="theme-preview">
          <div class="theme-swatch" style="background: ${c.primary};" title="Primary"></div>
          <div class="theme-swatch" style="background: ${c.primaryLight};" title="Light"></div>
          <div class="theme-swatch" style="background: ${c.accentBlue};" title="Accent"></div>
          <div class="theme-swatch" style="background: ${c.accentYellow};" title="Accent 2"></div>
          <div class="theme-swatch" style="background: ${c.bgAlt};" title="Background"></div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.theme-card').forEach((card) => {
    card.addEventListener('click', () => {
      const themeId = (card as HTMLElement).dataset.theme as ThemeId;
      selectTheme(themeId);
    });
  });
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

  container.innerHTML = ANKI_TEMPLATE_SECTIONS.map((section, index) => {
    const codeId = `template-code-${index}`;
    const btnId = `template-btn-${index}`;
    const langLabel = section.language === 'text' ? 'FIELDS' : section.language.toUpperCase();
    return `
      <div class="template-step">
        <div class="template-step-header">
          <span class="template-step-label">${escapeHtml(section.label)}</span>
          <span class="template-lang-tag">${langLabel}</span>
        </div>
        <p class="template-step-desc">${escapeHtml(section.description)}</p>
        <div class="template-code-wrap">
          <pre id="${codeId}" class="template-code">${escapeHtml(section.content)}</pre>
          <button id="${btnId}" class="template-copy-btn" data-index="${index}">
            <span class="template-copy-icon">&#x2398;</span>
            Copy
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll<HTMLButtonElement>('.template-copy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset.index);
      const section = ANKI_TEMPLATE_SECTIONS[index];
      navigator.clipboard.writeText(section.content).then(() => {
        btn.classList.add('copied');
        btn.innerHTML = '<span class="template-copy-icon">&#10003;</span> Copied!';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = '<span class="template-copy-icon">&#x2398;</span> Copy';
        }, 2000);
      });
    });
  });
}

init();
