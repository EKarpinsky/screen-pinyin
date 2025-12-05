import { ArrowRight } from 'lucide-react';


import { cn } from '@utils';

interface TranslateActionProps {
  isSelected: boolean;
  isLongText: boolean;
  hasMultipleLines: boolean;
  animationDelay: number;
  onClick: () => void;
}

export function TranslateAction({
  isSelected,
  isLongText,
  hasMultipleLines,
  animationDelay,
  onClick,
}: TranslateActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left cursor-pointer bg-transparent",
        "py-5 px-7 transition-colors duration-150",
        "animate-[slideUp_0.3s_ease-out_backwards]",
        isSelected ? "bg-[var(--hover-bg)]" : "hover:bg-[var(--hover-bg)]"
      )}
      style={{ animationDelay: `${animationDelay}s`, border: 'none', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-[var(--primary)] text-[1.05rem] m-0">
            Translate this text
          </p>
          <p className="text-[0.8rem] text-[var(--muted-foreground)] m-0 mt-1">
            {isLongText || hasMultipleLines
              ? 'Full paragraph translation'
              : 'Get pinyin and English translation'}
          </p>
        </div>
        <ArrowRight size={20} className="text-[var(--primary)]" />
      </div>
    </button>
  );
}

