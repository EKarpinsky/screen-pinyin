import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { convertNumberedPinyin } from '../utils/pinyin';
import hanziDictionary from '../../data/hanzi-dictionary.json';
import hskDictionary from '../../data/hsk-dictionary.json';
import cedictDictionary from '../../data/cedict-dictionary.json';

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

interface CedictEntry {
  pinyin: string;
  definitions: string[];
}

interface HSKEntry {
  level: number;
  type: 'character' | 'word';
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

const dictionary = hanziDictionary as Record<string, DictionaryEntry>;
const hskData = hskDictionary as Record<string, HSKEntry>;
const cedictData = cedictDictionary as Record<string, CedictEntry>;

// Get best definition: CC-CEDICT first, fallback to makemeahanzi
// Returns only the first clean definition for search display
function getBestDefinition(char: string): string {
  const cedict = cedictData[char];
  if (cedict?.definitions?.length > 0) {
    // Filter out classifier entries and clean CL: references from remaining definitions
    const defs = cedict.definitions
      .filter(d => !d.startsWith('CL:'))
      .map(d => d.replace(/\s*\(CL:[^)]+\)/g, '').trim()) // Remove inline CL: references
      .map(d => convertNumberedPinyin(d)) // Convert [pinyin1] to tone marks
      .filter(d => d.length > 0);
    // Return only the first definition for cleaner display
    return defs[0] || '';
  }
  // Fallback to makemeahanzi
  return dictionary[char]?.definition || '';
}

// Get clean definition for scoring (removes CL: and other noise)
function getCleanDefinition(char: string): string {
  const def = getBestDefinition(char);
  // Get just the first clean definition for scoring (already cleaned by getBestDefinition)
  return def.toLowerCase();
}

export function SearchView({ historyItems, onItemClick, onTranslateText }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMultiLine, setIsMultiLine] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Score how well a character matches the query (higher = better match)
  const getMatchScore = (char: string, data: DictionaryEntry, queryLower: string): number => {
    const cedict = cedictData[char];
    const cleanDef = getCleanDefinition(char);
    
    // Exact character match
    if (char === query) return 100;
    
    // Character contains query
    if (char.includes(query)) return 90;
    
    // Exact clean definition match (e.g., searching "cat" finds 猫 with first definition "cat")
    if (cleanDef === queryLower) return 88;
    
    // Exact makemeahanzi definition match
    if (data.definition.toLowerCase() === queryLower) return 85;
    
    // Clean definition starts with query
    if (cleanDef.startsWith(queryLower)) return 82;
    
    // Definition starts with query
    if (data.definition.toLowerCase().startsWith(queryLower)) return 80;
    
    // Exact pinyin match
    if (data.pinyin.some((p) => p.toLowerCase() === queryLower)) return 75;
    
    // Pinyin starts with query
    if (data.pinyin.some((p) => p.toLowerCase().startsWith(queryLower))) return 70;
    
    // CC-CEDICT first clean definition starts with query
    if (cedict?.definitions?.[0]) {
      const firstDef = cedict.definitions[0].replace(/\s*\(CL:[^)]+\)/g, '').toLowerCase();
      if (firstDef.startsWith(queryLower)) return 65;
    }
    
    // Definition contains query as a word (not substring)
    const defWords = data.definition.toLowerCase().split(/[\s,;]+/);
    if (defWords.includes(queryLower)) return 55;
    
    // CC-CEDICT definition contains query as word
    if (cedict?.definitions?.some((d: string) => {
      const cleanD = d.replace(/\s*\(CL:[^)]+\)/g, '').toLowerCase();
      return cleanD.split(/[\s,;]+/).includes(queryLower);
    })) return 50;
    
    // Pinyin contains query
    if (data.pinyin.some((p) => p.toLowerCase().includes(queryLower))) return 40;
    
    // CC-CEDICT pinyin contains query
    if (cedict?.pinyin?.toLowerCase().includes(queryLower)) return 35;
    
    // Definition contains query (substring match - lowest priority)
    if (data.definition.toLowerCase().includes(queryLower)) return 20;
    
    // CC-CEDICT definition contains query
    if (cedict?.definitions?.some((d: string) => d.toLowerCase().includes(queryLower))) return 15;
    
    return 0;
  };

  // Filter results based on query
  const queryLower = query.toLowerCase();
  
  // Check if a character is a traditional form of another character in results
  const isTraditionalDuplicate = (char: string, results: Array<{char: string; score: number}>): boolean => {
    const cedict = cedictData[char];
    // If this char's traditional form equals itself, it might be traditional
    // Check if there's a simplified version in the results with same/higher score
    for (const result of results) {
      const otherCedict = cedictData[result.char];
      if (otherCedict?.traditional === char && result.char !== char) {
        return true; // This is the traditional form of another result
      }
    }
    return false;
  };

  const searchResults = {
    history: query
      ? historyItems.filter(
          (item) =>
            item.chinese.toLowerCase().includes(queryLower) ||
            item.english.toLowerCase().includes(queryLower) ||
            item.pinyin.toLowerCase().includes(queryLower)
        )
      : [],
    dictionary: query
      ? (() => {
          const scored = Object.entries(dictionary)
            .map(([char, data]) => ({ char, data, score: getMatchScore(char, data, queryLower) }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score);
          
          // Filter out traditional duplicates
          const filtered = scored.filter(item => !isTraditionalDuplicate(item.char, scored));
          
          return filtered
            .slice(0, 10)
            .map(({ char, data }) => ({ character: char, ...data }));
        })()
      : [],
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
                        data: { ...entry, definition: getBestDefinition(entry.character) }
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
                        {getBestDefinition(entry.character)}
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

