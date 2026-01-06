# Anki Dictionary Helper

A Chrome extension that allows you to look up English words from Cambridge Dictionary with a simple Alt+click gesture and export them to Anki flashcards.

## Features

- **Quick Lookup**: Alt+click any English word on any webpage to see its definition in a beautiful modal
- **British English Dictionary**: Definitions, pronunciations (IPA), and audio from Cambridge Dictionary
- **Smart Storage**: Automatically saves all looked-up words to local storage
- **Anki Export**: Export selected words to CSV format for easy import into Anki
- **Rich Definitions**: Includes part of speech, CEFR levels, multiple meanings, and example sentences

## Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- Google Chrome or Chromium-based browser

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the extension**:
   ```bash
   npm run build
   ```

   This will create a `dist/` folder with the compiled extension.

3. **Load the extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the `dist/` folder from this project

## Usage

### Looking Up Words

1. Navigate to any webpage
2. Hold down the **Alt** key and **left-click** on any English word
3. A modal will appear with:
   - Pronunciation (UK and/or US with audio)
   - Definitions with part of speech
   - Example sentences
   - Link to full Cambridge Dictionary entry

### Managing Your Word Collection

1. Click the extension icon in your Chrome toolbar
2. You'll see a list of all words you've looked up
3. Each word shows:
   - The word and pronunciation
   - First definition preview
   - Number of definitions
   - Date saved

### Exporting to Anki

1. Click the extension icon
2. Select the words you want to export using checkboxes
3. Click "Export to Anki"
4. A CSV file will be downloaded

#### Importing into Anki

1. Open Anki
2. Go to File → Import
3. Select the downloaded CSV file
4. Anki will automatically detect the format
5. Review the field mappings and click Import

The CSV includes:
- Word
- British Pronunciation (IPA)
- American Pronunciation (IPA)
- HTML-formatted definitions
- HTML-formatted example sentences
- Source URL

## Development

### Project Structure

```
anki-dict/
├── src/
│   ├── background/
│   │   └── service-worker.ts       # Background worker for dictionary API calls
│   ├── content/
│   │   ├── content-script.ts       # Handles Alt+click events
│   │   ├── modal.ts                # Modal UI component
│   │   └── modal.css               # Modal styling
│   ├── popup/
│   │   ├── popup.html              # Extension popup UI
│   │   ├── popup.ts                # Popup logic
│   │   └── popup.css               # Popup styling
│   ├── lib/
│   │   ├── dictionary-scraper.ts   # Cambridge Dictionary parser
│   │   ├── storage.ts              # Chrome storage wrapper
│   │   ├── types.ts                # TypeScript interfaces
│   │   └── csv-exporter.ts         # Anki CSV generator
│   ├── assets/
│   │   └── icons/                  # Extension icons
│   └── manifest.json               # Chrome extension manifest
├── dist/                           # Build output (generated)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### Available Scripts

- `npm run dev` - Build in watch mode for development
- `npm run build` - Production build
- `npm run type-check` - TypeScript type checking

### Architecture

**Word Lookup Flow**:
1. Content script detects Alt+click → extracts word → shows loading modal
2. Background service worker receives request → checks cache → fetches from Cambridge Dictionary → parses HTML → saves to storage → returns data
3. Modal displays pronunciation, definitions, and examples

**Data Storage**:
- Uses `chrome.storage.local` (unlimited quota)
- Words are cached indefinitely to avoid repeated fetches
- Each word entry includes timestamp and last accessed date

**Dictionary Scraping**:
- Fetches from `https://dictionary.cambridge.org/dictionary/english/{word}`
- Uses DOMParser to parse HTML
- Multi-selector fallback system for robustness
- Extracts: pronunciations (UK/US), audio URLs, definitions, examples, CEFR levels

## Keyboard Shortcuts

- **Alt+Click** - Look up a word
- **Esc** - Close the modal

## Troubleshooting

### Modal doesn't appear

- Make sure you're holding Alt while clicking
- Try selecting the word first, then Alt+click
- Check that the extension is enabled in `chrome://extensions/`

### "Word not found" error

- The word might not be in Cambridge Dictionary
- Try the singular form or base form of the word
- Check your internet connection

### Export doesn't work

- Make sure you've selected at least one word
- Check Chrome's download settings
- Try a different browser if the issue persists

### Build errors

Make sure you have Node.js v18+ installed:
```bash
node --version
npm --version
```

If you see TypeScript errors, try:
```bash
npm run type-check
```

## Technical Details

### Manifest V3

This extension uses Chrome's Manifest V3 architecture:
- Background service worker for network requests
- Content scripts for page interaction
- No remote code execution
- Declarative permissions

### CORS Handling

The extension bypasses CORS restrictions using `host_permissions` in the manifest, allowing the background worker to fetch from Cambridge Dictionary without errors.

### Privacy

- All data is stored locally in your browser
- No data is sent to external servers (except Cambridge Dictionary for lookups)
- No tracking or analytics
- Open source - you can review all code

## Future Enhancements

- Direct Anki-Connect integration (no CSV export needed)
- Multiple dictionary sources (Oxford, Longman, Merriam-Webster)
- Customizable keyboard shortcuts
- Word frequency analysis
- Spaced repetition reminders
- Firefox support

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Credits

- Dictionary data from [Cambridge Dictionary](https://dictionary.cambridge.org/)
- Built with TypeScript and Vite
- Designed for seamless Anki integration
