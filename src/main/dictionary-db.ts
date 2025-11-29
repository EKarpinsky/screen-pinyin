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
  
  const trimmedQuery = query.trim();
  
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
    
    // FTS5 MATCH query with prefix search
    const stmt = db.prepare(`
      SELECT simplified, traditional, pinyin, definitions, rank
      FROM dict_fts 
      WHERE dict_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);
    
    // Escape special FTS5 characters and add prefix matching
    const escapedQuery = escapeQuery(trimmedQuery) + '*';
    return stmt.all(escapedQuery, limit) as DictionaryEntry[];
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

