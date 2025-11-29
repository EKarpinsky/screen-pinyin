import React, { useState, useEffect, useMemo } from 'react';
import { ScrollArea } from './ui/scroll-area';

// Define HistoryItem type locally (not imported from preload to avoid sandbox issues)
interface HistoryItem {
  id: string;
  chinese: string;
  pinyin: string;
  english: string;
  timestamp: number;
}

interface TranslationHistoryProps {
  items?: HistoryItem[];
  onItemClick?: (item: HistoryItem) => void;
  onDeleteItem?: (id: string) => void;
  onClearAll?: () => void;
}

// CSS keyframes and hover styles (pure CSS for performance)
const keyframesStyle = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.6; }
  }
  
  /* Card hover styles - pure CSS for smooth performance */
  .history-card {
    background-color: transparent;
    border: 1px solid transparent;
    transform: translateY(0);
    box-shadow: none;
    transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    will-change: transform;
  }
  .history-card:hover {
    background-color: var(--card);
    border-color: var(--border);
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0,0,0,0.1);
  }
  
  .history-watermark {
    opacity: 0.06;
    transition: opacity 0.2s ease;
  }
  .history-card:hover .history-watermark {
    opacity: 0.18;
  }
  
  .history-accent-bar {
    opacity: 0.5;
    transition: opacity 0.15s ease;
  }
  .history-card:hover .history-accent-bar {
    opacity: 1;
  }
  
  .history-delete-btn {
    opacity: 0;
    transition: opacity 0.2s ease, color 0.2s ease;
  }
  .history-card:hover .history-delete-btn {
    opacity: 1;
  }
`;

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = date.getDate();
  return `${month} ${day}`;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// Get dynamic font size based on text length - shorter = BIGGER
function getDynamicFontSize(text: string): string {
  const len = text.length;
  if (len <= 2) return '5rem';
  if (len <= 4) return '3.5rem';
  if (len <= 8) return '2.5rem';
  if (len <= 12) return '1.8rem';
  return '1.5rem';
}


// Search Icon component
function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}

// X Icon component
function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

export function TranslationHistory({
  items: propItems,
  onItemClick,
  onDeleteItem,
  onClearAll,
}: TranslationHistoryProps = {}) {
  const [items, setItems] = useState<HistoryItem[]>(propItems || []);
  const [loading, setLoading] = useState(!propItems);
  const [searchQuery, setSearchQuery] = useState('');

  // Use CSS variables for colors (supports dark mode)
  const colors = {
    background: 'var(--background)',
    foreground: 'var(--foreground)',
    card: 'var(--card)',
    muted: 'var(--muted)',
    mutedForeground: 'var(--muted-foreground)',
    secondaryForeground: 'var(--secondary-foreground)',
    tertiaryForeground: 'var(--tertiary-foreground)',
    border: 'var(--border)',
    input: 'var(--input)',
    primary: 'var(--primary)',
    destructive: 'var(--destructive)',
    hoverBg: 'var(--hover-bg)',
    accent: 'var(--accent)',
  };

  useEffect(() => {
    if (!propItems) {
      loadHistory();
    }
  }, [propItems]);

  useEffect(() => {
    if (propItems) {
      setItems(propItems);
    }
  }, [propItems]);

  const loadHistory = async () => {
    try {
      const history = await window.electronAPI.getHistory();
      setItems(history);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.chinese.toLowerCase().includes(query) ||
        item.english.toLowerCase().includes(query) ||
        item.pinyin?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const handleItemClick = async (item: HistoryItem) => {
    if (onItemClick) {
      onItemClick(item);
    } else {
      await window.electronAPI.showResultsWithData({
        chinese: item.chinese,
        pinyin: item.pinyin,
        english: item.english,
        x: 100,
        y: 100,
      });
    }
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteItem) {
      onDeleteItem(id);
    } else {
      await window.electronAPI.deleteHistoryItem(id);
    }
    setItems(items.filter(item => item.id !== id));
  };

  const handleClearAll = async () => {
    if (onClearAll) {
      onClearAll();
    } else {
      await window.electronAPI.clearHistory();
    }
    setItems([]);
  };

  const isEmpty = items.length === 0;
  const hasNoResults = !isEmpty && filteredItems.length === 0;

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: colors.background,
        fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
      }}>
        <style>{keyframesStyle}</style>
        <div style={{
          display: 'flex',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.mutedForeground,
        }}>
          <span style={{ animation: 'pulse 2s ease-in-out infinite' }}>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: colors.background,
      fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
      overflow: 'hidden',
    }}>
      <style>{keyframesStyle}</style>

      {/* Header - Magazine masthead style */}
      <div
        style={{
          padding: '32px 40px 24px',
          borderBottom: `1px solid ${colors.border}`,
          animation: 'fadeIn 0.4s ease-out',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: !isEmpty ? '20px' : 0,
        }}>
          <div>
            <h1 style={{
              color: colors.foreground,
              fontSize: '2.5rem',
              fontWeight: 300,
              letterSpacing: '-0.03em',
              margin: 0,
              lineHeight: 1,
            }}>
              History
            </h1>
            {!isEmpty && (
              <p style={{
                color: colors.tertiaryForeground,
                fontSize: '0.75rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginTop: '8px',
                fontWeight: 500,
              }}>
                {filteredItems.length} translation{filteredItems.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {!isEmpty && (
            <button
              onClick={handleClearAll}
              style={{
                fontSize: '0.7rem',
                color: colors.tertiaryForeground,
                background: 'none',
                border: `1px solid ${colors.border}`,
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '4px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 500,
                transition: 'border-color 0.2s ease, color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.destructive;
                e.currentTarget.style.color = colors.destructive;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.color = colors.tertiaryForeground;
              }}
            >
              Clear All
            </button>
          )}
        </div>

        {/* Search bar - minimal and editorial */}
        {!isEmpty && (
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <div style={{
              position: 'absolute',
              left: '0',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.tertiaryForeground,
            }}>
              <SearchIcon size={14} />
            </div>
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                borderBottom: `1px solid ${colors.border}`,
                backgroundColor: 'transparent',
                padding: '8px 32px 8px 24px',
                fontSize: '0.875rem',
                color: colors.foreground,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = colors.primary;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.border;
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: colors.tertiaryForeground,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = colors.foreground)}
                onMouseLeave={(e) => (e.currentTarget.style.color = colors.tertiaryForeground)}
              >
                <XIcon size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea style={{ flex: 1 }}>
        {isEmpty ? (
          /* Empty state - dramatic and editorial */
          <div style={{
            display: 'flex',
            height: '100%',
            minHeight: '400px',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 40px',
            animation: 'fadeIn 0.6s ease-out',
            position: 'relative',
          }}>
            {/* Large watermark character */}
            <div style={{
              position: 'absolute',
              fontSize: '20rem',
              fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
              fontWeight: 100,
              color: colors.border,
              opacity: 0.3,
              userSelect: 'none',
              pointerEvents: 'none',
              animation: 'float 6s ease-in-out infinite',
            }}>
              未
            </div>
            
            <div style={{ 
              maxWidth: '360px', 
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
            }}>
              <h2 style={{
                color: colors.foreground,
                fontSize: '1.75rem',
                fontWeight: 300,
                letterSpacing: '-0.02em',
                marginBottom: '16px',
                animation: 'slideUp 0.5s ease-out 0.2s backwards',
              }}>
                未开始
              </h2>
              <p style={{
                color: colors.tertiaryForeground,
                fontSize: '0.9rem',
                lineHeight: 1.8,
                margin: 0,
                animation: 'slideUp 0.5s ease-out 0.3s backwards',
              }}>
                Your translation journey begins here.<br />
                Capture text from your screen to start.
              </p>
            </div>
          </div>
        ) : hasNoResults ? (
          <div style={{
            display: 'flex',
            height: '100%',
            minHeight: '200px',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 40px',
            animation: 'fadeIn 0.3s ease-out',
          }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{
                color: colors.tertiaryForeground,
                fontSize: '1rem',
                lineHeight: 1.6,
                margin: 0,
              }}>
                No translations match "<span style={{ color: colors.foreground }}>{searchQuery}</span>"
              </p>
            </div>
          </div>
        ) : (
          /* Magazine-style editorial layout */
          <div style={{ 
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}>
            {filteredItems.map((item, index) => {
              const fontSize = getDynamicFontSize(item.chinese);
              const watermarkChar = item.chinese[0];
              
              return (
                <div
                  key={item.id}
                  style={{
                    animation: `slideUp 0.5s ${Math.min(index * 0.05, 0.5)}s ease-out backwards`,
                  }}
                >
                  <div
                    className="history-card"
                    style={{
                      width: '100%',
                      position: 'relative',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      padding: '32px',
                      overflow: 'hidden',
                    }}
                    onClick={() => handleItemClick(item)}
                  >
                    {/* Watermark character */}
                    <div 
                      className="history-watermark"
                      style={{
                        position: 'absolute',
                        top: '-20%',
                        right: '5%',
                        fontSize: '10rem',
                        fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
                        fontWeight: 100,
                        color: colors.border,
                        userSelect: 'none',
                        pointerEvents: 'none',
                        lineHeight: 1,
                      }}
                    >
                      {watermarkChar}
                    </div>

                    {/* Content */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      {/* Magazine-style date */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '16px',
                      }}>
                        <span style={{
                          fontSize: '0.65rem',
                          fontFamily: '"Consolas", "Monaco", monospace',
                          color: colors.tertiaryForeground,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                        }}>
                          {formatDate(item.timestamp)}
                        </span>
                        <span style={{
                          fontSize: '0.55rem',
                          color: colors.tertiaryForeground,
                          opacity: 0.5,
                        }}>
                          •
                        </span>
                        <span style={{
                          fontSize: '0.65rem',
                          fontFamily: '"Consolas", "Monaco", monospace',
                          color: colors.tertiaryForeground,
                          letterSpacing: '0.05em',
                        }}>
                          {formatTime(item.timestamp)}
                        </span>

                        {/* Delete button */}
                        <button
                          className="history-delete-btn"
                          onClick={(e) => handleDeleteItem(item.id, e)}
                          style={{
                            marginLeft: 'auto',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: colors.tertiaryForeground,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = colors.destructive)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = colors.tertiaryForeground)}
                          aria-label="Delete translation"
                        >
                          <XIcon size={14} />
                        </button>
                      </div>

                      {/* HERO: Chinese text - massive and prominent */}
                      <div style={{ marginBottom: '16px' }}>
                        <p style={{
                          color: colors.foreground,
                          fontSize: fontSize,
                          fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
                          fontWeight: 400,
                          letterSpacing: '0.02em',
                          lineHeight: 1.2,
                          margin: 0,
                        }}>
                          {item.chinese}
                        </p>
                      </div>

                      {/* Pinyin - annotation style */}
                      {item.pinyin && (
                        <div style={{ marginBottom: '16px' }}>
                          <p style={{
                            color: colors.primary,
                            fontSize: '0.8rem',
                            fontFamily: '"Consolas", "Monaco", monospace',
                            fontStyle: 'italic',
                            letterSpacing: '0.03em',
                            lineHeight: 1.5,
                            margin: 0,
                          }}>
                            {item.pinyin}
                          </p>
                        </div>
                      )}

                      {/* English - editorial caption with accent bar */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                      }}>
                        <div 
                          className="history-accent-bar"
                          style={{
                            width: '3px',
                            height: '100%',
                            minHeight: '20px',
                            backgroundColor: colors.primary,
                            borderRadius: '2px',
                            flexShrink: 0,
                          }} 
                        />
                        <p style={{
                          color: colors.secondaryForeground,
                          fontSize: '0.9rem',
                          fontStyle: 'italic',
                          lineHeight: 1.7,
                          margin: 0,
                          flex: 1,
                        }}>
                          {item.english}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
