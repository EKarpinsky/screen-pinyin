import React, { useState, useEffect, Activity } from 'react';

import { cn } from '@utils';

import { useTheme } from '../../contexts/theme-context';

// Sub-components

// External components
import { FlashcardDeck } from '../flashcards';
import { AmbientWidget } from '../flashcards/AmbientWidget';
import { ExitPromptModal } from '../flashcards/ExitPromptModal';
import { FlashcardReview } from '../flashcards/FlashcardReview';
import { TranslationHistory } from '../history';
import { ResultsViewWithDetail } from '../results-view-with-detail';
import { SearchView } from '../search';
import { SettingsPanel } from '../settings-panel';

import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';

// Types
import type { ViewType, HistoryItem, ResultsData } from './types';

export function MainAppLayout() {
  console.log('[MainAppLayout] Rendering...');
  const { isDark, toggleTheme } = useTheme();
  const [currentView, setCurrentView] = useState<ViewType>('history');
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // Flashcard UX state
  const [dueCardCount, setDueCardCount] = useState(0);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [exitPromptDueCount, setExitPromptDueCount] = useState(0);
  const [showAmbientWidget, setShowAmbientWidget] = useState(false);

  console.log('[MainAppLayout] currentView:', currentView, 'isProcessing:', isProcessing);

  // Listen for new results from capture
  useEffect(() => {
    console.log('[MainAppLayout] Setting up event listeners...');

    const handleNewCapture = async () => {
      console.log('[MainAppLayout] handleNewCapture called!');
      setIsProcessing(true);
      setProcessError(null);
      setCurrentView('results');

      try {
        console.log('[MainAppLayout] Getting captured image...');
        const imageData = await window.electronAPI.getCapturedImage();
        console.log('[MainAppLayout] Got image data:', imageData ? 'yes' : 'no');
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
          mode: 'translation',
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
          mode: 'translation',
        });
        setCurrentView('results');
      }
    };

    // Handler for lookup from clipboard popup
    const handleLookupText = (_event: unknown, chinese: string) => {
      console.log('Lookup text received:', chinese);
      setResultsData({
        original: chinese,
        pinyin: '', // Will be filled by ResultsViewWithDetail
        translation: '',
        mode: 'lookup',
      });
      setCurrentView('results');
    };

    // Listen for events from main process
    window.electronAPI.onNewCapture(handleNewCapture);
    window.electronAPI.onShowResultsFromHistory(handleShowResultsFromHistory);
    window.electronAPI.onLookupText?.(handleLookupText);

    // Check for pending capture or results on mount
    const checkPending = async () => {
      const pendingCapture = await window.electronAPI.getPendingCapture();
      if (pendingCapture) {
        handleNewCapture();
        return;
      }

      const pendingResults = await window.electronAPI.getPendingResultsData();
      if (pendingResults) {
        setResultsData({
          original: pendingResults.chinese,
          pinyin: pendingResults.pinyin,
          translation: pendingResults.english,
          mode: 'translation',
        });
        setCurrentView('results');
      }
    };
    checkPending();

    return () => {
      window.electronAPI.offNewCapture(handleNewCapture);
      window.electronAPI.offShowResultsFromHistory(handleShowResultsFromHistory);
      window.electronAPI.offLookupText?.(handleLookupText);
    };
  }, []);

  // Load history items (for SearchView)
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await window.electronAPI.getHistory();
        setHistoryItems(history);
      } catch (error) {
        console.error('Failed to load history:', error);
      }
    };
    loadHistory();
  }, [currentView]);

  // Load due card count and ambient widget state
  useEffect(() => {
    const loadFlashcardState = async () => {
      try {
        const stats = await window.electronAPI.flashcardGetStats();
        setDueCardCount(stats.due);

        const ambientEnabled = await window.electronAPI.ambientWidgetGetEnabled();
        setShowAmbientWidget(ambientEnabled);
      } catch (error) {
        console.error('Failed to load flashcard state:', error);
      }
    };
    loadFlashcardState();

    const interval = setInterval(loadFlashcardState, 60000);
    return () => clearInterval(interval);
  }, []);

  // Listen for exit prompt event from main process
  useEffect(() => {
    const handleShowExitPrompt = (_event: unknown, data: { dueCount: number }) => {
      setExitPromptDueCount(data.dueCount);
      setShowExitPrompt(true);
    };

    window.electronAPI.onShowExitPrompt(handleShowExitPrompt);

    return () => {
      window.electronAPI.offShowExitPrompt(handleShowExitPrompt);
    };
  }, []);

  // Listen for navigate-to-flashcards event (from notification click)
  useEffect(() => {
    const handleNavigateToFlashcards = () => {
      setCurrentView('flashcards');
    };

    window.electronAPI.onNavigateToFlashcards?.(handleNavigateToFlashcards);

    return () => {
      window.electronAPI.offNavigateToFlashcards?.(handleNavigateToFlashcards);
    };
  }, []);

  // Exit prompt handlers
  const handleExitPromptStartReview = () => {
    setShowExitPrompt(false);
    window.electronAPI.cancelExit();
    setCurrentView('flashcard-review');
  };

  const handleExitPromptDismiss = async () => {
    setShowExitPrompt(false);
    await window.electronAPI.exitPromptDismiss();
    await window.electronAPI.confirmExit();
  };

  const handleExitPromptClose = () => {
    setShowExitPrompt(false);
    window.electronAPI.cancelExit();
  };

  // Toggle ambient widget
  const toggleAmbientWidget = async () => {
    const newValue = !showAmbientWidget;
    setShowAmbientWidget(newValue);
    await window.electronAPI.ambientWidgetSetEnabled(newValue);
  };

  const handleHistoryItemClick = (item: HistoryItem) => {
    setResultsData({
      original: item.chinese,
      pinyin: item.pinyin,
      translation: item.english,
      mode: 'translation',
    });
    setCurrentView('results');
  };

  const handleBack = () => {
    const returnToSearch = resultsData?.mode === 'lookup';
    setResultsData(null);
    setProcessError(null);
    setCurrentView(returnToSearch ? 'search' : 'history');
  };

  // Handle search item click
  const handleSearchItemClick = (
    item: HistoryItem | { type: 'dictionary'; data: { character: string; pinyin: string[]; definition: string } }
  ) => {
    if ('type' in item && item.type === 'dictionary') {
      setResultsData({
        original: item.data.character,
        pinyin: item.data.pinyin.join(', '),
        translation: item.data.definition,
        mode: 'lookup',
      });
      setCurrentView('results');
    } else {
      handleHistoryItemClick(item as HistoryItem);
    }
  };

  // Handle translate text from search
  const handleTranslateText = async (text: string) => {
    setIsProcessing(true);
    setProcessError(null);
    setCurrentView('results');

    try {
      const translateResult = await window.electronAPI.translate(text);
      if (!translateResult.success) {
        setProcessError(translateResult.error || 'Translation failed');
        setIsProcessing(false);
        return;
      }

      setResultsData({
        original: translateResult.original || text,
        pinyin: translateResult.pinyin || '',
        translation: translateResult.translation || '',
        mode: 'translation',
      });
      setIsProcessing(false);
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Unknown error');
      setIsProcessing(false);
    }
  };

  // Sidebar navigation handler
  const handleNavigate = (view: ViewType) => {
    if (view === 'flashcards' && currentView === 'flashcard-review') {
      setCurrentView('flashcards');
    } else {
      setCurrentView(view);
    }
  };

  // History button click - go back if on results, otherwise go to history
  const handleHistoryClick = () => {
    if (currentView === 'results') {
      handleBack();
    } else {
      setCurrentView('history');
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col h-screen",
        "bg-[var(--card)]",
        "font-['Segoe_UI',system-ui,-apple-system,sans-serif]"
      )}
    >
      {/* Title Bar */}
      <TitleBar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          dueCardCount={dueCardCount}
          isDark={isDark}
          onNavigate={handleNavigate}
          onHistoryClick={handleHistoryClick}
          onToggleTheme={toggleTheme}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[var(--background)]">
          {currentView === 'history' && (
            <TranslationHistory onItemClick={handleHistoryItemClick} />
          )}

          {/* Activity preserves SearchView state when navigating to results */}
          <Activity mode={currentView === 'search' ? 'visible' : 'hidden'}>
            <SearchView
              historyItems={historyItems}
              onItemClick={handleSearchItemClick}
              onTranslateText={handleTranslateText}
            />
          </Activity>

          {currentView === 'settings' && <SettingsPanel />}

          {currentView === 'flashcards' && (
            <FlashcardDeck onStartReview={() => setCurrentView('flashcard-review')} />
          )}

          {currentView === 'flashcard-review' && (
            <FlashcardReview
              onComplete={() => setCurrentView('flashcards')}
              onBack={() => setCurrentView('flashcards')}
            />
          )}

          {currentView === 'results' && (
            isProcessing ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-[var(--muted-foreground)]">
                  <div className="w-6 h-6 mx-auto mb-4 border-2 border-[var(--border)] border-t-[var(--foreground)] rounded-full animate-spin" />
                  <div className="text-sm">Processing...</div>
                </div>
              </div>
            ) : processError ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="text-center p-8 max-w-[400px]">
                  <div className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-red-600 dark:text-red-400 mb-3">
                    Error
                  </div>
                  <div className="text-sm text-[var(--foreground)] leading-relaxed mb-6">
                    {processError}
                  </div>
                  <button
                    onClick={handleBack}
                    className="border border-[var(--border)] bg-transparent py-2.5 px-5 text-sm text-[var(--foreground)] cursor-pointer font-[inherit] flex items-center gap-2 mx-auto hover:bg-[var(--hover-bg)] transition-colors"
                  >
                    Back to History
                  </button>
                </div>
              </div>
            ) : resultsData ? (
              <ResultsViewWithDetail data={resultsData} onBack={handleBack} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-[var(--muted-foreground)]">
                No results to display
              </div>
            )
          )}
        </div>
      </div>

      {/* Exit Prompt Modal */}
      <ExitPromptModal
        open={showExitPrompt}
        dueCount={exitPromptDueCount}
        onStartReview={handleExitPromptStartReview}
        onDismiss={handleExitPromptDismiss}
        onClose={handleExitPromptClose}
      />

      {/* Ambient Widget */}
      {showAmbientWidget && <AmbientWidget onClose={() => toggleAmbientWidget()} />}
    </div>
  );
}

// Re-export types for consumers
export type { ViewType, ViewMode, ResultsData, HistoryItem, CharacterData } from './types';

