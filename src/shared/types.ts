import type { ElectronAPI } from '../preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TranslationResult {
  original: string;
  pinyin: string;
  translation: string;
}

export interface OCRResult {
  success: boolean;
  text?: string;
  error?: string;
}
