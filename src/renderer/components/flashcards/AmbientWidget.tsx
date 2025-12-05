import { ChevronRight, X, Minimize2, Maximize2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import type { FlashcardData } from '../../../shared/types';

interface AmbientWidgetProps {
  onClose: () => void;
}

export function AmbientWidget({ onClose }: AmbientWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [cards, setCards] = useState<FlashcardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const dueCards = await window.electronAPI.flashcardGetDue();
      setCards(dueCards);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    setIsRevealed(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Loop back to start
      setCurrentIndex(0);
    }
  };

  const handleSkip = () => {
    setIsRevealed(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
          style={{ 
            backgroundColor: 'var(--card, #fdfcfa)',
            border: '1px solid rgba(var(--border), 0.5)',
            color: 'var(--foreground, #1a1a1a)'
          }}
        >
          <Maximize2 className="h-5 w-5" />
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div 
        className="fixed bottom-6 right-6 z-50 w-80 rounded-xl shadow-2xl backdrop-blur-sm"
        style={{ 
          backgroundColor: 'var(--card, #fdfcfa)',
          border: '1px solid rgba(var(--border), 0.5)'
        }}
      >
        <div className="p-6 text-center">
          <div 
            className="animate-pulse text-sm"
            style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
          >
            Loading cards...
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard || cards.length === 0) {
    return (
      <div 
        className="fixed bottom-6 right-6 z-50 w-80 rounded-xl shadow-2xl backdrop-blur-sm"
        style={{ 
          backgroundColor: 'var(--card, #fdfcfa)',
          border: '1px solid rgba(var(--border), 0.5)'
        }}
      >
        <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: 'rgba(var(--border), 0.3)' }}>
          <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground, #6b6b6b)' }}>
            Ambient Review
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-black/5"
            style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="p-6 text-center">
          <div 
            className="text-sm"
            style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
          >
            No cards due for review!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed bottom-6 right-6 z-50 w-80 rounded-xl shadow-2xl backdrop-blur-sm"
      style={{ 
        backgroundColor: 'var(--card, #fdfcfa)',
        border: '1px solid rgba(var(--border), 0.5)'
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between border-b px-4 py-2.5"
        style={{ borderColor: 'rgba(var(--border), 0.3)' }}
      >
        <div className="flex items-center gap-2">
          <div 
            className="h-2 w-2 rounded-full animate-pulse"
            style={{ backgroundColor: 'var(--chart-2, #f97316)' }}
          />
          <span 
            className="text-xs font-medium"
            style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
          >
            Ambient Review • {cards.length} left
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded hover:bg-black/5"
            style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-black/5"
            style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Card content */}
      <button
        type="button"
        className="p-6 cursor-pointer select-none min-h-[140px] flex flex-col items-center justify-center space-y-3 w-full bg-transparent border-none text-left"
        onClick={() => setIsRevealed(!isRevealed)}
      >
        <div 
          className="text-5xl font-medium chinese-text"
          style={{ 
            color: 'var(--foreground, #1a1a1a)',
            fontFamily: '"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif'
          }}
        >
          {currentCard.chinese}
        </div>

        {isRevealed && (
          <div className="space-y-1.5 text-center animate-in fade-in duration-200">
            <div 
              className="text-sm font-mono"
              style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
            >
              {currentCard.pinyin}
            </div>
            <div 
              className="text-sm"
              style={{ color: 'var(--foreground, #1a1a1a)' }}
            >
              {currentCard.english}
            </div>
          </div>
        )}

        {!isRevealed && (
          <div 
            className="text-xs"
            style={{ color: 'rgba(var(--muted-foreground), 0.6)' }}
          >
            Click to reveal
          </div>
        )}
      </button>

      {/* Actions */}
      <div 
        className="flex items-center gap-2 border-t p-3"
        style={{ borderColor: 'rgba(var(--border), 0.3)' }}
      >
        <button
          onClick={handleSkip}
          className="flex-1 py-2 px-3 text-sm rounded-lg transition-colors hover:bg-black/5"
          style={{ color: 'var(--muted-foreground, #6b6b6b)' }}
        >
          Skip
        </button>
        <button
          onClick={handleNext}
          className="flex-1 py-2 px-3 text-sm rounded-lg transition-colors flex items-center justify-center gap-1"
          style={{ 
            backgroundColor: 'rgba(74, 55, 40, 0.05)',
            color: 'var(--primary, #4a3728)',
            border: '1px solid rgba(74, 55, 40, 0.2)'
          }}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}






