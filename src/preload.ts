// IMPORTANT: NO TypeScript interfaces or exports in this file!
// They cause Electron sandbox crashes. See TROUBLESHOOTING.md
// Keep type annotations minimal - they're compiled away but can cause issues.

const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  // Screenshot and capture
  getScreenshot: function() { return ipcRenderer.invoke('get-screenshot'); },
  getCapturedImage: function() { return ipcRenderer.invoke('get-captured-image'); },
  selectionComplete: function(selection) { return ipcRenderer.invoke('selection-complete', selection); },
  cancelSelection: function() { return ipcRenderer.invoke('cancel-selection'); },

  // Settings
  getStoreValue: function(key) { return ipcRenderer.invoke('get-store-value', key); },
  setStoreValue: function(key, value) { return ipcRenderer.invoke('set-store-value', key, value); },
  closeSettings: function() { return ipcRenderer.invoke('close-settings'); },

  // OCR and Translation
  performOCR: function(imageData) { return ipcRenderer.invoke('perform-ocr', imageData); },
  translate: function(text) { return ipcRenderer.invoke('translate', text); },

  // Word segmentation
  segmentText: function(text) { return ipcRenderer.invoke('segment-text', text); },

  // History API
  getHistory: function() { return ipcRenderer.invoke('get-history'); },
  addToHistory: function(item) { return ipcRenderer.invoke('add-to-history', item); },
  deleteHistoryItem: function(id) { return ipcRenderer.invoke('delete-history-item', id); },
  clearHistory: function() { return ipcRenderer.invoke('clear-history'); },

  // Results from history and pending capture
  getPendingCapture: function() { return ipcRenderer.invoke('get-pending-capture'); },
  getPendingResultsData: function() { return ipcRenderer.invoke('get-pending-results-data'); },
  showResultsWithData: function(data) { return ipcRenderer.invoke('show-results-with-data', data); },

  // Event listeners for single-window mode
  onNewCapture: function(callback) {
    ipcRenderer.on('new-capture', callback);
  },
  offNewCapture: function(callback) {
    ipcRenderer.removeListener('new-capture', callback);
  },
  onShowResultsFromHistory: function(callback) {
    ipcRenderer.on('show-results-from-history', callback);
  },
  offShowResultsFromHistory: function(callback) {
    ipcRenderer.removeListener('show-results-from-history', callback);
  },

  // Window controls (for custom titlebar)
  windowMinimize: function() { return ipcRenderer.invoke('window-minimize'); },
  windowMaximize: function() { return ipcRenderer.invoke('window-maximize'); },
  windowClose: function() { return ipcRenderer.invoke('window-close'); },

  // Dictionary search (SQLite + FTS5)
  dictionarySearch: function(query, limit) { return ipcRenderer.invoke('dictionary-search', query, limit); },
  dictionaryGet: function(simplified) { return ipcRenderer.invoke('dictionary-get', simplified); },
  dictionaryGetMany: function(simplifiedList) { return ipcRenderer.invoke('dictionary-get-many', simplifiedList); },
  dictionaryReady: function() { return ipcRenderer.invoke('dictionary-ready'); },

  // Clipboard monitor
  toggleClipboardMonitor: function(enabled) { return ipcRenderer.invoke('toggle-clipboard-monitor', enabled); },
  getClipboardMonitorStatus: function() { return ipcRenderer.invoke('get-clipboard-monitor-status'); },
  
  // Clipboard popup (for popup window)
  hideClipboardPopup: function() { return ipcRenderer.invoke('hide-clipboard-popup'); },
  openInApp: function(chinese) { return ipcRenderer.invoke('open-in-app', chinese); },
  onClipboardData: function(callback) {
    ipcRenderer.on('clipboard-data', callback);
  },
  offClipboardData: function(callback) {
    ipcRenderer.removeListener('clipboard-data', callback);
  },
  
  // Lookup text event (for main window)
  onLookupText: function(callback) {
    ipcRenderer.on('lookup-text', callback);
  },
  offLookupText: function(callback) {
    ipcRenderer.removeListener('lookup-text', callback);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
