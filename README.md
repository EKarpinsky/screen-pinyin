# ScreenPinyin Translator

Capture Chinese text from your screen and look up its pinyin and English
meanings. ScreenPinyin is a desktop app built with Electron, React and
TypeScript. It combines Tesseract OCR, local CC-CEDICT dictionary search,
word segmentation, translation history and flashcard review.

Screenshot: [`docs/screenshot.png`](docs/screenshot.png) (demo asset pending).

## Run locally

Use Node.js 22 (22.22.3 for the verification run), npm 10, Git, and at least
3 GB of free disk space. Native modules need Python 3 and a C++ compiler:
Visual Studio's C++ build tools on Windows, Xcode Command Line Tools on
macOS, or the packages below on Debian/Ubuntu.

```sh
sudo apt-get install build-essential python3 libx11-dev libxtst-dev libpng-dev
```

Linux screen capture needs an X11 desktop and ImageMagick (`sudo apt-get
install imagemagick`). Wayland capture is not verified. On macOS, allow
Screen Recording and Accessibility when prompted.

```sh
git clone https://github.com/EKarpinsky/screen-pinyin.git
cd screen-pinyin
npm ci
npm start
```

The first install compiles native modules and can take several minutes.
The SQLite database is included. `npm ci` also downloads and generates the
JSON dictionary fallback and example sentences used by the renderer, so setup
requires internet access.
Use the capture shortcut below, drag a rectangle around Chinese text, and
select a result to see definitions or save a flashcard. Closing the window
can leave the app in the system tray; use the tray's Quit action to exit.

### Optional Azure Translator

Open **Settings**, enter your Azure Translator resource's **API key** and
**region**, then save. The app stores these locally through `electron-store`
as `azureApiKey` and `azureRegion`; the default region is `eastus`.

There is currently no Azure environment variable or `.env` loader. Setting
`AZURE_TRANSLATOR_KEY` or `AZURE_TRANSLATOR_REGION` does not configure this
version; use Settings.

Without a key, screen OCR, local word definitions and pinyin, dictionary
search, and flashcard review are available. Full-text translation falls back
to Azure when the complete text has no dictionary entry; that fallback needs
a key and an internet connection. Tesseract may download its language data
on first OCR use, so first use is not guaranteed to work offline.

## Hotkeys

| Shortcut | Action |
| --- | --- |
| Ctrl+Shift+C (Windows/Linux), Cmd+Shift+C (macOS) | Capture a screen region |
| Alt+P (Windows) | Look up selected text when the clipboard popup option is enabled in Settings |
| Escape | Cancel region selection, dismiss a popup/detail view, or leave flashcard review |
| Up / Down, Enter | Navigate dictionary search results and open a result |
| Space | Reveal the answer during flashcard review |
| 1 / 2 / 3 / 4 | Rate a revealed card Again / Hard / Good / Easy |

The Alt+P shortcut currently uses Windows PowerShell to copy selected text;
it is not portable to macOS or Linux.

## Check and package

```sh
npm run lint
npm test
npm run package
```

`npm test` runs once; `npm run test:watch` watches while you develop.
`npm run package` creates an unpacked app in `out/` for the current platform.
`npm run make` also builds installers and needs the platform's packaging
tools. Linux packaging does not prove Windows/macOS screen permissions or
capture behavior. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for overlay and
preload debugging.

The packaged-app smoke check starts a temporary profile and checks the
renderer, preload, dictionary lookup, native segmentation and flashcard DB.
On a Linux desktop, run (use `xvfb-run -a` before `node` on a headless host):

```sh
node scripts/smoke-package.mjs "out/ScreenPinyin Translator-linux-x64/ScreenPinyin Translator"
```

## Dictionary data

`src/data/dictionary.db` is tracked and ships with this checkout. It contains
a SQLite FTS5 index derived from CC-CEDICT. The app copies it into Electron's
user-data directory on first use and reuses that copy on subsequent starts.

The active SQLite builder is `scripts/build-sqlite-dictionary.mjs`, invoked
by `npm run build:dictionary`. It downloads the `krmanik/cedict-json` data,
converts numbered pinyin to tone marks, combines definitions and writes the
SQLite index. It overwrites the tracked database, so only run it when you
intend to refresh dictionary data.

`npm ci` rebuilds SQLite for Electron. To run the builder with ordinary Node,
rebuild SQLite for Node first, then restore the Electron build afterwards:

```sh
npm rebuild better-sqlite3 --build-from-source
npm run build:dictionary
npm run rebuild
```

A separate script, `node scripts/build-cedict-dictionary.mjs`, downloads the
MDBG CC-CEDICT text export and writes `src/data/cedict-dictionary.json`, the renderer's fallback when SQLite
is unavailable. `scripts/build-sentences-dictionary.mjs` downloads the example
sentences and indexes them by character. `npm run build:data` runs both, and
`npm ci` runs it automatically. Neither script rebuilds `dictionary.db`.
To use refreshed bundled data in an existing installation, quit the app and
remove only its cached `dictionary.db` from Electron's user-data directory.
Keep the separate user database if you want to retain flashcards.

## Licenses

Application code: [MIT](LICENSE), copyright Eli Karpinsky.
Dictionary data: CC BY-SA 4.0. Tesseract `chi_sim.traineddata`: Apache 2.0.
See [NOTICE](NOTICE) for sources, contributors and data transformations.
