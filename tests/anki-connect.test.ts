import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeWord } from "./fixtures";
import { ANKI_TEMPLATE_SECTIONS, AUDIO_TEMPLATE_MARKER, LEGACY_BACK_TEMPLATE } from "../src/lib/anki-template";
import { addNotes, ensureDeckAndModel, mediaFilename } from "../src/lib/anki-connect";

const browserMock = await vi.hoisted(async () => (await import("./browser-mock")).createBrowserMock());
vi.mock("webextension-polyfill", () => ({ default: browserMock.browser }));

const ANKI_URL = "http://127.0.0.1:8765";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Params = Record<string, any>;

let handlers: Record<string, (params: Params) => unknown>;
let calls: { action: string; params: Params }[];

beforeEach(() => {
  browserMock.seed({});
  calls = [];
  handlers = {};

  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url === ANKI_URL) {
      const { action, params } = JSON.parse(init!.body as string);
      calls.push({ action, params });
      const handler = handlers[action];
      if (!handler) throw new Error(`unexpected AnkiConnect action ${action}`);
      return new Response(JSON.stringify({ result: handler(params), error: null }));
    }
    if (url.includes("broken")) return new Response("", { status: 404 });
    return new Response(new Uint8Array([1, 2, 3]));
  }));
});

const actions = () => calls.map((c) => c.action);
const sentNotes = () => calls.find((c) => c.action === "addNotes")!.params.notes;

describe("ensureDeckAndModel", () => {
  beforeEach(() => {
    handlers.createDeck = () => 1;
    handlers.createModel = () => ({});
    handlers.updateModelTemplates = () => null;
    handlers.updateModelStyling = () => null;
  });

  it("creates the note type with the media-aware template", async () => {
    handlers.modelNames = () => ["Basic"];

    expect(await ensureDeckAndModel()).toEqual({ mediaAudio: true });
    const create = calls.find((c) => c.action === "createModel")!;
    expect(create.params.cardTemplates[0].Back).toContain(AUDIO_TEMPLATE_MARKER);
  });

  it("upgrades a note type created by an older version", async () => {
    handlers.modelNames = () => ["Anki Dict"];
    handlers.modelTemplates = () => ({ "Anki Dict Card": { Front: "f", Back: `  ${LEGACY_BACK_TEMPLATE}\r\n` } });

    expect(await ensureDeckAndModel()).toEqual({ mediaAudio: true });
    const update = calls.find((c) => c.action === "updateModelTemplates")!;
    expect(update.params.model.templates["Anki Dict Card"]).toEqual({
      Front: "f",
      Back: ANKI_TEMPLATE_SECTIONS[2].content,
    });
  });

  it("leaves a customised note type alone and keeps URL audio", async () => {
    handlers.modelNames = () => ["Anki Dict"];
    handlers.modelTemplates = () => ({ "Anki Dict Card": { Front: "f", Back: "my own template" } });

    expect(await ensureDeckAndModel()).toEqual({ mediaAudio: false });
    expect(actions()).not.toContain("updateModelTemplates");
  });
});

describe("addNotes", () => {
  beforeEach(() => {
    handlers.addNotes = ({ notes }) => notes.map((_: unknown, i: number) => 100 + i);
  });

  it("skips duplicates before downloading audio", async () => {
    handlers.canAddNotes = () => [false, true];
    const words = [makeWord({ word: "dup" }), makeWord({ word: "fresh" })];

    const result = await addNotes(words, { mediaAudio: true });

    expect(result).toEqual({ total: 2, added: 1, duplicates: 1, failed: 0 });
    expect(sentNotes().map((n: Params) => n.fields.Word)).toEqual(["fresh"]);
    const audioFetches = vi.mocked(fetch).mock.calls.filter(([url]) => url !== ANKI_URL);
    expect(audioFetches).toHaveLength(2);
  });

  it("attaches downloaded audio as media and clears the URL fields", async () => {
    handlers.canAddNotes = () => [true];

    await addNotes([makeWord()], { mediaAudio: true });

    const [note] = sentNotes();
    expect(note.fields["British Audio"]).toBe("");
    expect(note.fields["American Audio"]).toBe("");
    expect(note.audio).toEqual([
      { data: "AQID", filename: "anki-dict-test-uk.mp3", fields: ["British Audio"] },
      { data: "AQID", filename: "anki-dict-test-us.mp3", fields: ["American Audio"] },
    ]);
  });

  it("keeps the URL when an audio download fails", async () => {
    handlers.canAddNotes = () => [true];
    const word = makeWord({
      pronunciations: { uk: { ipa: "/x/", audioUrl: "https://example.com/broken.mp3" } },
    });

    await addNotes([word], { mediaAudio: true });

    const [note] = sentNotes();
    expect(note.fields["British Audio"]).toBe("https://example.com/broken.mp3");
    expect(note.audio).toEqual([]);
  });

  it("sends URLs without downloading when the template can't play media", async () => {
    handlers.canAddNotes = () => [true];

    await addNotes([makeWord()], { mediaAudio: false });

    const [note] = sentNotes();
    expect(note.audio).toBeUndefined();
    expect(note.fields["British Audio"]).toBe("https://dictionary.cambridge.org/media/english/uk_pron/test.mp3");
  });

  it("counts notes Anki rejects as failed", async () => {
    handlers.canAddNotes = () => [true, true];
    handlers.addNotes = () => [1, null];

    const result = await addNotes([makeWord({ word: "a" }), makeWord({ word: "b" })], { mediaAudio: false });
    expect(result).toEqual({ total: 2, added: 1, duplicates: 0, failed: 1 });
  });
});

describe("mediaFilename", () => {
  it("makes word names safe for the media folder", () => {
    expect(mediaFilename("rock 'n' roll", "uk")).toBe("anki-dict-rock__n__roll-uk.mp3");
  });
});
