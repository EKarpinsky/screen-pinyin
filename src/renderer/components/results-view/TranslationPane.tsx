import { Copy, Check, ArrowLeft, BookOpen, Plus } from 'lucide-react';
import React, { ReactNode } from 'react';

import { ScrollArea } from '../ui/scroll-area';

import { colors } from './colors';
import type { ResultsData } from './types';

interface TranslationPaneProps {
  data: ResultsData;
  hasDetail: boolean;
  copied: boolean;
  isInDeck: boolean;
  addedToDeck: boolean;
  onBack: () => void;
  onCopy: () => void;
  onAddToFlashcards: () => void;
  renderSegmentedText: (size: string) => ReactNode;
}

/**
 * Left column showing original text, pinyin, translation, and action buttons
 * Hidden in lookup mode, shrinks when detail panel is open
 */
export function TranslationPane({
  data,
  hasDetail,
  copied,
  isInDeck,
  addedToDeck,
  onBack,
  onCopy,
  onAddToFlashcards,
  renderSegmentedText,
}: TranslationPaneProps) {
  return (
    <div
      className="flex flex-col overflow-hidden bg-[var(--background)] transition-[width] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{
        width: hasDetail ? '35%' : '100%',
        borderRight: hasDetail ? `1px solid ${colors.border}` : 'none',
      }}
    >
      <ScrollArea className="flex-1">
        <div className="p-6 pb-8 px-8 min-h-full">
          {/* Back button */}
          <button
            onClick={onBack}
            className="border-none bg-transparent py-1.5 px-0 text-sm text-[var(--muted-foreground)] cursor-pointer font-inherit flex items-center gap-1.5 mb-5 transition-colors duration-200 hover:text-[var(--foreground)]"
          >
            <ArrowLeft size={16} />
            Back to History
          </button>

          <div className="flex flex-col gap-6">
            {/* Chinese Text - with word segmentation */}
            <div className="animate-[slideUp_0.4s_ease-out]">
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)] mb-2">
                Original Text
                <span className="ml-2 font-normal text-[0.65rem] opacity-70">
                  (click words to explore)
                </span>
              </div>
              <div
                className="font-['Microsoft_YaHei','PingFang_SC','Noto_Sans_SC',sans-serif] font-medium text-[var(--foreground)] leading-relaxed tracking-wide transition-[font-size] duration-400 ease-out"
                style={{ fontSize: hasDetail ? '2.25rem' : '3.5rem' }}
              >
                {renderSegmentedText(hasDetail ? '2.25rem' : '3.5rem')}
              </div>
            </div>

            {/* Pinyin */}
            <div className="animate-[slideUp_0.4s_0.1s_ease-out_backwards]">
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)] mb-1.5">
                Pinyin
              </div>
              <p
                className="font-mono text-[var(--text-secondary)] leading-normal tracking-wide m-0 transition-[font-size] duration-400 ease-out"
                style={{ fontSize: hasDetail ? '0.95rem' : '1.15rem' }}
              >
                {data.pinyin}
              </p>
            </div>

            {/* Translation */}
            <div className="animate-[slideUp_0.4s_0.2s_ease-out_backwards]">
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)] mb-1.5">
                Translation
              </div>
              <p
                className="text-[var(--foreground)] leading-relaxed m-0 transition-[font-size] duration-400 ease-out"
                style={{ fontSize: hasDetail ? '0.9rem' : '1.05rem' }}
              >
                {data.translation}
              </p>
            </div>

            {/* Action Buttons - only show when no detail panel */}
            {!hasDetail && (
              <div className="animate-[slideUp_0.4s_0.3s_ease-out_backwards] flex flex-col gap-2.5 max-w-xs">
                {/* Copy Button */}
                <button
                  onClick={onCopy}
                  className="w-full flex items-center justify-center gap-2 border border-[var(--border)] py-3.5 px-6 text-sm font-medium cursor-pointer font-inherit transition-all duration-200 hover:bg-[var(--foreground)] hover:text-[var(--card)]"
                  style={{
                    backgroundColor: copied ? colors.foreground : 'var(--muted)',
                    color: copied ? colors.card : colors.foreground,
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy All'}
                </button>

                {/* Add to Flashcards Button */}
                <button
                  onClick={onAddToFlashcards}
                  disabled={isInDeck}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 text-sm font-medium font-inherit transition-all duration-200"
                  style={{
                    border: `1px solid ${isInDeck || addedToDeck ? 'var(--border)' : colors.primary}`,
                    backgroundColor: isInDeck || addedToDeck ? 'var(--muted)' : 'transparent',
                    color: isInDeck || addedToDeck ? colors.muted : colors.primary,
                    cursor: isInDeck ? 'default' : 'pointer',
                    opacity: isInDeck && !addedToDeck ? 0.7 : 1,
                  }}
                >
                  {addedToDeck ? <Check size={16} /> : (isInDeck ? <BookOpen size={16} /> : <Plus size={16} />)}
                  {addedToDeck ? 'Added to Deck!' : (isInDeck ? 'Already in Deck' : 'Add to Flashcards')}
                </button>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}


