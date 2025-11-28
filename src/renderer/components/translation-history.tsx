import React, { useState, useEffect } from 'react';
import type { HistoryItem } from '../../preload';

// CSS keyframes for animations
const keyframesStyle = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export function TranslationHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

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

  const handleItemClick = async (item: HistoryItem) => {
    await window.electronAPI.showResultsWithData({
      chinese: item.chinese,
      pinyin: item.pinyin,
      english: item.english,
      x: 100,
      y: 100,
    });
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await window.electronAPI.deleteHistoryItem(id);
    setItems(items.filter(item => item.id !== id));
  };

  const handleClearAll = async () => {
    await window.electronAPI.clearHistory();
    setItems([]);
  };

  const isEmpty = items.length === 0;

  // Styles
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#fdfcfa',
    fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
  };

  const headerStyle: React.CSSProperties = {
    borderBottom: '1px solid #d4d0c8',
    padding: '24px 32px',
    animation: 'fadeIn 0.3s ease-out',
  };

  const headerContentStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const titleStyle: React.CSSProperties = {
    color: '#1a1a1a',
    fontSize: '1.5rem',
    fontWeight: 500,
    letterSpacing: '-0.01em',
    margin: 0,
  };

  const clearAllButtonStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: '#6b6b6b',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'color 0.2s',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
  };

  const emptyStateStyle: React.CSSProperties = {
    display: 'flex',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
    animation: 'fadeIn 0.4s ease-out',
  };

  const emptyTextStyle: React.CSSProperties = {
    textAlign: 'center',
    color: '#6b6b6b',
    fontSize: '1rem',
    lineHeight: 1.6,
  };

  const listStyle: React.CSSProperties = {
    padding: '8px 0',
  };

  const getItemStyle = (index: number, isHovered: boolean): React.CSSProperties => ({
    position: 'relative',
    cursor: 'pointer',
    borderBottom: '1px solid #d4d0c8',
    padding: '24px 32px',
    transition: 'background-color 0.2s',
    backgroundColor: isHovered ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
    animation: `slideUp 0.3s ${index * 0.05}s ease-out backwards`,
  });

  const deleteButtonStyle = (isVisible: boolean): React.CSSProperties => ({
    position: 'absolute',
    right: '24px',
    top: '24px',
    opacity: isVisible ? 1 : 0,
    transition: 'opacity 0.2s',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    color: '#6b6b6b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  const chineseTextStyle: React.CSSProperties = {
    marginBottom: '8px',
    paddingRight: '32px',
    color: '#1a1a1a',
    fontSize: '1.75rem',
    fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Source Han Sans SC", sans-serif',
    fontWeight: 500,
    letterSpacing: '0.01em',
    lineHeight: 1.3,
  };

  const englishTextStyle: React.CSSProperties = {
    color: '#6b6b6b',
    fontSize: '0.9rem',
    lineHeight: 1.5,
  };

  const loadingStyle: React.CSSProperties = {
    display: 'flex',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b6b6b',
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <style>{keyframesStyle}</style>
        <div style={loadingStyle}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <style>{keyframesStyle}</style>
      
      {/* Header */}
      <div style={headerStyle}>
        <div style={headerContentStyle}>
          <h2 style={titleStyle}>Translation History</h2>
          {!isEmpty && (
            <button
              onClick={handleClearAll}
              style={clearAllButtonStyle}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#c53030')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#6b6b6b')}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {isEmpty ? (
          <div style={emptyStateStyle}>
            <div style={emptyTextStyle}>
              No translations yet.
              <br />
              Start by capturing and translating text.
            </div>
          </div>
        ) : (
          <div style={listStyle}>
            {items.map((item, index) => (
              <div
                key={item.id}
                style={getItemStyle(index, hoveredId === item.id)}
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Delete button - appears on hover */}
                <button
                  onClick={(e) => handleDeleteItem(item.id, e)}
                  style={deleteButtonStyle(hoveredId === item.id)}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#c53030')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6b6b6b')}
                  aria-label="Delete translation"
                >
                  <svg
                    width="16"
                    height="16"
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
                </button>

                {/* Chinese text - prominent */}
                <div style={chineseTextStyle}>
                  {item.chinese}
                </div>

                {/* English translation - secondary */}
                <div style={englishTextStyle}>
                  {item.english}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

