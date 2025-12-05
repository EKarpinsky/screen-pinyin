import type { ReactNode } from 'react';

interface SectionLabelProps {
  children: ReactNode;
  hint?: string;
}

/**
 * Reusable section label with optional hint text
 */
export function SectionLabel({ children, hint }: SectionLabelProps) {
  return (
    <div className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)] mb-2">
      {children}
      {hint && (
        <span className="ml-2 font-normal text-[0.6rem] opacity-70">
          {hint}
        </span>
      )}
    </div>
  );
}


