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
