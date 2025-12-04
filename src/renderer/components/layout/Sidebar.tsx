import React from 'react';
import { Clock, Search, BookOpen, Settings } from 'lucide-react';
import { cn } from '@utils';
import { NavButton } from './NavButton';
import { LightbulbToggle } from '../lightbulb-toggle';
import type { ViewType } from './types';

interface SidebarProps {
  currentView: ViewType;
  dueCardCount: number;
  isDark: boolean;
  onNavigate: (view: ViewType) => void;
  onHistoryClick: () => void;
  onToggleTheme: () => void;
}

export function Sidebar({
  currentView,
  dueCardCount,
  isDark,
  onNavigate,
  onHistoryClick,
  onToggleTheme,
}: SidebarProps) {
  return (
    <div
      className={cn(
        "w-[60px] bg-[var(--sidebar)]",
        "border-r border-[var(--border)]",
        "flex flex-col items-center",
        "pt-4 pb-4 gap-2"
      )}
    >
      <NavButton
        icon={<Clock size={22} />}
        isActive={currentView === 'history' || currentView === 'results'}
        onClick={onHistoryClick}
        tooltip="History"
      />
      <NavButton
        icon={<Search size={22} />}
        isActive={currentView === 'search'}
        onClick={() => onNavigate('search')}
        tooltip="Search"
      />
      <NavButton
        icon={<BookOpen size={22} />}
        isActive={currentView === 'flashcards' || currentView === 'flashcard-review'}
        onClick={() => onNavigate('flashcards')}
        tooltip="Flashcards"
        badge={dueCardCount}
      />
      <NavButton
        icon={<Settings size={22} />}
        isActive={currentView === 'settings'}
        onClick={() => onNavigate('settings')}
        tooltip="Settings"
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Theme toggle */}
      <div
        className={cn(
          "border-t border-[var(--border)]",
          "pt-3 w-full flex justify-center"
        )}
      >
        <LightbulbToggle
          isOn={!isDark}
          onToggle={onToggleTheme}
          size={22}
        />
      </div>
    </div>
  );
}

