// Define ElectronAPI interface here (NOT in preload to avoid sandbox crash)
export interface ElectronAPI {
  // Screenshot and capture
  getScreenshot: () => Promise<string | null>;
  getCapturedImage: () => Promise<string | null>;
  selectionComplete: (selection: Selection) => Promise<{ imageData?: string; position?: { x: number; y: number }; error?: string }>;
  cancelSelection: () => Promise<void>;

  // Settings
  getStoreValue: (key: string) => Promise<unknown>;
  setStoreValue: (key: string, value: unknown) => Promise<{ success: boolean }>;
  closeSettings: () => Promise<void>;

  // OCR and Translation
  performOCR: (imageData: string) => Promise<OCRResult>;
  translate: (text: string) => Promise<TranslationResponse>;

  // Word segmentation
  segmentText: (text: string) => Promise<SegmentationResult>;

  // History API
  getHistory: () => Promise<HistoryItem[]>;
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => Promise<{ success: boolean; item: HistoryItem }>;
  deleteHistoryItem: (id: string) => Promise<{ success: boolean }>;
  clearHistory: () => Promise<{ success: boolean }>;

  // Results from history and pending capture
  getPendingCapture: () => Promise<boolean>;
  getPendingResultsData: () => Promise<{ chinese: string; pinyin: string; english: string } | null>;
  showResultsWithData: (data: { chinese: string; pinyin: string; english: string }) => Promise<void>;

  // Event listeners for single-window mode
  onNewCapture: (callback: () => void) => void;
  offNewCapture: (callback: () => void) => void;
  onShowResultsFromHistory: (callback: () => void) => void;
  offShowResultsFromHistory: (callback: () => void) => void;

  // Window controls (for custom titlebar)
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
}

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

export interface TranslationResponse {
  success: boolean;
  original?: string;
  pinyin?: string;
  translation?: string;
  error?: string;
}

export interface OCRResult {
  success: boolean;
  text?: string;
  error?: string;
}

export interface HistoryItem {
  id: string;
  chinese: string;
  pinyin: string;
  english: string;
  timestamp: number;
}

export interface TaggedWord {
  word: string;
  tag: string;  // n=noun, v=verb, a=adjective, d=adverb, p=preposition, x=unknown, etc.
}

export interface SegmentationResult {
  success: boolean;
  segments: TaggedWord[];
  error?: string;
}

export interface WordData {
  word: string;
  traditional?: string;
  pinyin: string;
  definitions: string[];
}

export interface CedictEntry {
  traditional: string;
  pinyin: string;
  definitions: string[];
}
