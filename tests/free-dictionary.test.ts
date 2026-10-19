import { describe, expect, it } from "vitest";
import { parseFreeDictionaryJson } from "../src/lib/free-dictionary";

const RESPONSE = [
  {
    word: "hello",
    phonetic: "/həˈləʊ/",
    phonetics: [
      { text: "/həˈləʊ/", audio: "https://api.dictionaryapi.dev/media/pronunciations/en/hello-uk.mp3" },
      { text: "/həˈloʊ/", audio: "https://api.dictionaryapi.dev/media/pronunciations/en/hello-us.mp3" },
    ],
    meanings: [
      {
        partOfSpeech: "noun",
        definitions: [{ definition: "A greeting.", example: "She said hello.", synonyms: [], antonyms: [] }],
        synonyms: [],
        antonyms: [],
      },
      {
        partOfSpeech: "verb",
        definitions: [{ definition: "To greet with hello.", synonyms: [], antonyms: [] }],
        synonyms: [],
        antonyms: [],
      },
    ],
  },
];

describe("parseFreeDictionaryJson", () => {
  it("maps region-specific audio to UK and US", () => {
    const entry = parseFreeDictionaryJson(JSON.stringify(RESPONSE), "Hello");

    expect(entry.word).toBe("hello");
    expect(entry.pronunciations.uk?.ipa).toBe("/həˈləʊ/");
    expect(entry.pronunciations.uk?.audioUrl).toMatch(/hello-uk\.mp3$/);
    expect(entry.pronunciations.us?.ipa).toBe("/həˈloʊ/");
    expect(entry.pronunciations.us?.audioUrl).toMatch(/hello-us\.mp3$/);
  });

  it("flattens meanings into definitions", () => {
    const { definitions } = parseFreeDictionaryJson(JSON.stringify(RESPONSE), "hello");

    expect(definitions).toEqual([
      { partOfSpeech: "noun", meaning: "A greeting.", examples: ["She said hello."] },
      { partOfSpeech: "verb", meaning: "To greet with hello.", examples: [] },
    ]);
  });

  it("falls back to the first phonetic when no region is marked", () => {
    const json = JSON.stringify([
      { ...RESPONSE[0], phonetics: [{ text: "/x/", audio: "https://example.com/x.mp3" }] },
    ]);
    expect(parseFreeDictionaryJson(json, "hello").pronunciations).toEqual({
      us: { ipa: "/həˈləʊ/", audioUrl: "https://example.com/x.mp3" },
    });
  });

  it("throws on an empty response", () => {
    expect(() => parseFreeDictionaryJson("[]", "zzz")).toThrow(/No definitions/);
  });
});
