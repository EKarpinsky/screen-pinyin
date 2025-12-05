

import { colors } from './colors';

interface DefinitionListProps {
  definitions: string[];
  maxItems?: number;
}

/**
 * Numbered list of definitions with optional limit
 */
export function DefinitionList({ definitions, maxItems = 6 }: DefinitionListProps) {
  const visibleDefs = definitions.slice(0, maxItems);
  const remaining = definitions.length - maxItems;

  return (
    <div className="m-0">
      {visibleDefs.map((def, i) => (
        <div
          key={i}
          className="flex items-start gap-2.5"
          style={{ marginBottom: i < visibleDefs.length - 1 ? 8 : 0 }}
        >
          <span
            className="text-[0.7rem] font-semibold min-w-[16px] text-right"
            style={{ color: colors.muted }}
          >
            {i + 1}
          </span>
          <span
            className="text-[0.95rem] leading-normal"
            style={{ color: colors.foreground }}
          >
            {def}
          </span>
        </div>
      ))}
      {remaining > 0 && (
        <div
          className="text-[0.8rem] mt-2 pl-[26px]"
          style={{ color: colors.muted }}
        >
          +{remaining} more
        </div>
      )}
    </div>
  );
}


