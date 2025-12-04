import React from 'react';
import { cn } from '@utils';
import { ResultsViewWithDetail } from '../results-view-with-detail';
import type { ResultsData } from './types';

interface ResultsPaneProps {
  data: ResultsData | null;
  isProcessing: boolean;
  error: string | null;
  onBack: () => void;
}

export function ResultsPane({
  data,
  isProcessing,
  error,
  onBack,
}: ResultsPaneProps) {
  // Loading state
  if (isProcessing) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-[var(--muted-foreground)]">
          <div
            className={cn(
              "w-6 h-6 mx-auto mb-4",
              "border-2 border-[var(--border)] border-t-[var(--foreground)]",
              "rounded-full animate-spin"
            )}
          />
          <div className="text-sm">Processing...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center p-8 max-w-[400px]">
          <div
            className={cn(
              "text-[0.7rem] font-semibold uppercase",
              "tracking-[0.1em] text-red-600 dark:text-red-400",
              "mb-3"
            )}
          >
            Error
          </div>
          <div className="text-sm text-[var(--foreground)] leading-relaxed mb-6">
            {error}
          </div>
          <button
            onClick={onBack}
            className={cn(
              "border border-[var(--border)]",
              "bg-transparent py-2.5 px-5",
              "text-sm text-[var(--foreground)]",
              "cursor-pointer font-[inherit]",
              "flex items-center gap-2 mx-auto",
              "hover:bg-[var(--hover-bg)] transition-colors"
            )}
          >
            Back to History
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--muted-foreground)]">
        No results to display
      </div>
    );
  }

  // Actual results
  return <ResultsViewWithDetail data={data} onBack={onBack} />;
}

