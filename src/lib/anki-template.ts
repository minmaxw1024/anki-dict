/**
 * Anki note type template for the Duolingo-style card.
 *
 * Fields must match the column order in csv-exporter.ts:
 *   Word | British Pronunciation | American Pronunciation | Definitions | Examples | Source
 */

export interface AnkiTemplateSection {
  label: string;
  description: string;
  content: string;
  language: 'text' | 'html' | 'css';
}

// ─── Front Template ──────────────────────────────────────────────────────────

const FRONT_TEMPLATE = `<div class="ad-card ad-front">
  <div class="ad-word">{{Word}}</div>
</div>`.trim();

// ─── Back Template ────────────────────────────────────────────────────────────

const BACK_TEMPLATE = `<div class="ad-card ad-back">
  <div class="ad-word">{{Word}}</div>

  {{#British Pronunciation}}{{#American Pronunciation}}
  <div class="ad-prons">
    {{#British Pronunciation}}
    <span class="ad-pron ad-pron--uk">
      <span class="ad-pron-flag">🇬🇧</span>
      {{#British Audio}}<span class="ad-audio-btn" onclick="new Audio('{{British Audio}}').play()">🔊</span>{{/British Audio}}
      <span class="ad-pron-ipa">{{British Pronunciation}}</span>
    </span>
    {{/British Pronunciation}}
    {{#American Pronunciation}}
    <span class="ad-pron ad-pron--us">
      <span class="ad-pron-flag">🇺🇸</span>
      {{#American Audio}}<span class="ad-audio-btn" onclick="new Audio('{{American Audio}}').play()">🔊</span>{{/American Audio}}
      <span class="ad-pron-ipa">{{American Pronunciation}}</span>
    </span>
    {{/American Pronunciation}}
  </div>
  {{/American Pronunciation}}{{/British Pronunciation}}

  {{#British Pronunciation}}{{^American Pronunciation}}
  <div class="ad-prons">
    <span class="ad-pron ad-pron--uk">
      <span class="ad-pron-flag">🇬🇧</span>
      {{#British Audio}}<span class="ad-audio-btn" onclick="new Audio('{{British Audio}}').play()">🔊</span>{{/British Audio}}
      <span class="ad-pron-ipa">{{British Pronunciation}}</span>
    </span>
  </div>
  {{/American Pronunciation}}{{/British Pronunciation}}

  {{^British Pronunciation}}{{#American Pronunciation}}
  <div class="ad-prons">
    <span class="ad-pron ad-pron--us">
      <span class="ad-pron-flag">🇺🇸</span>
      {{#American Audio}}<span class="ad-audio-btn" onclick="new Audio('{{American Audio}}').play()">🔊</span>{{/American Audio}}
      <span class="ad-pron-ipa">{{American Pronunciation}}</span>
    </span>
  </div>
  {{/American Pronunciation}}{{/British Pronunciation}}

  {{#Definitions}}
  <div class="ad-definitions">{{Definitions}}</div>
  {{/Definitions}}

  {{#Examples}}
  <div class="ad-examples-wrap">
    <div class="ad-examples-title">Examples</div>
    <div class="ad-examples">{{Examples}}</div>
  </div>
  {{/Examples}}

  {{#Source}}
  <div class="ad-source">
    <a href="{{Source}}" target="_blank">📖 View in Cambridge Dictionary</a>
  </div>
  {{/Source}}
</div>`.trim();

// ─── Card CSS ─────────────────────────────────────────────────────────────────

const CARD_CSS = `.card {
  font-family: "Nunito", "Segoe UI", Arial, sans-serif;
  font-size: 16px;
  background: #f7f7f7;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  padding: 24px 16px;
  box-sizing: border-box;
  color: #4b4b4b;
}

.ad-card {
  background: #ffffff;
  border-radius: 16px;
  border: 2px solid #e5e5e5;
  box-shadow: 0 4px 0 #e5e5e5;
  padding: 28px;
  width: 100%;
  max-width: 520px;
  box-sizing: border-box;
}

/* Word heading */
.ad-word {
  font-size: 30px;
  font-weight: 800;
  color: #58cc02;
  text-transform: capitalize;
  margin-bottom: 14px;
  line-height: 1.2;
}

/* Pronunciations */
.ad-prons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.ad-pron {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
  border: 2px solid #e5e5e5;
  background: #f7f7f7;
}

.ad-pron--uk {
  background: #e5f8cc;
  border-color: #c4ed8b;
  color: #3a8a00;
}

.ad-pron--us {
  background: #e0f5ff;
  border-color: #99dcfa;
  color: #0077c2;
}

.ad-pron-ipa {
  font-family: "Segoe UI", Arial, sans-serif;
  letter-spacing: 0.02em;
}

.ad-audio-btn {
  cursor: pointer;
  font-size: 16px;
  opacity: 0.7;
  transition: opacity 0.15s;
  user-select: none;
}

.ad-audio-btn:hover {
  opacity: 1;
}

/* Definitions */
.ad-definitions {
  font-size: 15px;
  line-height: 1.7;
  color: #4b4b4b;
  margin-bottom: 16px;
  border-top: 2px solid #e5e5e5;
  padding-top: 16px;
}

.ad-definitions b {
  color: #1cb0f6;
  font-weight: 800;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ad-definitions .level {
  display: inline-block;
  background: #ffc800;
  color: #5a3e00;
  font-size: 11px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 6px;
  margin-left: 4px;
  vertical-align: middle;
  letter-spacing: 0.04em;
}

/* Examples */
.ad-examples-wrap {
  background: #f7f7f7;
  border-radius: 12px;
  border: 2px solid #e5e5e5;
  padding: 14px 18px;
  margin-bottom: 14px;
}

.ad-examples-title {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #afafaf;
  margin-bottom: 8px;
}

.ad-examples ul {
  margin: 0;
  padding-left: 20px;
}

.ad-examples li {
  font-size: 14px;
  color: #777777;
  line-height: 1.6;
  margin-bottom: 4px;
  font-style: italic;
}

.ad-examples li::marker {
  color: #58cc02;
}

/* Source link */
.ad-source {
  margin-top: 12px;
  text-align: right;
}

.ad-source a {
  font-size: 12px;
  font-weight: 700;
  color: #1cb0f6;
  text-decoration: none;
}

.ad-source a:hover {
  text-decoration: underline;
}`.trim();

// ─── Field List ───────────────────────────────────────────────────────────────

const FIELD_LIST = `Word
British Pronunciation
American Pronunciation
British Audio
American Audio
Definitions
Examples
Source`.trim();

// ─── Public API ───────────────────────────────────────────────────────────────

export const ANKI_TEMPLATE_SECTIONS: AnkiTemplateSection[] = [
  {
    label: 'Step 1 — Fields',
    description:
      'In Anki: Tools → Manage Note Types → Add → select "Add: Basic" → rename to "Anki Dict" → click Fields → add each field in this exact order.',
    content: FIELD_LIST,
    language: 'text',
  },
  {
    label: 'Step 2 — Front Template',
    description:
      'In the Cards editor, paste this into the Front Template box.',
    content: FRONT_TEMPLATE,
    language: 'html',
  },
  {
    label: 'Step 3 — Back Template',
    description:
      'Paste this into the Back Template box.',
    content: BACK_TEMPLATE,
    language: 'html',
  },
  {
    label: 'Step 4 — Styling (CSS)',
    description:
      'Paste this into the Styling box (replaces the default content).',
    content: CARD_CSS,
    language: 'css',
  },
];
