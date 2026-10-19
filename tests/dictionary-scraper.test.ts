import { describe, expect, it } from "vitest";
import { getCambridgeUrl, parseCambridgeHtml } from "../src/lib/dictionary-scraper";
import { CAMBRIDGE_HTML } from "./fixtures";

describe("parseCambridgeHtml", () => {
  it("extracts pronunciations with audio", () => {
    const entry = parseCambridgeHtml(CAMBRIDGE_HTML, "Test");

    expect(entry.word).toBe("test");
    expect(entry.pronunciations.uk).toEqual({ ipa: "test", audioUrl: "/media/english/uk_pron/test.mp3" });
    expect(entry.pronunciations.us).toEqual({ ipa: "tɛst", audioUrl: "/media/english/us_pron/test.mp3" });
    expect(entry.sourceUrl).toBe(getCambridgeUrl("test"));
  });

  it("extracts every definition block with level and examples", () => {
    const { definitions } = parseCambridgeHtml(CAMBRIDGE_HTML, "test");

    expect(definitions).toEqual([
      {
        partOfSpeech: "noun",
        level: "B1",
        category: undefined,
        meaning: "a way of discovering what someone knows",
        examples: ["a driving test", "I passed the test."],
      },
      {
        partOfSpeech: "noun",
        level: "C1",
        category: undefined,
        meaning: "a short medical examination",
        examples: [],
      },
    ]);
  });

  it("throws when the page has no entry (e.g. a search results page)", () => {
    expect(() => parseCambridgeHtml("<html><body><p>Nothing</p></body></html>", "zzz")).toThrow(
      /Could not parse/,
    );
  });

  it("throws when the entry has no definitions", () => {
    const html = `<div class="entry-body__el"><span class="pos">noun</span></div>`;
    expect(() => parseCambridgeHtml(html, "zzz")).toThrow(/No definitions/);
  });
});
