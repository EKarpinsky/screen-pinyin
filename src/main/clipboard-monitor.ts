import { clipboard } from 'electron';

import { searchDictionary, isDictionaryReady } from './dictionary-db';

// Chinese character detection regex
const CHINESE_REGEX = /[\u4E00-\u9FFF]/;

export interface ClipboardData {
  chinese: string;
  pinyin: string;
  english: string;
}

/**
 * Check if text contains Chinese characters
 */
function containsChinese(text: string): boolean {
  return CHINESE_REGEX.test(text);
}

/**
 * Extract the first Chinese word/phrase from text
 * Returns the longest matching dictionary entry, or just Chinese characters
 */
function extractChineseText(text: string): string {
  // Clean the text - remove whitespace and get just Chinese chars
  const cleaned = text.trim();
  
  // If it's short enough, use as-is
  if (cleaned.length <= 10) {
    return cleaned;
  }
  
  // Extract just Chinese characters for longer text
  const chineseOnly = cleaned.match(/[\u4E00-\u9FFF]+/g);
  if (chineseOnly) {
    return chineseOnly[0].slice(0, 10); // Limit to first 10 chars
  }
  
  return cleaned.slice(0, 10);
}

/**
 * Look up Chinese text in dictionary
 */
async function lookupText(chinese: string): Promise<ClipboardData | null> {
  if (!isDictionaryReady()) {
    return null;
  }
  
  try {
    // Try to find exact match first
    const results = searchDictionary(chinese, 1);
    
    if (results && results.length > 0) {
      const entry = results[0];
      return {
        chinese,
        pinyin: entry.pinyin || '',
        english: entry.definitions?.split('; ')[0] || '',
      };
    }
    
    // If no exact match and multi-char, try first character
    if (chinese.length > 1) {
      const firstChar = chinese[0];
      const charResults = searchDictionary(firstChar, 1);
      if (charResults && charResults.length > 0) {
        const entry = charResults[0];
        return {
          chinese,
          pinyin: entry.pinyin || '',
          english: `(${firstChar}) ${entry.definitions?.split('; ')[0] || ''}`,
        };
      }
    }
    
    return null;
  } catch (err) {
    console.error('Dictionary lookup failed:', err);
    return null;
  }
}

/**
 * Trigger lookup from current clipboard content (called on hotkey press)
 * Returns the lookup data if Chinese text found, null otherwise
 */
export async function triggerClipboardLookup(): Promise<ClipboardData | null> {
  try {
    const currentText = clipboard.readText();
    
    if (!currentText) {
      return null;
    }
    
    // Check if contains Chinese
    if (!containsChinese(currentText)) {
      return null;
    }
    
    // Extract Chinese text
    const chinese = extractChineseText(currentText);
    
    // Look up in dictionary
    return await lookupText(chinese);
  } catch (err) {
    console.error('Clipboard lookup failed:', err);
    return null;
  }
}

