# Troubleshooting Guide

## Ubuntu sandbox startup error

On Ubuntu 23.10+ (including 24.04), AppArmor can restrict unprivileged user
namespaces, causing a Chromium SUID sandbox error at startup.
For local development, run:

```sh
npm start -- -- --no-sandbox
```

`--no-sandbox` disables Chromium's process sandbox, reducing protection if the
app is compromised. To keep the sandbox enabled, fix the helper after installing
dependencies, then use `npm start`:

```sh
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
```

For a packaged-app smoke check on a headless Linux host:

```sh
xvfb-run -a node scripts/smoke-package.mjs "out/ScreenPinyin Translator-linux-x64/ScreenPinyin Translator" --no-sandbox
```
