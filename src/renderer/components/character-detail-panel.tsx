import { useEffect } from "react"
import { X } from "lucide-react"

export interface CharacterData {
  character: string
  pinyin: string[]
  definition: string
  radical: string
  decomposition: string
  etymology: {
    type: string
    phonetic?: string
    semantic?: string
    hint?: string
  } | null
}

interface CharacterDetailPanelProps {
  data: CharacterData | null
  isOpen: boolean
  onClose: () => void
}

const colors = {
  card: '#fdfcfa',
  foreground: '#1a1a1a',
  muted: '#6b6b6b',
  border: '#d4d0c8',
}

export function CharacterDetailPanel({ data, isOpen, onClose }: CharacterDetailPanelProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      return () => {
        document.removeEventListener("keydown", handleEscape)
      }
    }
  }, [isOpen, onClose])

  if (!isOpen || !data) return null

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        zIndex: 60,
        height: '100%',
        width: 380,
        backgroundColor: colors.card,
        boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.15)',
        animation: 'slideInRight 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${colors.border}`,
          padding: '20px 24px',
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        <h2 style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: colors.muted,
          margin: 0,
        }}>
          Character Details
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.muted,
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px 24px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Character - Large and prominent */}
          <div style={{ animation: 'slideUp 0.4s 0.1s ease-out backwards' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '7rem',
              fontFamily: '"Noto Serif SC", "Source Han Serif SC", "SimSun", serif',
              fontWeight: 500,
              lineHeight: 1,
              color: colors.foreground,
            }}>
              {data.character}
            </div>
          </div>

          {/* Pinyin */}
          <div style={{ animation: 'slideUp 0.4s 0.15s ease-out backwards' }}>
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
              fontSize: 22,
              fontFamily: '"Consolas", "Monaco", monospace',
              color: 'rgba(26, 26, 26, 0.8)',
              letterSpacing: '0.03em',
              margin: 0,
            }}>
              {data.pinyin.length > 0 ? data.pinyin.join(', ') : '—'}
            </p>
          </div>

          {/* Definition */}
          <div style={{ animation: 'slideUp 0.4s 0.2s ease-out backwards' }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: colors.muted,
              marginBottom: 8,
            }}>
              Definition
            </div>
            <p style={{
              fontSize: 15,
              color: colors.foreground,
              lineHeight: 1.6,
              margin: 0,
            }}>
              {data.definition || '—'}
            </p>
          </div>

          {/* Radical */}
          <div style={{ animation: 'slideUp 0.4s 0.25s ease-out backwards' }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: colors.muted,
              marginBottom: 8,
            }}>
              Radical
            </div>
            <div style={{
              fontSize: '2.5rem',
              fontFamily: '"Noto Serif SC", "Source Han Serif SC", "SimSun", serif',
              fontWeight: 500,
              color: colors.foreground,
            }}>
              {data.radical || '—'}
            </div>
          </div>

          {/* Decomposition */}
          <div style={{ animation: 'slideUp 0.4s 0.3s ease-out backwards' }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: colors.muted,
              marginBottom: 8,
            }}>
              Decomposition
            </div>
            <p style={{
              fontSize: 18,
              fontFamily: '"Consolas", "Monaco", monospace',
              color: 'rgba(26, 26, 26, 0.7)',
              margin: 0,
            }}>
              {data.decomposition || '—'}
            </p>
          </div>

          {/* Etymology */}
          {data.etymology && (
            <div style={{ animation: 'slideUp 0.4s 0.35s ease-out backwards' }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: colors.muted,
                marginBottom: 8,
              }}>
                Etymology
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{
                  fontSize: 14,
                  color: 'rgba(26, 26, 26, 0.9)',
                  lineHeight: 1.5,
                  margin: 0,
                }}>
                  <span style={{ fontWeight: 500 }}>Type:</span>{' '}
                  <span style={{ textTransform: 'capitalize' }}>{data.etymology.type}</span>
                </p>
                {data.etymology.hint && (
                  <p style={{
                    fontSize: 14,
                    color: 'rgba(26, 26, 26, 0.7)',
                    lineHeight: 1.6,
                    margin: 0,
                  }}>
                    {data.etymology.hint}
                  </p>
                )}
                {data.etymology.semantic && data.etymology.phonetic && (
                  <p style={{
                    fontSize: 14,
                    color: 'rgba(26, 26, 26, 0.7)',
                    lineHeight: 1.6,
                    margin: 0,
                  }}>
                    <span style={{
                      fontFamily: '"Noto Serif SC", serif',
                      fontSize: '1.1em',
                    }}>
                      {data.etymology.semantic}
                    </span>
                    {' '}provides the meaning while{' '}
                    <span style={{
                      fontFamily: '"Noto Serif SC", serif',
                      fontSize: '1.1em',
                    }}>
                      {data.etymology.phonetic}
                    </span>
                    {' '}provides the pronunciation.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

