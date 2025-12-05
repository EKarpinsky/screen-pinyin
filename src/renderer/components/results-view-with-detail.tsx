import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react';
import { Copy, Check, X, ArrowLeft, ChevronLeft, BookOpen, Plus } from 'lucide-react';
import { useState, useEffect, useRef, useCallback, createContext, useContext, useMemo, type ReactNode } from 'react';

import cedictDictionaryJson from '../../data/cedict-dictionary.json';
import hanziDictionary from '../../data/hanzi-dictionary.json';
import hskDictionary from '../../data/hsk-dictionary.json';
import sentencesDictionary from '../../data/sentences-dictionary.json';
import { isVariantEntry, isSurnameEntry, isClassifierEntry, extractInlineClassifier } from '../../shared/definition-utils';
import { TaggedWord } from '../../shared/types';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { convertNumberedPinyin } from '../utils/pinyin';

import { ClassifierButton } from './results-view/ClassifierButton';
import { colors } from './results-view/colors';
import { HSKBadge } from './results-view/HSKBadge';
import { SectionLabel } from './results-view/SectionLabel';
import type {
  HSKEntry,
  SentenceEntry,
  CharacterData,
  CedictEntry,
  WordData,
  ResultsViewWithDetailProps,
  DetailState,
} from './results-view/types';
import { VariantButton } from './results-view/VariantButton';
import { ScrollArea } from './ui/scroll-area';

// Data
const dictionary = hanziDictionary as Record<string, CharacterData>;
const hskData = hskDictionary as Record<string, HSKEntry>;
const sentencesData = sentencesDictionary as Record<string, SentenceEntry[]>;
// Fallback to JSON if SQLite not available
const cedictJsonFallback = cedictDictionaryJson as Record<string, CedictEntry>;

// CedictData Context - provides dictionary data with SQLite-first lookup
interface CedictContextType {
  getEntry: (key: string) => CedictEntry | undefined;
  cache: Record<string, CedictEntry>;
}

const CedictContext = createContext<CedictContextType>({
  getEntry: (key) => cedictJsonFallback[key],
  cache: {},
});

// Provider component that loads from SQLite
function CedictProvider({ children, keysToLoad }: { children: ReactNode; keysToLoad: string[] }) {
  const [cache, setCache] = useState<Record<string, CedictEntry>>({});
  
  // Memoize keys string for stable dependency
  const keysString = useMemo(() => keysToLoad.join(','), [keysToLoad]);

  // Load entries from SQLite when keys change
  useEffect(() => {
    const loadEntries = async () => {
      // Filter to only keys we haven't loaded yet
      const keys = keysString.split(',').filter(Boolean);
      const keysToFetch = keys.filter(k => !cache[k]);
      if (keysToFetch.length === 0) return;

      try {
        // Check if SQLite is ready
        const isReady = await window.electronAPI.dictionaryReady?.();
        
        if (isReady) {
          // Batch fetch from SQLite - returns object { simplified: entry }
          const results = await window.electronAPI.dictionaryGetMany?.(keysToFetch);
          
          if (results && typeof results === 'object') {
            const newEntries: Record<string, CedictEntry> = {};
            for (const [key, entry] of Object.entries(results) as [string, { simplified: string; traditional: string; pinyin: string; definitions: string }][]) {
              if (entry) {
                newEntries[key] = {
                  traditional: entry.traditional,
                  pinyin: entry.pinyin,
                  // SQLite stores definitions as semicolon-separated string, filter empty entries
                  definitions: entry.definitions.split('; ').filter(d => d.trim() !== ''),
                };
              }
            }
            setCache(prev => ({ ...prev, ...newEntries }));
          }
        }
      } catch {
        // SQLite not available, will use JSON fallback
      }
    };

    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cache intentionally excluded to prevent re-fetching already-cached entries
  }, [keysString]);

  // Get entry: SQLite cache first, then JSON fallback
  const getEntry = useCallback((key: string): CedictEntry | undefined => {
    return cache[key] || cedictJsonFallback[key];
  }, [cache]);

  return (
    <CedictContext.Provider value={{ getEntry, cache }}>
      {children}
    </CedictContext.Provider>
  );
}

// Legacy global accessor for components that haven't been updated yet
// This allows gradual migration
let globalCedictGetter: ((key: string) => CedictEntry | undefined) | null = null;
const cedictData = new Proxy({} as Record<string, CedictEntry>, {
  get(_, key: string) {
    if (globalCedictGetter) {
      return globalCedictGetter(key);
    }
    return cedictJsonFallback[key];
  }
});

// Bridge component to connect Context to global getter
function CedictContextBridge() {
  const { getEntry } = useContext(CedictContext);
  
  useEffect(() => {
    globalCedictGetter = getEntry;
    return () => {
      globalCedictGetter = null;
    };
  }, [getEntry]);
  
  return null;
}

// Check if a character is Chinese
function isChineseChar(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return (code >= 0x4E00 && code <= 0x9FFF) ||
         (code >= 0x3400 && code <= 0x4DBF) ||
         (code >= 0x2E80 && code <= 0x2EFF) ||
         (code >= 0x2F00 && code <= 0x2FDF);
}

// Clean up definition text (convert numbered pinyin, strip inline CL)
// Uses extractInlineClassifier from shared/definition-utils.ts
function cleanDefinition(def: string): string {
  const { cleanDef } = extractInlineClassifier(def);
  return convertNumberedPinyin(cleanDef);
}

// Parse classifier string like "CL:張|张[zhang1],套[tao4],幅[fu2]" into structured data
function parseClassifiers(classifierString: string): Array<{ character: string; pinyin: string }> {
  if (!classifierString || !classifierString.startsWith('CL:')) return [];
  
  const content = classifierString.replace('CL:', '');
  const items = content.split(',');
  
  return items.map(item => {
    // Match patterns like "張|张[zhang1]" or just "张[zhang1]" or "张zhāng"
    // Handle both [pinyin1] format and already-converted tones
    const bracketMatch = item.match(/(?:[^|]+[|])?([^[]+)\[([^\]]+)\]/);
    if (bracketMatch) {
      const char = bracketMatch[1];
      const pinyinNum = bracketMatch[2];
      // Convert numbered pinyin to tone marks
      const pinyin = convertNumberedPinyin(`[${pinyinNum}]`);
      return { character: char.trim(), pinyin };
    }
    
    // Match pattern without brackets: "张zhāng"
    const directMatch = item.match(/(?:[^|]+[|])?([^\s]+?)([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+\d?)/i);
    if (directMatch) {
      const char = directMatch[1];
      const pinyin = directMatch[2];
      return { character: char.trim(), pinyin: pinyin.trim() };
    }
    
    return null;
  }).filter((item): item is { character: string; pinyin: string } => item !== null);
}

// isVariantEntry, isSurnameEntry, isClassifierEntry, filterDefinitions, extractInlineClassifier
// are imported from shared/definition-utils.ts

// Parse "variant of 兔[tu4]" or "variant of 兔tù" into structured data
function parseVariant(variantString: string): { character: string; pinyin: string; type: string } | null {
  if (!isVariantEntry(variantString)) return null;
  
  // Extract the type (e.g., "old variant", "archaic variant", or just "variant")
  const typeMatch = variantString.match(/^(old |archaic |Japanese |)?variant of /i);
  const type = typeMatch ? (typeMatch[1]?.trim() || '') + 'variant' : 'variant';
  
  // Extract character and pinyin from patterns like "兔[tu4]" or "兔tù" or "電|电[dian4]"
  const content = variantString.replace(/^(old |archaic |Japanese |)?variant of /i, '').trim();
  
  // Match pattern with brackets: "電|电[dian4]" or "兔[tu4]"
  const bracketMatch = content.match(/(?:([^|]+)[|])?([^[]+)\[([^\]]+)\]/);
  if (bracketMatch) {
    const char = bracketMatch[2];
    const pinyinNum = bracketMatch[3];
    const pinyin = convertNumberedPinyin(`[${pinyinNum}]`);
    return { character: char.trim(), pinyin, type };
  }
  
  // Match pattern without brackets: "兔tù" 
  const directMatch = content.match(/([^\s]+?)([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+\d?)/i);
  if (directMatch) {
    const [, char, pinyin] = directMatch;
    return { character: char.trim(), pinyin: pinyin.trim(), type };
  }
  
  // Just a character with no pinyin
  const charOnly = content.match(/^([^\s,;]+)/);
  if (charOnly) {
    return { character: charOnly[1].trim(), pinyin: '', type };
  }
  
  return null;
}

// Check if string contains only Chinese characters
function isAllChinese(str: string): boolean {
  return [...str].every(char => isChineseChar(char) || /\s/.test(char));
}

// Part of speech type
type POS = 'verb' | 'noun' | 'adjective' | 'adverb' | 'unknown';

// Map jieba POS tag to our POS type
// Common jieba tags: n=noun, v=verb, a=adjective, d=adverb, p=preposition, x=unknown
// See: https://github.com/fxsjy/jieba (ICTCLAS tagset)
function mapJiebaTagToPOS(tag: string): POS {
  const firstChar = tag.charAt(0).toLowerCase();
  switch (firstChar) {
    case 'n': {  // n, nr, ns, nt, nz, etc. (nouns)
      return 'noun';
    }
    case 'v': {  // v, vd, vn, etc. (verbs)
      return 'verb';
    }
    case 'a': {  // a, ad, an, etc. (adjectives)
      return 'adjective';
    }
    case 'd': {  // d (adverbs)
      return 'adverb';
    }
    default: {
      return 'unknown';
    }
  }
}

// Get color for POS
function getPOSColor(pos: POS): { rest: string; hover: string } {
  switch (pos) {
    case 'verb': {
      return { rest: colors.verb, hover: colors.verbHover };
    }
    case 'noun': {
      return { rest: colors.noun, hover: colors.nounHover };
    }
    case 'adjective': {
      return { rest: colors.adjective, hover: colors.adjectiveHover };
    }
    case 'adverb': {
      return { rest: colors.adverb, hover: colors.adverbHover };
    }
    default: {
      return { rest: 'var(--foreground)', hover: 'var(--hover-bg)' };
    }
  }
}

// Clickable character with tooltip (for use in word detail and examples)
function ClickableChar({
  char,
  onClick,
  size = '2.5rem',
  highlight = false,
}: {
  char: string;
  onClick: () => void;
  size?: string;
  highlight?: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const charData = dictionary[char];
  const isClickable = !!charData;

  const { refs, floatingStyles, context } = useFloating({
    open: showTooltip,
    onOpenChange: setShowTooltip,
    placement: 'top',
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, { move: false, delay: { open: 300, close: 100 } });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  if (!isClickable) {
    return (
      <span style={{
        fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
        fontSize: size,
        color: highlight ? colors.primary : colors.foreground,
        fontWeight: highlight ? 600 : 400,
      }}>
        {char}
      </span>
    );
  }

  // Get definition - Priority: CC-CEDICT (filtered) → CC-CEDICT (any) → makemeahanzi fallback
  const allDefs = cedictData[char]?.definitions || [];
  const filteredDef = allDefs.find((d: string) => 
    !d.startsWith('CL:') && !isVariantEntry(d) && !isSurnameEntry(d)
  );
  const cedictDef = filteredDef || allDefs.find((d: string) => !d.startsWith('CL:'));
  const definition = convertNumberedPinyin(cedictDef || charData?.definition || '—');
  const pinyin = charData?.pinyin?.length > 0 ? charData.pinyin.join(', ') : '—';
  const hskLevel = hskData[char]?.level;

  return (
    <>
      <button
        type="button"
        ref={refs.setReference}
        {...getReferenceProps()}
        onClick={onClick}
        style={{
          fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
          fontSize: size,
          color: highlight ? colors.primary : colors.foreground,
          fontWeight: highlight ? 600 : 400,
          cursor: 'pointer',
          transition: 'color 0.15s',
          display: 'inline-block',
          background: 'none',
          border: 'none',
          padding: 0,
          margin: 0,
        }}
        onMouseOver={(e) => { e.currentTarget.style.color = colors.primary; }}
        onMouseOut={(e) => { e.currentTarget.style.color = highlight ? colors.primary : colors.foreground; }}
        onFocus={(e) => { e.currentTarget.style.color = colors.primary; }}
        onBlur={(e) => { e.currentTarget.style.color = highlight ? colors.primary : colors.foreground; }}
      >
        {char}
      </button>

      <FloatingPortal>
        {showTooltip && (
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              zIndex: 1000,
              background: 'rgba(0, 0, 0, 0.9)',
              color: 'white',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: '0.8rem',
              maxWidth: 250,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              pointerEvents: 'none',
            }}
            {...getFloatingProps()}
          >
            <div style={{
              fontFamily: '"Consolas", "Monaco", monospace',
              fontSize: '0.85rem',
              color: 'rgba(255,255,255,0.7)',
              marginBottom: 4,
            }}>
              {pinyin}
            </div>
            <div style={{
              fontSize: '0.875rem',
              lineHeight: 1.4,
              color: 'white',
            }}>
              {definition.length > 60 ? definition.slice(0, 60) + '...' : definition}
            </div>
            {hskLevel && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 8px',
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 4,
                fontSize: '0.7rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                color: 'white',
                marginTop: 6,
                alignSelf: 'flex-start',
              }}>
                HSK {hskLevel}
              </span>
            )}
          </div>
        )}
      </FloatingPortal>
    </>
  );
}

// Clickable word component (visual grouping for multi-character words)
function ClickableWord({
  word,
  tag,
  onClick,
  size = '3.5rem',
}: {
  word: string;
  tag: string;  // POS tag from nodejieba: n=noun, v=verb, a=adj, d=adverb, etc.
  onClick: () => void;
  size?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Floating UI setup - must be called before any early returns
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top',
    middleware: [
      offset(8),
      flip({ fallbackAxisSideDirection: 'start', padding: 8 }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, { move: false, delay: { open: 200, close: 0 } });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss]);

  // Guard against undefined/empty word
  if (!word) {
    return null;
  }
  
  // Check if word has definition in CEDICT or character dictionary
  const wordData = cedictData[word];
  const charData = word.length === 1 ? dictionary[word] : undefined;
  const hasWordDef = wordData !== undefined;
  const hasCharDef = charData !== undefined;
  const isClickable = hasWordDef || hasCharDef;
  const isChinese = isAllChinese(word) && word.trim() !== '';
  
  // Get HSK level
  const hskEntry = hskData[word];
  const hskLevel = hskEntry?.level;
  
  // Get definition text
  let definition = '';
  let pinyin = '';
  if (wordData) {
    const allDefs = wordData.definitions || [];
    const filteredDefs = allDefs.filter((d: string) => 
      !d.startsWith('CL:') && !isVariantEntry(d) && !isSurnameEntry(d)
    );
    const defsToShow = filteredDefs.length > 0 ? filteredDefs : allDefs.filter((d: string) => !d.startsWith('CL:'));
    definition = convertNumberedPinyin(defsToShow.slice(0, 2).join('; '));
    pinyin = convertNumberedPinyin(wordData.pinyin);
  } else if (charData) {
    // Priority: CC-CEDICT (filtered) → CC-CEDICT (any) → makemeahanzi fallback
    const allDefs = cedictData[word]?.definitions || [];
    const filteredDef = allDefs.find((d: string) => 
      !d.startsWith('CL:') && !isVariantEntry(d) && !isSurnameEntry(d)
    );
    const cedictDef = filteredDef || allDefs.find((d: string) => !d.startsWith('CL:'));
    definition = convertNumberedPinyin(cedictDef || charData.definition || '');
    pinyin = charData.pinyin?.join(', ') || '';
  }
  
  const hasTooltipContent = definition || pinyin || hskLevel;

  // For punctuation and non-Chinese, just render as-is
  if (!isChinese) {
    return (
      <span style={{
        fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
        fontSize: size,
        color: colors.foreground,
      }}>
        {word}
      </span>
    );
  }

  // Map jieba tag to POS type
  const posFromTag = mapJiebaTagToPOS(tag);
  const posColor = getPOSColor(posFromTag);

  return (
    <>
      <button
        type="button"
        ref={refs.setReference}
        {...getReferenceProps()}
        onClick={isClickable ? onClick : undefined}
        style={{
          display: 'inline-block',
          fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
          fontSize: size,
          color: isOpen ? colors.primary : posColor.rest,
          cursor: isClickable ? 'pointer' : 'default',
          padding: '2px 4px',
          marginLeft: -4,
          marginRight: -4,
          borderRadius: 4,
          backgroundColor: isOpen ? posColor.hover : 'transparent',
          transition: 'all 0.15s ease',
          transform: isOpen ? 'translateY(-1px)' : 'none',
          border: 'none',
        }}
      >
        {word}
      </button>
      
      {/* Tooltip via FloatingPortal */}
      <FloatingPortal>
        {isOpen && hasTooltipContent && (
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              backgroundColor: colors.foreground,
              color: colors.card,
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: '0.75rem',
              fontFamily: 'system-ui, sans-serif',
              maxWidth: 280,
              zIndex: 9999,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              animation: 'fadeIn 0.15s ease-out',
            }}
            {...getFloatingProps()}
          >
            {/* Pinyin */}
            {pinyin && (
              <div style={{ 
                fontFamily: '"Consolas", "Monaco", monospace',
                marginBottom: definition ? 4 : 0,
                opacity: 0.8,
              }}>
                {pinyin}
              </div>
            )}
            
            {/* Definition */}
            {definition && (
              <div style={{ 
                lineHeight: 1.4,
              }}>
                {definition.length > 80 ? definition.slice(0, 80) + '...' : definition}
              </div>
            )}
            
            {/* HSK Level */}
            {hskLevel && (
              <div style={{
                marginTop: 6,
                display: 'inline-block',
                padding: '2px 6px',
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 3,
                fontSize: '0.65rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}>
                HSK {hskLevel}
              </div>
            )}
          </div>
        )}
      </FloatingPortal>
    </>
  );
}

export function ResultsViewWithDetail({ data, onBack, onCopyAll }: ResultsViewWithDetailProps) {
  const [segmentedWords, setSegmentedWords] = useState<TaggedWord[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<DetailState | null>(null);
  const [detailHistory, setDetailHistory] = useState<DetailState[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'structure'>('overview');
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [currentWordExampleIndex, setCurrentWordExampleIndex] = useState(0);
  const detailRef = useRef<HTMLDivElement>(null);
  
  // Flashcard state
  const [isInDeck, setIsInDeck] = useState(false);
  const [addedToDeck, setAddedToDeck] = useState(false);

  const hasDetail = selectedDetail !== null;

  // Check if this is a lookup (single word/char exploration) vs full translation
  const isLookupMode = data.mode === 'lookup';

  // Collect all unique characters/words that need dictionary lookup
  const keysToLoad = useMemo(() => {
    const keys = new Set<string>([data.original]);
    // Add original text and its characters

    for (const char of data.original) {
      if (/[\u4E00-\u9FFF]/.test(char)) {
        keys.add(char);
      }
    }
    // Add segmented words
    for (const { word } of segmentedWords) {
      if (word && /[\u4E00-\u9FFF]/.test(word)) {
        keys.add(word);
        for (const char of word) {
          if (/[\u4E00-\u9FFF]/.test(char)) {
            keys.add(char);
          }
        }
      }
    }
    // Add selected detail character/word
    if (selectedDetail) {
      if (selectedDetail.type === 'word') {
        const wordData = selectedDetail.data as WordData;
        keys.add(wordData.word);
        for (const char of wordData.word) {
          keys.add(char);
        }
      } else {
        const charData = selectedDetail.data as CharacterData;
        keys.add(charData.character);
      }
    }
    return [...keys];
  }, [data.original, segmentedWords, selectedDetail]);

  // Segment text on mount or data change
  useEffect(() => {
    const segmentText = async () => {
      try {
        const result = await window.electronAPI.segmentText(data.original);
        if (result.success && result.segments) {
          setSegmentedWords(result.segments);
        } else {
          // Fallback: split by character with unknown tag
          setSegmentedWords([...data.original].map(char => ({ word: char, tag: 'x' })));
        }
      } catch (error) {
        console.error('Segmentation failed:', error);
        // Fallback: split by character with unknown tag
        setSegmentedWords([...data.original].map(char => ({ word: char, tag: 'x' })));
      }
    };
    segmentText();
  }, [data.original]);

  // Get current flashcard data (from selected detail or original data)
  const getFlashcardData = useCallback(() => {
    if (selectedDetail) {
      if (selectedDetail.type === 'word') {
        const wordData = selectedDetail.data as WordData;
        return {
          chinese: wordData.word,
          pinyin: wordData.pinyin,
          english: wordData.definitions.slice(0, 3).join('; '),
        };
      } else {
        const charData = selectedDetail.data as CharacterData;
        return {
          chinese: charData.character,
          pinyin: charData.pinyin.join(', '),
          english: charData.definition,
        };
      }
    }
    return {
      chinese: data.original,
      pinyin: data.pinyin,
      english: data.translation,
    };
  }, [selectedDetail, data]);

  // Check if card exists in flashcard deck
  useEffect(() => {
    const checkFlashcard = async () => {
      try {
        const flashcardData = getFlashcardData();
        const exists = await window.electronAPI.flashcardExists(flashcardData.chinese);
        setIsInDeck(exists);
        setAddedToDeck(false);
      } catch (error) {
        console.error('Failed to check flashcard:', error);
      }
    };
    checkFlashcard();
  }, [getFlashcardData]);

  // Handler for adding to flashcard deck
  const handleAddToFlashcards = async () => {
    console.log('[Flashcard] Button clicked, isInDeck:', isInDeck, 'addedToDeck:', addedToDeck);
    if (isInDeck || addedToDeck) {
      console.log('[Flashcard] Already in deck or added, skipping');
      return;
    }
    
    try {
      const flashcardData = getFlashcardData();
      console.log('[Flashcard] Adding:', flashcardData);
      const result = await window.electronAPI.flashcardAdd(flashcardData);
      console.log('[Flashcard] Result:', result);
      
      if (result.success) {
        setAddedToDeck(true);
        setIsInDeck(true);
      }
    } catch (error) {
      console.error('[Flashcard] Failed to add:', error);
    }
  };

  // In lookup mode, automatically show detail panel for the word/character
  useEffect(() => {
    if (isLookupMode && data.original) {
      // Try to find word data first (for multi-char lookups)
      const wordData = cedictData[data.original];
      if (wordData && data.original.length > 1) {
        setSelectedDetail({
          type: 'word',
          data: {
            word: data.original,
            traditional: wordData.traditional,
            pinyin: wordData.pinyin,
            definitions: wordData.definitions,
            isMultiChar: true,
          }
        });
      } else {
        // Fall back to character data from hanzi dictionary
        const charData = dictionary[data.original] || dictionary[data.original[0]];
        if (charData) {
          setSelectedDetail({ type: 'character', data: charData });
        } else {
          // Create fallback CharacterData from the passed-in data (from search result)
          // This handles characters that exist in CEDICT but not in hanzi dictionary
          const fallbackCharData: CharacterData = {
            character: data.original,
            pinyin: data.pinyin ? data.pinyin.split(', ') : [],
            definition: data.translation || '',
            radical: '',
            decomposition: '',
            etymology: { type: 'unknown' },
          };
          setSelectedDetail({ type: 'character', data: fallbackCharData });
        }
      }
      setActiveTab('overview');
      setCurrentExampleIndex(0);
      setCurrentWordExampleIndex(0);
    }
  }, [isLookupMode, data.original, data.pinyin, data.translation]);

  // Handle ESC key
  const handleEscapeKey = useCallback(() => {
    if (detailHistory.length > 0) {
      // Go back in detail history
      const prev = detailHistory.at(-1);
      setDetailHistory(detailHistory.slice(0, -1));
      setSelectedDetail(prev);
    } else if (isLookupMode) {
      // In lookup mode, ESC goes back to previous view
      onBack();
    } else if (hasDetail) {
      // Close detail panel
      setSelectedDetail(null);
      setDetailHistory([]);
      setActiveTab('overview');
    } else {
      onBack();
    }
  }, [hasDetail, detailHistory, onBack, isLookupMode]);

  useKeyboardShortcut('escape', handleEscapeKey, { deps: [handleEscapeKey] });

  // Scroll detail panel to top when detail changes
  useEffect(() => {
    if (detailRef.current) {
      detailRef.current.scrollTop = 0;
    }
  }, [selectedDetail]);

  // Get word data from CEDICT
  const getWordData = (word: string): WordData | null => {
    const cedict = cedictData[word];
    if (cedict) {
      return {
        word,
        traditional: cedict.traditional,
        pinyin: cedict.pinyin,
        definitions: cedict.definitions,
        isMultiChar: word.length > 1,
      };
    }
    return null;
  };

  // Get character data from hanzi dictionary
  const getCharacterData = (char: string): CharacterData | null => {
    return dictionary[char] || null;
  };

  const handleWordClick = (word: string) => {
    // For single characters, go directly to character detail
    if (word.length === 1) {
      const charData = getCharacterData(word);
      if (charData) {
        if (selectedDetail) {
          setDetailHistory([...detailHistory, selectedDetail]);
        }
        setSelectedDetail({ type: 'character', data: charData });
        setActiveTab('overview');
        setCurrentExampleIndex(0);
      }
    } else {
      // For multi-character words, show word detail
      const wordData = getWordData(word);
      if (wordData) {
        if (selectedDetail) {
          setDetailHistory([...detailHistory, selectedDetail]);
        }
        setSelectedDetail({ type: 'word', data: wordData });
        setActiveTab('overview');
        setCurrentWordExampleIndex(0);
      } else {
        // If no word entry, fall back to first character
        const charData = getCharacterData(word[0]);
        if (charData) {
          if (selectedDetail) {
            setDetailHistory([...detailHistory, selectedDetail]);
          }
          setSelectedDetail({ type: 'character', data: charData });
          setActiveTab('overview');
          setCurrentExampleIndex(0);
        }
      }
    }
  };

  const handleCharacterClick = (char: string) => {
    const charData = getCharacterData(char);
    if (charData) {
      if (selectedDetail) {
        setDetailHistory([...detailHistory, selectedDetail]);
      }
      setSelectedDetail({ type: 'character', data: charData });
      setActiveTab('overview');
      setCurrentExampleIndex(0);
    }
  };

  const handleDetailBack = () => {
    if (detailHistory.length > 0) {
      const prev = detailHistory.at(-1);
      setDetailHistory(detailHistory.slice(0, -1));
      setSelectedDetail(prev);
      setActiveTab('overview');
      setCurrentExampleIndex(0);
    } else {
      handleCloseDetail();
    }
  };

  const handleCloseDetail = () => {
    setSelectedDetail(null);
    setDetailHistory([]);
    setActiveTab('overview');
    setCurrentExampleIndex(0);
  };

  const handleCopy = async () => {
    const text = `${data.original}\n${data.pinyin}\n${data.translation}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopyAll?.();
  };

  // Render the segmented words
  const renderSegmentedText = (size: string = '3.5rem') => {
    // Debug: log what we're rendering
    console.log('Rendering segmentedWords:', segmentedWords);
    
    if (!segmentedWords || segmentedWords.length === 0) {
      // Fallback: render original text as single clickable unit
      return (
        <span style={{
          fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
          fontSize: size,
          color: colors.foreground,
        }}>
          {data.original}
        </span>
      );
    }
    
    return segmentedWords.map((tagged, index) => (
      <ClickableWord
        key={index}
        word={tagged?.word || ''}
        tag={tagged?.tag || 'x'}
        onClick={() => handleWordClick(tagged?.word || '')}
        size={size}
      />
    ));
  };

  // Get current character for character detail panel
  const currentCharacter = selectedDetail?.type === 'character' ? selectedDetail.data as CharacterData : null;
  const currentWord = selectedDetail?.type === 'word' ? selectedDetail.data as WordData : null;

  // Get sentences for current character
  const characterSentences = currentCharacter ? (sentencesData[currentCharacter.character] || []) : [];

  // Get sentences for current word (search for sentences containing the word)
  const getWordSentences = (word: string): SentenceEntry[] => {
    // First try to get sentences indexed by the first character
    const firstCharSentences = sentencesData[word[0]] || [];
    // Filter to find sentences that contain the full word
    const matchingSentences = firstCharSentences.filter(s => s.s.includes(word));
    
    // If we don't find enough, also check other characters in the word
    if (matchingSentences.length < 2 && word.length > 1) {
      for (let i = 1; i < word.length && matchingSentences.length < 5; i++) {
        const charSentences = sentencesData[word[i]] || [];
        for (const sentence of charSentences) {
          if (sentence.s.includes(word) && !matchingSentences.some(m => m.s === sentence.s)) {
            matchingSentences.push(sentence);
            if (matchingSentences.length >= 5) break;
          }
        }
      }
    }
    
    return matchingSentences.slice(0, 5);
  };

  const wordSentences = currentWord ? getWordSentences(currentWord.word) : [];

  return (
    <CedictProvider keysToLoad={keysToLoad}>
      <CedictContextBridge />
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden', backgroundColor: colors.background }}>
        <style>{`
        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Left Column: Translation (hidden in lookup mode) */}
      {!isLookupMode && (
      <div
        style={{
          width: hasDetail ? '35%' : '100%',
          borderRight: hasDetail ? `1px solid ${colors.border}` : 'none',
          transition: 'width 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: colors.background,
          overflow: 'hidden',
        }}
      >
        <ScrollArea style={{ flex: 1 }}>
          <div style={{
            padding: '24px 32px 32px 32px',
            minHeight: '100%',
          }}>
          {/* Back button */}
          <button
            onClick={onBack}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              padding: '6px 0',
              fontSize: '0.875rem',
              color: colors.muted,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 20,
              transition: 'color 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = colors.foreground; }}
            onMouseOut={(e) => { e.currentTarget.style.color = colors.muted; }}
            onFocus={(e) => { e.currentTarget.style.color = colors.foreground; }}
            onBlur={(e) => { e.currentTarget.style.color = colors.muted; }}
          >
            <ArrowLeft size={16} />
            Back to History
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Chinese Text - now with word segmentation */}
            <div style={{ animation: 'slideUp 0.4s ease-out' }}>
              <div style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: colors.muted,
                marginBottom: 8,
              }}>
                Original Text
                <span style={{ 
                  marginLeft: 8, 
                  fontWeight: 400, 
                  fontSize: '0.65rem',
                  opacity: 0.7,
                }}>
                  (click words to explore)
                </span>
              </div>
              <div style={{
                fontSize: hasDetail ? '2.25rem' : '3.5rem',
                fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
                fontWeight: 500,
                color: colors.foreground,
                lineHeight: 1.4,
                letterSpacing: '0.02em',
                transition: 'font-size 0.4s ease-out',
              }}>
                {renderSegmentedText(hasDetail ? '2.25rem' : '3.5rem')}
              </div>
            </div>

            {/* Pinyin */}
            <div style={{ animation: 'slideUp 0.4s 0.1s ease-out backwards' }}>
              <div style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: colors.muted,
                marginBottom: 6,
              }}>
                Pinyin
              </div>
              <p style={{
                fontSize: hasDetail ? '0.95rem' : '1.15rem',
                fontFamily: '"Consolas", "Monaco", monospace',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                letterSpacing: '0.03em',
                margin: 0,
                transition: 'font-size 0.4s ease-out',
              }}>
                {data.pinyin}
              </p>
            </div>

            {/* Translation */}
            <div style={{ animation: 'slideUp 0.4s 0.2s ease-out backwards' }}>
              <div style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: colors.muted,
                marginBottom: 6,
              }}>
                Translation
              </div>
              <p style={{
                fontSize: hasDetail ? '0.9rem' : '1.05rem',
                color: colors.foreground,
                lineHeight: 1.6,
                margin: 0,
                transition: 'font-size 0.4s ease-out',
              }}>
                {data.translation}
              </p>
            </div>

            {/* Action Buttons - only show when no detail panel */}
            {!hasDetail && (
              <div style={{ 
                animation: 'slideUp 0.4s 0.3s ease-out backwards',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                maxWidth: 320,
              }}>
                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    border: `1px solid ${colors.border}`,
                    backgroundColor: copied ? colors.foreground : 'var(--muted)',
                    padding: '14px 24px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: copied ? colors.card : colors.foreground,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => {
                    if (!copied) {
                      e.currentTarget.style.backgroundColor = colors.foreground;
                      e.currentTarget.style.color = colors.card;
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!copied) {
                      e.currentTarget.style.backgroundColor = 'var(--muted)';
                      e.currentTarget.style.color = colors.foreground;
                    }
                  }}
                  onFocus={(e) => {
                    if (!copied) {
                      e.currentTarget.style.backgroundColor = colors.foreground;
                      e.currentTarget.style.color = colors.card;
                    }
                  }}
                  onBlur={(e) => {
                    if (!copied) {
                      e.currentTarget.style.backgroundColor = 'var(--muted)';
                      e.currentTarget.style.color = colors.foreground;
                    }
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy All'}
                </button>

                {/* Add to Flashcards Button */}
                <button
                  onClick={handleAddToFlashcards}
                  disabled={isInDeck}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    border: `1px solid ${isInDeck || addedToDeck ? 'var(--border)' : colors.primary}`,
                    backgroundColor: isInDeck || addedToDeck ? 'var(--muted)' : 'transparent',
                    padding: '14px 24px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: isInDeck || addedToDeck ? colors.muted : colors.primary,
                    cursor: isInDeck ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                    opacity: isInDeck && !addedToDeck ? 0.7 : 1,
                  }}
                  onMouseOver={(e) => {
                    if (!isInDeck && !addedToDeck) {
                      e.currentTarget.style.backgroundColor = colors.primary;
                      e.currentTarget.style.color = colors.card;
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isInDeck && !addedToDeck) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = colors.primary;
                    }
                  }}
                  onFocus={(e) => {
                    if (!isInDeck && !addedToDeck) {
                      e.currentTarget.style.backgroundColor = colors.primary;
                      e.currentTarget.style.color = colors.card;
                    }
                  }}
                  onBlur={(e) => {
                    if (!isInDeck && !addedToDeck) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = colors.primary;
                    }
                  }}
                >
                  {addedToDeck ? <Check size={16} /> : (isInDeck ? <BookOpen size={16} /> : <Plus size={16} />)}
                  {addedToDeck ? 'Added to Deck!' : (isInDeck ? 'Already in Deck' : 'Add to Flashcards')}
                </button>
              </div>
            )}
          </div>
        </div>
        </ScrollArea>
      </div>
      )}

      {/* Right Column: Detail Panel (Word or Character) */}
      {hasDetail && (
        <div
          style={{
            width: isLookupMode ? '100%' : '65%',
            animation: isLookupMode ? 'fadeIn 0.3s ease-out' : 'slideInFromRight 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: colors.background,
          }}
        >
          {/* Header with back/close buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${colors.border}`,
            padding: '16px 24px',
            animation: 'fadeIn 0.3s ease-out',
          }}>
            <button
              onClick={detailHistory.length > 0 ? handleDetailBack : onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.75rem',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: colors.muted,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                transition: 'color 0.15s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = colors.foreground; }}
              onMouseOut={(e) => { e.currentTarget.style.color = colors.muted; }}
              onFocus={(e) => { e.currentTarget.style.color = colors.foreground; }}
              onBlur={(e) => { e.currentTarget.style.color = colors.muted; }}
            >
              <ChevronLeft size={16} />
              {detailHistory.length > 0 ? 'Previous' : (isLookupMode ? 'Back' : 'Close')}
            </button>
            <div style={{
              fontSize: '0.65rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: colors.muted,
              padding: '4px 10px',
              backgroundColor: colors.wordHighlight,
              borderRadius: 4,
            }}>
              {selectedDetail.type === 'word' ? 'Word' : 'Character'}
            </div>
            <button
              onClick={isLookupMode ? onBack : handleCloseDetail}
              style={{
                color: colors.muted,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                transition: 'color 0.15s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = colors.foreground; }}
              onMouseOut={(e) => { e.currentTarget.style.color = colors.muted; }}
              onFocus={(e) => { e.currentTarget.style.color = colors.foreground; }}
              onBlur={(e) => { e.currentTarget.style.color = colors.muted; }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Display - Word or Character */}
          <div style={{
            borderBottom: `1px solid ${colors.border}`,
            padding: '20px 24px',
            backgroundColor: colors.card,
            animation: 'fadeIn 0.3s ease-out',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: currentWord ? '4rem' : '5rem',
              fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
              fontWeight: 500,
              color: colors.foreground,
              lineHeight: 1,
            }}>
              {currentWord ? currentWord.word : currentCharacter?.character}
            </div>

            {/* Add to Flashcards Button - in detail view */}
            <button
              onClick={handleAddToFlashcards}
              disabled={isInDeck}
              style={{
                marginTop: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                border: `1px solid ${isInDeck || addedToDeck ? colors.border : colors.primary}`,
                backgroundColor: isInDeck || addedToDeck ? 'var(--muted)' : 'transparent',
                padding: '10px 20px',
                fontSize: '0.8rem',
                fontWeight: 500,
                color: isInDeck || addedToDeck ? colors.muted : colors.primary,
                cursor: isInDeck ? 'default' : 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
                opacity: isInDeck && !addedToDeck ? 0.7 : 1,
                borderRadius: 6,
              }}
              onMouseOver={(e) => {
                if (!isInDeck && !addedToDeck) {
                  e.currentTarget.style.backgroundColor = colors.primary;
                  e.currentTarget.style.color = colors.card;
                }
              }}
              onMouseOut={(e) => {
                if (!isInDeck && !addedToDeck) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = colors.primary;
                }
              }}
              onFocus={(e) => {
                if (!isInDeck && !addedToDeck) {
                  e.currentTarget.style.backgroundColor = colors.primary;
                  e.currentTarget.style.color = colors.card;
                }
              }}
              onBlur={(e) => {
                if (!isInDeck && !addedToDeck) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = colors.primary;
                }
              }}
            >
              {addedToDeck ? <Check size={14} /> : (isInDeck ? <BookOpen size={14} /> : <Plus size={14} />)}
              {addedToDeck ? 'Added!' : (isInDeck ? 'In Deck' : 'Add to Flashcards')}
            </button>
          </div>

          {/* Tab Bar - only show for character detail */}
          {currentCharacter && (
            <div style={{
              borderBottom: `1px solid ${colors.border}`,
              backgroundColor: colors.card,
            }}>
              <div style={{ display: 'flex', paddingLeft: 24 }}>
                {(['overview', 'structure'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      position: 'relative',
                      padding: '12px 20px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: activeTab === tab ? colors.foreground : colors.muted,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'color 0.15s',
                    }}
                    onMouseOver={(e) => {
                      if (activeTab !== tab) e.currentTarget.style.color = colors.foreground;
                    }}
                    onMouseOut={(e) => {
                      if (activeTab !== tab) e.currentTarget.style.color = colors.muted;
                    }}
                    onFocus={(e) => {
                      if (activeTab !== tab) e.currentTarget.style.color = colors.foreground;
                    }}
                    onBlur={(e) => {
                      if (activeTab !== tab) e.currentTarget.style.color = colors.muted;
                    }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {activeTab === tab && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 2,
                        backgroundColor: colors.primary,
                      }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <ScrollArea style={{ flex: 1 }}>
            <div
              ref={detailRef}
              style={{
                padding: '24px',
              }}
            >
            {/* WORD DETAIL VIEW */}
            {currentWord && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Pinyin with HSK badge */}
                <div style={{ animation: 'slideUp 0.3s ease-out' }}>
                  <div style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: colors.muted,
                    marginBottom: 6,
                  }}>
                    Pinyin
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <p style={{
                      fontSize: '1.5rem',
                      fontFamily: '"Consolas", "Monaco", monospace',
                      color: 'var(--foreground)',
                      letterSpacing: '0.03em',
                      margin: 0,
                    }}>
                      {currentWord.pinyin}
                    </p>
                    {hskData[currentWord.word] && (
                      <HSKBadge level={hskData[currentWord.word].level} />
                    )}
                  </div>
                </div>

                {/* Definitions (filtered - no CL: entries) */}
                {(() => {
                  // Filter out standalone CL: entries from display
                  const regularDefs = currentWord.definitions.filter(def => !isClassifierEntry(def));
                  
                  // Get standalone CL: entries
                  const standaloneCLs = currentWord.definitions.filter(def => isClassifierEntry(def));
                  
                  // Extract inline CLs like "(CL:首shǒu,支zhī)" from regular definitions
                  const inlineCLs = regularDefs
                    .map(def => extractInlineClassifier(def).classifier)
                    .filter((cl): cl is string => cl !== null);
                  
                  // Combine all classifier sources
                  const allClassifiers = [...standaloneCLs, ...inlineCLs].flatMap(def => parseClassifiers(def));
                  
                  return (
                    <>
                      <div style={{ animation: 'slideUp 0.3s 0.1s ease-out backwards' }}>
                        <div style={{
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          color: colors.muted,
                          marginBottom: 8,
                        }}>
                          Definitions
                        </div>
                        <div style={{ margin: 0 }}>
                          {regularDefs.slice(0, 6).map((def, i) => (
                            <div 
                              key={i} 
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                marginBottom: i < Math.min(regularDefs.length, 6) - 1 ? 8 : 0,
                              }}
                            >
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: colors.muted,
                                minWidth: 16,
                                textAlign: 'right',
                              }}>
                                {i + 1}
                              </span>
                              <span style={{
                                fontSize: '0.95rem',
                                color: colors.foreground,
                                lineHeight: 1.5,
                              }}>
                                {cleanDefinition(def)}
                              </span>
                            </div>
                          ))}
                          {regularDefs.length > 6 && (
                            <div style={{ 
                              fontSize: '0.8rem', 
                              color: colors.muted,
                              marginTop: 8,
                              paddingLeft: 26,
                            }}>
                              +{regularDefs.length - 6} more
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Measure Words (Classifiers) */}
                      {allClassifiers.length > 0 && (
                        <div className="animate-[slideUp_0.3s_0.12s_ease-out_backwards]">
                          <SectionLabel>Measure Words</SectionLabel>
                          <div className="flex flex-wrap gap-2.5">
                            {allClassifiers.map((classifier, idx) => (
                              <ClassifierButton
                                key={idx}
                                character={classifier.character}
                                pinyin={classifier.pinyin}
                                onClick={() => handleCharacterClick(classifier.character)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Component Characters - clickable chips */}
                <div style={{ 
                  animation: 'slideUp 0.3s 0.15s ease-out backwards',
                  marginTop: 8,
                  paddingTop: 20,
                  borderTop: `1px solid ${colors.border}`,
                }}>
                  <div style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: colors.muted,
                    marginBottom: 12,
                  }}>
                    Component Characters
                    <span style={{ 
                      marginLeft: 8, 
                      fontWeight: 400, 
                      fontSize: '0.6rem',
                      opacity: 0.7,
                    }}>
                      (click to explore)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {[...currentWord.word].map((char, i) => {
                      const charData = dictionary[char];
                      // Get short definition - Priority: CC-CEDICT (filtered) → CC-CEDICT (any) → makemeahanzi
                      const allDefs = cedictData[char]?.definitions || [];
                      const filteredDef = allDefs.find((d: string) => 
                        !d.startsWith('CL:') && !isVariantEntry(d) && !isSurnameEntry(d)
                      );
                      const cedictDef = filteredDef || allDefs.find((d: string) => !d.startsWith('CL:'));
                      const fullDef = convertNumberedPinyin(cedictDef || charData?.definition || '');
                      const shortDef = fullDef 
                        ? fullDef.split(/[,;]/)[0].trim().slice(0, 25) + (fullDef.length > 25 ? '...' : '')
                        : '—';
                      return (
                        <button
                          key={i}
                          onClick={() => handleCharacterClick(char)}
                          disabled={!charData}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                            padding: '12px 16px',
                            backgroundColor: colors.card,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 8,
                            cursor: charData ? 'pointer' : 'default',
                            opacity: charData ? 1 : 0.5,
                            transition: 'all 0.15s ease',
                            minWidth: 100,
                            maxWidth: 140,
                          }}
                          onMouseOver={(e) => {
                            if (charData) {
                              e.currentTarget.style.backgroundColor = colors.wordHighlight;
                              e.currentTarget.style.borderColor = colors.primary;
                            }
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = colors.card;
                            e.currentTarget.style.borderColor = colors.border;
                          }}
                          onFocus={(e) => {
                            if (charData) {
                              e.currentTarget.style.backgroundColor = colors.wordHighlight;
                              e.currentTarget.style.borderColor = colors.primary;
                            }
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.backgroundColor = colors.card;
                            e.currentTarget.style.borderColor = colors.border;
                          }}
                        >
                          <span style={{
                            fontSize: '2rem',
                            fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
                            color: colors.foreground,
                            lineHeight: 1,
                          }}>
                            {char}
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            fontFamily: '"Consolas", "Monaco", monospace',
                            color: colors.muted,
                          }}>
                            {charData?.pinyin?.[0] || '—'}
                          </span>
                          <span style={{
                            fontSize: '0.65rem',
                            color: colors.muted,
                            textAlign: 'center',
                            lineHeight: 1.3,
                            opacity: 0.8,
                          }}>
                            {shortDef}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Example Sentences for Word - Pull-Quote Style */}
                {wordSentences.length > 0 && (
                  <div style={{
                    animation: 'slideUp 0.3s 0.2s ease-out backwards',
                    marginTop: 8,
                    paddingTop: 20,
                    borderTop: `1px solid ${colors.border}`,
                  }}>
                    {/* Decorative opening quote */}
                    <div style={{
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: '4rem',
                      lineHeight: 1,
                      color: colors.primary,
                      opacity: 0.15,
                      marginBottom: '-1.5rem',
                      marginLeft: '-0.5rem',
                    }}>
                      "
                    </div>

                    {/* Chinese sentence - centered, clickable, highlight the word */}
                    <div style={{
                      fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
                      fontSize: '1.4rem',
                      lineHeight: 1.8,
                      textAlign: 'center',
                      color: colors.foreground,
                      marginBottom: '1rem',
                      letterSpacing: '0.03em',
                    }}>
                      {[...wordSentences[currentWordExampleIndex].s].map((char, charIndex) => {
                        // Check if this char is part of the word
                        const sentenceText = wordSentences[currentWordExampleIndex].s;
                        const wordStart = sentenceText.indexOf(currentWord.word);
                        const isPartOfWord = wordStart !== -1 && 
                          charIndex >= wordStart && 
                          charIndex < wordStart + currentWord.word.length;
                        const isChinese = isChineseChar(char);

                        if (!isChinese) {
                          return <span key={charIndex}>{char}</span>;
                        }

                        return (
                          <ClickableChar
                            key={charIndex}
                            char={char}
                            onClick={() => handleCharacterClick(char)}
                            size="1.4rem"
                            highlight={isPartOfWord}
                          />
                        );
                      })}
                    </div>

                    {/* Pinyin - subtle, centered */}
                    <div style={{
                      fontFamily: '"Consolas", "Monaco", monospace',
                      fontSize: '0.85rem',
                      textAlign: 'center',
                      color: colors.muted,
                      marginBottom: '1rem',
                      opacity: 0.6,
                      letterSpacing: '0.05em',
                    }}>
                      {wordSentences[currentWordExampleIndex].p}
                    </div>

                    {/* English translation */}
                    <div style={{
                      fontSize: '0.9rem',
                      textAlign: 'center',
                      color: colors.foreground,
                      opacity: 0.6,
                      fontStyle: 'italic',
                      maxWidth: '90%',
                      margin: '0 auto',
                      lineHeight: 1.6,
                    }}>
                      {wordSentences[currentWordExampleIndex].e}
                    </div>

                    {/* Pagination dots + next arrow (if multiple examples) */}
                    {wordSentences.length > 1 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        marginTop: '1.5rem',
                      }}>
                        {/* Pagination dots */}
                        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                          {wordSentences.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentWordExampleIndex(index)}
                              style={{
                                width: index === currentWordExampleIndex ? '1rem' : '0.375rem',
                                height: '0.375rem',
                                borderRadius: '0.1875rem',
                                background: index === currentWordExampleIndex ? colors.primary : colors.muted,
                                opacity: index === currentWordExampleIndex ? 1 : 0.3,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                              }}
                            />
                          ))}
                        </div>

                        {/* Next arrow */}
                        <button
                          onClick={() => setCurrentWordExampleIndex((prev) => 
                            (prev + 1) % wordSentences.length
                          )}
                          style={{
                            fontSize: '1rem',
                            color: colors.muted,
                            background: 'transparent',
                            border: 'none',
                            padding: '0.25rem',
                            cursor: 'pointer',
                            transition: 'color 0.2s ease',
                            lineHeight: 1,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = colors.primary;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = colors.muted;
                          }}
                        >
                          →
                        </button>
                      </div>
                    )}

                    {/* Subtle hint */}
                    <div style={{
                      fontSize: '0.6875rem',
                      textAlign: 'center',
                      color: colors.muted,
                      marginTop: '1.25rem',
                      opacity: 0.5,
                      letterSpacing: '0.03em',
                    }}>
                      Click any character to explore it
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CHARACTER DETAIL VIEW - Overview Tab */}
            {currentCharacter && activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Pinyin with HSK badge */}
                <div style={{ animation: 'slideUp 0.3s ease-out' }}>
                  <div style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: colors.muted,
                    marginBottom: 6,
                  }}>
                    Pinyin
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <p style={{
                      fontSize: '1.5rem',
                      fontFamily: '"Consolas", "Monaco", monospace',
                      color: 'var(--foreground)',
                      letterSpacing: '0.03em',
                      margin: 0,
                    }}>
                      {currentCharacter.pinyin.length > 0 ? currentCharacter.pinyin.join(', ') : '—'}
                    </p>
                    {hskData[currentCharacter.character] && (
                      <HSKBadge level={hskData[currentCharacter.character].level} />
                    )}
                  </div>
                </div>

                {/* Definition */}
                <div style={{ animation: 'slideUp 0.3s 0.05s ease-out backwards' }}>
                  <div style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: colors.muted,
                    marginBottom: 6,
                  }}>
                    Definition
                  </div>
                  <div style={{ margin: 0 }}>
                    {(() => {
                      // Priority: CC-CEDICT (filtered) → CC-CEDICT (all) → makemeahanzi fallback
                      const allCedictDefs = cedictData[currentCharacter.character]?.definitions || [];
                      // First try filtered definitions (no CL:, variants, surnames)
                      const filteredDefs = allCedictDefs.filter((d: string) => 
                        !d.startsWith('CL:') && !isVariantEntry(d) && !isSurnameEntry(d)
                      );
                      // If all filtered out, fall back to any non-CL definition
                      const cedictDefs = filteredDefs.length > 0 
                        ? filteredDefs 
                        : allCedictDefs.filter((d: string) => !d.startsWith('CL:'));
                      
                      if (cedictDefs && cedictDefs.length > 0) {
                        return cedictDefs.slice(0, 4).map((def, i) => (
                          <div 
                            key={i} 
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 10,
                              marginBottom: i < Math.min(cedictDefs.length, 4) - 1 ? 8 : 0,
                            }}
                          >
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: colors.muted,
                              minWidth: 16,
                              textAlign: 'right',
                            }}>
                              {i + 1}
                            </span>
                            <span style={{
                              fontSize: '0.95rem',
                              color: colors.foreground,
                              lineHeight: 1.5,
                            }}>
                              {cleanDefinition(def)}
                            </span>
                          </div>
                        ));
                      }
                      return (
                        <p style={{
                          fontSize: '0.95rem',
                          color: colors.foreground,
                          lineHeight: 1.6,
                          margin: 0,
                        }}>
                          {currentCharacter.definition || '—'}
                        </p>
                      );
                    })()}
                  </div>
                </div>

                {/* Variants - clickable links to variant characters */}
                {(() => {
                  const allDefs = cedictData[currentCharacter.character]?.definitions || [];
                  const variants = allDefs
                    .filter(def => isVariantEntry(def))
                    .map(def => parseVariant(def))
                    .filter((v): v is { character: string; pinyin: string; type: string } => v !== null);
                  
                  if (variants.length === 0) return null;
                  
                  return (
                    <div className="animate-[slideUp_0.3s_0.06s_ease-out_backwards]">
                      <SectionLabel>{variants.length === 1 ? 'Variant' : 'Variants'}</SectionLabel>
                      <div className="flex flex-wrap gap-2.5">
                        {variants.map((variant, idx) => (
                          <VariantButton
                            key={idx}
                            character={variant.character}
                            pinyin={variant.pinyin}
                            variantType={variant.type}
                            onClick={() => handleCharacterClick(variant.character)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Measure Words (Classifiers) for Character */}
                {(() => {
                  const allDefs = cedictData[currentCharacter.character]?.definitions || [];
                  
                  // Get standalone CL: entries
                  const standaloneCLs = allDefs.filter(def => isClassifierEntry(def));
                  
                  // Extract inline CLs from other definitions
                  const inlineCLs = allDefs
                    .filter(def => !isClassifierEntry(def))
                    .map(def => extractInlineClassifier(def).classifier)
                    .filter((cl): cl is string => cl !== null);
                  
                  // Combine all classifier sources
                  const allClassifiers = [...standaloneCLs, ...inlineCLs].flatMap(cl => parseClassifiers(cl));
                  
                  if (allClassifiers.length === 0) return null;
                  
                  return (
                    <div className="animate-[slideUp_0.3s_0.08s_ease-out_backwards]">
                      <SectionLabel>Measure Words</SectionLabel>
                      <div className="flex flex-wrap gap-2.5">
                        {allClassifiers.map((classifier, idx) => (
                          <ClassifierButton
                            key={idx}
                            character={classifier.character}
                            pinyin={classifier.pinyin}
                            onClick={() => handleCharacterClick(classifier.character)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Example Sentence - Editorial Pull-Quote Style */}
                {characterSentences.length > 0 && (
                  <div style={{
                    animation: 'slideUp 0.3s 0.1s ease-out backwards',
                    marginTop: '1.5rem',
                    paddingTop: '1.5rem',
                    borderTop: `1px solid ${colors.border}`,
                  }}>
                    {/* Decorative opening quote */}
                    <div style={{
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: '4rem',
                      lineHeight: 1,
                      color: colors.primary,
                      opacity: 0.15,
                      marginBottom: '-1.5rem',
                      marginLeft: '-0.5rem',
                    }}>
                      "
                    </div>

                    {/* Chinese sentence - centered, large, clickable */}
                    <div style={{
                      fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
                      fontSize: '1.5rem',
                      lineHeight: 1.8,
                      textAlign: 'center',
                      color: colors.foreground,
                      marginBottom: '1rem',
                      letterSpacing: '0.03em',
                    }}>
                      {[...characterSentences[currentExampleIndex].s].map((char, charIndex) => {
                        const isTarget = char === currentCharacter.character;
                        const isChinese = isChineseChar(char);

                        if (!isChinese) {
                          return <span key={charIndex}>{char}</span>;
                        }

                        return (
                          <ClickableChar
                            key={charIndex}
                            char={char}
                            onClick={() => handleCharacterClick(char)}
                            size="1.5rem"
                            highlight={isTarget}
                          />
                        );
                      })}
                    </div>

                    {/* Pinyin - subtle, centered */}
                    <div style={{
                      fontFamily: '"Consolas", "Monaco", monospace',
                      fontSize: '0.875rem',
                      textAlign: 'center',
                      color: colors.muted,
                      marginBottom: '1.25rem',
                      opacity: 0.6,
                      letterSpacing: '0.05em',
                    }}>
                      {characterSentences[currentExampleIndex].p}
                    </div>

                    {/* English translation */}
                    <div style={{
                      fontSize: '0.9375rem',
                      textAlign: 'center',
                      color: colors.foreground,
                      opacity: 0.6,
                      fontStyle: 'italic',
                      maxWidth: '85%',
                      margin: '0 auto',
                      lineHeight: 1.6,
                    }}>
                      {characterSentences[currentExampleIndex].e}
                    </div>

                    {/* Pagination dots + next arrow (if multiple examples) */}
                    {characterSentences.length > 1 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        marginTop: '1.5rem',
                      }}>
                        {/* Pagination dots */}
                        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                          {characterSentences.slice(0, Math.min(characterSentences.length, 5)).map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentExampleIndex(index)}
                              style={{
                                width: index === currentExampleIndex ? '1rem' : '0.375rem',
                                height: '0.375rem',
                                borderRadius: '0.1875rem',
                                background: index === currentExampleIndex ? colors.primary : colors.muted,
                                opacity: index === currentExampleIndex ? 1 : 0.3,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                              }}
                            />
                          ))}
                        </div>

                        {/* Next arrow */}
                        <button
                          onClick={() => setCurrentExampleIndex((prev) => 
                            (prev + 1) % Math.min(characterSentences.length, 5)
                          )}
                          style={{
                            fontSize: '1rem',
                            color: colors.muted,
                            background: 'transparent',
                            border: 'none',
                            padding: '0.25rem',
                            cursor: 'pointer',
                            transition: 'color 0.2s ease',
                            lineHeight: 1,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = colors.primary;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = colors.muted;
                          }}
                        >
                          →
                        </button>
                      </div>
                    )}

                    {/* Subtle hint about clickable characters */}
                    <div style={{
                      fontSize: '0.6875rem',
                      textAlign: 'center',
                      color: colors.muted,
                      marginTop: '1.25rem',
                      opacity: 0.5,
                      letterSpacing: '0.03em',
                    }}>
                      Click any character above to explore it
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CHARACTER DETAIL VIEW - Structure Tab */}
            {currentCharacter && activeTab === 'structure' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Radical */}
                <div style={{ animation: 'slideUp 0.3s ease-out' }}>
                  <div style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: colors.muted,
                    marginBottom: 6,
                  }}>
                    Radical {dictionary[currentCharacter.radical] && (
                      <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>(click to explore)</span>
                    )}
                  </div>
                  <div>
                    {currentCharacter.radical ? (
                      <ClickableChar
                        char={currentCharacter.radical}
                        onClick={() => handleCharacterClick(currentCharacter.radical)}
                        size="2.5rem"
                      />
                    ) : '—'}
                  </div>
                </div>

                {/* Decomposition */}
                <div style={{ animation: 'slideUp 0.3s 0.05s ease-out backwards' }}>
                  <div style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: colors.muted,
                    marginBottom: 6,
                  }}>
                    Decomposition
                  </div>
                  <div style={{
                    fontSize: '1.1rem',
                    fontFamily: '"Consolas", "Monaco", monospace',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 4,
                    alignItems: 'center',
                  }}>
                    {currentCharacter.decomposition ? (
                      [...currentCharacter.decomposition].map((char, i) => {
                        if (isChineseChar(char)) {
                          return (
                            <ClickableChar
                              key={i}
                              char={char}
                              onClick={() => handleCharacterClick(char)}
                              size="1.25rem"
                            />
                          );
                        }
                        return <span key={i} style={{ opacity: 0.5 }}>{char}</span>;
                      })
                    ) : '—'}
                  </div>
                </div>

                {/* Etymology */}
                {currentCharacter.etymology && (
                  <div style={{ animation: 'slideUp 0.3s 0.1s ease-out backwards' }}>
                    <div style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: colors.muted,
                      marginBottom: 8,
                    }}>
                      Etymology
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <p style={{
                        fontSize: '0.875rem',
                        color: 'var(--foreground)',
                        lineHeight: 1.5,
                        margin: 0,
                      }}>
                        <span style={{ fontWeight: 500 }}>Type:</span>{' '}
                        <span style={{ textTransform: 'capitalize' }}>{currentCharacter.etymology.type}</span>
                      </p>
                      {currentCharacter.etymology.hint && (
                        <p style={{
                          fontSize: '0.875rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.6,
                          margin: 0,
                        }}>
                          {currentCharacter.etymology.hint}
                        </p>
                      )}
                      {currentCharacter.etymology.semantic && currentCharacter.etymology.phonetic && (
                        <div style={{
                          fontSize: '0.875rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.6,
                        }}>
                          <ClickableChar
                            char={currentCharacter.etymology.semantic}
                            onClick={() => handleCharacterClick(currentCharacter.etymology!.semantic!)}
                            size="1.1em"
                          />
                          {' '}provides the meaning while{' '}
                          <ClickableChar
                            char={currentCharacter.etymology.phonetic}
                            onClick={() => handleCharacterClick(currentCharacter.etymology!.phonetic!)}
                            size="1.1em"
                          />
                          {' '}provides the pronunciation.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            </div>
          </ScrollArea>
        </div>
      )}
      </div>
    </CedictProvider>
  );
}
