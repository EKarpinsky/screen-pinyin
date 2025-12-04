import React, { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { convertNumberedPinyin } from '../../utils/pinyin';
import hskDictionary from '../../../data/hsk-dictionary.json';
import { isVariantEntry, isSurnameEntry, isClassifierEntry } from '../../../shared/definition-utils';

// Sub-components
import { SearchInput } from './SearchInput';
import { SearchEmptyState } from './SearchEmptyState';
import { SearchNoResults } from './SearchNoResults';
import { HistoryResultItem } from './HistoryResultItem';
import { DictionaryResultItem } from './DictionaryResultItem';
import { TranslateAction } from './TranslateAction';
import { KeyboardHint } from './KeyboardHint';

// Types
import type {
  HistoryItem,
  DictionaryEntry,
  HSKEntry,
  SQLiteDictionaryEntry,
  SearchViewProps,
} from './types';

const hskData = hskDictionary as Record<string, HSKEntry>;

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function SearchView({ historyItems, onItemClick, onTranslateText }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMultiLine, setIsMultiLine] = useState(false);
  const [sqliteResults, setSqliteResults] = useState<SQLiteDictionaryEntry[]>([]);
  const [useSqlite, setUseSqlite] = useState(false);

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

      try {
        const results = await window.electronAPI.dictionarySearch(debouncedQuery, 10) as SQLiteDictionaryEntry[];
        setSqliteResults(results || []);
      } catch (err) {
        console.error('SQLite search error:', err);
        setSqliteResults([]);
      }
    };

    performSearch();
  }, [debouncedQuery, useSqlite]);

  // Convert SQLite results to DictionaryEntry format
  const sqliteToDictEntry = useCallback((entry: SQLiteDictionaryEntry): DictionaryEntry => {
    const pinyinArray = entry.pinyin ? entry.pinyin.split(', ').filter(p => p.trim()) : [];
    const definitions = entry.definitions ? entry.definitions.split('; ') : [];
    const cleanDefs = definitions
      .filter(d => !isClassifierEntry(d))
      .map(d => d.replace(/\s*\(CL:[^)]+\)/g, '').trim())
      .map(d => convertNumberedPinyin(d))
      .filter(d => d.length > 0);

    const isUnhelpful = (d: string) => isVariantEntry(d) || isSurnameEntry(d);
    const meaningDefs = cleanDefs.filter(d => !isUnhelpful(d));
    const unhelpfulDefs = cleanDefs.filter(d => isUnhelpful(d));
    const sortedDefs = meaningDefs.length > 0 ? [...meaningDefs, ...unhelpfulDefs] : unhelpfulDefs;

    return {
      character: entry.simplified,
      pinyin: pinyinArray,
      definition: sortedDefs[0] || '',
    };
  }, []);

  // Filter results based on query
  const queryLower = query.toLowerCase();
  const searchResults = {
    history: query
      ? historyItems.filter(
          (item) =>
            item.chinese.toLowerCase().includes(queryLower) ||
            item.english.toLowerCase().includes(queryLower) ||
            item.pinyin.toLowerCase().includes(queryLower)
        )
      : [],
    dictionary: query && useSqlite ? sqliteResults.map(sqliteToDictEntry) : [],
  };

  const totalResults = searchResults.history.length + searchResults.dictionary.length;
  const hasResults = totalResults > 0;
  const totalItemsWithTranslate = query ? totalResults + 1 : totalResults;
  const hasMultipleLines = query.includes('\n');
  const isLongText = query.length > 30;

  // Keyboard navigation
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
    if (selectedIndex === totalResults || !hasResults) {
      onTranslateText(query);
      return;
    }

    if (selectedIndex < searchResults.history.length) {
      onItemClick(searchResults.history[selectedIndex]);
      return;
    }

    const dictIndex = selectedIndex - searchResults.history.length;
    if (dictIndex < searchResults.dictionary.length) {
      const entry = searchResults.dictionary[dictIndex];
      onItemClick({ type: 'dictionary', data: entry });
    }
  };

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    setSelectedIndex(0);
  };

  const getHSKLevel = (char: string): number | null => {
    return hskData[char]?.level || null;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--card)]">
      <SearchInput
        query={query}
        isMultiLine={isMultiLine}
        onQueryChange={handleQueryChange}
        onMultiLineChange={setIsMultiLine}
      />

      <ScrollArea className="flex-1">
        {/* Empty state */}
        {!query && <SearchEmptyState />}

        {/* No results state */}
        {query && !hasResults && (
          <SearchNoResults onTranslate={() => onTranslateText(query)} />
        )}

        {/* Results list */}
        {query && hasResults && (
          <div className="py-2">
            {/* History Results */}
            {searchResults.history.length > 0 && (
              <div>
                <div className="py-3 px-7">
                  <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)] m-0">
                    History ({searchResults.history.length})
                  </h3>
                </div>
                {searchResults.history.map((item, index) => (
                  <HistoryResultItem
                    key={item.id}
                    item={item}
                    index={index}
                    isSelected={selectedIndex === index}
                    onClick={() => onItemClick(item)}
                  />
                ))}
              </div>
            )}

            {/* Dictionary Results */}
            {searchResults.dictionary.length > 0 && (
              <div>
                <div className="py-3 px-7">
                  <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)] m-0">
                    Dictionary ({searchResults.dictionary.length})
                  </h3>
                </div>
                {searchResults.dictionary.map((entry, index) => {
                  const globalIndex = searchResults.history.length + index;
                  return (
                    <DictionaryResultItem
                      key={entry.character}
                      entry={entry}
                      index={globalIndex}
                      isSelected={selectedIndex === globalIndex}
                      hskLevel={getHSKLevel(entry.character)}
                      onClick={() => onItemClick({ type: 'dictionary', data: entry })}
                    />
                  );
                })}
              </div>
            )}

            {/* Translate action */}
            <TranslateAction
              isSelected={selectedIndex === totalResults}
              isLongText={isLongText}
              hasMultipleLines={hasMultipleLines}
              animationDelay={totalResults * 0.05}
              onClick={() => onTranslateText(query)}
            />
          </div>
        )}
      </ScrollArea>

      {/* Keyboard hint */}
      {query && (
        <KeyboardHint hasResults={hasResults} isMultiLine={isMultiLine} />
      )}
    </div>
  );
}

// Re-export types
export type { HistoryItem, DictionaryEntry, SearchViewProps } from './types';

