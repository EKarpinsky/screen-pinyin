import { ArrowRight } from 'lucide-react';


import { cn } from '@utils';

interface SearchNoResultsProps {
  onTranslate: () => void;
}

export function SearchNoResults({ onTranslate }: SearchNoResultsProps) {
  return (
    <div className="flex h-full items-center justify-center p-8 animate-[fadeIn_0.4s_ease-out]">
      <div className="text-center">
        <p className="text-[var(--muted-foreground)] text-[0.95rem] leading-relaxed mb-5">
          No dictionary matches found.
        </p>
        <button
          onClick={onTranslate}
          className={cn(
            "inline-flex items-center gap-2",
            "border-0 border-b-2 border-[var(--primary)]",
            "pb-1 text-[1.1rem] font-medium",
            "text-[var(--primary)] bg-transparent",
            "cursor-pointer transition-opacity duration-200",
            "hover:opacity-70"
          )}
        >
          Translate this text
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}

