# Troubleshooting Guide

## Overlay Window Not Working (Transparent Unclickable Layer)

### Symptoms
- Pressing Ctrl+Shift+C shows a transparent layer over the screen
- No crosshair cursor appears
- Cannot interact with anything (mouse clicks don't work)
- Have to quit app via system tray
- DevTools (if open) may be unresponsive

### Root Cause
**TypeScript interfaces in `src/preload.ts` crash Electron's sandbox.**

When webpack compiles TypeScript `interface` declarations in a preload script, it generates code that fails in Electron's sandboxed renderer with:
```
"Electron sandboxed_renderer.bundle.js script failed to run"
"TypeError: object is not iterable (cannot read property Symbol(Symbol.iterator))"
```

This error is **silent** - it doesn't always appear in the terminal. The preload script simply fails to run, so `window.electronAPI` is undefined, and the React component shows "Error: electronAPI not available" or just doesn't render at all.

### The Fix

**DO NOT use TypeScript `interface` or `export` keywords in `src/preload.ts`.**

❌ **BAD** - This will crash:
```typescript
export interface ElectronAPI {
  getScreenshot: () => Promise<string | null>;
  // ...
}

const electronAPI: ElectronAPI = {
  getScreenshot: () => ipcRenderer.invoke('get-screenshot'),
  // ...
};
```

✅ **GOOD** - This works:
```typescript
const electronAPI = {
  getScreenshot: () => ipcRenderer.invoke('get-screenshot'),
  // ...
};
```

### Quick Fix Steps

1. Open `src/preload.ts`
2. Remove ALL `interface` declarations
3. Remove ALL `export` keywords
4. Use plain objects with `any` types if needed
5. Clear webpack cache: `Remove-Item -Recurse -Force .webpack`
6. Restart: `npm start`

### Other Overlay Issues

If the preload is fine but overlay still doesn't work:

1. **Don't use `fullscreen: true`** - Can cause input issues on Windows
2. **Add `focusable: true`** to BrowserWindow options
3. **Call `overlayWindow.focus()`** after creating the window
4. **Use `transparent: true`** with `frame: false`

### Working Overlay Window Config

```typescript
overlayWindow = new BrowserWindow({
  width,
  height,
  x: 0,
  y: 0,
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: false,
  movable: false,
  minimizable: false,
  maximizable: false,
  closable: true,
  focusable: true,
  hasShadow: false,
  webPreferences: {
    preload: OVERLAY_WINDOW_PRELOAD_WEBPACK_ENTRY,
    contextIsolation: true,
    nodeIntegration: false,
  },
});

overlayWindow.loadURL(OVERLAY_WINDOW_WEBPACK_ENTRY);
overlayWindow.setAlwaysOnTop(true, 'screen-saver');
overlayWindow.focus();
```

### Working Preload Script

```typescript
const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  getScreenshot: () => ipcRenderer.invoke('get-screenshot'),
  getCapturedImage: () => ipcRenderer.invoke('get-captured-image'),
  selectionComplete: (selection: any) => ipcRenderer.invoke('selection-complete', selection),
  showResults: (position: any) => ipcRenderer.invoke('show-results', position),
  cancelSelection: () => ipcRenderer.invoke('cancel-selection'),
  closeResults: () => ipcRenderer.invoke('close-results'),
  getStoreValue: (key: string) => ipcRenderer.invoke('get-store-value', key),
  setStoreValue: (key: string, value: any) => ipcRenderer.invoke('set-store-value', key, value),
  closeSettings: () => ipcRenderer.invoke('close-settings'),
  performOCR: (imageData: string) => ipcRenderer.invoke('perform-ocr', imageData),
  translate: (text: string) => ipcRenderer.invoke('translate', text),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
```

### Debugging Tips

1. Add logging to main process in `createOverlayWindow()` to confirm it's being called
2. Check terminal output for "sandboxed_renderer" errors after pressing Ctrl+Shift+C
3. If DevTools opens but is unresponsive, the issue is likely the preload script
4. Always clear `.webpack` folder after changing preload: `Remove-Item -Recurse -Force .webpack`

