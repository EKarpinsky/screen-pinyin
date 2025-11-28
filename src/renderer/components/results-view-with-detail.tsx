import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, X, ArrowLeft, ChevronLeft } from 'lucide-react';
import hanziDictionary from '../../data/hanzi-dictionary.json';
import hskDictionary from '../../data/hsk-dictionary.json';
import sentencesDictionary from '../../data/sentences-dictionary.json';

// Types
interface HSKEntry {
  level: number;
  type: 'character' | 'word';
}

interface SentenceEntry {
  s: string;
  p: string;
  e: string;
}

interface CharacterData {
  character: string;
  pinyin: string[];
  definition: string;
  radical: string;
  decomposition: string;
  etymology: {
    type: string;
    phonetic?: string;
    semantic?: string;
    hint?: string;
  } | null;
}

interface ResultsData {
  original: string;
  pinyin: string;
  translation: string;
}

interface ResultsViewWithDetailProps {
  data: ResultsData;
  onBack: () => void;
  onCopyAll?: () => void;
}

// Data
const dictionary = hanziDictionary as Record<string, CharacterData>;
const hskData = hskDictionary as Record<string, HSKEntry>;
const sentencesData = sentencesDictionary as Record<string, SentenceEntry[]>;

// Colors
const colors = {
  background: '#f7f5f0',
  card: '#fdfcfa',
  foreground: '#1a1a1a',
  muted: '#6b6b6b',
  border: '#d4d0c8',
  input: '#efece6',
  primary: '#4a3728',
};

// Check if a character is Chinese
function isChineseChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF) ||
         (code >= 0x3400 && code <= 0x4DBF) ||
         (code >= 0x2E80 && code <= 0x2EFF) ||
         (code >= 0x2F00 && code <= 0x2FDF);
}

// Extract Chinese characters from decomposition
function extractChineseChars(str: string): string[] {
  if (!str) return [];
  return str.split('').filter(char => isChineseChar(char));
}

// Highlight character in sentence
function HighlightedSentence({ text, targetChar }: { text: string; targetChar: string }) {
  const parts = text.split(targetChar);
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span style={{ color: colors.primary, fontWeight: 600 }}>
              {targetChar}
            </span>
          )}
        </span>
      ))}
    </>
  );
}

// Clickable character with tooltip
function ClickableChar({
  char,
  onClick,
  size = '2.5rem',
}: {
  char: string;
  onClick: () => void;
  size?: string;
}) {
  const [showInfo, setShowInfo] = useState(false);
  const charData = dictionary[char];
  const isClickable = !!charData;

  if (!isClickable) {
    return (
      <span style={{
        fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
        fontSize: size,
        color: colors.foreground,
      }}>
        {char}
      </span>
    );
  }

  return (
    <span
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShowInfo(true)}
      onMouseLeave={() => setShowInfo(false)}
    >
      <span
        onClick={onClick}
        style={{
          fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
          fontSize: size,
          color: colors.foreground,
          cursor: 'pointer',
          transition: 'color 0.15s',
          display: 'inline-block',
        }}
        onMouseOver={(e) => e.currentTarget.style.color = colors.primary}
        onMouseOut={(e) => e.currentTarget.style.color = colors.foreground}
      >
        {char}
      </span>

      {/* Tooltip */}
      {showInfo && charData && (
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
            {charData.definition ? charData.definition.substring(0, 60) + (charData.definition.length > 60 ? '...' : '') : '—'}
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
  );
}

export function ResultsViewWithDetail({ data, onBack, onCopyAll }: ResultsViewWithDetailProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterData | null>(null);
  const [characterHistory, setCharacterHistory] = useState<CharacterData[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'structure'>('overview');
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const detailRef = useRef<HTMLDivElement>(null);

  const hasDetail = selectedCharacter !== null;

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (characterHistory.length > 0) {
          handleDetailBack();
        } else if (hasDetail) {
          handleCloseDetail();
        } else {
          onBack();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasDetail, characterHistory, onBack]);

  // Scroll detail panel to top when character changes
  useEffect(() => {
    if (detailRef.current) {
      detailRef.current.scrollTop = 0;
    }
  }, [selectedCharacter]);

  const handleCharacterClick = (char: string) => {
    const charData = dictionary[char];
    if (charData) {
      if (selectedCharacter) {
        setCharacterHistory([...characterHistory, selectedCharacter]);
      }
      setSelectedCharacter(charData);
      setActiveTab('overview'); // Reset to overview when selecting new character
      setCurrentExampleIndex(0); // Reset example index
    }
  };

  const handleDetailBack = () => {
    if (characterHistory.length > 0) {
      const prev = characterHistory[characterHistory.length - 1];
      setCharacterHistory(characterHistory.slice(0, -1));
      setSelectedCharacter(prev);
      setActiveTab('overview'); // Reset tab when going back
      setCurrentExampleIndex(0); // Reset example index
    } else {
      handleCloseDetail();
    }
  };

  const handleCloseDetail = () => {
    setSelectedCharacter(null);
    setCharacterHistory([]);
    setActiveTab('overview'); // Reset tab when closing
    setCurrentExampleIndex(0); // Reset example index
  };

  const handleCopy = async () => {
    const text = `${data.original}\n${data.pinyin}\n${data.translation}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopyAll?.();
  };

  const renderClickableText = (text: string, size: string = '3.5rem') => {
    return text.split('').map((char, index) => {
      if (isChineseChar(char)) {
        return (
          <ClickableChar
            key={index}
            char={char}
            onClick={() => handleCharacterClick(char)}
            size={size}
          />
        );
      }
      return <span key={index} style={{ fontSize: size }}>{char}</span>;
    });
  };

  // Get sentences for current character
  const characterSentences = selectedCharacter ? (sentencesData[selectedCharacter.character] || []) : [];

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <style>{`
        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Left Column: Translation */}
      <div
        style={{
          width: hasDetail ? '35%' : '100%',
          borderRight: hasDetail ? `1px solid ${colors.border}` : 'none',
          transition: 'width 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{
          padding: '24px 32px 32px 32px',
          minHeight: '100%',
        }}>
          {/* Back button */}
          <button
            onClick={onBack}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              padding: '6px 0',
              fontSize: '0.875rem',
              color: colors.muted,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 20,
              transition: 'color 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.color = colors.foreground}
            onMouseOut={(e) => e.currentTarget.style.color = colors.muted}
          >
            <ArrowLeft size={16} />
            Back to History
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Chinese Text */}
            <div style={{ animation: 'slideUp 0.4s ease-out' }}>
              <h1 style={{
                fontSize: hasDetail ? '2.25rem' : '3.5rem',
                fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
                fontWeight: 500,
                color: colors.foreground,
                lineHeight: 1.3,
                letterSpacing: '0.02em',
                margin: 0,
                transition: 'font-size 0.4s ease-out',
              }}>
                {renderClickableText(data.original, hasDetail ? '2.25rem' : '3.5rem')}
              </h1>
            </div>

            {/* Pinyin */}
            <div style={{ animation: 'slideUp 0.4s 0.1s ease-out backwards' }}>
              <div style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: colors.muted,
                marginBottom: 6,
              }}>
                Pinyin
              </div>
              <p style={{
                fontSize: hasDetail ? '0.95rem' : '1.15rem',
                fontFamily: '"Consolas", "Monaco", monospace',
                color: 'rgba(26, 26, 26, 0.7)',
                lineHeight: 1.5,
                letterSpacing: '0.03em',
                margin: 0,
                transition: 'font-size 0.4s ease-out',
              }}>
                {data.pinyin}
              </p>
            </div>

            {/* Translation */}
            <div style={{ animation: 'slideUp 0.4s 0.2s ease-out backwards' }}>
              <div style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: colors.muted,
                marginBottom: 6,
              }}>
                Translation
              </div>
              <p style={{
                fontSize: hasDetail ? '0.9rem' : '1.05rem',
                color: colors.foreground,
                lineHeight: 1.6,
                margin: 0,
                transition: 'font-size 0.4s ease-out',
              }}>
                {data.translation}
              </p>
            </div>

            {/* Copy Button - only show when no detail panel */}
            {!hasDetail && (
              <div style={{ animation: 'slideUp 0.4s 0.3s ease-out backwards' }}>
                <button
                  onClick={handleCopy}
                  style={{
                    width: '100%',
                    maxWidth: 320,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    border: `1px solid ${colors.border}`,
                    backgroundColor: copied ? colors.foreground : 'rgba(232, 228, 220, 0.3)',
                    padding: '14px 24px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: copied ? colors.card : colors.foreground,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => {
                    if (!copied) {
                      e.currentTarget.style.backgroundColor = colors.foreground;
                      e.currentTarget.style.color = colors.card;
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!copied) {
                      e.currentTarget.style.backgroundColor = 'rgba(232, 228, 220, 0.3)';
                      e.currentTarget.style.color = colors.foreground;
                    }
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy All'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Character Detail (slides in) */}
      {hasDetail && selectedCharacter && (
        <div
          style={{
            width: '65%',
            animation: 'slideInFromRight 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header with back/close buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${colors.border}`,
            padding: '16px 24px',
            animation: 'fadeIn 0.3s ease-out',
          }}>
            <button
              onClick={handleDetailBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.75rem',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: colors.muted,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                transition: 'color 0.15s',
              }}
              onMouseOver={(e) => e.currentTarget.style.color = colors.foreground}
              onMouseOut={(e) => e.currentTarget.style.color = colors.muted}
            >
              <ChevronLeft size={16} />
              {characterHistory.length > 0 ? 'Previous' : 'Close'}
            </button>
            <button
              onClick={handleCloseDetail}
              style={{
                color: colors.muted,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                transition: 'color 0.15s',
              }}
              onMouseOver={(e) => e.currentTarget.style.color = colors.foreground}
              onMouseOut={(e) => e.currentTarget.style.color = colors.muted}
            >
              <X size={18} />
            </button>
          </div>

          {/* Sticky Character Display */}
          <div style={{
            borderBottom: `1px solid ${colors.border}`,
            padding: '20px 24px',
            backgroundColor: colors.card,
            animation: 'fadeIn 0.3s ease-out',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '5rem',
              fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
              fontWeight: 500,
              color: colors.foreground,
              lineHeight: 1,
            }}>
              {selectedCharacter.character}
            </div>
          </div>

          {/* Tab Bar */}
          <div style={{
            borderBottom: `1px solid ${colors.border}`,
            backgroundColor: colors.card,
          }}>
            <div style={{ display: 'flex', paddingLeft: 24 }}>
              {(['overview', 'structure'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    position: 'relative',
                    padding: '12px 20px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: activeTab === tab ? colors.foreground : colors.muted,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.15s',
                  }}
                  onMouseOver={(e) => {
                    if (activeTab !== tab) e.currentTarget.style.color = colors.foreground;
                  }}
                  onMouseOut={(e) => {
                    if (activeTab !== tab) e.currentTarget.style.color = colors.muted;
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {activeTab === tab && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      backgroundColor: colors.primary,
                    }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div
            ref={detailRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
            }}
          >
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Pinyin with HSK badge */}
                <div style={{ animation: 'slideUp 0.3s ease-out' }}>
                  <div style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: colors.muted,
                    marginBottom: 6,
                  }}>
                    Pinyin
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <p style={{
                      fontSize: '1.5rem',
                      fontFamily: '"Consolas", "Monaco", monospace',
                      color: 'rgba(26, 26, 26, 0.8)',
                      letterSpacing: '0.03em',
                      margin: 0,
                    }}>
                      {selectedCharacter.pinyin.length > 0 ? selectedCharacter.pinyin.join(', ') : '—'}
                    </p>
                    {hskData[selectedCharacter.character] && (
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
                        HSK {hskData[selectedCharacter.character].level}
                      </span>
                    )}
                  </div>
                </div>

                {/* Definition */}
                <div style={{ animation: 'slideUp 0.3s 0.05s ease-out backwards' }}>
                  <div style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: colors.muted,
                    marginBottom: 6,
                  }}>
                    Definition
                  </div>
                  <p style={{
                    fontSize: '0.95rem',
                    color: colors.foreground,
                    lineHeight: 1.6,
                    margin: 0,
                  }}>
                    {selectedCharacter.definition || '—'}
                  </p>
                </div>

                {/* Example Sentence - Editorial Pull-Quote Style */}
                {characterSentences.length > 0 && (
                  <div style={{
                    animation: 'slideUp 0.3s 0.1s ease-out backwards',
                    marginTop: '1.5rem',
                    paddingTop: '1.5rem',
                    borderTop: `1px solid ${colors.border}`,
                  }}>
                    {/* Decorative opening quote */}
                    <div style={{
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: '4rem',
                      lineHeight: 1,
                      color: colors.primary,
                      opacity: 0.15,
                      marginBottom: '-1.5rem',
                      marginLeft: '-0.5rem',
                    }}>
                      "
                    </div>

                    {/* Chinese sentence - centered, large, clickable */}
                    <div style={{
                      fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
                      fontSize: '1.5rem',
                      lineHeight: 1.8,
                      textAlign: 'center',
                      color: colors.foreground,
                      marginBottom: '1rem',
                      letterSpacing: '0.03em',
                    }}>
                      {characterSentences[currentExampleIndex].s.split('').map((char, charIndex) => {
                        const isTarget = char === selectedCharacter.character;
                        const isChinese = isChineseChar(char);

                        if (!isChinese) {
                          return <span key={charIndex}>{char}</span>;
                        }

                        return (
                          <span
                            key={charIndex}
                            onClick={() => handleCharacterClick(char)}
                            style={{
                              color: isTarget ? colors.primary : colors.foreground,
                              fontWeight: isTarget ? 600 : 400,
                              fontSize: isTarget ? '1.75rem' : '1.5rem',
                              cursor: 'pointer',
                              display: 'inline-block',
                              position: 'relative',
                              transition: 'all 0.2s ease',
                              borderBottom: isTarget ? `2px solid ${colors.primary}` : 'none',
                              paddingBottom: isTarget ? '2px' : '0',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = colors.primary;
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = isTarget ? colors.primary : colors.foreground;
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            {char}
                          </span>
                        );
                      })}
                    </div>

                    {/* Pinyin - subtle, centered */}
                    <div style={{
                      fontFamily: '"Consolas", "Monaco", monospace',
                      fontSize: '0.875rem',
                      textAlign: 'center',
                      color: colors.muted,
                      marginBottom: '1.25rem',
                      opacity: 0.6,
                      letterSpacing: '0.05em',
                    }}>
                      {characterSentences[currentExampleIndex].p}
                    </div>

                    {/* English translation */}
                    <div style={{
                      fontSize: '0.9375rem',
                      textAlign: 'center',
                      color: colors.foreground,
                      opacity: 0.6,
                      fontStyle: 'italic',
                      maxWidth: '85%',
                      margin: '0 auto',
                      lineHeight: 1.6,
                    }}>
                      {characterSentences[currentExampleIndex].e}
                    </div>

                    {/* Pagination dots + next arrow (if multiple examples) */}
                    {characterSentences.length > 1 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        marginTop: '1.5rem',
                      }}>
                        {/* Pagination dots */}
                        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                          {characterSentences.slice(0, Math.min(characterSentences.length, 5)).map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentExampleIndex(index)}
                              style={{
                                width: index === currentExampleIndex ? '1rem' : '0.375rem',
                                height: '0.375rem',
                                borderRadius: '0.1875rem',
                                background: index === currentExampleIndex ? colors.primary : colors.muted,
                                opacity: index === currentExampleIndex ? 1 : 0.3,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                              }}
                            />
                          ))}
                        </div>

                        {/* Next arrow */}
                        <button
                          onClick={() => setCurrentExampleIndex((prev) => 
                            (prev + 1) % Math.min(characterSentences.length, 5)
                          )}
                          style={{
                            fontSize: '1rem',
                            color: colors.muted,
                            background: 'transparent',
                            border: 'none',
                            padding: '0.25rem',
                            cursor: 'pointer',
                            transition: 'color 0.2s ease',
                            lineHeight: 1,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = colors.primary;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = colors.muted;
                          }}
                        >
                          →
                        </button>
                      </div>
                    )}

                    {/* Subtle hint about clickable characters */}
                    <div style={{
                      fontSize: '0.6875rem',
                      textAlign: 'center',
                      color: colors.muted,
                      marginTop: '1.25rem',
                      opacity: 0.5,
                      letterSpacing: '0.03em',
                    }}>
                      Click any character above to explore it
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Structure Tab */}
            {activeTab === 'structure' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Radical */}
                <div style={{ animation: 'slideUp 0.3s ease-out' }}>
                  <div style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: colors.muted,
                    marginBottom: 6,
                  }}>
                    Radical {dictionary[selectedCharacter.radical] && (
                      <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>(click to explore)</span>
                    )}
                  </div>
                  <div>
                    {selectedCharacter.radical ? (
                      <ClickableChar
                        char={selectedCharacter.radical}
                        onClick={() => handleCharacterClick(selectedCharacter.radical)}
                        size="2.5rem"
                      />
                    ) : '—'}
                  </div>
                </div>

                {/* Decomposition */}
                <div style={{ animation: 'slideUp 0.3s 0.05s ease-out backwards' }}>
                  <div style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: colors.muted,
                    marginBottom: 6,
                  }}>
                    Decomposition
                  </div>
                  <div style={{
                    fontSize: '1.1rem',
                    fontFamily: '"Consolas", "Monaco", monospace',
                    color: 'rgba(26, 26, 26, 0.7)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 4,
                    alignItems: 'center',
                  }}>
                    {selectedCharacter.decomposition ? (
                      selectedCharacter.decomposition.split('').map((char, i) => {
                        if (isChineseChar(char)) {
                          return (
                            <ClickableChar
                              key={i}
                              char={char}
                              onClick={() => handleCharacterClick(char)}
                              size="1.25rem"
                            />
                          );
                        }
                        return <span key={i} style={{ opacity: 0.5 }}>{char}</span>;
                      })
                    ) : '—'}
                  </div>
                </div>

                {/* Etymology */}
                {selectedCharacter.etymology && (
                  <div style={{ animation: 'slideUp 0.3s 0.1s ease-out backwards' }}>
                    <div style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: colors.muted,
                      marginBottom: 8,
                    }}>
                      Etymology
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <p style={{
                        fontSize: '0.875rem',
                        color: 'rgba(26, 26, 26, 0.9)',
                        lineHeight: 1.5,
                        margin: 0,
                      }}>
                        <span style={{ fontWeight: 500 }}>Type:</span>{' '}
                        <span style={{ textTransform: 'capitalize' }}>{selectedCharacter.etymology.type}</span>
                      </p>
                      {selectedCharacter.etymology.hint && (
                        <p style={{
                          fontSize: '0.875rem',
                          color: 'rgba(26, 26, 26, 0.7)',
                          lineHeight: 1.6,
                          margin: 0,
                        }}>
                          {selectedCharacter.etymology.hint}
                        </p>
                      )}
                      {selectedCharacter.etymology.semantic && selectedCharacter.etymology.phonetic && (
                        <div style={{
                          fontSize: '0.875rem',
                          color: 'rgba(26, 26, 26, 0.7)',
                          lineHeight: 1.6,
                        }}>
                          <ClickableChar
                            char={selectedCharacter.etymology.semantic}
                            onClick={() => handleCharacterClick(selectedCharacter.etymology!.semantic!)}
                            size="1.1em"
                          />
                          {' '}provides the meaning while{' '}
                          <ClickableChar
                            char={selectedCharacter.etymology.phonetic}
                            onClick={() => handleCharacterClick(selectedCharacter.etymology!.phonetic!)}
                            size="1.1em"
                          />
                          {' '}provides the pronunciation.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

