

import { SearchIcon, XIcon } from '@components/ui/icons';
import { cn } from '@utils';

interface HistoryHeaderProps {
  itemCount: number;
  isEmpty: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearAll: () => void;
}

export function HistoryHeader({
  itemCount,
  isEmpty,
  searchQuery,
  onSearchChange,
  onClearAll,
}: HistoryHeaderProps) {
  return (
    <div className={cn(
      "p-[32px_40px_24px] border-b border-[var(--border)]",
      "animate-[fadeIn_0.4s_ease-out]"
    )}>
      <div className={cn(
        "flex items-baseline justify-between",
        isEmpty ? "" : "mb-5"
      )}>
        <div>
          <h1 className={cn(
            "text-[var(--foreground)] text-[2.5rem] font-light",
            "tracking-tight m-0 leading-none"
          )}>
            History
          </h1>
          {!isEmpty && (
            <p className={cn(
              "text-[var(--tertiary-foreground)] text-xs",
              "tracking-[0.15em] uppercase mt-2 font-medium"
            )}>
              {itemCount} translation{itemCount === 1 ? '' : 's'}
            </p>
          )}
        </div>
        {!isEmpty && (
          <button
            onClick={onClearAll}
            className={cn(
              "text-[0.7rem] text-[var(--tertiary-foreground)]",
              "bg-transparent border border-[var(--border)]",
              "cursor-pointer py-2 px-4 rounded",
              "tracking-[0.1em] uppercase font-medium",
              "transition-[border-color,color] duration-200",
              "hover:border-[var(--destructive)] hover:text-[var(--destructive)]"
            )}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Search bar */}
      {!isEmpty && (
        <div className="relative max-w-[400px]">
          <div className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2",
            "text-[var(--tertiary-foreground)]"
          )}>
            <SearchIcon size={14} />
          </div>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              "w-full border-0 border-b border-[var(--border)]",
              "bg-transparent py-2 pl-6 pr-8 text-sm",
              "text-[var(--foreground)] outline-none",
              "transition-[border-color] duration-200",
              "focus:border-[var(--primary)]"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2",
                "text-[var(--tertiary-foreground)] bg-transparent",
                "border-0 cursor-pointer p-1 flex items-center justify-center",
                "hover:text-[var(--foreground)]"
              )}
            >
              <XIcon size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
