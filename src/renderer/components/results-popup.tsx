import { useEffect, useState, useCallback } from "react"
import { Copy, Check, X } from "lucide-react"
import { CharacterDetailPanel, CharacterData } from "./character-detail-panel"
import hanziDictionary from "../../data/hanzi-dictionary.json"
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut"

interface ResultsProps {
  original: string
  pinyin: string
  translation: string
}

const colors = {
  background: '#f7f5f0',
  card: '#fdfcfa',
  foreground: '#1a1a1a',
  muted: '#6b6b6b',
  border: '#d4d0c8',
  primary: '#4a3728',
}

// Type for the dictionary
const dictionary = hanziDictionary as Record<string, CharacterData>

// Check if a character is Chinese
function isChineseChar(char: string): boolean {
  const code = char.charCodeAt(0)
  return (code >= 0x4E00 && code <= 0x9FFF) || // CJK Unified Ideographs
         (code >= 0x3400 && code <= 0x4DBF) || // CJK Unified Ideographs Extension A
         (code >= 0x2E80 && code <= 0x2EFF) || // CJK Radicals Supplement
         (code >= 0x2F00 && code <= 0x2FDF)    // Kangxi Radicals
}

export function ResultsPopup({ original, pinyin, translation }: ResultsProps) {
  const [copied, setCopied] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterData | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const handleEscape = useCallback(() => {
    if (isPanelOpen) {
      setIsPanelOpen(false)
    } else {
      window.electronAPI.closeResults()
    }
  }, [isPanelOpen])

  useKeyboardShortcut('escape', handleEscape, { deps: [handleEscape] })

  const handleCopy = async () => {
    const text = `${original}\n${pinyin}\n${translation}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    window.electronAPI.closeResults()
  }

  const handleCharacterClick = (char: string) => {
    const charData = dictionary[char]
    if (charData) {
      setSelectedCharacter(charData)
      setIsPanelOpen(true)
    }
  }

  // Split text into characters and render clickable spans for Chinese chars
  const renderClickableText = (text: string) => {
    return text.split('').map((char, index) => {
      const isChinese = isChineseChar(char)
      const hasData = isChinese && dictionary[char]
      
      if (isChinese) {
        return (
          <span
            key={index}
            onClick={() => hasData && handleCharacterClick(char)}
            style={{
              cursor: hasData ? 'pointer' : 'default',
              transition: 'color 0.15s, transform 0.15s',
              display: 'inline-block',
            }}
            onMouseOver={(e) => {
              if (hasData) {
                e.currentTarget.style.color = colors.primary
                e.currentTarget.style.transform = 'scale(1.05)'
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = colors.foreground
              e.currentTarget.style.transform = 'scale(1)'
            }}
            title={hasData ? 'Click for details' : undefined}
          >
            {char}
          </span>
        )
      }
      return <span key={index}>{char}</span>
    })
  }

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: colors.card,
      padding: 0,
      fontFamily: '"Segoe UI", system-ui, sans-serif',
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        backgroundColor: colors.card,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {/* Draggable header area */}
        <div style={{
          // @ts-ignore - webkit property for Electron drag
          WebkitAppRegion: 'drag',
          height: 32,
          width: '100%',
          cursor: 'move',
        }} />

        {/* Content with padding */}
        <div style={{ padding: '16px 56px 48px 56px' }}>
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            right: 20,
            top: 40,
            // @ts-ignore - webkit property for Electron no-drag
            WebkitAppRegion: 'no-drag',
            background: 'transparent',
            border: 'none',
            color: colors.muted,
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            transition: 'color 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.color = colors.foreground}
          onMouseOut={(e) => e.currentTarget.style.color = colors.muted}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Chinese Text - MASSIVE and prominent, clickable */}
          <div style={{ animation: 'slideUp 0.4s ease-out' }}>
            <h1 style={{
              fontSize: '4rem',
              fontFamily: '"Noto Serif SC", "Source Han Serif SC", "SimSun", serif',
              fontWeight: 500,
              color: colors.foreground,
              lineHeight: 1.2,
              letterSpacing: '0.02em',
              margin: 0,
            }}>
              {renderClickableText(original)}
            </h1>
          </div>

          {/* Pinyin */}
          <div style={{ animation: 'slideUp 0.4s 0.1s ease-out backwards' }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: colors.muted,
              marginBottom: 8,
            }}>
              Pinyin
            </div>
            <p style={{
              fontSize: 20,
              fontFamily: '"Consolas", "Monaco", monospace',
              color: 'rgba(26, 26, 26, 0.7)',
              lineHeight: 1.5,
              letterSpacing: '0.03em',
              margin: 0,
            }}>
              {pinyin}
            </p>
          </div>

          {/* English Translation */}
          <div style={{ animation: 'slideUp 0.4s 0.2s ease-out backwards' }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: colors.muted,
              marginBottom: 8,
            }}>
              Translation
            </div>
            <p style={{
              fontSize: 18,
              color: colors.foreground,
              lineHeight: 1.6,
              margin: 0,
            }}>
              {translation}
            </p>
          </div>

          {/* Copy Button */}
          <div style={{ animation: 'slideUp 0.4s 0.3s ease-out backwards' }}>
            <button
              onClick={handleCopy}
              style={{
                // @ts-ignore - webkit property for Electron no-drag
                WebkitAppRegion: 'no-drag',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                border: `1px solid ${colors.border}`,
                backgroundColor: copied ? colors.foreground : 'rgba(232, 228, 220, 0.3)',
                padding: '16px 24px',
                fontSize: 14,
                fontWeight: 500,
                color: copied ? colors.card : colors.foreground,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                if (!copied) {
                  e.currentTarget.style.backgroundColor = colors.foreground
                  e.currentTarget.style.color = colors.card
                }
              }}
              onMouseOut={(e) => {
                if (!copied) {
                  e.currentTarget.style.backgroundColor = 'rgba(232, 228, 220, 0.3)'
                  e.currentTarget.style.color = colors.foreground
                }
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy All'}
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Character Detail Panel */}
      <CharacterDetailPanel
        data={selectedCharacter}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  )
}

// Wrapper component that fetches data
export function ResultsPopupWrapper() {
  const [data, setData] = useState<ResultsProps | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const imageData = await window.electronAPI.getCapturedImage()
        if (!imageData) {
          setError('No captured image found')
          setLoading(false)
          return
        }

        const ocrResult = await window.electronAPI.performOCR(imageData)
        if (!ocrResult.success || !ocrResult.text) {
          setError(ocrResult.error || 'OCR failed to detect text')
          setLoading(false)
          return
        }

        const translateResult = await window.electronAPI.translate(ocrResult.text)
        if (!translateResult.success) {
          setError(translateResult.error || 'Translation failed')
          setLoading(false)
          return
        }

        setData({
          original: translateResult.original || ocrResult.text,
          pinyin: translateResult.pinyin || '',
          translation: translateResult.translation || '',
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [])

  if (loading) {
    return (
      <div style={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#fdfcfa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}>
        <div style={{ textAlign: 'center', color: '#6b6b6b' }}>
          <div style={{
            width: 24,
            height: 24,
            border: '2px solid #d4d0c8',
            borderTopColor: '#1a1a1a',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: 14 }}>Processing...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#fdfcfa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        padding: 24,
      }}>
        <div style={{
          textAlign: 'center',
          padding: 32,
          maxWidth: 400,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#b44',
            marginBottom: 12,
          }}>
            Error
          </div>
          <div style={{ fontSize: 14, color: '#1a1a1a', lineHeight: 1.5 }}>{error}</div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return <ResultsPopup {...data} />
}
