import { useState, useEffect } from 'react';
import { cn } from '@utils';
import { Label } from '@components/ui/label';

export function ClipboardMonitorToggle() {
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSetting = async () => {
      try {
        const status = await window.electronAPI.getClipboardMonitorStatus?.();
        setEnabled(status || false);
      } catch (err) {
        console.error('Failed to get clipboard monitor status:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSetting();
  }, []);

  const handleToggle = async () => {
    const newValue = !enabled;
    setEnabled(newValue);
    try {
      await window.electronAPI.toggleClipboardMonitor?.(newValue);
    } catch (err) {
      console.error('Failed to toggle clipboard monitor:', err);
      setEnabled(!newValue); // Revert on error
    }
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex flex-col gap-1">
        <Label className="text-sm font-medium text-[var(--foreground)]">
          Clipboard Monitor
        </Label>
        <span className="text-xs text-[var(--muted-foreground)]">
          Show pinyin popup when copying Chinese text
        </span>
      </div>
      
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2",
          enabled 
            ? "bg-[var(--primary)]" 
            : "bg-[var(--muted)]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm",
            "transition-transform duration-200",
            enabled ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

