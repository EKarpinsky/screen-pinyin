const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script executing...');

export interface ElectronAPI {
  getScreenshot: () => Promise<string | null>;
  getCapturedImage: () => Promise<string | null>;
  selectionComplete: (selection: { x: number; y: number; width: number; height: number }) => Promise<{
    imageData?: string;
    position?: { x: number; y: number };
    error?: string;
  }>;
  showResults: (position: { x: number; y: number }) => Promise<void>;
  cancelSelection: () => Promise<void>;
  closeResults: () => Promise<void>;
  getStoreValue: (key: string) => Promise<unknown>;
  setStoreValue: (key: string, value: unknown) => Promise<{ success: boolean }>;
  closeSettings: () => Promise<void>;
  performOCR: (imageData: string) => Promise<{
    success: boolean;
    text?: string;
    error?: string;
  }>;
  translate: (text: string) => Promise<{
    success: boolean;
    original?: string;
    pinyin?: string;
    translation?: string;
    error?: string;
  }>;
}

const electronAPI: ElectronAPI = {
  getScreenshot: () => ipcRenderer.invoke('get-screenshot'),
  getCapturedImage: () => ipcRenderer.invoke('get-captured-image'),
  selectionComplete: (selection) => ipcRenderer.invoke('selection-complete', selection),
  showResults: (position) => ipcRenderer.invoke('show-results', position),
  cancelSelection: () => ipcRenderer.invoke('cancel-selection'),
  closeResults: () => ipcRenderer.invoke('close-results'),
  getStoreValue: (key) => ipcRenderer.invoke('get-store-value', key),
  setStoreValue: (key, value) => ipcRenderer.invoke('set-store-value', key, value),
  closeSettings: () => ipcRenderer.invoke('close-settings'),
  performOCR: (imageData) => ipcRenderer.invoke('perform-ocr', imageData),
  translate: (text) => ipcRenderer.invoke('translate', text),
};

console.log('About to expose electronAPI...');
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
console.log('electronAPI exposed successfully');
