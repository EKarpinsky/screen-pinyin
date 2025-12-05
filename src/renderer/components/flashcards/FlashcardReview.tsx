import { ArrowLeft, BookOpen } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { cn } from '@utils';

import { useKeyboardShortcut } from '../../hooks/use-keyboard-shortcut';

import type { FlashcardData, FlashcardIntervals, FlashcardReviewProps } from './types';
import { Rating } from './types';

function formatInterval(days: number): string {
  if (days < 1) return '<1d';
  if (days === 1) return '1d';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

export function FlashcardReview({ onComplete, onBack }: FlashcardReviewProps) {
  const [cards, setCards] = useState<FlashcardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [intervals, setIntervals] = useState<FlashcardIntervals | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewedCount, setReviewedCount] = useState(0);

  const currentCard = cards[currentIndex];

  // Load due cards
  useEffect(() => {
    const loadCards = async () => {
      try {
        const dueCards = await window.electronAPI.flashcardGetDue();
        if (dueCards.length === 0) {
          onComplete();
          return;
        }
        setCards(dueCards);
      } catch (error) {
        console.error('Failed to load due cards:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCards();
  }, [onComplete]);

  // Load intervals for current card
  useEffect(() => {
    const loadIntervals = async () => {
      if (!currentCard) return;
      try {
        const cardIntervals = await window.electronAPI.flashcardGetIntervals(currentCard.id);
        setIntervals(cardIntervals);
      } catch (error) {
        console.error('Failed to load intervals:', error);
      }
    };
    loadIntervals();
  }, [currentCard]);

  const handleFlip = useCallback(() => {
    setIsFlipped(!isFlipped);
  }, [isFlipped]);

  const handleRating = useCallback(async (rating: Rating) => {
    if (!currentCard) return;

    try {
      await window.electronAPI.flashcardReview(currentCard.id, rating);
      setReviewedCount(prev => prev + 1);

      // Move to next card or complete
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
        setIntervals(null);
      } else {
        // Update streak when session completes
        try {
          await window.electronAPI.statsUpdateStreak();
        } catch (error) {
          console.error('Failed to update streak:', error);
        }
        onComplete();
      }
    } catch (error) {
      console.error('Failed to review card:', error);
    }
  }, [currentCard, currentIndex, cards.length, onComplete]);

  // Keyboard shortcuts
  useKeyboardShortcut(['space', '1', '2', '3', '4', 'escape'], (e) => {
    if (e.code === 'Space' && !isFlipped) {
      handleFlip();
    } else if (isFlipped) {
      switch (e.key) {
        case '1': { handleRating(Rating.Again); break;
        }
        case '2': { handleRating(Rating.Hard); break;
        }
        case '3': { handleRating(Rating.Good); break;
        }
        case '4': { handleRating(Rating.Easy); break;
        }
      }
    }
    if (e.key === 'Escape') onBack();
  }, { deps: [isFlipped, handleFlip, handleRating, onBack] });

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[var(--background)] items-center justify-center">
        <div className="text-[var(--muted-foreground)] animate-pulse">Loading review session...</div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="flex flex-col h-full bg-[var(--background)] items-center justify-center">
        <BookOpen className="w-12 h-12 text-[var(--primary)] mb-4" />
        <div className="text-[var(--foreground)] text-xl font-semibold mb-2">Review Complete!</div>
        <div className="text-[var(--muted-foreground)]">You reviewed {reviewedCount} cards.</div>
        <button
          onClick={onBack}
          className="mt-6 px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl hover:opacity-90 transition-opacity font-medium"
        >
          Back to Deck
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--background)]">
      {/* Header */}
      <div className="border-b border-[var(--border)]/50">
        <div className="max-w-5xl mx-auto px-8 py-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[var(--primary)] hover:opacity-70 transition-opacity font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Deck</span>
          </button>
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-[var(--primary)]" />
            <div className="text-center">
              <div className="text-sm text-[var(--muted-foreground)] font-medium">Progress</div>
              <div className="text-2xl font-bold text-[var(--primary)]">
                {currentIndex + 1} / {cards.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-10">
          {/* Status Badge */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 bg-[var(--card)] px-6 py-3 rounded-full border border-[var(--border)] shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-[var(--muted-foreground)]">
                {cards.length - currentIndex} cards remaining
              </span>
            </div>
          </div>

          {/* Flashcard */}
          <button
            onClick={handleFlip}
            className={cn(
              "w-full bg-[var(--card)] rounded-2xl shadow-sm border-2 border-[var(--border)]",
              "hover:border-[var(--primary)]/30 p-16 min-h-[400px]",
              "flex items-center justify-center transition-all group mb-8"
            )}
          >
            {isFlipped ? (
              <div className="text-center w-full space-y-5">
                <div className="chinese-text text-7xl font-bold text-[var(--foreground)] leading-none">
                  {currentCard.chinese}
                </div>
                <div className="h-px w-32 bg-[var(--border)]/50 mx-auto" />
                <div className="font-mono text-2xl text-[var(--muted-foreground)] tracking-wide">
                  {currentCard.pinyin}
                </div>
                <div className="h-px w-32 bg-[var(--border)]/50 mx-auto" />
                <div className="text-2xl text-[var(--primary)] max-w-2xl mx-auto leading-relaxed font-medium">
                  {currentCard.english}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="chinese-text text-8xl font-bold text-[var(--foreground)] mb-6 leading-none">
                  {currentCard.chinese}
                </div>
                <div className="text-[var(--muted-foreground)] text-base font-medium opacity-40 group-hover:opacity-100 transition-opacity">
                  Click to reveal • Press Space
                </div>
              </div>
            )}
          </button>

          {/* Rating Section */}
          {isFlipped ? (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-sm text-[var(--muted-foreground)] font-medium mb-1">
                  How well did you recall?
                </p>
                <p className="text-xs text-[var(--muted-foreground)]/60">
                  Choose your confidence level
                </p>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <RatingButton
                  label="Again"
                  shortcut="1"
                  interval={intervals ? formatInterval(intervals.again) : '...'}
                  variant="again"
                  onClick={() => handleRating(Rating.Again)}
                />
                <RatingButton
                  label="Hard"
                  shortcut="2"
                  interval={intervals ? formatInterval(intervals.hard) : '...'}
                  variant="hard"
                  onClick={() => handleRating(Rating.Hard)}
                />
                <RatingButton
                  label="Good"
                  shortcut="3"
                  interval={intervals ? formatInterval(intervals.good) : '...'}
                  variant="good"
                  onClick={() => handleRating(Rating.Good)}
                />
                <RatingButton
                  label="Easy"
                  shortcut="4"
                  interval={intervals ? formatInterval(intervals.easy) : '...'}
                  variant="easy"
                  onClick={() => handleRating(Rating.Easy)}
                />
              </div>

              <div className="text-center text-xs text-[var(--muted-foreground)]/60 font-medium pt-2">
                Keyboard: Press 1, 2, 3, or 4
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-[var(--muted-foreground)] font-medium">
                Reveal the answer to rate your recall
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface RatingButtonProps {
  label: string;
  shortcut: string;
  interval: string;
  variant: 'again' | 'hard' | 'good' | 'easy';
  onClick: () => void;
}

function RatingButton({ label, shortcut, interval, variant, onClick }: RatingButtonProps) {
  // Card-based buttons with subtle colored borders - cohesive with deck view
  const styles = {
    again: 'bg-[var(--card)] border-2 border-red-400/30 hover:border-red-400/50 hover:bg-red-500/5 text-red-500',
    hard: 'bg-[var(--card)] border-2 border-orange-400/30 hover:border-orange-400/50 hover:bg-orange-500/5 text-orange-500',
    good: 'bg-[var(--card)] border-2 border-green-400/30 hover:border-green-400/50 hover:bg-green-500/5 text-green-500',
    easy: 'bg-[var(--card)] border-2 border-blue-400/30 hover:border-blue-400/50 hover:bg-blue-500/5 text-blue-500',
  };

  return (
    <button
      onClick={onClick}
      className={cn(styles[variant], 'rounded-xl p-5 transition-all hover:shadow-md group')}
    >
      <div className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-2">
        {interval}
      </div>
      <div className="text-xl font-bold mb-2">{label}</div>
      <kbd className="text-xs opacity-50 font-mono bg-[var(--background)]/50 px-2 py-1 rounded border border-current/20">
        {shortcut}
      </kbd>
    </button>
  );
}

export default FlashcardReview;
