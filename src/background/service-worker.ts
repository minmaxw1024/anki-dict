import { scrapeCambridgeWord } from '../lib/dictionary-scraper';
import { saveWord, getWord } from '../lib/storage';
import type { MessageRequest, LookupResponse } from '../lib/types';

chrome.runtime.onMessage.addListener((
  message: MessageRequest,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: LookupResponse) => void
) => {
  if (message.action === 'lookup') {
    handleLookup(message.word)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => {
        console.error('Lookup error:', error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      });

    return true;
  }

  return false;
});

async function handleLookup(word: string): Promise<any> {
  const cleanWord = word.toLowerCase().trim();

  if (!cleanWord) {
    throw new Error('Invalid word provided');
  }

  const cachedWord = await getWord(cleanWord);

  if (cachedWord) {
    console.log(`Using cached entry for "${cleanWord}"`);
    return cachedWord;
  }

  console.log(`Fetching "${cleanWord}" from Cambridge Dictionary...`);

  const wordEntry = await scrapeCambridgeWord(cleanWord);

  await saveWord(wordEntry);

  return wordEntry;
}

console.log('Anki Dictionary Helper: Background service worker initialized');
