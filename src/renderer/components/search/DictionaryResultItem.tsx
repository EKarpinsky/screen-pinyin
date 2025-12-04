import React from 'react';
import { cn } from '@utils';
import type { DictionaryEntry } from './types';

interface DictionaryResultItemProps {
  entry: DictionaryEntry;
  index: number;
  isSelected: boolean;
  hskLevel: number | null;
  onClick: () => void;
}

export function DictionaryResultItem({
  entry,
  index,
  isSelected,
  hskLevel,
  onClick,
}: DictionaryResultItemProps) {
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
      <div className="mb-1.5 flex items-baseline gap-3">
        <p className={cn(
          "text-[var(--foreground)] text-[1.35rem]",
          "font-['Microsoft_YaHei','PingFang_SC','Noto_Sans_SC',sans-serif]",
          "font-medium m-0"
        )}>
          {entry.character}
        </p>
        <p className="font-mono text-[0.85rem] text-[var(--muted-foreground)] m-0">
          {entry.pinyin.join(', ')}
        </p>
        {hskLevel && (
          <span className="bg-[#e0e0e0] text-[#4a4a4a] py-0.5 px-2 rounded text-[0.7rem] font-medium">
            HSK {hskLevel}
          </span>
        )}
      </div>
      <p className="text-[var(--muted-foreground)] text-[0.85rem] leading-relaxed m-0 overflow-hidden text-ellipsis whitespace-nowrap">
        {entry.definition}
      </p>
    </div>
  );
}

