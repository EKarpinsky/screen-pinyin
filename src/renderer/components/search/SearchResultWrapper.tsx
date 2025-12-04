import React from 'react';
import { cn } from '@utils';

interface SearchResultWrapperProps {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function SearchResultWrapper({
  index,
  isSelected,
  onClick,
  children,
}: SearchResultWrapperProps) {
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
      {children}
    </div>
  );
}

