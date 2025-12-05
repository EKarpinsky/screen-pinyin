

import { cn } from '@utils';

interface HistoryEmptyStateProps {
  searchQuery?: string;
}

export function HistoryEmptyState({ searchQuery }: HistoryEmptyStateProps) {
  // No results from search
  if (searchQuery) {
    return (
      <div className={cn(
        "flex h-full min-h-[200px] items-center justify-center",
        "p-[60px_40px] animate-[fadeIn_0.3s_ease-out]"
      )}>
        <div className="text-center">
          <p className="text-[var(--tertiary-foreground)] text-base leading-relaxed m-0">
            No translations match "<span className="text-[var(--foreground)]">{searchQuery}</span>"
          </p>
        </div>
      </div>
    );
  }

  // Completely empty state
  return (
    <div className={cn(
      "flex h-full min-h-[400px] items-center justify-center",
      "p-[60px_40px] animate-[fadeIn_0.6s_ease-out] relative"
    )}>
      {/* Large watermark character */}
      <div className={cn(
        "absolute text-[20rem] font-thin select-none pointer-events-none",
        "text-[var(--border)] opacity-30 animate-[float_6s_ease-in-out_infinite]",
        "font-['Microsoft_YaHei','PingFang_SC','Noto_Sans_SC',sans-serif]"
      )}>
        未
      </div>
      
      <div className="max-w-[360px] text-center relative z-[1]">
        <h2 className={cn(
          "text-[var(--foreground)] text-[1.75rem] font-light",
          "tracking-tight mb-4 animate-[slideUp_0.5s_ease-out_0.2s_backwards]"
        )}>
          未开始
        </h2>
        <p className={cn(
          "text-[var(--tertiary-foreground)] text-[0.9rem] leading-[1.8] m-0",
          "animate-[slideUp_0.5s_ease-out_0.3s_backwards]"
        )}>
          Your translation journey begins here.<br />
          Capture text from your screen to start.
        </p>
      </div>
    </div>
  );
}
