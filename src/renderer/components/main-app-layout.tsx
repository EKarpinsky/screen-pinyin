import React, { useState, useEffect } from 'react';
import { Copy, Check, X, ArrowLeft, Clock, Settings } from 'lucide-react';
import { CharacterDetailPanel, CharacterData } from './character-detail-panel';
import hanziDictionary from '../../data/hanzi-dictionary.json';
import type { HistoryItem } from '../../preload';

type ViewType = 'history' | 'settings' | 'results';

interface ResultsData {
  original: string;
  pinyin: string;
  translation: string;
}

const colors = {
  background: '#f7f5f0',
  card: '#fdfcfa',
  foreground: '#1a1a1a',
  muted: '#6b6b6b',
  border: '#d4d0c8',
  input: '#efece6',
  primary: '#4a3728',
  sidebar: '#f0ebe4',
  sidebarActive: '#e8e2d9',
};

const dictionary = hanziDictionary as Record<string, CharacterData>;

// CSS keyframes
const keyframesStyle = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// Check if a character is Chinese
function isChineseChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF) ||
         (code >= 0x3400 && code <= 0x4DBF) ||
         (code >= 0x2E80 && code <= 0x2EFF) ||
         (code >= 0x2F00 && code <= 0x2FDF);
}

const AZURE_REGIONS = [
  { value: "eastus", label: "East US" },
  { value: "westus", label: "West US" },
  { value: "westus2", label: "West US 2" },
  { value: "eastasia", label: "East Asia" },
  { value: "southeastasia", label: "Southeast Asia" },
  { value: "northeurope", label: "North Europe" },
  { value: "westeurope", label: "West Europe" },
];

export function MainAppLayout() {
  const [currentView, setCurrentView] = useState<ViewType>('history');
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);

  // Listen for new results from capture
  useEffect(() => {
    const handleNewCapture = async () => {
      setIsProcessing(true);
      setProcessError(null);
      setCurrentView('results');

      try {
        const imageData = await window.electronAPI.getCapturedImage();
        if (!imageData) {
          setProcessError('No captured image found');
          setIsProcessing(false);
          return;
        }

        const ocrResult = await window.electronAPI.performOCR(imageData);
        if (!ocrResult.success || !ocrResult.text) {
          setProcessError(ocrResult.error || 'OCR failed to detect text');
          setIsProcessing(false);
          return;
        }

        const translateResult = await window.electronAPI.translate(ocrResult.text);
        if (!translateResult.success) {
          setProcessError(translateResult.error || 'Translation failed');
          setIsProcessing(false);
          return;
        }

        setResultsData({
          original: translateResult.original || ocrResult.text,
          pinyin: translateResult.pinyin || '',
          translation: translateResult.translation || '',
        });
        setIsProcessing(false);
      } catch (err) {
        setProcessError(err instanceof Error ? err.message : 'Unknown error');
        setIsProcessing(false);
      }
    };

    const handleShowResultsFromHistory = async () => {
      const pending = await window.electronAPI.getPendingResultsData();
      if (pending) {
        setResultsData({
          original: pending.chinese,
          pinyin: pending.pinyin,
          translation: pending.english,
        });
        setCurrentView('results');
      }
    };

    // Listen for events from main process
    window.electronAPI.onNewCapture(handleNewCapture);
    window.electronAPI.onShowResultsFromHistory(handleShowResultsFromHistory);

    // Check for pending results on mount (from history click before window was open)
    const checkPending = async () => {
      const pending = await window.electronAPI.getPendingResultsData();
      if (pending) {
        setResultsData({
          original: pending.chinese,
          pinyin: pending.pinyin,
          translation: pending.english,
        });
        setCurrentView('results');
      }
    };
    checkPending();

    return () => {
      window.electronAPI.offNewCapture(handleNewCapture);
      window.electronAPI.offShowResultsFromHistory(handleShowResultsFromHistory);
    };
  }, []);

  const handleHistoryItemClick = (item: HistoryItem) => {
    setResultsData({
      original: item.chinese,
      pinyin: item.pinyin,
      translation: item.english,
    });
    setCurrentView('results');
  };

  const handleBackToHistory = () => {
    setResultsData(null);
    setProcessError(null);
    setCurrentView('history');
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: colors.card,
      fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
    }}>
      <style>{keyframesStyle}</style>

      {/* Sidebar */}
      <div style={{
        width: 60,
        backgroundColor: colors.sidebar,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 16,
        gap: 8,
      }}>
        {/* Draggable area at top */}
        <div style={{
          // @ts-ignore - webkit property for Electron drag
          WebkitAppRegion: 'drag',
          height: 24,
          width: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        }} />

        <SidebarButton
          icon={<Clock size={22} />}
          isActive={currentView === 'history' || currentView === 'results'}
          onClick={() => currentView === 'results' ? handleBackToHistory() : setCurrentView('history')}
          tooltip="History"
        />
        <SidebarButton
          icon={<Settings size={22} />}
          isActive={currentView === 'settings'}
          onClick={() => setCurrentView('settings')}
          tooltip="Settings"
        />
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {currentView === 'history' && (
          <HistoryView onItemClick={handleHistoryItemClick} />
        )}
        {currentView === 'settings' && (
          <SettingsView />
        )}
        {currentView === 'results' && (
          <ResultsView
            data={resultsData}
            isProcessing={isProcessing}
            error={processError}
            onBack={handleBackToHistory}
          />
        )}
      </div>
    </div>
  );
}

// Sidebar Button Component
function SidebarButton({
  icon,
  isActive,
  onClick,
  tooltip,
}: {
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  tooltip: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={tooltip}
      style={{
        // @ts-ignore - webkit property for Electron no-drag
        WebkitAppRegion: 'no-drag',
        width: 44,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: 8,
        backgroundColor: isActive ? colors.sidebarActive : isHovered ? 'rgba(0,0,0,0.04)' : 'transparent',
        color: isActive ? colors.foreground : colors.muted,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {icon}
    </button>
  );
}

// History View Component
function HistoryView({ onItemClick }: { onItemClick: (item: HistoryItem) => void }) {
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

  if (loading) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.muted,
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${colors.border}`,
        padding: '20px 28px',
        animation: 'fadeIn 0.3s ease-out',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{
            color: colors.foreground,
            fontSize: '1.35rem',
            fontWeight: 500,
            letterSpacing: '-0.01em',
            margin: 0,
          }}>
            Translation History
          </h2>
          {!isEmpty && (
            <button
              onClick={handleClearAll}
              style={{
                fontSize: '0.85rem',
                color: colors.muted,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 4,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#c53030')}
              onMouseLeave={(e) => (e.currentTarget.style.color = colors.muted)}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isEmpty ? (
          <div style={{
            display: 'flex',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            animation: 'fadeIn 0.4s ease-out',
          }}>
            <div style={{
              textAlign: 'center',
              color: colors.muted,
              fontSize: '0.95rem',
              lineHeight: 1.6,
            }}>
              No translations yet.
              <br />
              Press <kbd style={{
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.input,
                padding: '2px 6px',
                fontSize: '0.8rem',
                borderRadius: 3,
                margin: '0 4px',
              }}>Ctrl+Shift+C</kbd> to capture text.
            </div>
          </div>
        ) : (
          <div style={{ padding: '8px 0' }}>
            {items.map((item, index) => (
              <div
                key={item.id}
                onClick={() => onItemClick(item)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  borderBottom: `1px solid ${colors.border}`,
                  padding: '20px 28px',
                  transition: 'background-color 0.2s',
                  backgroundColor: hoveredId === item.id ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
                  animation: `slideUp 0.3s ${index * 0.05}s ease-out backwards`,
                }}
              >
                {/* Delete button */}
                <button
                  onClick={(e) => handleDeleteItem(item.id, e)}
                  style={{
                    position: 'absolute',
                    right: 20,
                    top: 20,
                    opacity: hoveredId === item.id ? 1 : 0,
                    transition: 'opacity 0.2s',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    color: colors.muted,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#c53030')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = colors.muted)}
                >
                  <X size={16} />
                </button>

                {/* Chinese text */}
                <div style={{
                  marginBottom: 6,
                  paddingRight: 32,
                  color: colors.foreground,
                  fontSize: '1.5rem',
                  fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Source Han Sans SC", sans-serif',
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  lineHeight: 1.3,
                }}>
                  {item.chinese}
                </div>

                {/* English translation */}
                <div style={{
                  color: colors.muted,
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                }}>
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

// Settings View Component
function SettingsView() {
  const [apiKey, setApiKey] = useState('');
  const [region, setRegion] = useState('eastus');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedApiKey = await window.electronAPI.getStoreValue('azureApiKey') as string;
        const storedRegion = await window.electronAPI.getStoreValue('azureRegion') as string;
        if (storedApiKey) setApiKey(storedApiKey);
        if (storedRegion) setRegion(storedRegion);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    await window.electronAPI.setStoreValue('azureApiKey', apiKey);
    await window.electronAPI.setStoreValue('azureRegion', region);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (isLoading) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.muted,
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      padding: '28px 36px',
      overflowY: 'auto',
      animation: 'fadeIn 0.3s ease-out',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{
          fontSize: '1.35rem',
          fontWeight: 500,
          color: colors.foreground,
          margin: 0,
        }}>
          Settings
        </h2>
        <p style={{
          fontSize: '0.875rem',
          color: colors.muted,
          marginTop: 4,
          margin: 0,
        }}>
          Configure your Azure Translator connection
        </p>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480 }}>
        {/* API Key */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: colors.foreground,
            marginBottom: 8,
          }}>
            Azure API Key
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              style={{
                width: '100%',
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.input,
                padding: '12px 44px 12px 14px',
                fontSize: '0.875rem',
                color: colors.foreground,
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
                borderRadius: 0,
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = colors.foreground}
              onBlur={(e) => e.currentTarget.style.borderColor = colors.border}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: colors.muted,
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
              }}
            >
              {showApiKey ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Region */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: colors.foreground,
            marginBottom: 8,
          }}>
            Azure Region
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            style={{
              width: '100%',
              appearance: 'none',
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.input,
              padding: '12px 14px',
              fontSize: '0.875rem',
              color: colors.foreground,
              fontFamily: 'inherit',
              outline: 'none',
              cursor: 'pointer',
              borderRadius: 0,
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b6b6b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 12px center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '16px',
            }}
          >
            {AZURE_REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Hotkey Display */}
        <div style={{
          border: `1px solid ${colors.border}`,
          backgroundColor: 'rgba(232, 228, 220, 0.3)',
          padding: 16,
        }}>
          <div style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: colors.muted,
            marginBottom: 10,
          }}>
            Capture Hotkey
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {['Ctrl', 'Shift', 'C'].map((key, i) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {i > 0 && <span style={{ color: colors.muted }}>+</span>}
                <kbd style={{
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.card,
                  padding: '5px 10px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  fontFamily: '"Consolas", monospace',
                  color: colors.foreground,
                }}>
                  {key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          style={{
            border: `1px solid ${colors.foreground}`,
            backgroundColor: saved ? colors.foreground : colors.foreground,
            padding: '14px 20px',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: colors.card,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          {saved ? <Check size={16} /> : null}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

// Results View Component
function ResultsView({
  data,
  isProcessing,
  error,
  onBack,
}: {
  data: ResultsData | null;
  isProcessing: boolean;
  error: string | null;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterData | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isPanelOpen) {
          setIsPanelOpen(false);
        } else {
          onBack();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen, onBack]);

  const handleCopy = async () => {
    if (!data) return;
    const text = `${data.original}\n${data.pinyin}\n${data.translation}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCharacterClick = (char: string) => {
    const charData = dictionary[char];
    if (charData) {
      setSelectedCharacter(charData);
      setIsPanelOpen(true);
    }
  };

  const renderClickableText = (text: string) => {
    return text.split('').map((char, index) => {
      const isChinese = isChineseChar(char);
      const hasData = isChinese && dictionary[char];

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
                e.currentTarget.style.color = colors.primary;
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = colors.foreground;
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title={hasData ? 'Click for details' : undefined}
          >
            {char}
          </span>
        );
      }
      return <span key={index}>{char}</span>;
    });
  };

  // Loading state
  if (isProcessing) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', color: colors.muted }}>
          <div style={{
            width: 24,
            height: 24,
            border: `2px solid ${colors.border}`,
            borderTopColor: colors.foreground,
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ fontSize: '0.875rem' }}>Processing...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}>
        <div style={{
          textAlign: 'center',
          padding: 32,
          maxWidth: 400,
        }}>
          <div style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#b44',
            marginBottom: 12,
          }}>
            Error
          </div>
          <div style={{ fontSize: '0.875rem', color: colors.foreground, lineHeight: 1.5, marginBottom: 24 }}>
            {error}
          </div>
          <button
            onClick={onBack}
            style={{
              border: `1px solid ${colors.border}`,
              backgroundColor: 'transparent',
              padding: '10px 20px',
              fontSize: '0.875rem',
              color: colors.foreground,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              margin: '0 auto',
            }}
          >
            <ArrowLeft size={16} />
            Back to History
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.muted,
      }}>
        No results to display
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      {/* Main content */}
      <div style={{
        flex: 1,
        padding: '24px 36px 36px 36px',
        overflowY: 'auto',
        animation: 'fadeIn 0.3s ease-out',
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Chinese Text */}
          <div style={{ animation: 'slideUp 0.4s ease-out' }}>
            <h1 style={{
              fontSize: '3.5rem',
              fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Source Han Sans SC", sans-serif',
              fontWeight: 500,
              color: colors.foreground,
              lineHeight: 1.2,
              letterSpacing: '0.02em',
              margin: 0,
            }}>
              {renderClickableText(data.original)}
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
              fontSize: '1.15rem',
              fontFamily: '"Consolas", "Monaco", monospace',
              color: 'rgba(26, 26, 26, 0.7)',
              lineHeight: 1.5,
              letterSpacing: '0.03em',
              margin: 0,
            }}>
              {data.pinyin}
            </p>
          </div>

          {/* English Translation */}
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
              fontSize: '1.05rem',
              color: colors.foreground,
              lineHeight: 1.6,
              margin: 0,
            }}>
              {data.translation}
            </p>
          </div>

          {/* Copy Button */}
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
        </div>
      </div>

      {/* Character Detail Panel */}
      <CharacterDetailPanel
        data={selectedCharacter}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  );
}

