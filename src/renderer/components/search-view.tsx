import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { convertNumberedPinyin } from '../utils/pinyin';
import hskDictionary from '../../data/hsk-dictionary.json'; // Small file, needed for HSK badges
import { isVariantEntry, isSurnameEntry, isClassifierEntry } from '../../shared/definition-utils';

interface HistoryItem {
  id: string;
  chinese: string;
  pinyin: string;
  english: string;
  timestamp: number;
}

interface DictionaryEntry {
  character: string;
  pinyin: string[];
  definition: string;
}

interface HSKEntry {
  level: number;
  type: 'character' | 'word';
}

// SQLite FTS5 search result from main process
interface SQLiteDictionaryEntry {
  simplified: string;
  traditional: string;
  pinyin: string;
  definitions: string;
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

interface SearchViewProps {
  historyItems: HistoryItem[];
  onItemClick: (item: HistoryItem | { type: 'dictionary'; data: DictionaryEntry }) => void;
  onTranslateText: (text: string) => void;
}

// Colors - use CSS variables for dark mode compatibility
const colors = {
  background: 'var(--background)',
  card: 'var(--card)',
  foreground: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  border: 'var(--border)',
  input: 'var(--input)',
  primary: 'var(--primary)',
};

const hskData = hskDictionary as Record<string, HSKEntry>;

export function SearchView({ historyItems, onItemClick, onTranslateText }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMultiLine, setIsMultiLine] = useState(false);
  const [sqliteResults, setSqliteResults] = useState<SQLiteDictionaryEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [useSqlite, setUseSqlite] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Debounce query for SQLite search (150ms delay)
  const debouncedQuery = useDebounce(query, 150);

  // Check if SQLite dictionary is available
  useEffect(() => {
    const checkSqlite = async () => {
      if (window.electronAPI?.dictionaryReady) {
        const ready = await window.electronAPI.dictionaryReady();
        setUseSqlite(ready);
        if (ready) console.log('Using SQLite FTS5 for dictionary search');
      }
    };
    checkSqlite();
  }, []);

  // Perform SQLite dictionary search when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!useSqlite || !debouncedQuery.trim()) {
        setSqliteResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const results = await window.electronAPI.dictionarySearch(debouncedQuery, 10);
        setSqliteResults(results || []);
      } catch (err) {
        console.error('SQLite search error:', err);
        setSqliteResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    
    performSearch();
  }, [debouncedQuery, useSqlite]);

  // Filter results based on query
  const queryLower = query.toLowerCase();

  // Convert SQLite results to DictionaryEntry format
  // Uses filtering functions from shared/definition-utils.ts
  const sqliteToDictEntry = useCallback((entry: SQLiteDictionaryEntry): DictionaryEntry => {
    // Parse pinyin - SQLite stores as comma-separated string
    const pinyinArray = entry.pinyin ? entry.pinyin.split(', ').filter(p => p.trim()) : [];
    // Get first clean definition, prioritizing actual meanings over "variant of" entries
    const definitions = entry.definitions ? entry.definitions.split('; ') : [];
    const cleanDefs = definitions
      .filter(d => !isClassifierEntry(d))
      .map(d => d.replace(/\s*\(CL:[^)]+\)/g, '').trim())
      .map(d => convertNumberedPinyin(d))
      .filter(d => d.length > 0);
    
    // Filter out unhelpful entries (variants, surnames) but keep as fallback if nothing else
    const isUnhelpful = (d: string) => isVariantEntry(d) || isSurnameEntry(d);
    const meaningDefs = cleanDefs.filter(d => !isUnhelpful(d));
    const unhelpfulDefs = cleanDefs.filter(d => isUnhelpful(d));
    // Use meaningful defs first, fall back to unhelpful if nothing else
    const sortedDefs = meaningDefs.length > 0 ? [...meaningDefs, ...unhelpfulDefs] : unhelpfulDefs;
    
    return {
      character: entry.simplified,
      pinyin: pinyinArray,
      definition: sortedDefs[0] || '',
    };
  }, []);

  const searchResults = {
    history: query
      ? historyItems.filter(
          (item) =>
            item.chinese.toLowerCase().includes(queryLower) ||
            item.english.toLowerCase().includes(queryLower) ||
            item.pinyin.toLowerCase().includes(queryLower)
        )
      : [],
    // Use SQLite FTS5 results directly (fast, <5ms)
    dictionary: query && useSqlite ? sqliteResults.map(sqliteToDictEntry) : [],
  };

  const totalResults = searchResults.history.length + searchResults.dictionary.length;
  const hasResults = totalResults > 0;
  const totalItemsWithTranslate = query ? totalResults + 1 : totalResults;

  const hasMultipleLines = query.includes('\n');
  const isLongText = query.length > 30;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!query) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < totalItemsWithTranslate - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleEnterPress();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [query, totalResults, totalItemsWithTranslate, selectedIndex, hasResults]);

  const handleEnterPress = () => {
    // If translate action is selected or no results
    if (selectedIndex === totalResults || !hasResults) {
      onTranslateText(query);
      return;
    }

    // History result selected
    if (selectedIndex < searchResults.history.length) {
      onItemClick(searchResults.history[selectedIndex]);
      return;
    }

    // Dictionary result selected
    const dictIndex = selectedIndex - searchResults.history.length;
    if (dictIndex < searchResults.dictionary.length) {
      const entry = searchResults.dictionary[dictIndex];
      onItemClick({ type: 'dictionary', data: entry });
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (hasMultipleLines && !isMultiLine) {
      setIsMultiLine(true);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [hasMultipleLines, isMultiLine]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [query, isMultiLine]);

  const getHSKLevel = (char: string): number | null => {
    return hskData[char]?.level || null;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: colors.card,
    }}>
      {/* Search Header */}
      <div style={{
        borderBottom: `1px solid ${colors.border}`,
        padding: '20px 28px',
        animation: 'fadeIn 0.3s ease-out',
      }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={20}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.muted,
            }}
          />
          {!isMultiLine ? (
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onPaste={(e) => {
                const pastedText = e.clipboardData.getData('text');
                if (pastedText.includes('\n')) {
                  e.preventDefault();
                  setQuery(pastedText);
                  setIsMultiLine(true);
                }
              }}
              placeholder="Search or paste Chinese text to translate..."
              style={{
                width: '100%',
                borderBottom: `2px solid ${colors.border}`,
                border: 'none',
                borderBottomWidth: 2,
                borderBottomStyle: 'solid',
                borderBottomColor: colors.border,
                backgroundColor: 'transparent',
                padding: '12px 14px 12px 48px',
                fontSize: '1rem',
                color: colors.foreground,
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => e.currentTarget.style.borderBottomColor = colors.foreground}
              onBlur={(e) => e.currentTarget.style.borderBottomColor = colors.border}
            />
          ) : (
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Paste Chinese text to translate..."
              style={{
                width: '100%',
                resize: 'none',
                borderBottom: `2px solid ${colors.border}`,
                border: 'none',
                borderBottomWidth: 2,
                borderBottomStyle: 'solid',
                borderBottomColor: colors.border,
                backgroundColor: 'transparent',
                padding: '12px 14px 12px 48px',
                fontSize: '1rem',
                color: colors.foreground,
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                minHeight: 48,
                maxHeight: 200,
                boxSizing: 'border-box',
              }}
              onFocus={(e) => e.currentTarget.style.borderBottomColor = colors.foreground}
              onBlur={(e) => e.currentTarget.style.borderBottomColor = colors.border}
            />
          )}
        </div>
      </div>

      {/* Results */}
      <ScrollArea style={{ flex: 1 }}>
        {/* Empty state */}
        {!query && (
          <div style={{
            display: 'flex',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            animation: 'fadeIn 0.4s ease-out',
          }}>
            <div style={{ textAlign: 'center' }}>
              <Search
                size={48}
                style={{
                  margin: '0 auto 16px',
                  color: 'var(--muted-foreground)',
                }}
              />
              <p style={{
                color: colors.muted,
                fontSize: '0.95rem',
                lineHeight: 1.6,
              }}>
                Search dictionary entries
                <br />
                or paste Chinese text to translate.
              </p>
            </div>
          </div>
        )}

        {/* No results state */}
        {query && !hasResults && (
          <div style={{
            display: 'flex',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            animation: 'fadeIn 0.4s ease-out',
          }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{
                color: colors.muted,
                fontSize: '0.95rem',
                lineHeight: 1.6,
                marginBottom: 20,
              }}>
                No dictionary matches found.
              </p>
              <button
                onClick={() => onTranslateText(query)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  borderBottom: `2px solid ${colors.primary}`,
                  paddingBottom: 4,
                  fontSize: '1.1rem',
                  fontWeight: 500,
                  color: colors.primary,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.7'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                Translate this text
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Results list */}
        {query && hasResults && (
          <div style={{ padding: '8px 0' }}>
            {/* History Results */}
            {searchResults.history.length > 0 && (
              <div>
                <div style={{ padding: '12px 28px' }}>
                  <h3 style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: colors.muted,
                    margin: 0,
                  }}>
                    History ({searchResults.history.length})
                  </h3>
                </div>
                {searchResults.history.map((item, index) => {
                  const isSelected = selectedIndex === index;

                  return (
                    <div
                      key={item.id}
                      onClick={() => onItemClick(item)}
                      style={{
                        cursor: 'pointer',
                        borderBottom: `1px solid ${colors.border}`,
                        padding: '16px 28px',
                        transition: 'background-color 0.15s',
                        backgroundColor: isSelected ? 'var(--hover-bg)' : 'transparent',
                        animation: `slideUp 0.3s ${index * 0.05}s ease-out backwards`,
                      }}
                      onMouseOver={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                      }}
                      onMouseOut={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ marginBottom: 6 }}>
                        <p style={{
                          color: colors.foreground,
                          fontSize: '1.35rem',
                          fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
                          fontWeight: 500,
                          letterSpacing: '0.01em',
                          lineHeight: 1.3,
                          margin: 0,
                        }}>
                          {item.chinese}
                        </p>
                      </div>
                      <p style={{
                        color: colors.muted,
                        fontSize: '0.85rem',
                        lineHeight: 1.5,
                        margin: 0,
                      }}>
                        {item.english}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dictionary Results */}
            {searchResults.dictionary.length > 0 && (
              <div>
                <div style={{ padding: '12px 28px' }}>
                  <h3 style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: colors.muted,
                    margin: 0,
                  }}>
                    Dictionary ({searchResults.dictionary.length})
                  </h3>
                </div>
                {searchResults.dictionary.map((entry, index) => {
                  const globalIndex = searchResults.history.length + index;
                  const isSelected = selectedIndex === globalIndex;
                  const hskLevel = getHSKLevel(entry.character);

                  return (
                    <div
                      key={entry.character}
                      onClick={() => onItemClick({ 
                        type: 'dictionary', 
                        data: entry
                      })}
                      style={{
                        cursor: 'pointer',
                        borderBottom: `1px solid ${colors.border}`,
                        padding: '16px 28px',
                        transition: 'background-color 0.15s',
                        backgroundColor: isSelected ? 'var(--hover-bg)' : 'transparent',
                        animation: `slideUp 0.3s ${(searchResults.history.length + index) * 0.05}s ease-out backwards`,
                      }}
                      onMouseOver={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                      }}
                      onMouseOut={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{
                        marginBottom: 6,
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 12,
                      }}>
                        <p style={{
                          color: colors.foreground,
                          fontSize: '1.35rem',
                          fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
                          fontWeight: 500,
                          margin: 0,
                        }}>
                          {entry.character}
                        </p>
                        <p style={{
                          fontFamily: '"Consolas", "Monaco", monospace',
                          fontSize: '0.85rem',
                          color: colors.muted,
                          margin: 0,
                        }}>
                          {entry.pinyin.join(', ')}
                        </p>
                        {hskLevel && (
                          <span style={{
                            backgroundColor: '#e0e0e0',
                            color: '#4a4a4a',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: '0.7rem',
                            fontWeight: 500,
                          }}>
                            HSK {hskLevel}
                          </span>
                        )}
                      </div>
                      <p style={{
                        color: colors.muted,
                        fontSize: '0.85rem',
                        lineHeight: 1.5,
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {entry.definition}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Translate action */}
            <div
              onClick={() => onTranslateText(query)}
              style={{
                cursor: 'pointer',
                borderBottom: `1px solid ${colors.border}`,
                backgroundColor: selectedIndex === totalResults ? 'var(--hover-bg)' : 'transparent',
                padding: '20px 28px',
                transition: 'background-color 0.15s',
                animation: `slideUp 0.3s ${totalResults * 0.05}s ease-out backwards`,
              }}
              onMouseOver={(e) => {
                if (selectedIndex !== totalResults) e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
              }}
              onMouseOut={(e) => {
                if (selectedIndex !== totalResults) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <p style={{
                    marginBottom: 4,
                    fontWeight: 500,
                    color: colors.primary,
                    fontSize: '1.05rem',
                    margin: 0,
                  }}>
                    Translate this text
                  </p>
                  <p style={{
                    fontSize: '0.8rem',
                    color: colors.muted,
                    margin: 0,
                    marginTop: 4,
                  }}>
                    {isLongText || hasMultipleLines
                      ? 'Full paragraph translation'
                      : 'Get pinyin and English translation'}
                  </p>
                </div>
                <ArrowRight
                  size={20}
                  style={{ color: colors.primary }}
                />
              </div>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Keyboard hint */}
      {query && (
        <div style={{
          borderTop: `1px solid ${colors.border}`,
          padding: '10px 28px',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          <p style={{
            fontSize: '0.75rem',
            color: colors.muted,
            margin: 0,
          }}>
            {hasResults && (
              <>
                Use <kbd style={kbdStyle}>↑</kbd> <kbd style={kbdStyle}>↓</kbd> to navigate,{' '}
              </>
            )}
            <kbd style={kbdStyle}>Enter</kbd> to {hasResults ? 'select' : 'translate'}
            {isMultiLine && (
              <>
                {' '}· <kbd style={kbdStyle}>Shift + Enter</kbd> for new line
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  backgroundColor: '#efece6',
  padding: '2px 6px',
  borderRadius: 3,
  fontFamily: '"Consolas", monospace',
  fontSize: '0.7rem',
};

