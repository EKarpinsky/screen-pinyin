import React from 'react';
import { X, Minus, Square } from 'lucide-react';
import { cn } from '@utils';

interface WindowControlsProps {
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

export function WindowControls({ onMinimize, onMaximize, onClose }: WindowControlsProps) {
  return (
    <div
      className={cn(
        "flex h-full",
        "[--webkit-app-region:no-drag]"
      )}
      // @ts-ignore - webkit property for Electron no-drag
      style={{ WebkitAppRegion: 'no-drag' }}
    >
      <button
        onClick={onMinimize}
        title="Minimize"
        className={cn(
          "w-[46px] h-full flex items-center justify-center",
          "border-none bg-transparent cursor-pointer",
          "text-[var(--muted-foreground)]",
          "transition-all duration-100",
          "hover:bg-[var(--hover-bg)]"
        )}
      >
        <Minus size={14} />
      </button>
      <button
        onClick={onMaximize}
        title="Maximize"
        className={cn(
          "w-[46px] h-full flex items-center justify-center",
          "border-none bg-transparent cursor-pointer",
          "text-[var(--muted-foreground)]",
          "transition-all duration-100",
          "hover:bg-[var(--hover-bg)]"
        )}
      >
        <Square size={12} />
      </button>
      <button
        onClick={onClose}
        title="Close"
        className={cn(
          "w-[46px] h-full flex items-center justify-center",
          "border-none bg-transparent cursor-pointer",
          "text-[var(--muted-foreground)]",
          "transition-all duration-100",
          "hover:bg-[#e81123] hover:text-white"
        )}
      >
        <X size={14} />
      </button>
    </div>
  );
}

