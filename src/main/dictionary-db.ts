import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let db: Database.Database | null = null;

/**
 * Initialize the dictionary database with FTS5 support.
 * Uses the database from userData if it exists, or falls back to bundled data.
 */
export function initDictionaryDB(): void {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'dictionary.db');
  
  // Check if database exists in userData
  if (fs.existsSync(dbPath)) {
    console.log('Loading dictionary database from:', dbPath);
    db = new Database(dbPath, { readonly: true });
  } else {
    // Try to find bundled database
    const bundledPath = path.join(__dirname, '..', '..', 'src', 'data', 'dictionary.db');
    if (fs.existsSync(bundledPath)) {
      console.log('Loading bundled dictionary database from:', bundledPath);
      // Copy bundled database to userData for future use
      fs.copyFileSync(bundledPath, dbPath);
      db = new Database(dbPath, { readonly: true });
    } else {
      console.warn('No dictionary database found. Dictionary search will be unavailable.');
      return;
    }
  }
  
  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  
  console.log('Dictionary database initialized successfully');
}

/**
 * Search the dictionary using FTS5 full-text search.
 * Supports Chinese characters, pinyin, and English definitions.
 */
export function searchDictionary(query: string, limit = 10): DictionaryEntry[] {
  if (!db) {
    console.warn('Dictionary database not initialized');
    return [];
  }
  
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  const trimmedQuery = query.trim().toLowerCase();
  
  try {
    // Try exact match first for Chinese characters
    const exactStmt = db.prepare(`
      SELECT simplified, traditional, pinyin, definitions
      FROM dict_fts 
      WHERE simplified = ?
      LIMIT 1
    `);
    const exactMatch = exactStmt.get(trimmedQuery) as DictionaryEntry | undefined;
    
    if (exactMatch) {
      // If exact match, also get similar results
      const similarStmt = db.prepare(`
        SELECT simplified, traditional, pinyin, definitions, rank
        FROM dict_fts 
        WHERE dict_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `);
      const similar = similarStmt.all(escapeQuery(trimmedQuery) + '*', limit - 1) as DictionaryEntry[];
      
      // Combine exact match with similar results (deduplicated)
      const results = [exactMatch];
      for (const entry of similar) {
        if (entry.simplified !== exactMatch.simplified) {
          results.push(entry);
        }
      }
      return results.slice(0, limit);
    }
    
    // FTS5 MATCH query - fetch more results for re-ranking
    const stmt = db.prepare(`
      SELECT simplified, traditional, pinyin, definitions, rank
      FROM dict_fts 
      WHERE dict_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);
    
    // Escape special FTS5 characters and add prefix matching
    const escapedQuery = escapeQuery(trimmedQuery) + '*';
    const rawResults = stmt.all(escapedQuery, limit * 5) as DictionaryEntry[];
    
    // Re-rank results for English queries to prioritize:
    // 1. Shorter Chinese words (simpler = more common)
    // 2. Definitions that START with the search term
    // 3. Definitions that have the term as a standalone word
    const isEnglishQuery = /^[a-zA-Z\s]+$/.test(trimmedQuery);
    
    if (isEnglishQuery && rawResults.length > 0) {
      const scored = rawResults.map(entry => {
        let score = 0;
        const defs = entry.definitions.toLowerCase();
        const words = defs.split(/[;,]/);
        
        // Huge bonus: definition starts with exact search term
        if (words.some(w => w.trim().startsWith(trimmedQuery))) {
          score += 1000;
        }
        
        // Big bonus: exact word match (not just substring)
        const wordBoundaryRegex = new RegExp(`\\b${trimmedQuery}\\b`);
        if (wordBoundaryRegex.test(defs)) {
          score += 500;
        }
        
        // Bonus for shorter Chinese words (1 char = +300, 2 char = +200, etc.)
        score += Math.max(0, 400 - entry.simplified.length * 100);
        
        // Small bonus if search term is in first definition
        const firstDef = words[0]?.trim() || '';
        if (firstDef.includes(trimmedQuery)) {
          score += 100;
        }
        
        return { entry, score };
      });
      
      // Sort by score (descending), then by original FTS rank
      scored.sort((a, b) => b.score - a.score);
      
      return scored.slice(0, limit).map(s => s.entry);
    }
    
    return rawResults.slice(0, limit);
  } catch (error) {
    console.error('Dictionary search error:', error);
    return [];
  }
}

/**
 * Get a specific dictionary entry by simplified Chinese.
 */
export function getEntry(simplified: string): DictionaryEntry | null {
  if (!db) {
    console.warn('Dictionary database not initialized');
    return null;
  }
  
  try {
    const stmt = db.prepare(`
      SELECT simplified, traditional, pinyin, definitions
      FROM dict_fts 
      WHERE simplified = ?
    `);
    return (stmt.get(simplified) as DictionaryEntry) || null;
  } catch (error) {
    console.error('Dictionary get error:', error);
    return null;
  }
}

/**
 * Get multiple dictionary entries by simplified Chinese.
 */
export function getEntries(simplifiedList: string[]): Map<string, DictionaryEntry> {
  if (!db || simplifiedList.length === 0) {
    return new Map();
  }
  
  const results = new Map<string, DictionaryEntry>();
  
  try {
    const placeholders = simplifiedList.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT simplified, traditional, pinyin, definitions
      FROM dict_fts 
      WHERE simplified IN (${placeholders})
    `);
    
    const entries = stmt.all(...simplifiedList) as DictionaryEntry[];
    for (const entry of entries) {
      results.set(entry.simplified, entry);
    }
  } catch (error) {
    console.error('Dictionary getEntries error:', error);
  }
  
  return results;
}

/**
 * Check if the dictionary database is initialized.
 */
export function isDictionaryReady(): boolean {
  return db !== null;
}

/**
 * Close the database connection.
 */
export function closeDictionaryDB(): void {
  if (db) {
    db.close();
    db = null;
    console.log('Dictionary database closed');
  }
}

/**
 * Escape special FTS5 query characters.
 */
function escapeQuery(query: string): string {
  // FTS5 special characters that need escaping: " * - OR AND NOT
  // For simple queries, wrap in double quotes to treat as phrase
  // But for prefix search, we need to be careful
  return query
    .replace(/"/g, '""')  // Escape double quotes
    .replace(/[*]/g, '');  // Remove asterisks (we add our own for prefix)
}

/**
 * Dictionary entry interface.
 */
export interface DictionaryEntry {
  simplified: string;
  traditional: string;
  pinyin: string;
  definitions: string;
  rank?: number;
}

