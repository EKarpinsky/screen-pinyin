import React from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { colors } from './colors';
import type { DetailType } from './types';

interface DetailHeaderProps {
  detailType: DetailType;
  hasHistory: boolean;
  isLookupMode: boolean;
  onBack: () => void;
  onClose: () => void;
}

/**
 * Header bar for detail panel with navigation, type indicator, and close button
 */
export function DetailHeader({
  detailType,
  hasHistory,
  isLookupMode,
  onBack,
  onClose,
}: DetailHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-6 py-4 animate-[fadeIn_0.3s_ease-out]">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[0.75rem] font-medium uppercase tracking-wide text-[var(--muted-foreground)] bg-transparent border-none cursor-pointer p-1 transition-colors duration-150 hover:text-[var(--foreground)]"
      >
        <ChevronLeft size={16} />
        {hasHistory ? 'Previous' : (isLookupMode ? 'Back' : 'Close')}
      </button>
      
      <div
        className="text-[0.65rem] font-semibold uppercase tracking-widest px-2.5 py-1 rounded"
        style={{
          color: colors.muted,
          backgroundColor: colors.wordHighlight,
        }}
      >
        {detailType === 'word' ? 'Word' : 'Character'}
      </div>
      
      <button
        onClick={onClose}
        className="text-[var(--muted-foreground)] bg-transparent border-none cursor-pointer p-1 flex transition-colors duration-150 hover:text-[var(--foreground)]"
      >
        <X size={18} />
      </button>
    </div>
  );
}

