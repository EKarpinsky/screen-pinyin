# Regenerate the demo

The capture runs the packaged Linux Electron app on an X11 desktop. It renders
the original sample image, selects its Chinese text through the real capture
overlay, waits for OCR and the local dictionary result, and opens a character's
detail panel. No results or application state are mocked.

Use Node 22 and the normal README build prerequisites, plus these capture tools:

```sh
df -h / # stop if less than 3 GB is free
sudo apt-get install xvfb xauth imagemagick xdotool ffmpeg fonts-wqy-zenhei
npm ci
npm run package
```

Set `CAPTURE_SCRATCH_DIR` to a writable temporary directory. Paperclip runs use
their existing `PAPERCLIP_RUN_SCRATCH_DIR` automatically. Then run:

```sh
xvfb-run -a -s '-screen 0 1440x900x24' node scripts/capture/demo.mjs \
  'out/ScreenPinyin Translator-linux-x64/ScreenPinyin Translator'
```

Outputs:

- `docs/sample.png`: the sample rendered with the WenQuanYi Zen Hei font.
- `docs/screenshot.png`: the real 1440 by 900 results view with character detail.
- `docs/demo.gif`: 12 seconds of region selection, OCR results and character detail.

The sample is 电脑 (diàn nǎo, computer). The entire phrase has a local
CC-CEDICT entry, so no Azure key is used. This demo does not demonstrate
full-sentence Azure translation. Tesseract may download its language data on
first run. The script waits for initialization before recording and uses a
fresh disposable profile. It closes the overlay's detached DevTools window,
which the application currently opens automatically.

Additional command arguments are passed to Electron. The isolated capture host
used `--no-sandbox --disable-gpu`, matching its packaged-app smoke check, because
its Electron SUID sandbox helper is not configured. Use a configured sandbox
when running the app normally.

The script uses xdotool for native window control and Chromium's debugging
protocol for pointer input and assertions. A separate Electron image viewer
displays the sample behind the app. FFmpeg records the Xvfb desktop in real time; the
GIF is not sped up or assembled from staged application states. Assertions
check the full-screen overlay, OCR history, pinyin, visible result, file sizes
and GIF duration.
Set `CAPTURE_CJK_FONT` if the Chinese font is installed at a different path.

This is a desktop app with a 600px minimum window width. There is no mobile
version or hosted web preview; a 390px browser screenshot would misrepresent it.

After capturing and checking the assets, remove generated build output:

```sh
rm -rf node_modules out .webpack build dist .gradle
```
