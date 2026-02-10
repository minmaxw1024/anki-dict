import { saveWord, getWord } from "../lib/storage";
import type {
  MessageRequest,
  LookupResponse,
  FetchHtmlResponse,
} from "../lib/types";

chrome.runtime.onMessage.addListener(
  (
    message: MessageRequest,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: LookupResponse | FetchHtmlResponse) => void,
  ) => {
    if (message.action === "lookup") {
      handleLookup(message.word)
        .then((data) => sendResponse({ success: true, data }))
        .catch((error) => {
          console.error("Lookup error:", error);
          sendResponse({
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown error occurred",
          });
        });

      return true;
    }

    if (message.action === "save") {
      saveWord(message.data)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error("Save error:", error);
          sendResponse({
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown error occurred",
          });
        });

      return true;
    }

    if (message.action === "fetch-html") {
      handleFetchHtml(message.url)
        .then((html) => sendResponse({ success: true, html }))
        .catch((error) => {
          console.error("Fetch error:", error);
          sendResponse({
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown error occurred",
          });
        });

      return true;
    }

    return false;
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
