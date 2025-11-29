import { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, nativeImage } from 'electron';
import Store from 'electron-store';
import { captureScreen, cropImage } from './capture';
import { createWorker, Worker } from 'tesseract.js';
import axios from 'axios';
import nodejieba from 'nodejieba';

// Handle Squirrel events for Windows installer
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Declare webpack magic variables
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const OVERLAY_WINDOW_WEBPACK_ENTRY: string;
declare const OVERLAY_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Store instance
let store: Store;

// Window references - only main and overlay now
let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Store screenshot buffer for cropping
let currentScreenshotBuffer: Buffer | null = null;

// Store captured/cropped image for results
let capturedImageData: string | null = null;

// Tesseract worker
let ocrWorker: Worker | null = null;

// History item type (defined here, NOT in preload)
type HistoryItem = {
  id: string;
  chinese: string;
  pinyin: string;
  english: string;
  timestamp: number;
};

const initOCRWorker = async (): Promise<void> => {
  if (!ocrWorker) {
    console.log('Initializing OCR worker...');
    ocrWorker = await createWorker('chi_sim');
    console.log('OCR worker ready');
  }
};

const createMainWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 500,
    show: false,
    frame: false, // Completely frameless - we'll add custom controls
    resizable: true,
    backgroundColor: '#fdfcfa',
    autoHideMenuBar: true,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Disable sandbox to allow __dirname in preload
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open DevTools in development
  mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

const createOverlayWindow = async (): Promise<void> => {
  // Capture screenshot first
  console.log('Capturing screenshot...');
  try {
    currentScreenshotBuffer = await captureScreen();
    console.log('Screenshot captured:', currentScreenshotBuffer ? `${currentScreenshotBuffer.length} bytes` : 'NULL');
  } catch (err) {
    console.error('Screenshot capture failed:', err);
    currentScreenshotBuffer = null;
  }

  // Get primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;

  console.log('Creating overlay window with preload:', OVERLAY_WINDOW_PRELOAD_WEBPACK_ENTRY);
  
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
      sandbox: false, // Try disabling sandbox for overlay
    },
  });

  console.log('Loading overlay URL:', OVERLAY_WINDOW_WEBPACK_ENTRY);
  overlayWindow.loadURL(OVERLAY_WINDOW_WEBPACK_ENTRY);
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.focus();

  // Enable DevTools for overlay debugging
  overlayWindow.webContents.openDevTools({ mode: 'detach' });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
    currentScreenshotBuffer = null;
  });
};

const showMainWindow = (): void => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createMainWindow();
    mainWindow?.show();
    mainWindow?.focus();
  }
};

const createTray = (): void => {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAB2SURBVHgB7ZJBCsAgDAS3xd/4Bj/iY3yDb/ENvqFVUAoSeuhNZS5LWJIN4jgOIJMPgKqmAQlJANj33qd/sG1r/ykBMzMK8HvvkJmqKpRSmJmZJVBVBBBCgJnPHnLOqKqICBFxAjAzIgJmRkRARI4/eJT+kfAGvvMxePqmrBQAAAAASUVORK5CYII='
  );

  tray = new Tray(icon);

  const hotkey = store.get('hotkey', 'Ctrl+Shift+C');
  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Capture (${hotkey})`,
      click: startCaptureWorkflow,
    },
    {
      label: 'Open App',
      click: showMainWindow,
    },
    { type: 'separator' },
    { role: 'quit' },
  ]);

  tray.setToolTip('ScreenPinyin Translator');
  tray.setContextMenu(contextMenu);

  tray.on('click', showMainWindow);
};

const registerHotkey = (): void => {
  const hotkey = store.get('hotkey', 'CommandOrControl+Shift+C') as string;

  globalShortcut.unregisterAll();

  const success = globalShortcut.register(hotkey, startCaptureWorkflow);
  if (!success) {
    console.error('Failed to register hotkey:', hotkey);
  }
};

const startCaptureWorkflow = async (): Promise<void> => {
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
  }

  await createOverlayWindow();
};

const setupIpcHandlers = (): void => {
  // Screenshot handlers
  ipcMain.handle('get-screenshot', async () => {
    console.log('[IPC] get-screenshot called, buffer:', currentScreenshotBuffer ? `${currentScreenshotBuffer.length} bytes` : 'NULL');
    if (currentScreenshotBuffer) {
      const dataUrl = `data:image/png;base64,${currentScreenshotBuffer.toString('base64')}`;
      console.log('[IPC] Returning data URL of length:', dataUrl.length);
      return dataUrl;
    }
    console.log('[IPC] No screenshot buffer available');
    return null;
  });

  ipcMain.handle('selection-complete', async (_event, selection: { x: number; y: number; width: number; height: number }) => {
    if (!currentScreenshotBuffer) {
      return { error: 'No screenshot available' };
    }

    try {
      const croppedBuffer = await cropImage(currentScreenshotBuffer, selection);

      // Store the captured image
      capturedImageData = `data:image/png;base64,${croppedBuffer.toString('base64')}`;

      if (overlayWindow) {
        overlayWindow.close();
        overlayWindow = null;
      }

      // Mark that there's a pending capture to process
      store.set('pendingCapture', true);

      // Show main window
      showMainWindow();

      // Send signal to main window to process the capture (if window is already loaded)
      if (mainWindow && mainWindow.webContents) {
        // Small delay to ensure React has mounted if window was just created
        setTimeout(() => {
          if (mainWindow) {
            mainWindow.webContents.send('new-capture');
          }
        }, 100);
      }

      return {
        imageData: capturedImageData,
        position: { x: selection.x, y: selection.y },
      };
    } catch (error) {
      console.error('Error cropping image:', error);
      return { error: 'Failed to crop image' };
    }
  });

  ipcMain.handle('get-captured-image', () => {
    return capturedImageData;
  });

  ipcMain.handle('cancel-selection', () => {
    if (overlayWindow) {
      overlayWindow.close();
      overlayWindow = null;
    }
  });

  // Settings handlers
  ipcMain.handle('get-store-value', (_event, key: string) => {
    return store.get(key);
  });

  ipcMain.handle('set-store-value', (_event, key: string, value: unknown) => {
    store.set(key, value);

    if (key === 'hotkey') {
      registerHotkey();
      if (tray) {
        const contextMenu = Menu.buildFromTemplate([
          {
            label: `Capture (${value})`,
            click: startCaptureWorkflow,
          },
          {
            label: 'Open App',
            click: showMainWindow,
          },
          { type: 'separator' },
          { role: 'quit' },
        ]);
        tray.setContextMenu(contextMenu);
      }
    }

    return { success: true };
  });

  ipcMain.handle('close-settings', () => {
    if (mainWindow) {
      mainWindow.hide();
    }
  });

  // OCR handler
  ipcMain.handle('perform-ocr', async (_event, imageData: string) => {
    try {
      await initOCRWorker();

      if (!ocrWorker) {
        return { success: false, error: 'OCR worker not initialized' };
      }

      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      const result = await ocrWorker.recognize(imageBuffer);
      const text = result.data.text.trim();

      if (!text) {
        return { success: false, error: 'No text detected in the selected region' };
      }

      return { success: true, text };
    } catch (error) {
      console.error('OCR error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'OCR failed' };
    }
  });

  // Translation handler
  ipcMain.handle('translate', async (_event, text: string) => {
    try {
      const apiKey = store.get('azureApiKey', '') as string;
      const region = store.get('azureRegion', 'eastus') as string;

      if (!apiKey) {
        return { success: false, error: 'Please set your Azure API key in Settings' };
      }

      const endpoint = 'https://api.cognitive.microsofttranslator.com';

      const [translateResponse, pinyinResponse] = await Promise.all([
        axios.post(
          `${endpoint}/translate?api-version=3.0&from=zh-Hans&to=en`,
          [{ text }],
          {
            headers: {
              'Ocp-Apim-Subscription-Key': apiKey,
              'Ocp-Apim-Subscription-Region': region,
              'Content-Type': 'application/json',
            },
          }
        ),
        axios.post(
          `${endpoint}/transliterate?api-version=3.0&language=zh-Hans&fromScript=Hans&toScript=Latn`,
          [{ text }],
          {
            headers: {
              'Ocp-Apim-Subscription-Key': apiKey,
              'Ocp-Apim-Subscription-Region': region,
              'Content-Type': 'application/json',
            },
          }
        ),
      ]);

      const translation = translateResponse.data[0]?.translations?.[0]?.text || '';
      const pinyin = pinyinResponse.data[0]?.text || '';

      // Auto-save to history
      const history = store.get('translationHistory', []) as HistoryItem[];
      const newItem: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        chinese: text,
        pinyin,
        english: translation,
        timestamp: Date.now(),
      };
      history.unshift(newItem);
      if (history.length > 100) {
        history.pop();
      }
      store.set('translationHistory', history);

      return {
        success: true,
        original: text,
        pinyin,
        translation,
      };
    } catch (error) {
      console.error('Translation error:', error);
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401) {
          return { success: false, error: 'Invalid API key. Please check your Azure API key in Settings.' };
        }
        if (status === 403) {
          return { success: false, error: 'API key not authorized for this region. Please check your settings.' };
        }
      }
      return { success: false, error: error instanceof Error ? error.message : 'Translation failed' };
    }
  });

  // History IPC handlers
  ipcMain.handle('get-history', () => {
    const history = store.get('translationHistory', []) as HistoryItem[];
    return history;
  });

  ipcMain.handle('add-to-history', (_event, item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const history = store.get('translationHistory', []) as HistoryItem[];
    const newItem: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      chinese: item.chinese,
      pinyin: item.pinyin,
      english: item.english,
      timestamp: Date.now(),
    };
    history.unshift(newItem);
    if (history.length > 100) {
      history.pop();
    }
    store.set('translationHistory', history);
    return { success: true, item: newItem };
  });

  ipcMain.handle('delete-history-item', (_event, id: string) => {
    const history = store.get('translationHistory', []) as HistoryItem[];
    const filtered = history.filter(item => item.id !== id);
    store.set('translationHistory', filtered);
    return { success: true };
  });

  ipcMain.handle('clear-history', () => {
    store.set('translationHistory', []);
    return { success: true };
  });

  // Check for pending capture (for when window wasn't ready)
  ipcMain.handle('get-pending-capture', () => {
    const pending = store.get('pendingCapture', false);
    // Clear after reading
    store.delete('pendingCapture');
    return pending;
  });

  // Word segmentation with POS tagging using nodejieba
  ipcMain.handle('segment-text', (_event, text: string) => {
    try {
      // Use nodejieba.tag for word segmentation with POS tags
      // Returns: [{word: "回合", tag: "v"}, {word: "炸弹", tag: "n"}, ...]
      const tagged = nodejieba.tag(text);
      return { success: true, segments: tagged };
    } catch (error) {
      console.error('Segmentation error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Segmentation failed', segments: [] };
    }
  });

  // Pending results data for history item clicks
  ipcMain.handle('get-pending-results-data', () => {
    const data = store.get('pendingResultsData', null);
    // Clear after reading
    store.delete('pendingResultsData');
    return data;
  });

  ipcMain.handle('show-results-with-data', (_event, data: { chinese: string; pinyin: string; english: string }) => {
    // Store the data for the results view
    store.set('pendingResultsData', data);
    showMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('show-results-from-history');
    }
  });

  // Window control handlers (for custom titlebar)
  ipcMain.handle('window-minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('window-close', () => {
    mainWindow?.close();
  });
};

// App lifecycle
app.whenReady().then(async () => {
  // Initialize store
  store = new Store({
    name: 'screen-pinyin-config',
    defaults: {
      azureApiKey: '',
      azureRegion: 'eastus',
      hotkey: 'CommandOrControl+Shift+C',
      translationHistory: [],
    },
  });

  // Setup IPC handlers
  setupIpcHandlers();

  // Create tray and register hotkey
  createTray();
  registerHotkey();

  // Pre-initialize OCR worker
  await initOCRWorker();
});

app.on('window-all-closed', () => {
  // Don't quit on window close - keep running in tray
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (ocrWorker) {
    ocrWorker.terminate();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
