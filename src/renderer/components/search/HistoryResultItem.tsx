import React from 'react';
import { cn } from '@utils';
import type { HistoryItem } from './types';

interface HistoryResultItemProps {
  item: HistoryItem;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

export function HistoryResultItem({
  item,
  index,
  isSelected,
  onClick,
}: HistoryResultItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer border-b border-[var(--border)]",
        "py-4 px-7 transition-colors duration-150",
        "animate-[slideUp_0.3s_ease-out_backwards]",
        isSelected ? "bg-[var(--hover-bg)]" : "hover:bg-[var(--hover-bg)]"
      )}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="mb-1.5">
        <p className={cn(
          "text-[var(--foreground)] text-[1.35rem]",
          "font-['Microsoft_YaHei','PingFang_SC','Noto_Sans_SC',sans-serif]",
          "font-medium tracking-[0.01em] leading-tight m-0"
        )}>
          {item.chinese}
        </p>
      </div>
      <p className="text-[var(--muted-foreground)] text-[0.85rem] leading-relaxed m-0">
        {item.english}
      </p>
    </div>
  );
}

