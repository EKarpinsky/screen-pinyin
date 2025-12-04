import React from 'react';

export function SelectionInstructions() {
  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/90 px-6 py-3.5 pointer-events-none">
      <div className="flex items-center gap-5 text-sm text-white">
        <span>Drag to select region</span>
        <span className="text-white/40">·</span>
        <div className="flex items-center gap-2">
          <kbd className="border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-mono">
            ESC
          </kbd>
          <span className="text-white/60">to cancel</span>
        </div>
      </div>
    </div>
  );
}

