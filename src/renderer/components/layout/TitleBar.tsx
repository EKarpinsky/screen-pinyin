

import { cn } from '@utils';

import { WindowControls } from './WindowControls';

export function TitleBar() {
  return (
    <div
      className={cn(
        "h-8 flex items-center justify-end",
        "bg-[var(--sidebar)] border-b border-[var(--border)]",
        "shrink-0"
      )}
      // @ts-expect-error - webkit property for Electron drag
      style={{ WebkitAppRegion: 'drag' }}
    >
      <WindowControls
        onMinimize={() => window.electronAPI.windowMinimize()}
        onMaximize={() => window.electronAPI.windowMaximize()}
        onClose={() => window.electronAPI.windowClose()}
      />
    </div>
  );
}

