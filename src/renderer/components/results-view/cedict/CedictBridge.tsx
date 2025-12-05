import { useContext, useEffect } from 'react';

import type { CedictEntry } from '../types';

import { CedictContext, cedictJsonFallback } from './CedictContext';

// Legacy global accessor for components that haven't been updated yet
let globalCedictGetter: ((key: string) => CedictEntry | undefined) | null = null;

/**
 * Proxy object that allows accessing cedict data globally
 * Used by components that haven't migrated to the context pattern
 */
export const cedictData = new Proxy({} as Record<string, CedictEntry>, {
  get(_, key: string) {
    if (globalCedictGetter) {
      return globalCedictGetter(key);
    }
    return cedictJsonFallback[key];
  }
});

/**
 * Bridge component to connect Context to global getter
 * Renders nothing but syncs context to global state
 */
export function CedictContextBridge() {
  const { getEntry } = useContext(CedictContext);
  
  useEffect(() => {
    globalCedictGetter = getEntry;
    return () => {
      globalCedictGetter = null;
    };
  }, [getEntry]);
  
  return null;
}


