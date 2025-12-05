import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';

import type { CedictEntry } from '../types';

import { CedictContext, cedictJsonFallback } from './CedictContext';

interface CedictProviderProps {
  children: ReactNode;
  keysToLoad: string[];
}

/**
 * Provider component that loads CEDICT entries from SQLite (with JSON fallback)
 */
export function CedictProvider({ children, keysToLoad }: CedictProviderProps) {
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
                  // SQLite stores definitions as semicolon-separated string
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


