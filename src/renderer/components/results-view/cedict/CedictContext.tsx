import React, { createContext, useContext } from 'react';

import cedictDictionaryJson from '../../../../data/cedict-dictionary.json';
import type { CedictEntry, CedictContextType } from '../types';

// JSON fallback data - imported by provider
export const cedictJsonFallback = cedictDictionaryJson as Record<string, CedictEntry>;

// Context with JSON fallback as default
export const CedictContext = createContext<CedictContextType>({
  getEntry: (key) => cedictJsonFallback[key],
  cache: {},
});

/**
 * Hook to get a single cedict entry by key
 */
export function useCedictEntry(key: string | undefined): CedictEntry | undefined {
  const { getEntry } = useContext(CedictContext);
  return key ? getEntry(key) : undefined;
}


