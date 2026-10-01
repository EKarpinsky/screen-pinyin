# Regenerate the demo

The capture runs the packaged Linux Electron app on an X11 desktop. It renders
the original sample image, selects its Chinese text through the real capture
overlay, waits for OCR and the local dictionary result, and opens a character's
detail panel. No results or application state are mocked.

Use Node 22 and the normal README build prerequisites, plus these capture tools:

```sh
sudo apt-get install xvfb xauth x11-xserver-utils imagemagick xdotool ffmpeg fonts-wqy-zenhei
npm ci
npm run package
```

Temporary files use the system temporary directory. Set `CAPTURE_SCRATCH_DIR`
to use a different writable directory. Then run:

```sh
xvfb-run -a -s '-screen 0 1440x900x24' node scripts/capture/demo.mjs \
  'out/ScreenPinyin Translator-linux-x64/ScreenPinyin Translator'
```

Outputs:

- `docs/sample.png`: the sample rendered with the WenQuanYi Zen Hei font.
- `docs/screenshot.png`: the real 1440 by 900 results view with character detail.
- `docs/demo.gif`: 12 seconds of region selection, OCR results and character detail.

The sample is 电脑 (diàn nǎo, computer). The entire phrase has a local
CC-CEDICT entry, so no Azure key is used. Tesseract may download its language data on
first run. The script waits for initialization before recording and uses a
fresh disposable profile.

Extra arguments are passed to Electron, for example `--no-sandbox --disable-gpu` on a host without a configured Chromium sandbox.

The script uses xdotool for native window control and Chromium's debugging
protocol for pointer input and assertions. A separate Electron image viewer
displays the sample behind the app. FFmpeg records the Xvfb desktop in real time. Assertions
check the full-screen overlay, OCR history, pinyin, visible result, file sizes
and GIF duration.
Set `CAPTURE_CJK_FONT` if the Chinese font is installed at a different path.
