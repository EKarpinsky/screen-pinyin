

import { colors } from './colors';

interface HSKBadgeProps {
  level: number;
}

/**
 * HSK level badge indicator
 */
export function HSKBadge({ level }: HSKBadgeProps) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 bg-[var(--accent-bg)] border border-[var(--border)] text-[11px] font-semibold tracking-wide rounded"
      style={{ color: colors.primary }}
    >
      HSK {level}
    </span>
  );
}


