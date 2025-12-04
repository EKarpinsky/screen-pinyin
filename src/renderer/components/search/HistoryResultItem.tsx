import React from 'react';
import { cn } from '@utils';
import { SearchResultWrapper } from './SearchResultWrapper';
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
    <SearchResultWrapper index={index} isSelected={isSelected} onClick={onClick}>
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
    </SearchResultWrapper>
  );
}
