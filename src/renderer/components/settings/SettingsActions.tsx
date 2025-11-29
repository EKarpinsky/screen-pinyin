import { cn } from '@utils';

interface SettingsActionsProps {
  onCancel: () => void;
  onSave: () => void;
}

export function SettingsActions({ onCancel, onSave }: SettingsActionsProps) {
  return (
    <div className="flex gap-3 mt-2">
      <button
        onClick={onCancel}
        className={cn(
          "flex-1 border border-[var(--border)]",
          "bg-transparent py-3.5 px-5",
          "text-sm font-medium",
          "text-[var(--foreground)] cursor-pointer",
          "font-[inherit] transition-colors duration-200",
          "hover:bg-[var(--input)]"
        )}
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        className={cn(
          "flex-1 border border-[var(--foreground)]",
          "bg-[var(--foreground)] py-3.5 px-5",
          "text-sm font-medium",
          "text-[var(--card)] cursor-pointer",
          "font-[inherit] transition-opacity duration-200",
          "hover:opacity-90"
        )}
      >
        Save Settings
      </button>
    </div>
  );
}

