import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react';
import { useState } from 'react';

import hanziDictionary from '../../../data/hanzi-dictionary.json';
import hskDictionary from '../../../data/hsk-dictionary.json';
import { isVariantEntry, isSurnameEntry } from '../../../shared/definition-utils';
import { convertNumberedPinyin } from '../../utils/pinyin';

import { cedictData } from './cedict';
import { colors } from './colors';
import type { CharacterData, HSKEntry } from './types';
import { isAllChinese, mapJiebaTagToPOS, getPOSColor } from './utils';

// Data imports

const dictionary = hanziDictionary as Record<string, CharacterData>;
const hskData = hskDictionary as Record<string, HSKEntry>;

interface ClickableWordProps {
  word: string;
  tag: string;  // POS tag from nodejieba: n=noun, v=verb, a=adj, d=adverb, etc.
  onClick: () => void;
  size?: string;
}

/**
 * Clickable word component with POS coloring and tooltip
 * Visual grouping for multi-character words
 */
export function ClickableWord({
  word,
  tag,
  onClick,
  size = '3.5rem',
}: ClickableWordProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Floating UI setup - must be called before any early returns
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top',
    middleware: [
      offset(8),
      flip({ fallbackAxisSideDirection: 'start', padding: 8 }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, { move: false, delay: { open: 200, close: 0 } });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss]);

  // Guard against undefined/empty word
  if (!word) {
    return null;
  }
  
  // Check if word has definition in CEDICT or character dictionary
  const wordData = cedictData[word];
  const charData = word.length === 1 ? dictionary[word] : undefined;
  const hasWordDef = wordData !== undefined;
  const hasCharDef = charData !== undefined;
  const isClickable = hasWordDef || hasCharDef;
  const isChinese = isAllChinese(word) && word.trim() !== '';
  
  // Get HSK level
  const hskEntry = hskData[word];
  const hskLevel = hskEntry?.level;
  
  // Get definition text
  let definition = '';
  let pinyin = '';
  if (wordData) {
    const allDefs = wordData.definitions || [];
    const filteredDefs = allDefs.filter((d: string) => 
      !d.startsWith('CL:') && !isVariantEntry(d) && !isSurnameEntry(d)
    );
    const defsToShow = filteredDefs.length > 0 ? filteredDefs : allDefs.filter((d: string) => !d.startsWith('CL:'));
    definition = convertNumberedPinyin(defsToShow.slice(0, 2).join('; '));
    pinyin = convertNumberedPinyin(wordData.pinyin);
  } else if (charData) {
    const allDefs = cedictData[word]?.definitions || [];
    const filteredDef = allDefs.find((d: string) => 
      !d.startsWith('CL:') && !isVariantEntry(d) && !isSurnameEntry(d)
    );
    const cedictDef = filteredDef || allDefs.find((d: string) => !d.startsWith('CL:'));
    definition = convertNumberedPinyin(cedictDef || charData.definition || '');
    pinyin = charData.pinyin?.join(', ') || '';
  }
  
  const hasTooltipContent = definition || pinyin || hskLevel;

  // For punctuation and non-Chinese, just render as-is
  if (!isChinese) {
    return (
      <span
        className="font-['Microsoft_YaHei','PingFang_SC','Noto_Sans_SC',sans-serif]"
        style={{ fontSize: size, color: colors.foreground }}
      >
        {word}
      </span>
    );
  }

  // Map jieba tag to POS type
  const posFromTag = mapJiebaTagToPOS(tag);
  const posColor = getPOSColor(posFromTag);

  return (
    <>
      <button
        type="button"
        ref={refs.setReference}
        {...getReferenceProps()}
        onClick={isClickable ? onClick : undefined}
        className="inline-block font-['Microsoft_YaHei','PingFang_SC','Noto_Sans_SC',sans-serif] px-1 -mx-1 rounded transition-all duration-150 border-none bg-transparent"
        style={{
          fontSize: size,
          color: isOpen ? colors.primary : posColor.rest,
          cursor: isClickable ? 'pointer' : 'default',
          backgroundColor: isOpen ? posColor.hover : 'transparent',
          transform: isOpen ? 'translateY(-1px)' : 'none',
        }}
      >
        {word}
      </button>
      
      {/* Tooltip via FloatingPortal */}
      <FloatingPortal>
        {isOpen && hasTooltipContent && (
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-[9999] bg-[var(--foreground)] text-[var(--card)] px-3 py-2 rounded-md text-[0.75rem] font-sans max-w-[280px] shadow-lg animate-[fadeIn_0.15s_ease-out]"
            {...getFloatingProps()}
          >
            {/* Pinyin */}
            {pinyin && (
              <div className="font-mono opacity-80" style={{ marginBottom: definition ? 4 : 0 }}>
                {pinyin}
              </div>
            )}
            
            {/* Definition */}
            {definition && (
              <div className="leading-relaxed">
                {definition.length > 80 ? definition.slice(0, 80) + '...' : definition}
              </div>
            )}
            
            {/* HSK Level */}
            {hskLevel && (
              <div className="mt-1.5 inline-block px-1.5 py-0.5 bg-white/15 rounded text-[0.65rem] font-semibold tracking-wide">
                HSK {hskLevel}
              </div>
            )}
          </div>
        )}
      </FloatingPortal>
    </>
  );
}
