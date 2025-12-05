import { X, ChevronLeft } from "lucide-react"
import { useEffect, useState, useRef, useCallback } from "react"

import hanziDictionary from "../../data/hanzi-dictionary.json"
import hskDictionary from "../../data/hsk-dictionary.json"
import sentencesDictionary from "../../data/sentences-dictionary.json"
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut"

// Sentences dictionary type
interface SentenceEntry {
  s: string  // simplified Chinese
  p: string  // pinyin
  e: string  // English
}

const sentencesData = sentencesDictionary as Record<string, SentenceEntry[]>

// HSK dictionary type
interface HSKEntry {
  level: number
  type: 'character' | 'word'
}

const hskData = hskDictionary as Record<string, HSKEntry>

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
  primary: '#4a3728',
}

const dictionary = hanziDictionary as Record<string, CharacterData>

// Check if a character is Chinese and exists in dictionary
function isClickableChar(char: string): boolean {
  return dictionary[char] !== undefined
}

// Extract Chinese characters from a decomposition string (filter out structure markers like ⿰⿱ etc)
function extractChineseChars(str: string): string[] {
  if (!str) return []
  return [...str].filter(char => {
    const code = char.codePointAt(0) ?? 0
    // CJK characters but not Ideographic Description Characters (⿰⿱⿲ etc are U+2FF0-U+2FFF)
    return (code >= 0x4E00 && code <= 0x9FFF) || 
           (code >= 0x3400 && code <= 0x4DBF) ||
           (code >= 0x2E80 && code <= 0x2EFF) ||
           (code >= 0x2F00 && code <= 0x2FDF)
  })
}

// Highlight target character in sentence text
function HighlightedSentence({ text, targetChar }: { text: string, targetChar: string }) {
  const parts = text.split(targetChar)
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span style={{
              color: colors.primary,
              fontWeight: 600,
            }}>
              {targetChar}
            </span>
          )}
        </span>
      ))}
    </>
  )
}

// Clickable character component with tooltip
function ClickableChar({ 
  char, 
  onClick, 
  size = '2.5rem',
  showTooltip = true 
}: { 
  char: string
  onClick: () => void
  size?: string
  showTooltip?: boolean
}) {
  const [showInfo, setShowInfo] = useState(false)
  const charData = dictionary[char]
  const isClickable = !!charData

  if (!isClickable) {
    return (
      <span style={{
        fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Source Han Sans SC", sans-serif',
        fontSize: size,
        color: colors.foreground,
      }}>
        {char}
      </span>
    )
  }

  return (
    <span
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShowInfo(true)}
      onMouseLeave={() => setShowInfo(false)}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Source Han Sans SC", sans-serif',
          fontSize: size,
          color: colors.foreground,
          cursor: 'pointer',
          transition: 'color 0.15s',
          display: 'inline-block',
          background: 'none',
          border: 'none',
          padding: 0,
          margin: 0,
        }}
        onMouseOver={(e) => e.currentTarget.style.color = colors.primary}
        onMouseOut={(e) => e.currentTarget.style.color = colors.foreground}
        onFocus={(e) => e.currentTarget.style.color = colors.primary}
        onBlur={(e) => e.currentTarget.style.color = colors.foreground}
      >
        {char}
      </button>
      
      {/* Tooltip with character info */}
      {showTooltip && showInfo && charData && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 8,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: 4,
          fontSize: 12,
          whiteSpace: 'nowrap',
          zIndex: 100,
          pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontWeight: 600 }}>
              {charData.pinyin.length > 0 ? charData.pinyin.join(', ') : '—'}
            </span>
            {hskData[char] && (
              <span style={{
                fontSize: 10,
                padding: '1px 5px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: 3,
              }}>
                HSK {hskData[char].level}
              </span>
            )}
          </div>
          <div style={{ 
            color: 'rgba(255,255,255,0.8)',
            maxWidth: 200,
            whiteSpace: 'normal',
            lineHeight: 1.3,
          }}>
            {charData.definition ? charData.definition.slice(0, 60) + (charData.definition.length > 60 ? '...' : '') : '—'}
          </div>
          <div style={{
            position: 'absolute',
            bottom: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid rgba(0, 0, 0, 0.9)',
          }} />
        </div>
      )}
    </span>
  )
}

export function CharacterDetailPanel({ data, isOpen, onClose }: CharacterDetailPanelProps) {
  const [history, setHistory] = useState<CharacterData[]>([])
  const [currentData, setCurrentData] = useState<CharacterData | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Reset when panel opens with new data
  useEffect(() => {
    if (isOpen && data) {
      setCurrentData(data)
      setHistory([])
    }
  }, [isOpen, data])

  // Scroll to top when character changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0
    }
  }, [currentData])

  const handleBack = useCallback(() => {
    if (history.length > 0) {
      const prev = history.at(-1)
      setHistory(h => h.slice(0, -1))
      setCurrentData(prev)
    }
  }, [history])

  const handleEscapePress = useCallback(() => {
    if (history.length > 0) {
      handleBack()
    } else {
      onClose()
    }
  }, [history, handleBack, onClose])

  useKeyboardShortcut('escape', handleEscapePress, { enabled: isOpen, deps: [handleEscapePress] })

  const handleCharacterClick = (char: string) => {
    const charData = dictionary[char]
    if (charData && currentData) {
      setHistory(prev => [...prev, currentData])
      setCurrentData(charData)
    }
  }

  if (!isOpen || !currentData) return null

  const decompositionChars = extractChineseChars(currentData.decomposition)

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {history.length > 0 && (
            <button
              onClick={handleBack}
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.muted,
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                transition: 'color 0.15s',
              }}
              onMouseOver={(e) => e.currentTarget.style.color = colors.foreground}
              onMouseOut={(e) => e.currentTarget.style.color = colors.muted}
              onFocus={(e) => e.currentTarget.style.color = colors.foreground}
              onBlur={(e) => e.currentTarget.style.color = colors.muted}
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <h2 style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: colors.muted,
            margin: 0,
          }}>
            {history.length > 0 ? `Component · ${history.length + 1}` : 'Character Details'}
          </h2>
        </div>
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
      <div 
        ref={contentRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px 24px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Character - Large and prominent */}
          <div style={{ animation: 'slideUp 0.4s 0.1s ease-out backwards' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '7rem',
              fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Source Han Sans SC", sans-serif',
              fontWeight: 500,
              lineHeight: 1,
              color: colors.foreground,
            }}>
              {currentData.character}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <p style={{
                fontSize: 22,
                fontFamily: '"Consolas", "Monaco", monospace',
                color: 'rgba(26, 26, 26, 0.8)',
                letterSpacing: '0.03em',
                margin: 0,
              }}>
                {currentData.pinyin.length > 0 ? currentData.pinyin.join(', ') : '—'}
              </p>
              {/* HSK Level Badge */}
              {hskData[currentData.character] && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 10px',
                  backgroundColor: 'rgba(74, 55, 40, 0.08)',
                  border: `1px solid ${colors.border}`,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  color: colors.primary,
                  borderRadius: 4,
                }}>
                  HSK {hskData[currentData.character].level}
                </span>
              )}
            </div>
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
              {currentData.definition || '—'}
            </p>
          </div>

          {/* Radical - Now clickable */}
          <div style={{ animation: 'slideUp 0.4s 0.25s ease-out backwards' }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: colors.muted,
              marginBottom: 8,
            }}>
              Radical {isClickableChar(currentData.radical) && <span style={{ fontSize: 10, opacity: 0.7 }}>(click to explore)</span>}
            </div>
            <div>
              {currentData.radical ? (
                <ClickableChar 
                  char={currentData.radical} 
                  onClick={() => handleCharacterClick(currentData.radical)}
                  size="2.5rem"
                />
              ) : '—'}
            </div>
          </div>

          {/* Decomposition - Now with clickable components */}
          <div style={{ animation: 'slideUp 0.4s 0.3s ease-out backwards' }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: colors.muted,
              marginBottom: 8,
            }}>
              Decomposition {decompositionChars.some(c => isClickableChar(c)) && <span style={{ fontSize: 10, opacity: 0.7 }}>(click to explore)</span>}
            </div>
            <div style={{
              fontSize: 18,
              fontFamily: '"Consolas", "Monaco", monospace',
              color: 'rgba(26, 26, 26, 0.7)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
              alignItems: 'center',
            }}>
              {currentData.decomposition ? (
                [...currentData.decomposition].map((char, i) => {
                  // Check if it's a Chinese character
                  const code = char.codePointAt(0) ?? 0
                  const isChinese = (code >= 0x4E00 && code <= 0x9FFF) || 
                                   (code >= 0x3400 && code <= 0x4DBF) ||
                                   (code >= 0x2E80 && code <= 0x2EFF) ||
                                   (code >= 0x2F00 && code <= 0x2FDF)
                  
                  if (isChinese) {
                    return (
                      <ClickableChar 
                        key={i}
                        char={char} 
                        onClick={() => handleCharacterClick(char)}
                        size="1.5rem"
                      />
                    )
                  }
                  // Structure markers (⿰⿱ etc)
                  return <span key={i} style={{ opacity: 0.5 }}>{char}</span>
                })
              ) : '—'}
            </div>
          </div>

          {/* Etymology - Now with clickable semantic/phonetic */}
          {currentData.etymology && (
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
                  <span style={{ textTransform: 'capitalize' }}>{currentData.etymology.type}</span>
                </p>
                {currentData.etymology.hint && (
                  <p style={{
                    fontSize: 14,
                    color: 'rgba(26, 26, 26, 0.7)',
                    lineHeight: 1.6,
                    margin: 0,
                  }}>
                    {currentData.etymology.hint}
                  </p>
                )}
                {currentData.etymology.semantic && currentData.etymology.phonetic && (
                  <div style={{
                    fontSize: 14,
                    color: 'rgba(26, 26, 26, 0.7)',
                    lineHeight: 1.6,
                  }}>
                    <ClickableChar 
                      char={currentData.etymology.semantic} 
                      onClick={() => handleCharacterClick(currentData.etymology!.semantic!)}
                      size="1.3em"
                    />
                    {' '}provides the meaning while{' '}
                    <ClickableChar 
                      char={currentData.etymology.phonetic} 
                      onClick={() => handleCharacterClick(currentData.etymology!.phonetic!)}
                      size="1.3em"
                    />
                    {' '}provides the pronunciation.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Example Sentences */}
          {sentencesData[currentData.character] && sentencesData[currentData.character].length > 0 && (
            <div style={{ animation: 'slideUp 0.4s 0.4s ease-out backwards' }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: colors.muted,
                marginBottom: 16,
              }}>
                Example Sentences
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sentencesData[currentData.character].slice(0, 2).map((sentence, index) => (
                  <div
                    key={index}
                    style={{
                      background: '#efece6',
                      border: `1px solid ${colors.border}`,
                      padding: '16px 20px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Decorative quotation mark */}
                    <div style={{
                      position: 'absolute',
                      top: 6,
                      right: 12,
                      fontSize: '3rem',
                      fontFamily: 'Georgia, serif',
                      color: colors.border,
                      lineHeight: 1,
                      opacity: 0.5,
                      pointerEvents: 'none',
                    }}>
                      "
                    </div>

                    {/* Chinese text with highlighted character */}
                    <div style={{
                      fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Source Han Sans SC", sans-serif',
                      fontSize: '1.25rem',
                      lineHeight: 1.6,
                      color: colors.foreground,
                      marginBottom: 10,
                      position: 'relative',
                      zIndex: 1,
                    }}>
                      <HighlightedSentence text={sentence.s} targetChar={currentData.character} />
                    </div>

                    {/* Pinyin */}
                    <div style={{
                      fontFamily: '"Consolas", "Monaco", monospace',
                      fontSize: '0.8125rem',
                      color: colors.muted,
                      marginBottom: 10,
                      letterSpacing: '0.02em',
                    }}>
                      {sentence.p}
                    </div>

                    {/* English translation with left border accent */}
                    <div style={{
                      fontSize: '0.875rem',
                      lineHeight: 1.6,
                      color: colors.foreground,
                      opacity: 0.8,
                      paddingLeft: 12,
                      borderLeft: `2px solid ${colors.primary}`,
                    }}>
                      {sentence.e}
                    </div>
                  </div>
                ))}
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
