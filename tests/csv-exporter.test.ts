import { describe, expect, it } from "vitest";
import { generateAnkiCSV, getFullAudioUrl } from "../src/lib/csv-exporter";
import { makeWord } from "./fixtures";

describe("generateAnkiCSV", () => {
  it("writes Anki import headers and one tab-separated row per word", () => {
    const csv = generateAnkiCSV([makeWord(), makeWord({ word: "other" })]);
    const lines = csv.replace(/^﻿/, "").split("\n");

    expect(lines.slice(0, 3)).toEqual(["# separator:tab", "# html:true", "# tags:cambridge-dictionary anki-dict-extension"]);
    expect(lines[3].split("\t")).toHaveLength(8);
    expect(lines).toHaveLength(6);
  });

  it("expands relative audio URLs and escapes HTML in definitions", () => {
    const row = generateAnkiCSV([makeWord()]).split("\n")[4].split("\t");

    expect(row[3]).toBe("https://dictionary.cambridge.org/media/english/uk_pron/test.mp3");
    expect(row[4]).toBe("https://example.com/test-us.mp3");
    expect(row[5]).toContain("&lt;what&gt;");
  });

  it("escapes double quotes in examples", () => {
    const row = generateAnkiCSV([makeWord()]).split("\n")[4].split("\t");

    expect(row[6]).toContain("&quot;blood&quot;");
  });
});

describe("getFullAudioUrl", () => {
  it("returns an empty string when there is no audio", () => {
    expect(getFullAudioUrl(undefined)).toBe("");
  });
});
