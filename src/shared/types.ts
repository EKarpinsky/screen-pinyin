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

  // Dictionary search (SQLite + FTS5)
  dictionarySearch: (query: string, limit?: number) => Promise<SQLiteDictionaryEntry[]>;
  dictionaryGet: (simplified: string) => Promise<SQLiteDictionaryEntry | null>;
  dictionaryGetMany: (simplifiedList: string[]) => Promise<Record<string, SQLiteDictionaryEntry>>;
  dictionaryReady: () => Promise<boolean>;

  // Clipboard monitor
  toggleClipboardMonitor: (enabled: boolean) => Promise<void>;
  getClipboardMonitorStatus: () => Promise<boolean>;

  // Clipboard popup
  hideClipboardPopup: () => Promise<void>;
  openInApp: (chinese: string) => Promise<void>;
  onClipboardData: (callback: (event: unknown, data: { chinese: string; pinyin: string; english: string }) => void) => void;
  offClipboardData: (callback: (event: unknown, data: { chinese: string; pinyin: string; english: string }) => void) => void;

  // Lookup text event
  onLookupText: (callback: (event: unknown, chinese: string) => void) => void;
  offLookupText: (callback: (event: unknown, chinese: string) => void) => void;

  // Flashcard API
  flashcardAdd: (data: { chinese: string; pinyin: string; english: string }) => Promise<{ success: boolean; flashcard: FlashcardData | null }>;
  flashcardGetAll: () => Promise<FlashcardData[]>;
  flashcardGetDue: () => Promise<FlashcardData[]>;
  flashcardGetStats: () => Promise<FlashcardStats>;
  flashcardExists: (chinese: string) => Promise<boolean>;
  flashcardDelete: (id: string) => Promise<{ success: boolean }>;
  flashcardReview: (id: string, rating: number) => Promise<{ success: boolean; nextDue?: string; error?: string }>;
  flashcardGetIntervals: (id: string) => Promise<FlashcardIntervals | null>;
  flashcardGetByChinese: (chinese: string) => Promise<FlashcardData | null>;

  // Stats API
  statsGet: () => Promise<StreakStats>;
  statsUpdateStreak: () => Promise<{ currentStreak: number; longestStreak: number; streakIncremented: boolean }>;
  statsIncrementMastered: () => Promise<number>;

  // Exit prompt API
  exitPromptShouldShow: () => Promise<boolean>;
  exitPromptDismiss: () => Promise<{ success: boolean }>;
  onShowExitPrompt: (callback: (event: unknown, data: { dueCount: number }) => void) => void;
  offShowExitPrompt: (callback: (event: unknown, data: { dueCount: number }) => void) => void;
  confirmExit: () => Promise<void>;
  cancelExit: () => Promise<void>;

  // Ambient widget API
  ambientWidgetGetEnabled: () => Promise<boolean>;
  ambientWidgetSetEnabled: (enabled: boolean) => Promise<{ success: boolean }>;

  // Notification settings API
  notificationGetTimes: () => Promise<number[]>;
  notificationSetTimes: (times: number[]) => Promise<{ success: boolean }>;

  // Event listener for notification click
  onNavigateToFlashcards: (callback: () => void) => void;
  offNavigateToFlashcards: (callback: () => void) => void;
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

// SQLite dictionary entry (from FTS5 search)
export interface SQLiteDictionaryEntry {
  simplified: string;
  traditional: string;
  pinyin: string;
  definitions: string;
}

// Flashcard types
export interface FlashcardData {
  id: string;
  chinese: string;
  pinyin: string;
  english: string;
  due: string;           // ISO date string
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;         // 0=New, 1=Learning, 2=Review, 3=Relearning
  last_review: string | null;
  created_at: string;
}

export interface FlashcardStats {
  total: number;
  new: number;
  learning: number;
  review: number;
  due: number;
}

export interface FlashcardIntervals {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalMastered: number;
  lastReviewDate: string | null;
}
