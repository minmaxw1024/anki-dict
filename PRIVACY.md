# Privacy Policy — Anki Dictionary Helper

**Last updated: October 19, 2026**

## Overview

Anki Dictionary Helper is a browser extension that helps users look up English words and export vocabulary to Anki flashcards. This policy describes what data the extension handles and how.

## Data Collection

**The extension has no server and no analytics. The developer never receives any of your data.**

The only data that leaves your browser is the word you choose to look up and the flashcards you choose to send to Anki, as described below.

## Data Stored Locally

The extension stores the following data on your device using the browser's built-in extension storage (`storage.local`):

| Data | Purpose |
|---|---|
| Looked-up words and their definitions | Build your personal word list for Anki export |
| Which words have been exported | Show an "Exported" badge and select unexported words |
| Extension settings (theme, AnkiConnect address, deck and note type names) | Remember your preferences |

This data:
- Remains on your device
- Is never sent to the developer
- Can be deleted at any time from the extension popup ("Clear All") or by removing the extension

## Network Requests

The extension makes requests only in response to your actions:

| Destination | When | What is sent |
|---|---|---|
| Cambridge Dictionary (`dictionary.cambridge.org`) | You Alt+click a word, play a pronunciation, or send words to Anki | The word, or the address of its pronunciation audio |
| Free Dictionary API (`api.dictionaryapi.dev`) | Cambridge Dictionary has no entry for the word | The word |
| AnkiConnect on your own computer (`127.0.0.1:8765`) | You click "Send to Anki" or test the connection in Settings | The selected words' definitions, examples and pronunciation audio |

These requests contain no identifiers from the extension. As with any web request, the dictionary sites receive your IP address and browser user agent; their own privacy policies apply. AnkiConnect runs locally, so nothing sent to it leaves your computer.

The extension loads no remote code, fonts or other resources, and it makes no requests on its own while you browse.

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Save your word list and settings locally on your device |
| Access to all websites (content script) | Detect Alt+click on words and show the definition popup on the page you're reading |
| `dictionary.cambridge.org`, `api.dictionaryapi.dev` | Fetch word definitions and pronunciation audio |
| `127.0.0.1:8765` | Talk to the AnkiConnect add-on in your local Anki app |

## Changes to This Policy

If this policy is updated, the new version will be committed to this repository with an updated date.

## Contact

If you have any questions or concerns, please open an issue on the [GitHub repository](https://github.com/minmaxw1024/anki-dict/issues).
