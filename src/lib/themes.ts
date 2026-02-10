import type { ThemeId } from './types';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryHover: string;
  primaryBg: string;
  primaryBorder: string;
  accentBlue: string;
  accentYellow: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderDark: string;
  bg: string;
  bgAlt: string;
  hoverBg: string;
  error: string;
  errorBg: string;
  errorBorder: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  colors: ThemeColors;
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  duolingo: {
    id: 'duolingo',
    name: 'Duolingo Origin',
    description: 'Classic Duolingo style, fresh and vibrant green',
    colors: {
      primary: '#58cc02',
      primaryDark: '#43c000',
      primaryLight: '#89e219',
      primaryHover: '#61d800',
      primaryBg: '#e5f8cc',
      primaryBorder: '#c4ed8b',
      accentBlue: '#1cb0f6',
      accentYellow: '#ffc800',
      textPrimary: '#4b4b4b',
      textSecondary: '#777777',
      textMuted: '#afafaf',
      border: '#e5e5e5',
      borderDark: '#cccccc',
      bg: '#ffffff',
      bgAlt: '#f7f7f7',
      hoverBg: '#f0fce4',
      error: '#ff4b4b',
      errorBg: '#fff0f0',
      errorBorder: '#ffcccc',
    },
  },
  british: {
    id: 'british',
    name: 'British Classic',
    description: 'Elegant British style, deep navy and warm cream',
    colors: {
      primary: '#1B4F7A',
      primaryDark: '#153D64',
      primaryLight: '#2E7DBF',
      primaryHover: '#22608F',
      primaryBg: '#E8F0F8',
      primaryBorder: '#B8D4E8',
      accentBlue: '#8B1A2B',
      accentYellow: '#C5A358',
      textPrimary: '#2C2C2C',
      textSecondary: '#555555',
      textMuted: '#888888',
      border: '#D8D8D8',
      borderDark: '#C0C0C0',
      bg: '#FDFCFA',
      bgAlt: '#F5F1E8',
      hoverBg: '#EDF3FA',
      error: '#C23B3B',
      errorBg: '#FBF0F0',
      errorBorder: '#E8CCCC',
    },
  },
};

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

const COLOR_TO_VAR: Record<keyof ThemeColors, string> = {
  primary: '--ad-primary',
  primaryDark: '--ad-primary-dark',
  primaryLight: '--ad-primary-light',
  primaryHover: '--ad-primary-hover',
  primaryBg: '--ad-primary-bg',
  primaryBorder: '--ad-primary-border',
  accentBlue: '--ad-accent-blue',
  accentYellow: '--ad-accent-yellow',
  textPrimary: '--ad-text-primary',
  textSecondary: '--ad-text-secondary',
  textMuted: '--ad-text-muted',
  border: '--ad-border',
  borderDark: '--ad-border-dark',
  bg: '--ad-bg',
  bgAlt: '--ad-bg-alt',
  hoverBg: '--ad-hover-bg',
  error: '--ad-error',
  errorBg: '--ad-error-bg',
  errorBorder: '--ad-error-border',
};

export function applyThemeToElement(element: HTMLElement, themeId: ThemeId): void {
  const theme = THEMES[themeId];
  if (!theme) return;

  for (const [key, varName] of Object.entries(COLOR_TO_VAR)) {
    const value = theme.colors[key as keyof ThemeColors];
    element.style.setProperty(varName, value);
  }
}

export function applyThemeToDocument(themeId: ThemeId): void {
  applyThemeToElement(document.documentElement, themeId);
}
