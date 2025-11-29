/**
 * Shared types for history components
 */

export interface HistoryItem {
  id: string;
  chinese: string;
  pinyin: string;
  english: string;
  timestamp: number;
}

export interface HistoryColors {
  background: string;
  foreground: string;
  card: string;
  muted: string;
  mutedForeground: string;
  secondaryForeground: string;
  tertiaryForeground: string;
  border: string;
  input: string;
  primary: string;
  destructive: string;
  hoverBg: string;
  accent: string;
}

/**
 * CSS variable-based colors for dark mode support
 */
export const historyColors: HistoryColors = {
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

