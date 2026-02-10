import browser from 'webextension-polyfill';
import { saveWord, getWord } from "../lib/storage";
import type {
  MessageRequest,
  LookupResponse,
  FetchHtmlResponse,
} from "../lib/types";

browser.runtime.onMessage.addListener(
  (msg: unknown): Promise<LookupResponse | FetchHtmlResponse> | undefined => {
    const message = msg as MessageRequest;

    if (message.action === "lookup") {
      return handleLookup(message.word)
        .then((data) => ({ success: true, data } as LookupResponse))
        .catch((error) => {
          console.error("Lookup error:", error);
          return {
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown error occurred",
          } as LookupResponse;
        });
    }

    if (message.action === "save") {
      return saveWord(message.data)
        .then(() => ({ success: true } as LookupResponse))
        .catch((error) => {
          console.error("Save error:", error);
          return {
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown error occurred",
          } as LookupResponse;
        });
    }

    if (message.action === "fetch-html") {
      return handleFetchHtml(message.url)
        .then((html) => ({ success: true, html } as FetchHtmlResponse))
        .catch((error) => {
          console.error("Fetch error:", error);
          return {
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown error occurred",
          } as FetchHtmlResponse;
        });
    }

    return undefined;
  },
);

async function handleLookup(word: string): Promise<any> {
  const cleanWord = word.toLowerCase().trim();

  if (!cleanWord) {
    throw new Error("Invalid word provided");
  }

  const cachedWord = await getWord(cleanWord);

  if (cachedWord) {
    console.log(`Using cached entry for "${cleanWord}"`);
    return cachedWord;
  }

  return null;
}

async function handleFetchHtml(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Word not found in Cambridge Dictionary");
    }
    throw new Error(
      `Failed to fetch dictionary page: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

console.log("Anki Dictionary Helper: Background service worker initialized");
