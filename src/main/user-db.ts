import path from 'node:path';

import BetterSqlite3 from 'better-sqlite3';
import { app } from 'electron';

let db: BetterSqlite3.Database | null = null;

/**
 * Flashcard data stored in SQLite with FSRS scheduling fields.
 */
export interface FlashcardData {
  id: string;
  chinese: string;
  pinyin: string;
  english: string;
  // FSRS scheduling fields
  due: string;           // ISO date string
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;         // 0=New, 1=Learning, 2=Review, 3=Relearning
  last_review: string | null;
  created_at: string;
}

/**
 * Initialize the user data database (writable).
 * Stores flashcards and potentially other user data in the future.
 */
export function initUserDB(): void {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'user-data.db');

  console.log('Initializing user database at:', dbPath);
  db = new BetterSqlite3(dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Create flashcards table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      chinese TEXT NOT NULL,
      pinyin TEXT NOT NULL,
      english TEXT NOT NULL,
      due TEXT NOT NULL,
      stability REAL NOT NULL DEFAULT 0,
      difficulty REAL NOT NULL DEFAULT 0,
      elapsed_days INTEGER NOT NULL DEFAULT 0,
      scheduled_days INTEGER NOT NULL DEFAULT 0,
      reps INTEGER NOT NULL DEFAULT 0,
      lapses INTEGER NOT NULL DEFAULT 0,
      state INTEGER NOT NULL DEFAULT 0,
      last_review TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // Create index for due date queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_flashcards_due ON flashcards(due)
  `);

  // Create unique index on chinese to prevent duplicates
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_flashcards_chinese ON flashcards(chinese)
  `);

  // Create user_stats table for streak tracking and settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_stats (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  console.log('User database initialized successfully');
}

/**
 * Add a new flashcard to the deck.
 * Returns the created flashcard or null if it already exists.
 */
export function addFlashcard(data: {
  chinese: string;
  pinyin: string;
  english: string;
}): FlashcardData | null {
  if (!db) {
    console.warn('User database not initialized');
    return null;
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const now = new Date().toISOString();

  try {
    const stmt = db.prepare(`
      INSERT INTO flashcards (id, chinese, pinyin, english, due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review, created_at)
      VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, NULL, ?)
    `);

    stmt.run(id, data.chinese, data.pinyin, data.english, now, now);

    return {
      id,
      chinese: data.chinese,
      pinyin: data.pinyin,
      english: data.english,
      due: now,
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      last_review: null,
      created_at: now,
    };
  } catch (error) {
    // Likely a duplicate entry
    if ((error as Error).message?.includes('UNIQUE constraint failed')) {
      console.log('Flashcard already exists for:', data.chinese);
      return null;
    }
    console.error('Error adding flashcard:', error);
    return null;
  }
}

/**
 * Get a flashcard by ID.
 */
export function getFlashcard(id: string): FlashcardData | null {
  if (!db) {
    console.warn('User database not initialized');
    return null;
  }

  try {
    const stmt = db.prepare('SELECT * FROM flashcards WHERE id = ?');
    return (stmt.get(id) as FlashcardData) || null;
  } catch (error) {
    console.error('Error getting flashcard:', error);
    return null;
  }
}

/**
 * Get all flashcards.
 */
export function getAllFlashcards(): FlashcardData[] {
  if (!db) {
    console.warn('User database not initialized');
    return [];
  }

  try {
    const stmt = db.prepare('SELECT * FROM flashcards ORDER BY created_at DESC');
    return stmt.all() as FlashcardData[];
  } catch (error) {
    console.error('Error getting all flashcards:', error);
    return [];
  }
}

/**
 * Get flashcards that are due for review (due date <= now).
 */
export function getDueFlashcards(): FlashcardData[] {
  if (!db) {
    console.warn('User database not initialized');
    return [];
  }

  try {
    const now = new Date().toISOString();
    const stmt = db.prepare('SELECT * FROM flashcards WHERE due <= ? ORDER BY due ASC');
    return stmt.all(now) as FlashcardData[];
  } catch (error) {
    console.error('Error getting due flashcards:', error);
    return [];
  }
}

/**
 * Update a flashcard's FSRS scheduling data after review.
 */
export function updateFlashcard(
  id: string,
  updates: Partial<Omit<FlashcardData, 'id' | 'chinese' | 'pinyin' | 'english' | 'created_at'>>
): boolean {
  if (!db) {
    console.warn('User database not initialized');
    return false;
  }

  try {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.due !== undefined) {
      fields.push('due = ?');
      values.push(updates.due);
    }
    if (updates.stability !== undefined) {
      fields.push('stability = ?');
      values.push(updates.stability);
    }
    if (updates.difficulty !== undefined) {
      fields.push('difficulty = ?');
      values.push(updates.difficulty);
    }
    if (updates.elapsed_days !== undefined) {
      fields.push('elapsed_days = ?');
      values.push(updates.elapsed_days);
    }
    if (updates.scheduled_days !== undefined) {
      fields.push('scheduled_days = ?');
      values.push(updates.scheduled_days);
    }
    if (updates.reps !== undefined) {
      fields.push('reps = ?');
      values.push(updates.reps);
    }
    if (updates.lapses !== undefined) {
      fields.push('lapses = ?');
      values.push(updates.lapses);
    }
    if (updates.state !== undefined) {
      fields.push('state = ?');
      values.push(updates.state);
    }
    if (updates.last_review !== undefined) {
      fields.push('last_review = ?');
      values.push(updates.last_review);
    }

    if (fields.length === 0) {
      return true; // Nothing to update
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE flashcards SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);

    return result.changes > 0;
  } catch (error) {
    console.error('Error updating flashcard:', error);
    return false;
  }
}

/**
 * Delete a flashcard.
 */
export function deleteFlashcard(id: string): boolean {
  if (!db) {
    console.warn('User database not initialized');
    return false;
  }

  try {
    const stmt = db.prepare('DELETE FROM flashcards WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting flashcard:', error);
    return false;
  }
}

/**
 * Check if a flashcard exists for the given Chinese text.
 */
export function flashcardExists(chinese: string): boolean {
  if (!db) {
    console.warn('User database not initialized');
    return false;
  }

  try {
    const stmt = db.prepare('SELECT 1 FROM flashcards WHERE chinese = ? LIMIT 1');
    return stmt.get(chinese) !== undefined;
  } catch (error) {
    console.error('Error checking flashcard existence:', error);
    return false;
  }
}

/**
 * Get flashcard counts by state.
 */
export function getFlashcardStats(): { total: number; new: number; learning: number; review: number; due: number } {
  if (!db) {
    return { total: 0, new: 0, learning: 0, review: 0, due: 0 };
  }

  try {
    const total = (db.prepare('SELECT COUNT(*) as count FROM flashcards').get() as { count: number }).count;
    const newCount = (db.prepare('SELECT COUNT(*) as count FROM flashcards WHERE state = 0').get() as { count: number }).count;
    const learning = (db.prepare('SELECT COUNT(*) as count FROM flashcards WHERE state = 1 OR state = 3').get() as { count: number }).count;
    const review = (db.prepare('SELECT COUNT(*) as count FROM flashcards WHERE state = 2').get() as { count: number }).count;
    const now = new Date().toISOString();
    const due = (db.prepare('SELECT COUNT(*) as count FROM flashcards WHERE due <= ?').get(now) as { count: number }).count;

    return { total, new: newCount, learning, review, due };
  } catch (error) {
    console.error('Error getting flashcard stats:', error);
    return { total: 0, new: 0, learning: 0, review: 0, due: 0 };
  }
}

/**
 * Check if the user database is initialized.
 */
export function isUserDBReady(): boolean {
  return db !== null;
}

/**
 * Close the user database connection.
 */
export function closeUserDB(): void {
  if (db) {
    db.close();
    db = null;
    console.log('User database closed');
  }
}

// =====================
// User Stats Functions
// =====================

/**
 * Get a stat value by key.
 */
export function getStat(key: string): string | null {
  if (!db) return null;
  try {
    const stmt = db.prepare('SELECT value FROM user_stats WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;
    return row?.value ?? null;
  } catch (error) {
    console.error('Error getting stat:', error);
    return null;
  }
}

/**
 * Set a stat value by key.
 */
export function setStat(key: string, value: string): boolean {
  if (!db) return false;
  try {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO user_stats (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    stmt.run(key, value, now);
    return true;
  } catch (error) {
    console.error('Error setting stat:', error);
    return false;
  }
}

/**
 * Get streak and mastery statistics.
 */
export function getStreakStats(): {
  currentStreak: number;
  longestStreak: number;
  totalMastered: number;
  lastReviewDate: string | null;
} {
  const currentStreak = Number.parseInt(getStat('current_streak') || '0', 10);
  const longestStreak = Number.parseInt(getStat('longest_streak') || '0', 10);
  const totalMastered = Number.parseInt(getStat('total_mastered') || '0', 10);
  const lastReviewDate = getStat('last_review_date');
  
  return { currentStreak, longestStreak, totalMastered, lastReviewDate };
}

/**
 * Update streak after a review session.
 * Should be called when user completes at least one review.
 */
export function updateStreakAfterReview(): {
  currentStreak: number;
  longestStreak: number;
  streakIncremented: boolean;
} {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const lastReviewDate = getStat('last_review_date');
  let currentStreak = Number.parseInt(getStat('current_streak') || '0', 10);
  let longestStreak = Number.parseInt(getStat('longest_streak') || '0', 10);
  let streakIncremented = false;

  if (lastReviewDate === today) {
    // Already reviewed today, no change to streak
    return { currentStreak, longestStreak, streakIncremented: false };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (lastReviewDate === yesterdayStr) {
    // Reviewed yesterday, increment streak
    currentStreak += 1;
    streakIncremented = true;
  } else if (lastReviewDate) {
    // Missed a day, reset streak
    currentStreak = 1;
    streakIncremented = true;
  } else {
    // First review ever
    currentStreak = 1;
    streakIncremented = true;
  }

  // Update longest streak if needed
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
    setStat('longest_streak', longestStreak.toString());
  }

  setStat('current_streak', currentStreak.toString());
  setStat('last_review_date', today);

  return { currentStreak, longestStreak, streakIncremented };
}

/**
 * Increment the total mastered count.
 * Called when a card reaches a certain stability threshold.
 */
export function incrementMastered(): number {
  const current = Number.parseInt(getStat('total_mastered') || '0', 10);
  const newTotal = current + 1;
  setStat('total_mastered', newTotal.toString());
  return newTotal;
}

/**
 * Check if exit prompt should be shown (not dismissed today).
 */
export function shouldShowExitPrompt(): boolean {
  const dismissedDate = getStat('exit_prompt_dismissed_date');
  if (!dismissedDate) return true;
  
  const today = new Date().toISOString().split('T')[0];
  return dismissedDate !== today;
}

/**
 * Mark exit prompt as dismissed for today.
 */
export function dismissExitPrompt(): void {
  const today = new Date().toISOString().split('T')[0];
  setStat('exit_prompt_dismissed_date', today);
}

/**
 * Get ambient widget enabled state.
 */
export function getAmbientWidgetEnabled(): boolean {
  return getStat('ambient_widget_enabled') === 'true';
}

/**
 * Set ambient widget enabled state.
 */
export function setAmbientWidgetEnabled(enabled: boolean): void {
  setStat('ambient_widget_enabled', enabled.toString());
}

/**
 * Get notification times (JSON array of hour numbers, e.g., [9, 18]).
 */
export function getNotificationTimes(): number[] {
  const times = getStat('notification_times');
  if (!times) return [9, 18]; // Default: 9am and 6pm
  try {
    return JSON.parse(times);
  } catch {
    return [9, 18];
  }
}

/**
 * Set notification times.
 */
export function setNotificationTimes(times: number[]): void {
  setStat('notification_times', JSON.stringify(times));
}

/**
 * Get flashcard by Chinese text (for in-deck indicator).
 */
export function getFlashcardByChinese(chinese: string): FlashcardData | null {
  if (!db) return null;
  try {
    const stmt = db.prepare('SELECT * FROM flashcards WHERE chinese = ?');
    return (stmt.get(chinese) as FlashcardData) || null;
  } catch (error) {
    console.error('Error getting flashcard by chinese:', error);
    return null;
  }
}

