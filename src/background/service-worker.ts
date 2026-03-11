import browser from 'webextension-polyfill';
import { saveWord, getWord } from "../lib/storage";
import type {
  MessageRequest,
  WordEntry,
  LookupResponse,
  FetchHtmlResponse,
  FetchAudioResponse,
} from "../lib/types";

type MessageResponse = LookupResponse | FetchHtmlResponse | FetchAudioResponse;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error occurred";
}

function handleMessage(message: MessageRequest): Promise<MessageResponse> | undefined {
  switch (message.action) {
    case "lookup":
      return handleLookup(message.word)
        .then((data): LookupResponse => ({ success: true, data: data ?? undefined }))
        .catch((error): LookupResponse => {
          console.error("Lookup error:", error);
          return { success: false, error: getErrorMessage(error) };
        });

    case "save":
      return saveWord(message.data)
        .then((): LookupResponse => ({ success: true }))
        .catch((error): LookupResponse => {
          console.error("Save error:", error);
          return { success: false, error: getErrorMessage(error) };
        });

    case "fetch-html":
      return handleFetchHtml(message.url)
        .then((html): FetchHtmlResponse => ({ success: true, html }))
        .catch((error): FetchHtmlResponse => {
          console.error("Fetch error:", error);
          return { success: false, error: getErrorMessage(error) };
        });

    case "fetch-audio":
      return handleFetchAudio(message.url)
        .then((dataUrl): FetchAudioResponse => ({ success: true, dataUrl }))
        .catch((error): FetchAudioResponse => {
          console.error("Audio fetch error:", error);
          return { success: false, error: getErrorMessage(error) };
        });

    default:
      return undefined;
  }
}

browser.runtime.onMessage.addListener(
  (msg: unknown) => handleMessage(msg as MessageRequest),
);

async function handleLookup(word: string): Promise<WordEntry | null> {
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

async function handleFetchAudio(url: string): Promise<string> {
  const fullUrl = url.startsWith("http")
    ? url
    : `https://dictionary.cambridge.org${url}`;

  const response = await fetch(fullUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const contentType = response.headers.get("content-type") || "audio/mpeg";

  return `data:${contentType};base64,${base64}`;
}

console.log("Anki Dictionary Helper: Background service worker initialized");
