import React from 'react';
import { cn } from '@utils';

interface KeyboardHintProps {
  hasResults: boolean;
  isMultiLine: boolean;
}

const kbdClassName = cn(
  "bg-[#efece6] dark:bg-[var(--muted)]",
  "py-0.5 px-1.5 rounded-sm",
  "font-mono text-[0.7rem]"
);

export function KeyboardHint({ hasResults, isMultiLine }: KeyboardHintProps) {
  return (
    <div className="border-t border-[var(--border)] py-2.5 px-7 animate-[fadeIn_0.3s_ease-out]">
      <p className="text-[0.75rem] text-[var(--muted-foreground)] m-0">
        {hasResults && (
          <>
            Use <kbd className={kbdClassName}>↑</kbd> <kbd className={kbdClassName}>↓</kbd> to navigate,{' '}
          </>
        )}
        <kbd className={kbdClassName}>Enter</kbd> to {hasResults ? 'select' : 'translate'}
        {isMultiLine && (
          <>
            {' '}· <kbd className={kbdClassName}>Shift + Enter</kbd> for new line
          </>
        )}
      </p>
    </div>
  );
}

