import { useState, useCallback, useMemo } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import hskDictionary from '../../../data/hsk-dictionary.json';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { ScrollArea } from '../ui/scroll-area';

// Sub-components
import { DictionaryResultItem } from './DictionaryResultItem';
import { HistoryResultItem } from './HistoryResultItem';
import { KeyboardHint } from './KeyboardHint';
import { SearchEmptyState } from './SearchEmptyState';
import { SearchInput } from './SearchInput';
import { SearchNoResults } from './SearchNoResults';
import { TranslateAction } from './TranslateAction';
// Types
import type {
  HSKEntry,
  SQLiteDictionaryEntry,
  SearchViewProps,
} from './types';
import { transformSqliteEntry } from './utils';

const hskData = hskDictionary as Record<string, HSKEntry>;

function getHSKLevel(char: string): number | null {
  return hskData[char]?.level || null;
}

export function SearchView({ historyItems, onItemClick, onTranslateText }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMultiLine, setIsMultiLine] = useState(false);
  const [sqliteResults, setSqliteResults] = useState<SQLiteDictionaryEntry[]>([]);

  // Debounced dictionary search - called directly from event handler
  const debouncedSearch = useDebouncedCallback(async (q: string) => {
    if (!q.trim()) {
      setSqliteResults([]);
      return;
    }
    try {
      const results = await window.electronAPI.dictionarySearch(q, 10);
      setSqliteResults(results || []);
    } catch (err) {
      console.error('SQLite search error:', err);
      setSqliteResults([]);
    }
  }, 150);

  // Filter results based on query
  const queryLower = query.toLowerCase();
  const searchResults = useMemo(() => ({
    history: query
      ? historyItems.filter(
          (item) =>
            item.chinese.toLowerCase().includes(queryLower) ||
            item.english.toLowerCase().includes(queryLower) ||
            item.pinyin.toLowerCase().includes(queryLower)
        )
      : [],
    dictionary: query ? sqliteResults.map(entry => transformSqliteEntry(entry)) : [],
  }), [query, queryLower, historyItems, sqliteResults]);

  const totalResults = searchResults.history.length + searchResults.dictionary.length;
  const hasResults = totalResults > 0;
  const totalItemsWithTranslate = query ? totalResults + 1 : totalResults;
  const hasMultipleLines = query.includes('\n');
  const isLongText = query.length > 30;

  const handleEnterPress = useCallback(() => {
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
  }, [selectedIndex, totalResults, hasResults, query, searchResults, onTranslateText, onItemClick]);

  // Keyboard navigation
  useKeyboardShortcut(['arrowdown', 'arrowup', 'enter'], (e) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex((prev) => (prev < totalItemsWithTranslate - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && !e.shiftKey) {
      handleEnterPress();
    }
  }, { enabled: !!query, deps: [query, totalItemsWithTranslate, handleEnterPress] });

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    setSelectedIndex(0);
    debouncedSearch(newQuery);
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

