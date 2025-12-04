/**
 * Shared types for search components
 */

export interface HistoryItem {
  id: string;
  chinese: string;
  pinyin: string;
  english: string;
  timestamp: number;
}

export interface DictionaryEntry {
  character: string;
  pinyin: string[];
  definition: string;
}

export interface HSKEntry {
  level: number;
  type: 'character' | 'word';
}

// Re-export from shared types
export type { SQLiteDictionaryEntry } from '../../../shared/types';

export interface SearchViewProps {
  historyItems: HistoryItem[];
  onItemClick: (item: HistoryItem | { type: 'dictionary'; data: DictionaryEntry }) => void;
  onTranslateText: (text: string) => void;
}

