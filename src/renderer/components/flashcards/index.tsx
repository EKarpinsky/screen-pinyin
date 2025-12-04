import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, Trash2, Play } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@utils';
import type { FlashcardData, FlashcardStats, FlashcardDeckProps, CardState } from './types';
import type { StreakStats as StreakStatsType } from '../../../shared/types';
import { WelcomeBanner } from './WelcomeBanner';
import { StreakStats } from './StreakStats';

// Colors using CSS variables for dark mode compatibility
const colors = {
  background: 'var(--background)',
  card: 'var(--card)',
  foreground: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  border: 'var(--border)',
  primary: 'var(--primary)',
};

export function FlashcardDeck({ onStartReview }: FlashcardDeckProps) {
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [stats, setStats] = useState<FlashcardStats>({ total: 0, new: 0, learning: 0, review: 0, due: 0 });
  const [streakStats, setStreakStats] = useState<StreakStatsType>({ currentStreak: 0, longestStreak: 0, totalMastered: 0, lastReviewDate: null });
  const [loading, setLoading] = useState(true);

  const loadFlashcards = async () => {
    try {
      const [cards, flashcardStats, userStreakStats] = await Promise.all([
        window.electronAPI.flashcardGetAll(),
        window.electronAPI.flashcardGetStats(),
        window.electronAPI.statsGet(),
      ]);
      setFlashcards(cards);
      setStats(flashcardStats);
      setStreakStats(userStreakStats);
    } catch (error) {
      console.error('Failed to load flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlashcards();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await window.electronAPI.flashcardDelete(id);
    if (result.success) {
      setFlashcards(flashcards.filter(card => card.id !== id));
      setStats(prev => ({
        ...prev,
        total: prev.total - 1,
        due: Math.max(0, prev.due - 1),
      }));
    }
  };

  const getStateBadgeColor = (state: number) => {
    switch (state) {
      case 0: // New
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
      case 1: // Learning
      case 3: // Relearning
        return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
      case 2: // Review
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    }
  };

  const getStateLabel = (state: number) => {
    switch (state) {
      case 0: return 'New';
      case 1: return 'Learning';
      case 2: return 'Review';
      case 3: return 'Relearning';
      default: return 'Unknown';
    }
  };

  const getDueDateText = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days}d`;
  };

  if (loading) {
    return (
      <div className={cn(
        "flex flex-col h-full bg-[var(--background)]",
        "font-['Segoe_UI',system-ui,-apple-system,sans-serif]"
      )}>
        <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">
          <span className="animate-pulse">Loading flashcards...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-[var(--background)] overflow-hidden",
      "font-['Segoe_UI',system-ui,-apple-system,sans-serif]"
    )}>
      {/* Header */}
      <div className="border-b border-[var(--border)] p-6 px-8">
        {/* Welcome Banner - only shows when cards are due */}
        <WelcomeBanner dueCount={stats.due} onStartReview={onStartReview} />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-[var(--primary)]" />
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Flashcards</h1>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Total Cards</div>
            <div className="text-2xl font-bold text-[var(--primary)]">{stats.total}</div>
          </div>
        </div>

        {/* Streak Stats */}
        <div className="mb-4">
          <StreakStats
            currentStreak={streakStats.currentStreak}
            longestStreak={streakStats.longestStreak}
            totalMastered={streakStats.totalMastered}
            variant="compact"
          />
        </div>

        {/* Stats Bar */}
        <div className="bg-[var(--card)] rounded-lg border border-[var(--border)] p-4 mb-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Due Today</div>
              <div className="text-xl font-bold text-[var(--primary)]">{stats.due}</div>
            </div>
            <div className="text-center border-l border-[var(--border)]">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">New</div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.new}</div>
            </div>
            <div className="text-center border-l border-[var(--border)]">
              <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Learning</div>
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{stats.learning}</div>
            </div>
            <div className="text-center border-l border-[var(--border)]">
              <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Review</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.review}</div>
            </div>
          </div>
        </div>

        {/* Start Review Button */}
        <button
          onClick={onStartReview}
          disabled={stats.due === 0}
          className={cn(
            "w-full h-12 text-base font-semibold rounded-lg transition-all flex items-center justify-center gap-2",
            stats.due > 0
              ? "bg-[var(--foreground)] text-[var(--card)] hover:opacity-90"
              : "bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed"
          )}
        >
          <Play className="w-4 h-4" />
          {stats.due > 0 ? `Start Review (${stats.due} cards)` : 'No cards due'}
        </button>
      </div>

      {/* Flashcard Grid */}
      <ScrollArea className="flex-1">
        {flashcards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 px-8">
            <BookOpen className="w-16 h-16 text-[var(--muted-foreground)] mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No flashcards yet</h3>
            <p className="text-sm text-[var(--muted-foreground)] text-center max-w-xs">
              Add flashcards from your translations to start learning with spaced repetition.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 px-8">
            {flashcards.map((card, index) => (
              <FlashcardCard
                key={card.id}
                card={card}
                index={index}
                badgeColor={getStateBadgeColor(card.state)}
                stateLabel={getStateLabel(card.state)}
                dueDateText={getDueDateText(card.due)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface FlashcardCardProps {
  card: FlashcardData;
  index: number;
  badgeColor: string;
  stateLabel: string;
  dueDateText: string;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

function FlashcardCard({ card, index, badgeColor, stateLabel, dueDateText, onDelete }: FlashcardCardProps) {
  return (
    <div
      className={cn(
        "group relative bg-[var(--card)] rounded-lg border border-[var(--border)]",
        "p-5 hover:shadow-md transition-all hover:border-[var(--primary)]",
        "animate-[slideUp_0.3s_ease-out_backwards]"
      )}
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      {/* Delete Button */}
      <button
        onClick={(e) => onDelete(card.id, e)}
        className={cn(
          "absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity",
          "p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
        )}
        aria-label="Delete flashcard"
      >
        <Trash2 className="w-4 h-4 text-red-500" />
      </button>

      {/* Chinese */}
      <div className="chinese-text text-4xl font-bold text-[var(--foreground)] mb-2 leading-tight pr-8">
        {card.chinese}
      </div>

      {/* Pinyin */}
      <div className="font-mono text-base text-[var(--muted-foreground)] mb-2">
        {card.pinyin}
      </div>

      {/* English */}
      <div className="text-sm text-[var(--foreground)] opacity-80 mb-4 line-clamp-2 min-h-[40px]">
        {card.english}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
        <span className={cn(
          "text-xs font-semibold px-2.5 py-1 rounded-full border",
          badgeColor
        )}>
          {stateLabel}
        </span>
        <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
          <Calendar className="w-3.5 h-3.5" />
          <span>{dueDateText}</span>
        </div>
      </div>
    </div>
  );
}

export default FlashcardDeck;

