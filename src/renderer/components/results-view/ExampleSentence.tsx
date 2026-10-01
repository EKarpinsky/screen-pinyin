
import { ClickableChar } from './ClickableChar';
import { colors } from './colors';
import type { SentenceEntry } from './types';
import { isChineseChar } from './utils';

interface ExampleSentenceProps {
  sentence: SentenceEntry;
  highlightWord?: string;
  currentIndex: number;
  totalCount: number;
  onCharacterClick: (char: string) => void;
  onIndexChange: (index: number) => void;
}

/**
 * Pull-quote style example sentence with clickable characters
 */
export function ExampleSentence({
  sentence,
  highlightWord,
  currentIndex,
  totalCount,
  onCharacterClick,
  onIndexChange,
}: ExampleSentenceProps) {
  const wordStart = highlightWord ? sentence.s.indexOf(highlightWord) : -1;

  return (
    <div className="animate-[slideUp_0.3s_0.2s_ease-out_backwards] mt-2 pt-5 border-t border-[var(--border)]">
      {/* Decorative opening quote */}
      <div
        className="font-serif text-[4rem] leading-none opacity-15 -mb-6 -ml-2"
        style={{ color: colors.primary }}
      >
        "
      </div>

      {/* Chinese sentence - centered, clickable, highlight the word */}
      <div className="font-['Microsoft_YaHei','PingFang_SC','Noto_Sans_SC',sans-serif] text-[1.4rem] leading-[1.8] text-center mb-4 tracking-wide text-[var(--foreground)]">
        {[...sentence.s].map((char, charIndex) => {
          const isPartOfWord = Boolean(highlightWord && wordStart !== -1 &&
            charIndex >= wordStart &&
            charIndex < wordStart + highlightWord.length);
          const isChinese = isChineseChar(char);

          if (!isChinese) {
            return <span key={charIndex}>{char}</span>;
          }

          return (
            <ClickableChar
              key={charIndex}
              char={char}
              onClick={() => onCharacterClick(char)}
              size="1.4rem"
              highlight={isPartOfWord}
            />
          );
        })}
      </div>

      {/* Pinyin - subtle, centered */}
      <div className="font-mono text-[0.85rem] text-center text-[var(--muted-foreground)] mb-4 opacity-60 tracking-wide">
        {sentence.p}
      </div>

      {/* English translation */}
      <div className="text-[0.9rem] text-center text-[var(--foreground)] opacity-60 italic max-w-[90%] mx-auto leading-relaxed">
        {sentence.e}
      </div>

      {/* Pagination dots + next arrow (if multiple examples) */}
      {totalCount > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          {/* Pagination dots */}
          <div className="flex gap-1.5 items-center">
            {Array.from({ length: totalCount }).map((_, index) => (
              <button
                key={index}
                onClick={() => onIndexChange(index)}
                className="border-none cursor-pointer transition-all duration-300 rounded-sm"
                style={{
                  width: index === currentIndex ? '1rem' : '0.375rem',
                  height: '0.375rem',
                  background: index === currentIndex ? colors.primary : colors.muted,
                  opacity: index === currentIndex ? 1 : 0.3,
                }}
              />
            ))}
          </div>

          {/* Next arrow */}
          <button
            onClick={() => onIndexChange((currentIndex + 1) % totalCount)}
            className="text-base text-[var(--muted-foreground)] bg-transparent border-none p-1 cursor-pointer transition-colors duration-200 leading-none hover:text-[var(--primary)]"
          >
            →
          </button>
        </div>
      )}

      {/* Subtle hint */}
      <div className="text-[0.6875rem] text-center text-[var(--muted-foreground)] mt-5 opacity-50 tracking-wide">
        Click any character to explore it
      </div>
    </div>
  );
}
