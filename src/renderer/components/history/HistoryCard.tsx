

import { XIcon } from '@components/ui/icons';
import { cn, formatDate, formatTime, getDynamicFontSize } from '@utils';

import { HistoryItem } from './types';

interface HistoryCardProps {
  item: HistoryItem;
  index: number;
  onItemClick: (item: HistoryItem) => void;
  onDeleteItem: (id: string, e: React.MouseEvent) => void;
}

export function HistoryCard({
  item,
  index,
  onItemClick,
  onDeleteItem,
}: HistoryCardProps) {
  const fontSize = getDynamicFontSize(item.chinese);
  const watermarkChar = item.chinese[0];
  const animationDelay = `${Math.min(index * 0.05, 0.5)}s`;

  return (
    <div
      style={{ animation: `slideUp 0.5s ${animationDelay} ease-out backwards` }}
    >
      <button
        type="button"
        className={cn(
          "history-card w-full relative cursor-pointer text-left",
          "rounded-lg p-8 overflow-hidden bg-transparent border-none"
        )}
        onClick={() => onItemClick(item)}
      >
        {/* Watermark character */}
        <div 
          className={cn(
            "history-watermark absolute -top-[20%] right-[5%]",
            "text-[10rem] font-thin text-[var(--border)]",
            "select-none pointer-events-none leading-none",
            "font-['Microsoft_YaHei','PingFang_SC','Noto_Sans_SC',sans-serif]"
          )}
        >
          {watermarkChar}
        </div>

        {/* Content */}
        <div className="relative z-[1]">
          {/* Magazine-style date */}
          <div className="flex items-center gap-3 mb-4">
            <span className={cn(
              "text-[0.65rem] font-mono text-[var(--tertiary-foreground)]",
              "tracking-[0.1em] uppercase"
            )}>
              {formatDate(item.timestamp)}
            </span>
            <span className="text-[0.55rem] text-[var(--tertiary-foreground)] opacity-50">
              •
            </span>
            <span className={cn(
              "text-[0.65rem] font-mono text-[var(--tertiary-foreground)]",
              "tracking-[0.05em]"
            )}>
              {formatTime(item.timestamp)}
            </span>

            {/* Delete button */}
            <button
              className={cn(
                "history-delete-btn ml-auto bg-transparent border-0",
                "cursor-pointer p-1 text-[var(--tertiary-foreground)]",
                "flex items-center justify-center",
                "hover:text-[var(--destructive)]"
              )}
              onClick={(e) => onDeleteItem(item.id, e)}
              aria-label="Delete translation"
            >
              <XIcon size={14} />
            </button>
          </div>

          {/* HERO: Chinese text - massive and prominent */}
          <div className="mb-4">
            <p 
              className={cn(
                "text-[var(--foreground)] font-normal",
                "tracking-[0.02em] leading-tight m-0",
                "font-['Microsoft_YaHei','PingFang_SC','Noto_Sans_SC',sans-serif]"
              )}
              style={{ fontSize }}
            >
              {item.chinese}
            </p>
          </div>

          {/* Pinyin - annotation style */}
          {item.pinyin && (
            <div className="mb-4">
              <p className={cn(
                "text-[var(--primary)] text-[0.8rem] font-mono",
                "italic tracking-[0.03em] leading-normal m-0"
              )}>
                {item.pinyin}
              </p>
            </div>
          )}

          {/* English - editorial caption with accent bar */}
          <div className="flex items-start gap-3">
            <div 
              className={cn(
                "history-accent-bar w-[3px] h-full min-h-[20px]",
                "bg-[var(--primary)] rounded-sm shrink-0"
              )}
            />
            <p className={cn(
              "text-[var(--secondary-foreground)] text-[0.9rem]",
              "italic leading-relaxed m-0 flex-1"
            )}>
              {item.english}
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}
