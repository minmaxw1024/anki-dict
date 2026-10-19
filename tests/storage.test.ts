import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeWord } from "./fixtures";

const browserMock = await vi.hoisted(async () => (await import("./browser-mock")).createBrowserMock());
vi.mock("webextension-polyfill", () => ({ default: browserMock.browser }));

// Re-import per test so the one-time migration runs against fresh data.
async function loadStorage() {
  vi.resetModules();
  return import("../src/lib/storage");
}

beforeEach(() => browserMock.seed({}));

describe("word storage", () => {
  it("stores each word under its own key", async () => {
    const storage = await loadStorage();
    await storage.saveWord(makeWord({ word: "alpha" }));
    await storage.saveWord(makeWord({ word: "beta" }));

    expect(Object.keys(browserMock.store).sort()).toEqual(["word:alpha", "word:beta"]);
  });

  it("keeps both words when two saves run at once", async () => {
    const storage = await loadStorage();
    await Promise.all([
      storage.saveWord(makeWord({ word: "alpha" })),
      storage.saveWord(makeWord({ word: "beta" })),
    ]);

    expect((await storage.getAllWords()).map((w) => w.word).sort()).toEqual(["alpha", "beta"]);
  });

  it("looks words up case-insensitively", async () => {
    const storage = await loadStorage();
    await storage.saveWord(makeWord({ word: "alpha" }));

    expect((await storage.getWord(" Alpha "))?.word).toBe("alpha");
    expect(await storage.getWord("missing")).toBeNull();
  });

  it("sorts words newest first", async () => {
    const storage = await loadStorage();
    await storage.saveWord(makeWord({ word: "old", timestamp: 1 }));
    await storage.saveWord(makeWord({ word: "new", timestamp: 2 }));

    expect((await storage.getAllWords()).map((w) => w.word)).toEqual(["new", "old"]);
  });

  it("deletes one word or all of them, leaving settings alone", async () => {
    const storage = await loadStorage();
    await storage.saveSettings({ theme: "british" });
    await storage.saveWord(makeWord({ word: "alpha" }));
    await storage.saveWord(makeWord({ word: "beta" }));

    await storage.deleteWord("Alpha");
    expect((await storage.getAllWords()).map((w) => w.word)).toEqual(["beta"]);

    await storage.clearAllWords();
    expect(await storage.getAllWords()).toEqual([]);
    expect((await storage.getSettings()).theme).toBe("british");
  });

  it("migrates the legacy single `words` object", async () => {
    browserMock.seed({
      words: { alpha: makeWord({ word: "alpha" }), beta: makeWord({ word: "beta" }) },
      settings: { theme: "british" },
    });
    const storage = await loadStorage();

    expect((await storage.getAllWords()).map((w) => w.word).sort()).toEqual(["alpha", "beta"]);
    expect(browserMock.store).not.toHaveProperty("words");
    expect(browserMock.store).toHaveProperty("word:alpha");
  });
});

describe("settings", () => {
  it("fills in keys missing from settings saved by older versions", async () => {
    browserMock.seed({ settings: { theme: "british", autoSave: true, maxCacheAge: 30 } });
    const storage = await loadStorage();

    expect(await storage.getSettings()).toEqual({ ...storage.DEFAULT_SETTINGS, theme: "british" });
  });
});
