import { Search } from 'lucide-react';


export function SearchEmptyState() {
  return (
    <div className="flex h-full items-center justify-center p-8 animate-[fadeIn_0.4s_ease-out]">
      <div className="text-center">
        <Search
          size={48}
          className="mx-auto mb-4 text-[var(--muted-foreground)]"
        />
        <p className="text-[var(--muted-foreground)] text-[0.95rem] leading-relaxed">
          Search dictionary entries
          <br />
          or paste Chinese text to translate.
        </p>
      </div>
    </div>
  );
}

