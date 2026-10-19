import type { WordEntry } from "../src/lib/types";

export function makeWord(overrides: Partial<WordEntry> = {}): WordEntry {
  return {
    word: "test",
    timestamp: 1_700_000_000_000,
    lastAccessed: 1_700_000_000_000,
    pronunciations: {
      uk: { ipa: "/test/", audioUrl: "/media/english/uk_pron/test.mp3" },
      us: { ipa: "/tɛst/", audioUrl: "https://example.com/test-us.mp3" },
    },
    definitions: [
      {
        partOfSpeech: "noun",
        level: "B1",
        meaning: "a way of discovering <what> someone knows",
        examples: ["a driving test", 'a "blood" test'],
      },
    ],
    sourceUrl: "https://dictionary.cambridge.org/dictionary/english/test",
    ...overrides,
  };
}

// Trimmed-down copy of the markup Cambridge Dictionary serves for an entry.
export const CAMBRIDGE_HTML = `<!doctype html><html><body>
<div class="entry-body">
  <div class="entry-body__el">
    <div class="posgram"><span class="pos">noun</span></div>
    <span class="uk dpron-i">
      <span class="daud"><audio><source type="audio/mpeg" src="/media/english/uk_pron/test.mp3"></audio></span>
      <span class="pron">/<span class="ipa">test</span>/</span>
    </span>
    <span class="us dpron-i">
      <span class="daud"><audio><source type="audio/mpeg" src="/media/english/us_pron/test.mp3"></audio></span>
      <span class="pron">/<span class="ipa">tɛst</span>/</span>
    </span>
    <div class="def-block">
      <div class="def-head"><span class="epp-xref">B1</span><div class="def">a way of discovering what someone knows</div></div>
      <div class="def-body"><span class="examp"><span class="eg">a driving test</span></span><span class="examp"><span class="eg">I passed the test.</span></span></div>
    </div>
    <div class="def-block">
      <div class="def-head"><span class="epp-xref">C1</span><div class="def">a short medical examination</div></div>
      <div class="def-body"></div>
    </div>
  </div>
</div>
</body></html>`;
