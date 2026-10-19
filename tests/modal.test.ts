import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeWord } from "./fixtures";

const sendMessage = vi.hoisted(() => vi.fn(async () => ({ success: true })));
vi.mock("webextension-polyfill", () => ({ default: { runtime: { sendMessage } } }));

const { createModal, showModal, updateModalContent, updateModalError, updateModalLoading } = await import(
  "../src/content/modal"
);

const XSS = '<img src=x onerror="window.__pwned = true">';

let modal: HTMLElement;
beforeEach(() => {
  document.body.replaceChildren();
  sendMessage.mockClear();
  modal = createModal();
  document.body.appendChild(modal);
  showModal(modal, 100, 100);
});

describe("lookup modal", () => {
  it("renders the word, pronunciations, definitions and examples", () => {
    updateModalContent(modal, makeWord());

    expect(modal.querySelector(".anki-dict-word h2")?.textContent).toBe("test");
    expect([...modal.querySelectorAll(".anki-dict-pron-label")].map((e) => e.textContent)).toEqual(["UK", "US"]);
    expect(modal.querySelector(".anki-dict-level")?.textContent).toBe("B1");
    expect(modal.querySelectorAll(".anki-dict-examples li")).toHaveLength(2);
    expect(modal.querySelector<HTMLAnchorElement>(".anki-dict-source a")?.href).toBe(
      "https://dictionary.cambridge.org/dictionary/english/test",
    );
  });

  it("inserts dictionary text as text, never as markup", () => {
    updateModalContent(
      modal,
      makeWord({
        word: XSS,
        pronunciations: { uk: { ipa: XSS } },
        definitions: [{ partOfSpeech: XSS, level: XSS, category: XSS, meaning: XSS, examples: [XSS] }],
      }),
    );
    updateModalError(modal, XSS);
    updateModalLoading(modal, XSS);

    expect(modal.querySelector("img")).toBeNull();
    expect(modal.textContent).toContain(XSS);
  });

  it("drops a source link that isn't http(s)", () => {
    updateModalContent(modal, makeWord({ sourceUrl: "javascript:alert(1)" }));

    expect(modal.querySelector(".anki-dict-source")).toBeNull();
  });

  it("plays the pronunciation when its button is clicked", () => {
    updateModalContent(modal, makeWord());
    modal.querySelector<HTMLButtonElement>(".anki-dict-audio-btn")!.click();

    expect(sendMessage).toHaveBeenCalledWith({ action: "play-audio", url: "/media/english/uk_pron/test.mp3" });
  });
});
