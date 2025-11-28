import { useState, useRef, useEffect } from "react"

export function SelectionOverlay() {
  const [isDragging, setIsDragging] = useState(false)
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 })
  const [currentPoint, setCurrentPoint] = useState({ x: 0, y: 0 })
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.electronAPI) {
      setError('electronAPI not available')
      return
    }
    
    window.electronAPI.getScreenshot()
      .then((url) => {
        setScreenshotUrl(url)
      })
      .catch((err) => {
        setError('Screenshot error: ' + err.message)
      })

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        window.electronAPI.cancelSelection()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setStartPoint({ x: e.clientX, y: e.clientY })
    setCurrentPoint({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    setCurrentPoint({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = async (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    setIsDragging(false)

    const x = Math.min(startPoint.x, currentPoint.x)
    const y = Math.min(startPoint.y, currentPoint.y)
    const width = Math.abs(currentPoint.x - startPoint.x)
    const height = Math.abs(currentPoint.y - startPoint.y)

    if (width > 10 && height > 10) {
      const result = await window.electronAPI.selectionComplete({ x, y, width, height })
      if (result.position) {
        window.electronAPI.showResults(result.position)
      }
    }
  }

  const selectionRect = {
    left: Math.min(startPoint.x, currentPoint.x),
    top: Math.min(startPoint.y, currentPoint.y),
    width: Math.abs(currentPoint.x - startPoint.x),
    height: Math.abs(currentPoint.y - startPoint.y),
  }

  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.9)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24,
      }}>
        Error: {error}
      </div>
    )
  }

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        cursor: 'crosshair',
        backgroundImage: screenshotUrl ? `url(${screenshotUrl})` : undefined,
        backgroundSize: '100% 100%',
        backgroundPosition: '0 0',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}
    >
      {/* Dark overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          animation: 'fadeIn 0.15s ease-out',
          pointerEvents: 'none',
        }}
      />

      {/* Selection rectangle */}
      {isDragging && selectionRect.width > 0 && selectionRect.height > 0 && (
        <div
          style={{
            position: 'absolute',
            left: selectionRect.left,
            top: selectionRect.top,
            width: selectionRect.width,
            height: selectionRect.height,
            pointerEvents: 'none',
          }}
        >
          {/* Border */}
          <div style={{
            position: 'absolute',
            inset: 0,
            border: '2px solid rgba(26, 26, 26, 0.9)',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
          }} />

          {/* Dimensions label */}
          <div style={{
            position: 'absolute',
            top: -40,
            left: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            padding: '8px 14px',
            fontSize: 13,
            fontFamily: '"Consolas", "Monaco", monospace',
            color: '#fff',
          }}>
            {Math.round(selectionRect.width)} × {Math.round(selectionRect.height)}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        padding: '14px 24px',
        pointerEvents: 'none',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          fontSize: 14,
          color: '#fff',
        }}>
          <span>Drag to select region</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <kbd style={{
              border: '1px solid rgba(255,255,255,0.2)',
              backgroundColor: 'rgba(255,255,255,0.1)',
              padding: '4px 10px',
              fontSize: 12,
              fontFamily: '"Consolas", monospace',
            }}>
              ESC
            </kbd>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>to cancel</span>
          </div>
        </div>
      </div>
    </div>
  )
}
