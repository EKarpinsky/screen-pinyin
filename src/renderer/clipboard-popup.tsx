import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

import { useKeyboardShortcut } from './hooks/use-keyboard-shortcut';

interface ClipboardData {
  chinese: string;
  pinyin: string;
  english: string;
}

function ClipboardPopup() {
  const [data, setData] = useState<ClipboardData | null>(null);
  const [visible, setVisible] = useState(false);

  // Handle incoming data from main process
  useEffect(() => {
    const handleData = (_event: unknown, clipboardData: ClipboardData) => {
      setData(clipboardData);
      setVisible(true);
    };

    // Listen for clipboard data
    window.electronAPI?.onClipboardData?.(handleData);

    return () => {
      window.electronAPI?.offClipboardData?.(handleData);
    };
  }, []);

  // No auto-dismiss - stays until user presses Escape or X

  const handleDismiss = useCallback(() => {
    setVisible(false);
    window.electronAPI?.hideClipboardPopup?.();
  }, []);

  // Handle keyboard dismiss
  useKeyboardShortcut('escape', handleDismiss);

  const handleOpenInApp = useCallback(() => {
    if (data) {
      window.electronAPI?.openInApp?.(data.chinese);
    }
    handleDismiss();
  }, [data, handleDismiss]);

  if (!visible || !data) {
    return null;
  }

  // v0 tooltip design - minimal, retro, horizontal
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '6px 12px',
          backgroundColor: '#1a1a1a',
          color: '#f0f0e8',
          border: '1px solid #333',
          fontFamily: '"Consolas", "Monaco", "SF Mono", monospace',
          fontSize: '12px',
          letterSpacing: '0.025em',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Pinyin */}
        <span style={{ color: '#c4b998' }}>
          {data.pinyin || '—'}
        </span>
        
        {/* Separator */}
        <span style={{ color: '#666' }}>│</span>
        
        {/* English */}
        <span style={{ color: '#888', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {data.english || '—'}
        </span>
        
        {/* Open in App button */}
        <button
          onClick={handleOpenInApp}
          style={{
            marginLeft: '4px',
            padding: '2px 8px',
            backgroundColor: 'transparent',
            border: '1px solid #444',
            color: '#666',
            fontSize: '10px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#c4b998';
            e.currentTarget.style.color = '#c4b998';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#444';
            e.currentTarget.style.color = '#666';
          }}
        >
          ↗
        </button>
        
        {/* Close button */}
        <button
          onClick={handleDismiss}
          style={{
            marginLeft: '4px',
            padding: '2px 6px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#555',
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#c4b998';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#555';
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<ClipboardPopup />);
}

