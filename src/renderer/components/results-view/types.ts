// Types for results-view components

export interface HSKEntry {
  level: number;
  type: 'character' | 'word';
}

export interface SentenceEntry {
  s: string;  // simplified Chinese
  p: string;  // pinyin
  e: string;  // English
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

export interface CedictEntry {
  traditional: string;
  pinyin: string;
  definitions: string[];
}

export interface WordData {
  word: string;
  traditional: string;
  pinyin: string;
  definitions: string[];
  isMultiChar: boolean;
}

export type ViewMode = 'translation' | 'lookup';

export interface ResultsData {
  original: string;
  pinyin: string;
  translation: string;
  mode: ViewMode;
}

export interface ResultsViewWithDetailProps {
  data: ResultsData;
  onBack: () => void;
  onCopyAll?: () => void;
}

// Type for detail panel: either word or character
export type DetailType = 'word' | 'character';

export interface DetailState {
  type: DetailType;
  data: WordData | CharacterData;
}

// Cedict context type
export interface CedictContextType {
  getEntry: (key: string) => CedictEntry | undefined;
  cache: Record<string, CedictEntry>;
}

// Part of speech type
export type POS = 'verb' | 'noun' | 'adjective' | 'adverb' | 'unknown';

