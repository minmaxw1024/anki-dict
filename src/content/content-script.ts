import {
  createModal,
  showModal,
  hideModal,
  updateModalContent,
  updateModalError,
  updateModalLoading,
} from "./modal";
import { parseCambridgeHtml, getCambridgeUrl } from "../lib/dictionary-scraper";
import type {
  LookupResponse,
  FetchHtmlResponse,
  WordEntry,
} from "../lib/types";

let currentModal: HTMLElement | null = null;
let isLookingUp = false;

function getSelectedWord(event: MouseEvent): string | null {
  const selection = window.getSelection();

  if (selection && selection.toString().trim()) {
    return selection.toString().trim();
  }

  const target = event.target as HTMLElement;
  const textContent = target.textContent?.trim();

  if (
    textContent &&
    /^[a-zA-Z\s-]+$/.test(textContent) &&
    textContent.split(/\s+/).length <= 3
  ) {
    return textContent;
  }

  return null;
}

function extractSingleWord(text: string): string {
  const words = text.trim().split(/\s+/);

  if (words.length === 1) {
    return words[0].replace(/[^a-zA-Z-]/g, "");
  }

  return words[0].replace(/[^a-zA-Z-]/g, "") || text.trim();
}

async function handleWordLookup(
  word: string,
  x: number,
  y: number,
): Promise<void> {
  if (isLookingUp) {
    return;
  }

  isLookingUp = true;

  if (!currentModal) {
    currentModal = createModal();
    document.body.appendChild(currentModal);
  }

  updateModalLoading(currentModal, word);
  showModal(currentModal, x, y);

  try {
    // Check cache first via service worker
    const cacheResponse: LookupResponse = await chrome.runtime.sendMessage({
      action: "lookup",
      word,
    });

    if (cacheResponse.success && cacheResponse.data) {
      updateModalContent(currentModal, cacheResponse.data);
      return;
    }

    // Fetch HTML via service worker (has host_permissions)
    const fetchResponse: FetchHtmlResponse = await chrome.runtime.sendMessage({
      action: "fetch-html",
      url: getCambridgeUrl(word),
    });

    if (!fetchResponse.success || !fetchResponse.html) {
      updateModalError(
        currentModal,
        fetchResponse.error || "Failed to fetch dictionary page",
      );
      return;
    }

    // Parse HTML in content script (has DOMParser)
    const wordEntry = parseCambridgeHtml(fetchResponse.html, word);

    // Save to cache via service worker
    await chrome.runtime.sendMessage({
      action: "save",
      data: wordEntry,
    });

    updateModalContent(currentModal, wordEntry);
  } catch (error) {
    console.error("Error looking up word:", error);
    updateModalError(
      currentModal,
      error instanceof Error ? error.message : "Unknown error",
    );
  } finally {
    isLookingUp = false;
  }
}

function handleClick(event: MouseEvent): void {
  if (!event.altKey) {
    if (currentModal && !currentModal.contains(event.target as Node)) {
      hideModal(currentModal);
    }
    return;
  }

  const selectedText = getSelectedWord(event);

  if (!selectedText) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const word = extractSingleWord(selectedText);

  if (word.length < 2) {
    return;
  }

  handleWordLookup(word, event.clientX, event.clientY);
}

document.addEventListener("click", handleClick, true);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && currentModal) {
    hideModal(currentModal);
  }
});

console.log("Anki Dictionary Helper: Content script loaded");
