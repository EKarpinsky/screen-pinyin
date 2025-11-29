import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@utils';
import { ScrollArea } from '@components/ui/scroll-area';
import { HistoryHeader } from './HistoryHeader';
import { HistoryEmptyState } from './HistoryEmptyState';
import { HistoryCard } from './HistoryCard';
import { HistoryItem } from './types';

interface TranslationHistoryProps {
  items?: HistoryItem[];
  onItemClick?: (item: HistoryItem) => void;
  onDeleteItem?: (id: string) => void;
  onClearAll?: () => void;
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
      <div className={cn(
        "flex flex-col h-full bg-[var(--background)]",
        "font-['Segoe_UI',system-ui,-apple-system,sans-serif]"
      )}>
        <div className={cn(
          "flex h-full items-center justify-center",
          "text-[var(--muted-foreground)]"
        )}>
          <span className="animate-[pulseFade_2s_ease-in-out_infinite]">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-[var(--background)] overflow-hidden",
      "font-['Segoe_UI',system-ui,-apple-system,sans-serif]"
    )}>
      <HistoryHeader
        itemCount={filteredItems.length}
        isEmpty={isEmpty}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearAll={handleClearAll}
      />

      <ScrollArea className="flex-1">
        {isEmpty ? (
          <HistoryEmptyState />
        ) : hasNoResults ? (
          <HistoryEmptyState searchQuery={searchQuery} />
        ) : (
          <div className="p-10 flex flex-col gap-6">
            {filteredItems.map((item, index) => (
              <HistoryCard
                key={item.id}
                item={item}
                index={index}
                onItemClick={handleItemClick}
                onDeleteItem={handleDeleteItem}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// Re-export types for consumers
export type { HistoryItem } from './types';
