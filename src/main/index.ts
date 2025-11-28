import { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, nativeImage } from 'electron';
import Store from 'electron-store';
import { captureScreen, cropImage } from './capture';
import { createWorker, Worker } from 'tesseract.js';
import axios from 'axios';

// Handle Squirrel events for Windows installer
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Declare webpack magic variables
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const OVERLAY_WINDOW_WEBPACK_ENTRY: string;
declare const OVERLAY_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const RESULTS_WINDOW_WEBPACK_ENTRY: string;
declare const RESULTS_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Store instance
let store: Store;

// Window references
let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let resultsWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Store screenshot buffer for cropping
let currentScreenshotBuffer: Buffer | null = null;

// Store captured/cropped image for results window
let capturedImageData: string | null = null;

// Tesseract worker
let ocrWorker: Worker | null = null;

const initOCRWorker = async (): Promise<void> => {
  if (!ocrWorker) {
    console.log('Initializing OCR worker...');
    ocrWorker = await createWorker('chi_sim');
    console.log('OCR worker ready');
  }
};

const createMainWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 520,
    show: false,
    frame: true,
    resizable: true,
    minWidth: 400,
    minHeight: 450,
    backgroundColor: '#1a1a1a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

const createOverlayWindow = async (): Promise<void> => {
  // Capture screenshot first
  currentScreenshotBuffer = await captureScreen();

  // Get primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;

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

  overlayWindow.on('closed', () => {
    overlayWindow = null;
    currentScreenshotBuffer = null;
  });
};

const createResultsWindow = (x: number, y: number): void => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  resultsWindow = new BrowserWindow({
    width: 720,
    height: 520,
    x: Math.min(x + 10, screenWidth - 740),
    y: Math.min(y + 10, screenHeight - 540),
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    backgroundColor: '#fdfcfa',
    webPreferences: {
      preload: RESULTS_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  resultsWindow.loadURL(RESULTS_WINDOW_WEBPACK_ENTRY);

  resultsWindow.once('ready-to-show', () => {
    resultsWindow?.show();
  });

  resultsWindow.on('closed', () => {
    resultsWindow = null;
  });
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
      label: 'Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow();
          mainWindow?.show();
        }
      },
    },
    { type: 'separator' },
    { role: 'quit' },
  ]);

  tray.setToolTip('ScreenPinyin Translator');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createMainWindow();
      mainWindow?.show();
    }
  });
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
  if (resultsWindow) {
    resultsWindow.close();
    resultsWindow = null;
  }

  await createOverlayWindow();
};

const setupIpcHandlers = (): void => {
  ipcMain.handle('get-screenshot', async () => {
    if (currentScreenshotBuffer) {
      return `data:image/png;base64,${currentScreenshotBuffer.toString('base64')}`;
    }
    return null;
  });

  ipcMain.handle('selection-complete', async (_event, selection: { x: number; y: number; width: number; height: number }) => {
    if (!currentScreenshotBuffer) {
      return { error: 'No screenshot available' };
    }

    try {
      const croppedBuffer = await cropImage(currentScreenshotBuffer, selection);

      // Store the captured image for the results window
      capturedImageData = `data:image/png;base64,${croppedBuffer.toString('base64')}`;

      if (overlayWindow) {
        overlayWindow.close();
        overlayWindow = null;
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

  ipcMain.handle('show-results', (_event, position: { x: number; y: number }) => {
    createResultsWindow(position.x, position.y);
  });

  ipcMain.handle('cancel-selection', () => {
    if (overlayWindow) {
      overlayWindow.close();
      overlayWindow = null;
    }
  });

  ipcMain.handle('close-results', () => {
    if (resultsWindow) {
      resultsWindow.close();
      resultsWindow = null;
    }
  });

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
            label: 'Settings',
            click: () => {
              if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
              }
            },
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
