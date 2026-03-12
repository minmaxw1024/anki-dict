# Anki Dictionary Helper

A browser extension that lets you look up English words from Cambridge Dictionary with a simple Alt+click and sync them to Anki flashcards. Supports Chrome, Edge, and Firefox.

## Features

- **Quick Lookup**: Alt+click any English word on any webpage to see its definition in a popup modal
- **Pronunciations**: UK and US IPA with audio playback buttons
- **Rich Definitions**: Part of speech, CEFR levels, multiple meanings, and example sentences
- **Smart Caching**: Automatically saves looked-up words to local storage, avoids duplicate fetches
- **AnkiConnect Sync**: Send selected words directly to Anki with one click (requires AnkiConnect add-on)
- **CSV Export**: Export words as tab-separated CSV for manual Anki import
- **Audio in Anki Cards**: Exported cards include clickable pronunciation buttons
- **Batch Operations**: Select all, batch delete, batch export
- **Themes**: Duolingo-style and British Classic themes
- **Anki Card Template**: Built-in card template with step-by-step setup guide in settings
- **Cross-Browser**: Chrome, Edge, and Firefox (Manifest V3)

## Installation

### Prerequisites

- Node.js (v18+)
- [Bun](https://bun.sh/) (package manager)

### Build

```bash
# Install dependencies
bun install

# Build all platforms (Chrome, Firefox, Edge)
bun run build

# Or build for a specific platform
bun run build:chrome
bun run build:firefox
bun run build:edge

# Package .zip files for store submission
bun run pack
```

### Load in Browser

**Chrome / Edge**:
1. Navigate to `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `dist/chrome/` (or `dist/edge/`)

**Firefox**:
1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file inside `dist/firefox/`

## Usage

### Looking Up Words

1. Navigate to any webpage
2. Hold **Alt** and **left-click** on any English word
3. A modal appears with pronunciation, definitions, examples, and a link to the full entry

### Managing Words

Click the extension icon in the toolbar to open the popup:
- View all saved words with pronunciations, definitions, and dates
- Select words with checkboxes (Select All / Deselect All)
- **Batch delete** selected words
- **Clear All** to remove everything

### Syncing to Anki (AnkiConnect)

The fastest way to get words into Anki:

1. Install the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on in Anki (code: `2055492159`)
2. Restart Anki and keep it running
3. In the extension popup, select words and click **Send to Anki**
4. The extension automatically creates the "Anki Dict" deck and note type on first sync

Cards include: word, UK/US pronunciation with audio buttons, definitions, examples, and source link.

### Exporting as CSV

1. Select words and click **Export CSV**
2. A `.csv` file is downloaded
3. In Anki: File > Import > select the file

### Setting Up the Card Template (Manual Import)

If you use CSV import instead of AnkiConnect, set up the card template in Anki:

1. Click the gear icon in the popup to open Settings
2. Follow the 4-step guide to create the note type with fields, front/back templates, and CSS
3. Each step has a copy button for easy pasting

## Project Structure

```
anki-dict/
├── src/
│   ├── background/
│   │   └── service-worker.ts        # Message handler, network requests, audio fetch
│   ├── content/
│   │   ├── content-script.ts        # Alt+click event listener, word lookup flow
│   │   ├── modal.ts                 # Modal UI component with audio playback
│   │   └── modal.css                # Modal styling with CSS variables
│   ├── popup/
│   │   ├── popup.html               # Word list UI
│   │   ├── popup.ts                 # Popup logic, export, AnkiConnect sync
│   │   └── popup.css                # Popup styling
│   ├── options/
│   │   ├── options.html             # Settings page
│   │   ├── options.ts               # Theme selector, Anki template guide
│   │   └── options.css              # Settings page styling
│   ├── lib/
│   │   ├── types.ts                 # TypeScript interfaces
│   │   ├── storage.ts               # Browser storage wrapper
│   │   ├── utils.ts                 # Shared utilities (escapeHtml)
│   │   ├── dictionary-scraper.ts    # Cambridge Dictionary HTML parser
│   │   ├── csv-exporter.ts          # Anki CSV generator
│   │   ├── anki-connect.ts          # AnkiConnect HTTP client
│   │   ├── anki-template.ts         # Anki card template definitions
│   │   └── themes.ts               # Theme definitions and appliers
│   ├── assets/
│   │   └── icons/                   # Extension icons (16, 48, 128)
│   └── manifest.json                # Extension manifest (MV3)
├── dist/                            # Build output
│   ├── chrome/
│   ├── firefox/
│   └── edge/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Scripts

| Command | Description |
|---|---|
| `bun run build` | Build for all platforms |
| `bun run build:chrome` | Build for Chrome |
| `bun run build:firefox` | Build for Firefox |
| `bun run build:edge` | Build for Edge |
| `bun run pack` | Build + package `.zip` files for store submission |
| `bun run dev` | Watch mode for development (Chrome) |
| `bun run type-check` | TypeScript type checking |

## Architecture

**Word Lookup Flow**:
1. Content script detects Alt+click, extracts the word, shows a loading modal
2. Service worker checks local cache; if miss, fetches from Cambridge Dictionary
3. Content script parses HTML with DOMParser (multi-selector fallback)
4. Word entry is saved to storage and displayed in the modal

**AnkiConnect Flow**:
1. Popup calls AnkiConnect at `http://127.0.0.1:8765`
2. Auto-creates "Anki Dict" deck and note type (with templates + CSS) if needed
3. Sends notes in batch, skipping duplicates

**Storage**: `browser.storage.local` via webextension-polyfill. Words cached indefinitely with timestamps.

## Keyboard Shortcuts

- **Alt+Click** — Look up a word
- **Esc** — Close the modal

## Troubleshooting

### Modal doesn't appear
- Make sure you're holding Alt while clicking
- Try selecting the word first, then Alt+click
- Check that the extension is enabled

### "Word not found" error
- The word might not be in Cambridge Dictionary
- Try the base form of the word (e.g. "run" instead of "running")
- Check your internet connection

### AnkiConnect issues
- Make sure Anki desktop is running
- Verify AnkiConnect is installed: Tools > Add-ons > check for "AnkiConnect"
- If you get a permission error, AnkiConnect may prompt you in Anki to allow access

### Build errors
```bash
node --version   # Should be v18+
bun run type-check
```

## Privacy

- All data stored locally in your browser
- No external servers except Cambridge Dictionary (for lookups) and localhost (for AnkiConnect)
- No tracking or analytics
- See [PRIVACY.md](PRIVACY.md) for details

## License

MIT License

## Credits

- Dictionary data from [Cambridge Dictionary](https://dictionary.cambridge.org/)
- Built with TypeScript, Vite, and [webextension-polyfill](https://github.com/nicolo-ribaudo/webextension-polyfill)
- AnkiConnect by [FooSoft](https://foosoft.net/projects/anki-connect/)
