import { cn } from '@utils';

const HOTKEY_KEYS = ['Ctrl', 'Shift', 'C'] as const;

export function HotkeyDisplay() {
  return (
    <div className={cn(
      "border border-[var(--border)]",
      "bg-[var(--hover-bg)] p-4 rounded-none"
    )}>
      <div className={cn(
        "text-[0.7rem] font-semibold uppercase",
        "tracking-[0.1em] text-[var(--muted-foreground)]",
        "mb-3"
      )}>
        Capture Hotkey
      </div>
      <div className="flex items-center gap-2">
        {HOTKEY_KEYS.map((key, i) => (
          <div key={key} className="flex items-center gap-2">
            {i > 0 && (
              <span className="text-[var(--muted-foreground)]">+</span>
            )}
            <kbd className={cn(
              "border border-[var(--border)]",
              "bg-[var(--card)] px-3 py-1.5",
              "text-[13px] font-medium",
              "font-mono text-[var(--foreground)]"
            )}>
              {key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

