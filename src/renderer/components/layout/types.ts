/**
 * Shared types for layout components
 */

export interface HistoryItem {
  id: string;
  chinese: string;
  pinyin: string;
  english: string;
  timestamp: number;
}

export interface CharacterData {
  character: string;
  pinyin: string[];
  definition: string;
  radical: string;
  decomposition: string;
  etymology: {
    type: string;
    phonetic?: string;
    semantic?: string;
    hint?: string;
  } | null;
}

export type ViewType = 'history' | 'settings' | 'search' | 'results' | 'flashcards' | 'flashcard-review';

export type ViewMode = 'translation' | 'lookup';

export interface ResultsData {
  original: string;
  pinyin: string;
  translation: string;
  mode: ViewMode;
}

