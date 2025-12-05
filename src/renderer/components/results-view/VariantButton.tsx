

import { colors } from './colors';

interface VariantButtonProps {
  character: string;
  pinyin: string;
  variantType: string;
  onClick: () => void;
}

/**
 * Clickable variant character button
 */
export function VariantButton({ character, pinyin, variantType, onClick }: VariantButtonProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-baseline gap-1.5 px-3 py-1.5 bg-[var(--accent-bg)] border border-[var(--accent-border)] rounded cursor-pointer transition-all duration-200 font-inherit hover:border-[var(--primary)]"
    >
      <span
        className="text-lg leading-none font-['Microsoft_YaHei','PingFang_SC','Noto_Sans_SC',sans-serif]"
        style={{ color: colors.foreground }}
      >
        {character}
      </span>
      {pinyin && (
        <span className="text-[0.75rem] text-[var(--muted-foreground)] tracking-wide font-mono">
          {pinyin}
        </span>
      )}
      {variantType !== 'variant' && (
        <span className="text-[0.6rem] text-[var(--muted-foreground)] opacity-70">
          ({variantType})
        </span>
      )}
    </button>
  );
}


