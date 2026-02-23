# Privacy Policy — Anki Dictionary Helper

**Last updated: February 22, 2026**

## Overview

Anki Dictionary Helper is a browser extension that helps users look up English words and export vocabulary to Anki flashcards. This policy describes what data the extension handles and how.

## Data Collection

**This extension does not collect, transmit, or share any personal data with the developer or any third party.**

## Data Stored Locally

The extension stores the following data on your device using the browser's built-in `chrome.storage.local` API:

| Data | Purpose |
|---|---|
| Looked-up words and their definitions | Build your personal word list for Anki export |
| Extension settings (theme preference) | Remember your display preferences |

This data:
- Remains entirely on your device
- Is never transmitted to any external server
- Is never accessible to the extension's developer
- Can be cleared at any time by removing the extension

## Third-Party Network Requests

When you look up a word, the extension fetches the definition page from **Cambridge Dictionary** (`dictionary.cambridge.org`). This request:
- Contains only the word you selected
- Does not include any personally identifiable information
- Is initiated solely by your explicit action of selecting a word

No other external network requests are made by this extension.

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Save your word list and settings locally on your device |
| `activeTab` | Inject the dictionary popup into the page where you selected a word |
| `host_permissions: dictionary.cambridge.org` | Fetch word definitions from Cambridge Dictionary |

## Changes to This Policy

If this policy is updated, the new version will be committed to this repository with an updated date.

## Contact

If you have any questions or concerns, please open an issue on the [GitHub repository](https://github.com).
