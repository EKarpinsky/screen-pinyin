import React, { useState, useRef, useEffect } from 'react';
import { SelectionError } from './SelectionError';
import { SelectionRectangle } from './SelectionRectangle';
import { SelectionInstructions } from './SelectionInstructions';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';

export function SelectionOverlay() {
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentPoint, setCurrentPoint] = useState({ x: 0, y: 0 });
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Small delay to ensure preload script is fully initialized (fixes race condition on fresh start)
    const initOverlay = async () => {
      // Wait for electronAPI to be available (with retries)
      let retries = 0;
      while (!window.electronAPI && retries < 10) {
        console.log('[SelectionOverlay] Waiting for electronAPI...', retries);
        await new Promise(r => setTimeout(r, 50));
        retries++;
      }
      
      if (!window.electronAPI) {
        setError('electronAPI not available after retries');
        return;
      }
      
      console.log('[SelectionOverlay] electronAPI ready, calling getScreenshot...');
      try {
        const url = await window.electronAPI.getScreenshot();
        console.log('[SelectionOverlay] Screenshot URL received:', url ? `${url.length} chars` : 'NULL');
        if (!url) {
          setError('Screenshot returned null - capture may have failed');
          return;
        }
        setScreenshotUrl(url);
      } catch (err: any) {
        console.error('[SelectionOverlay] Screenshot error:', err);
        setError('Screenshot error: ' + err.message);
      }
    };
    
    initOverlay();
  }, []);

  // Handle Escape key to cancel selection
  useKeyboardShortcut('escape', () => window.electronAPI.cancelSelection());

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartPoint({ x: e.clientX, y: e.clientY });
    setCurrentPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setCurrentPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = async (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setIsDragging(false);

    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);

    if (width > 10 && height > 10) {
      // Main process will close this window and show results in main window
      await window.electronAPI.selectionComplete({ x, y, width, height });
    }
  };

  const selectionRect = {
    left: Math.min(startPoint.x, currentPoint.x),
    top: Math.min(startPoint.y, currentPoint.y),
    width: Math.abs(currentPoint.x - startPoint.x),
    height: Math.abs(currentPoint.y - startPoint.y),
  };

  if (error) {
    return <SelectionError error={error} />;
  }

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="fixed inset-0 z-[9999] cursor-crosshair font-['Segoe_UI',system-ui,sans-serif]"
      style={{
        backgroundImage: screenshotUrl ? `url(${screenshotUrl})` : undefined,
        backgroundSize: '100% 100%',
        backgroundPosition: '0 0',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/45 animate-[fadeIn_0.15s_ease-out] pointer-events-none" />

      {/* Selection rectangle */}
      {isDragging && selectionRect.width > 0 && selectionRect.height > 0 && (
        <SelectionRectangle
          left={selectionRect.left}
          top={selectionRect.top}
          width={selectionRect.width}
          height={selectionRect.height}
        />
      )}

      {/* Instructions */}
      <SelectionInstructions />
    </div>
  );
}

