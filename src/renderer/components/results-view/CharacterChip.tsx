

import { colors } from './colors';
import type { CharacterData } from './types';

interface CharacterChipProps {
  char: string;
  charData: CharacterData | undefined;
  pinyin: string;
  definition: string;
  onClick: () => void;
}

/**
 * Clickable chip displaying a component character with pinyin and definition
 */
export function CharacterChip({
  char,
  charData,
  pinyin,
  definition,
  onClick,
}: CharacterChipProps) {
  const isClickable = !!charData;

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className="flex flex-col items-center gap-1 py-3 px-4 bg-[var(--card)] border border-[var(--border)] rounded-lg cursor-pointer transition-all duration-150 min-w-[100px] max-w-[140px] disabled:cursor-default disabled:opacity-50 hover:enabled:bg-[var(--accent-bg)] hover:enabled:border-[var(--primary)]"
    >
      <span
        className="text-[2rem] font-['Microsoft_YaHei','PingFang_SC','Noto_Sans_SC',sans-serif] leading-none"
        style={{ color: colors.foreground }}
      >
        {char}
      </span>
      <span
        className="text-[0.75rem] font-mono"
        style={{ color: colors.muted }}
      >
        {pinyin || '—'}
      </span>
      <span
        className="text-[0.65rem] text-center leading-tight opacity-80"
        style={{ color: colors.muted }}
      >
        {definition}
      </span>
    </button>
  );
}


