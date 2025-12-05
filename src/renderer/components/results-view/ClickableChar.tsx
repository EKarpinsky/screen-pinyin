import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react';
import React, { useState } from 'react';

import hanziDictionary from '../../../data/hanzi-dictionary.json';
import hskDictionary from '../../../data/hsk-dictionary.json';
import { isVariantEntry, isSurnameEntry } from '../../../shared/definition-utils';
import { convertNumberedPinyin } from '../../utils/pinyin';

import { cedictData } from './cedict';
import { colors } from './colors';
import type { CharacterData, HSKEntry } from './types';

// Data imports

const dictionary = hanziDictionary as Record<string, CharacterData>;
const hskData = hskDictionary as Record<string, HSKEntry>;

interface ClickableCharProps {
  char: string;
  onClick: () => void;
  size?: string;
  highlight?: boolean;
}

/**
 * Clickable character with tooltip showing pinyin/definition
 * Used in word detail panels and example sentences
 */
export function ClickableChar({
  char,
  onClick,
  size = '2.5rem',
  highlight = false,
}: ClickableCharProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const charData = dictionary[char];
  const isClickable = !!charData;

  const { refs, floatingStyles, context } = useFloating({
    open: showTooltip,
    onOpenChange: setShowTooltip,
    placement: 'top',
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, { move: false, delay: { open: 300, close: 100 } });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  // Non-clickable character - just render the text
  if (!isClickable) {
    return (
      <span
        className="font-['Microsoft_YaHei','PingFang_SC','Noto_Sans_SC',sans-serif]"
        style={{
          fontSize: size,
          color: highlight ? colors.primary : colors.foreground,
          fontWeight: highlight ? 600 : 400,
        }}
      >
        {char}
      </span>
    );
  }

  // Get definition - Priority: CC-CEDICT (filtered) → CC-CEDICT (any) → makemeahanzi fallback
  const allDefs = cedictData[char]?.definitions || [];
  const filteredDef = allDefs.find((d: string) => 
    !d.startsWith('CL:') && !isVariantEntry(d) && !isSurnameEntry(d)
  );
  const cedictDef = filteredDef || allDefs.find((d: string) => !d.startsWith('CL:'));
  const definition = convertNumberedPinyin(cedictDef || charData?.definition || '—');
  const pinyin = charData?.pinyin?.length > 0 ? charData.pinyin.join(', ') : '—';
  const hskLevel = hskData[char]?.level;

  return (
    <>
      <button
        type="button"
        ref={refs.setReference}
        {...getReferenceProps()}
        onClick={onClick}
        className="font-['Microsoft_YaHei','PingFang_SC','Noto_Sans_SC',sans-serif] cursor-pointer transition-colors duration-150 inline-block hover:text-[var(--primary)] bg-transparent border-none p-0 m-0"
        style={{
          fontSize: size,
          color: highlight ? colors.primary : colors.foreground,
          fontWeight: highlight ? 600 : 400,
        }}
      >
        {char}
      </button>

      <FloatingPortal>
        {showTooltip && (
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-[1000] bg-black/90 text-white px-3.5 py-2.5 rounded-md text-[0.8rem] max-w-[250px] shadow-lg flex flex-col gap-1.5 pointer-events-none"
            {...getFloatingProps()}
          >
            <div className="font-mono text-[0.85rem] text-white/70 mb-1">
              {pinyin}
            </div>
            <div className="text-sm leading-relaxed text-white">
              {definition.length > 60 ? definition.slice(0, 60) + '...' : definition}
            </div>
            {hskLevel && (
              <span className="inline-flex items-center px-2 py-0.5 bg-white/15 rounded text-[0.7rem] font-semibold tracking-wide text-white mt-1.5 self-start">
                HSK {hskLevel}
              </span>
            )}
          </div>
        )}
      </FloatingPortal>
    </>
  );
}


