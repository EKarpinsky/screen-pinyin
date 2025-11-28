// IMPORTANT: NO TypeScript interfaces or exports in this file!
// They cause Electron sandbox crashes. See TROUBLESHOOTING.md

const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  // Screenshot and capture
  getScreenshot: () => ipcRenderer.invoke('get-screenshot'),
  getCapturedImage: () => ipcRenderer.invoke('get-captured-image'),
  selectionComplete: (selection: any) => ipcRenderer.invoke('selection-complete', selection),
  cancelSelection: () => ipcRenderer.invoke('cancel-selection'),

  // Settings
  getStoreValue: (key: string) => ipcRenderer.invoke('get-store-value', key),
  setStoreValue: (key: string, value: any) => ipcRenderer.invoke('set-store-value', key, value),
  closeSettings: () => ipcRenderer.invoke('close-settings'),

  // OCR and Translation
  performOCR: (imageData: string) => ipcRenderer.invoke('perform-ocr', imageData),
  translate: (text: string) => ipcRenderer.invoke('translate', text),

  // History API
  getHistory: () => ipcRenderer.invoke('get-history'),
  addToHistory: (item: any) => ipcRenderer.invoke('add-to-history', item),
  deleteHistoryItem: (id: string) => ipcRenderer.invoke('delete-history-item', id),
  clearHistory: () => ipcRenderer.invoke('clear-history'),

  // Results from history and pending capture
  getPendingCapture: () => ipcRenderer.invoke('get-pending-capture'),
  getPendingResultsData: () => ipcRenderer.invoke('get-pending-results-data'),
  showResultsWithData: (data: any) => ipcRenderer.invoke('show-results-with-data', data),

  // Event listeners for single-window mode
  onNewCapture: (callback: () => void) => {
    ipcRenderer.on('new-capture', callback);
  },
  offNewCapture: (callback: () => void) => {
    ipcRenderer.removeListener('new-capture', callback);
  },
  onShowResultsFromHistory: (callback: () => void) => {
    ipcRenderer.on('show-results-from-history', callback);
  },
  offShowResultsFromHistory: (callback: () => void) => {
    ipcRenderer.removeListener('show-results-from-history', callback);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
