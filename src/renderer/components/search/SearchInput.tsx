import { Search } from 'lucide-react';
import React, { useRef, useEffect } from 'react';

import { cn } from '@utils';

interface SearchInputProps {
  query: string;
  isMultiLine: boolean;
  onQueryChange: (value: string) => void;
  onMultiLineChange: (value: boolean) => void;
}

export function SearchInput({
  query,
  isMultiLine,
  onQueryChange,
  onMultiLineChange,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Switch to textarea when multiline detected
  useEffect(() => {
    if (query.includes('\n') && !isMultiLine) {
      onMultiLineChange(true);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [query, isMultiLine, onMultiLineChange]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [query, isMultiLine]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.includes('\n')) {
      e.preventDefault();
      onQueryChange(pastedText);
      onMultiLineChange(true);
    }
  };

  const inputClassName = cn(
    "w-full bg-transparent",
    "border-0 border-b-2 border-[var(--border)]",
    "py-3 pl-12 pr-3.5 text-base",
    "text-[var(--foreground)] font-[inherit]",
    "outline-none transition-colors duration-200",
    "focus:border-[var(--foreground)]",
    "placeholder:text-[var(--muted-foreground)]"
  );

  return (
    <div className="border-b border-[var(--border)] p-5 px-7 animate-[fadeIn_0.3s_ease-out]">
      <div className="relative">
        <Search
          size={20}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
        />
        {isMultiLine ? (
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Paste Chinese text to translate..."
            className={cn(inputClassName, "resize-none min-h-12 max-h-[200px]")}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onPaste={handlePaste}
            placeholder="Search or paste Chinese text to translate..."
            className={inputClassName}
          />
        )}
      </div>
    </div>
  );
}

