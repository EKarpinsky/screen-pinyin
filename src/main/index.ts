import { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, nativeImage, Notification } from 'electron';
import schedule from 'node-schedule';
import Store from 'electron-store';
import { captureScreen, cropImage } from './capture';
import { createWorker, Worker } from 'tesseract.js';
import axios from 'axios';
import nodejieba from 'nodejieba';
import { initDictionaryDB, searchDictionary, getEntry, getEntries, closeDictionaryDB, isDictionaryReady } from './dictionary-db';
import { triggerClipboardLookup, ClipboardData } from './clipboard-monitor';
import { filterDefinitions } from '../shared/definition-utils';
import {
  initUserDB,
  closeUserDB,
  addFlashcard,
  getFlashcard,
  getAllFlashcards,
  getDueFlashcards,
  updateFlashcard,
  deleteFlashcard,
  flashcardExists,
  getFlashcardStats,
  FlashcardData,
  // Stats and settings
  getStreakStats,
  updateStreakAfterReview,
  incrementMastered,
  shouldShowExitPrompt,
  dismissExitPrompt,
  getAmbientWidgetEnabled,
  setAmbientWidgetEnabled,
  getNotificationTimes,
  setNotificationTimes,
  getFlashcardByChinese,
} from './user-db';
import { createEmptyCard, fsrs, Rating, State, Card, Grade } from 'ts-fsrs';

// Handle Squirrel events for Windows installer
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Declare webpack magic variables
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const OVERLAY_WINDOW_WEBPACK_ENTRY: string;
declare const OVERLAY_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const CLIPBOARD_POPUP_WEBPACK_ENTRY: string;
declare const CLIPBOARD_POPUP_PRELOAD_WEBPACK_ENTRY: string;

// Store instance
let store: Store;

// Window references
let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let clipboardPopup: BrowserWindow | null = null;
let tray: Tray | null = null;

// Exit prompt state
let isQuitting = false;
let exitPromptShown = false;

// Scheduled notification jobs
let notificationJobs: schedule.Job[] = [];

// Set up scheduled notifications based on user settings
const setupNotificationScheduler = () => {
  // Cancel existing jobs
  notificationJobs.forEach(job => job.cancel());
  notificationJobs = [];

  // Get notification times from settings
  const times = getNotificationTimes();
  console.log('Setting up notification scheduler for times:', times);

  times.forEach(hour => {
    // Schedule job for each hour
    const job = schedule.scheduleJob({ hour, minute: 0 }, async () => {
      const dueCards = getDueFlashcards();
      if (dueCards.length > 0 && Notification.isSupported()) {
        const notification = new Notification({
          title: 'Time to Review!',
          body: `You have ${dueCards.length} flashcard${dueCards.length === 1 ? '' : 's'} ready for review.`,
          icon: nativeImage.createFromDataURL(
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAB2SURBVHgB7ZJBCsAgDAS3xd/4Bj/iY3yDb/ENvqFVUAoSeuhNZS5LWJIN4jgOIJMPgKqmAQlJANj33qd/sG1r/ykBMzMK8HvvkJmqKpRSmJmZJVBVBBBCgJnPHnLOqKqICBFxAjAzIgJmRkRARI4/eJT+kfAGvvMxePqmrBQAAAAASUVORK5CYII='
          ),
          silent: false,
        });

        notification.on('click', () => {
          showMainWindow();
          mainWindow?.webContents.send('navigate-to-flashcards');
        });

        notification.show();
      }
    });

    notificationJobs.push(job);
    console.log(`Scheduled notification job for ${hour}:00`);
  });
};

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

  // Handle close event for exit prompt
  mainWindow.on('close', (event) => {
    // Skip if already quitting or exit prompt not needed
    if (isQuitting || exitPromptShown) {
      return;
    }

    // Check if we should show exit prompt
    if (shouldShowExitPrompt()) {
      const dueCards = getDueFlashcards();
      if (dueCards.length > 0) {
        // Prevent close and show exit prompt
        event.preventDefault();
        exitPromptShown = true;
        mainWindow?.webContents.send('show-exit-prompt', { dueCount: dueCards.length });
      }
    }
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

// Clipboard popup window - small transparent tooltip
const createClipboardPopup = (): void => {
  if (clipboardPopup && !clipboardPopup.isDestroyed()) {
    return;
  }

  clipboardPopup = new BrowserWindow({
    width: 400,
    height: 50,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    focusable: false, // Don't steal focus from other apps
    show: false,
    webPreferences: {
      preload: CLIPBOARD_POPUP_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  clipboardPopup.loadURL(CLIPBOARD_POPUP_WEBPACK_ENTRY);
  clipboardPopup.setAlwaysOnTop(true, 'pop-up-menu');
  
  // Prevent the popup from appearing in alt-tab
  clipboardPopup.setSkipTaskbar(true);

  clipboardPopup.on('closed', () => {
    clipboardPopup = null;
  });
};

const showClipboardPopup = (data: ClipboardData): void => {
  if (!clipboardPopup || clipboardPopup.isDestroyed()) {
    createClipboardPopup();
  }

  // Position near cursor
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  
  // Position popup above and slightly to the right of cursor
  let x = cursor.x + 10;
  let y = cursor.y - 60;
  
  // Keep popup on screen
  const popupWidth = 400;
  const popupHeight = 50;
  
  if (x + popupWidth > display.bounds.x + display.bounds.width) {
    x = cursor.x - popupWidth - 10;
  }
  if (y < display.bounds.y) {
    y = cursor.y + 20;
  }

  clipboardPopup?.setBounds({ x, y, width: popupWidth, height: popupHeight });
  
  // Send data to popup
  clipboardPopup?.webContents.send('clipboard-data', data);
  clipboardPopup?.showInactive(); // Show without stealing focus
};

const hideClipboardPopup = (): void => {
  clipboardPopup?.hide();
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

  // Unregister capture hotkey only, preserve popup hotkey
  globalShortcut.unregister(hotkey);

  const success = globalShortcut.register(hotkey, startCaptureWorkflow);
  if (!success) {
    console.error('Failed to register hotkey:', hotkey);
  }
};

// Popup hotkey for quick pinyin lookup (Alt+P to avoid conflicts)
const POPUP_HOTKEY = 'Alt+P';
let popupHotkeyRegistered = false;

const registerPopupHotkey = (): void => {
  if (popupHotkeyRegistered) return;
  
  const { clipboard } = require('electron');
  const { exec } = require('child_process');
  
  const success = globalShortcut.register(POPUP_HOTKEY, async () => {
    console.log('Popup hotkey triggered');
    
    // Store old clipboard to detect if copy worked
    const oldClipboard = clipboard.readText();
    console.log('Clipboard before Ctrl+C:', oldClipboard?.slice(0, 50));
    
    // Use PowerShell to send Ctrl+C via Windows Forms SendKeys
    await new Promise<void>((resolve, reject) => {
      exec(
        'powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^c\')"',
        (error) => {
          if (error) {
            console.error('SendKeys error:', error);
            reject(error);
          } else {
            resolve();
          }
        }
      );
    });
    
    // Wait for clipboard to update
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const newClipboard = clipboard.readText();
    console.log('Clipboard after Ctrl+C:', newClipboard?.slice(0, 50));
    
    const data = await triggerClipboardLookup();
    if (data) {
      showClipboardPopup(data);
    } else {
      console.log('No Chinese text found in clipboard');
    }
  });
  
  if (success) {
    popupHotkeyRegistered = true;
    console.log('Popup hotkey registered:', POPUP_HOTKEY);
  } else {
    console.error('Failed to register popup hotkey:', POPUP_HOTKEY);
  }
};

const unregisterPopupHotkey = (): void => {
  if (!popupHotkeyRegistered) return;
  
  globalShortcut.unregister(POPUP_HOTKEY);
  popupHotkeyRegistered = false;
  console.log('Popup hotkey unregistered');
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
      // Check dictionary first - skip Azure API if found
      const dictEntry = getEntry(text);
      if (dictEntry) {
        const pinyin = dictEntry.pinyin;
        const translation = filterDefinitions(dictEntry.definitions).slice(0, 3).join('; ');

        // Still save to history
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
          fromDictionary: true,
        };
      }

      // Not in dictionary - use Azure API
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

  // Dictionary search handlers (SQLite + FTS5)
  ipcMain.handle('dictionary-search', (_event, query: string, limit?: number) => {
    if (!isDictionaryReady()) {
      console.warn('Dictionary search called but database not ready');
      return [];
    }
    return searchDictionary(query, limit);
  });

  ipcMain.handle('dictionary-get', (_event, simplified: string) => {
    if (!isDictionaryReady()) {
      return null;
    }
    return getEntry(simplified);
  });

  ipcMain.handle('dictionary-get-many', (_event, simplifiedList: string[]) => {
    if (!isDictionaryReady()) {
      return {};
    }
    const entriesMap = getEntries(simplifiedList);
    // Convert Map to plain object for IPC serialization
    const result: Record<string, unknown> = {};
    entriesMap.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  });

  ipcMain.handle('dictionary-ready', () => {
    return isDictionaryReady();
  });

  // Clipboard popup handlers
  ipcMain.handle('hide-clipboard-popup', () => {
    hideClipboardPopup();
  });

  ipcMain.handle('open-in-app', (_event, chinese: string) => {
    // Show main window with lookup mode
    showMainWindow();
    mainWindow?.webContents.send('lookup-text', chinese);
  });

  ipcMain.handle('toggle-clipboard-monitor', (_event, enabled: boolean) => {
    store.set('clipboardMonitorEnabled', enabled);
    if (enabled) {
      registerPopupHotkey();
    } else {
      unregisterPopupHotkey();
    }
  });

  ipcMain.handle('get-clipboard-monitor-status', () => {
    return store.get('clipboardMonitorEnabled', false);
  });

  // Manual trigger for popup (for testing or alternative triggers)
  ipcMain.handle('trigger-clipboard-popup', async () => {
    const data = await triggerClipboardLookup();
    if (data) {
      showClipboardPopup(data);
    }
  });

  // =====================
  // Flashcard IPC handlers
  // =====================

  // Add a new flashcard
  ipcMain.handle('flashcard-add', (_event, data: { chinese: string; pinyin: string; english: string }) => {
    const result = addFlashcard(data);
    return { success: result !== null, flashcard: result };
  });

  // Get all flashcards
  ipcMain.handle('flashcard-get-all', () => {
    return getAllFlashcards();
  });

  // Get due flashcards
  ipcMain.handle('flashcard-get-due', () => {
    return getDueFlashcards();
  });

  // Get flashcard stats
  ipcMain.handle('flashcard-get-stats', () => {
    return getFlashcardStats();
  });

  // Check if flashcard exists
  ipcMain.handle('flashcard-exists', (_event, chinese: string) => {
    return flashcardExists(chinese);
  });

  // Delete flashcard
  ipcMain.handle('flashcard-delete', (_event, id: string) => {
    return { success: deleteFlashcard(id) };
  });

  // Update flashcard after review (using ts-fsrs)
  ipcMain.handle('flashcard-review', (_event, id: string, rating: number) => {
    const flashcard = getFlashcard(id);
    if (!flashcard) {
      return { success: false, error: 'Flashcard not found' };
    }

    try {
      // Reconstruct the FSRS card from stored data
      const card: Card = {
        due: new Date(flashcard.due),
        stability: flashcard.stability,
        difficulty: flashcard.difficulty,
        elapsed_days: flashcard.elapsed_days,
        scheduled_days: flashcard.scheduled_days,
        reps: flashcard.reps,
        lapses: flashcard.lapses,
        state: flashcard.state as State,
        last_review: flashcard.last_review ? new Date(flashcard.last_review) : undefined,
        learning_steps: 0,
      };

      // Apply FSRS algorithm with specific rating
      const f = fsrs();
      const now = new Date();
      const ratingKey = rating as Grade;
      const result = f.next(card, now, ratingKey);
      const newCard = result.card;

      // Update the flashcard in database
      const success = updateFlashcard(id, {
        due: newCard.due.toISOString(),
        stability: newCard.stability,
        difficulty: newCard.difficulty,
        elapsed_days: newCard.elapsed_days,
        scheduled_days: newCard.scheduled_days,
        reps: newCard.reps,
        lapses: newCard.lapses,
        state: newCard.state,
        last_review: now.toISOString(),
      });

      return { success, nextDue: newCard.due.toISOString() };
    } catch (error) {
      console.error('Error reviewing flashcard:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Get scheduling preview for a flashcard (shows intervals for each rating)
  ipcMain.handle('flashcard-get-intervals', (_event, id: string) => {
    const flashcard = getFlashcard(id);
    if (!flashcard) {
      return null;
    }

    try {
      const card: Card = {
        due: new Date(flashcard.due),
        stability: flashcard.stability,
        difficulty: flashcard.difficulty,
        elapsed_days: flashcard.elapsed_days,
        scheduled_days: flashcard.scheduled_days,
        reps: flashcard.reps,
        lapses: flashcard.lapses,
        state: flashcard.state as State,
        last_review: flashcard.last_review ? new Date(flashcard.last_review) : undefined,
        learning_steps: 0,
      };

      const f = fsrs();
      const now = new Date();

      // Get scheduling for each rating
      const againResult = f.next(card, now, Rating.Again);
      const hardResult = f.next(card, now, Rating.Hard);
      const goodResult = f.next(card, now, Rating.Good);
      const easyResult = f.next(card, now, Rating.Easy);

      // Return intervals for each rating
      return {
        again: againResult.card.scheduled_days,
        hard: hardResult.card.scheduled_days,
        good: goodResult.card.scheduled_days,
        easy: easyResult.card.scheduled_days,
      };
    } catch (error) {
      console.error('Error getting intervals:', error);
      return null;
    }
  });

  // Get flashcard by Chinese text (for in-deck indicator)
  ipcMain.handle('flashcard-get-by-chinese', (_event, chinese: string) => {
    return getFlashcardByChinese(chinese);
  });

  // =====================
  // Stats & Settings IPC handlers
  // =====================

  // Get streak and mastery stats
  ipcMain.handle('stats-get', () => {
    return getStreakStats();
  });

  // Update streak after completing a review
  ipcMain.handle('stats-update-streak', () => {
    return updateStreakAfterReview();
  });

  // Increment mastered count
  ipcMain.handle('stats-increment-mastered', () => {
    return incrementMastered();
  });

  // Exit prompt handlers
  ipcMain.handle('exit-prompt-should-show', () => {
    return shouldShowExitPrompt();
  });

  ipcMain.handle('exit-prompt-dismiss', () => {
    dismissExitPrompt();
    return { success: true };
  });

  // Ambient widget handlers
  ipcMain.handle('ambient-widget-get-enabled', () => {
    return getAmbientWidgetEnabled();
  });

  ipcMain.handle('ambient-widget-set-enabled', (_event, enabled: boolean) => {
    setAmbientWidgetEnabled(enabled);
    return { success: true };
  });

  // Notification settings handlers
  ipcMain.handle('notification-get-times', () => {
    return getNotificationTimes();
  });

  ipcMain.handle('notification-set-times', (_event, times: number[]) => {
    setNotificationTimes(times);
    // Reschedule notifications with new times
    setupNotificationScheduler();
    return { success: true };
  });

  // Exit prompt confirmation handlers
  ipcMain.handle('confirm-exit', () => {
    isQuitting = true;
    exitPromptShown = false;
    mainWindow?.close();
  });

  ipcMain.handle('cancel-exit', () => {
    exitPromptShown = false;
    // User cancelled, don't close
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
      clipboardMonitorEnabled: false,
    },
  });

  // Clear any stale pendingCapture flag from previous session
  // (prevents showing "No captured image found" error on startup)
  store.delete('pendingCapture');

  // Initialize dictionary database (SQLite + FTS5)
  try {
    initDictionaryDB();
    console.log('Dictionary database initialized');
  } catch (err) {
    console.error('Failed to initialize dictionary database:', err);
  }

  // Initialize user database (flashcards, etc.)
  try {
    initUserDB();
    console.log('User database initialized');
  } catch (err) {
    console.error('Failed to initialize user database:', err);
  }

  // Setup IPC handlers
  setupIpcHandlers();

  // Create tray and register hotkey
  createTray();
  registerHotkey();

  // Create and show main window on startup
  createMainWindow();
  mainWindow?.show();

  // Register popup hotkey if enabled
  const clipboardMonitorEnabled = store.get('clipboardMonitorEnabled', false);
  if (clipboardMonitorEnabled) {
    createClipboardPopup();
    registerPopupHotkey();
  }

  // Pre-initialize OCR worker
  await initOCRWorker();

  // Set up scheduled notifications
  setupNotificationScheduler();
});

app.on('window-all-closed', () => {
  // Don't quit on window close - keep running in tray
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (ocrWorker) {
    ocrWorker.terminate();
  }
  // Cancel scheduled notifications
  notificationJobs.forEach(job => job.cancel());
  notificationJobs = [];
  // Close databases
  closeDictionaryDB();
  closeUserDB();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
