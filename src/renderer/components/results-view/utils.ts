// Utility functions for results-view components

import { convertNumberedPinyin } from '../../utils/pinyin';
import { isVariantEntry, extractInlineClassifier } from '../../../shared/definition-utils';
import type { POS } from './types';
import { colors } from './colors';

/**
 * Check if a character is Chinese (CJK Unified Ideographs)
 */
export function isChineseChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF) ||   // CJK Unified Ideographs
         (code >= 0x3400 && code <= 0x4DBF) ||   // CJK Unified Ideographs Extension A
         (code >= 0x2E80 && code <= 0x2EFF) ||   // CJK Radicals Supplement
         (code >= 0x2F00 && code <= 0x2FDF);     // Kangxi Radicals
}

/**
 * Check if string contains only Chinese characters (and whitespace)
 */
export function isAllChinese(str: string): boolean {
  return str.split('').every(char => isChineseChar(char) || /\s/.test(char));
}

/**
 * Clean up definition text (convert numbered pinyin, strip inline CL)
 */
export function cleanDefinition(def: string): string {
  const { cleanDef } = extractInlineClassifier(def);
  return convertNumberedPinyin(cleanDef);
}

/**
 * Parse classifier string like "CL:張|张[zhang1],套[tao4],幅[fu2]" into structured data
 */
export function parseClassifiers(classifierString: string): Array<{ character: string; pinyin: string }> {
  if (!classifierString || !classifierString.startsWith('CL:')) return [];
  
  const content = classifierString.replace('CL:', '');
  const items = content.split(',');
  
  return items.map(item => {
    // Match patterns like "張|张[zhang1]" or just "张[zhang1]" or "张zhāng"
    const bracketMatch = item.match(/(?:[^\|]+\|)?([^\[]+)\[([^\]]+)\]/);
    if (bracketMatch) {
      const [, char, pinyinNum] = bracketMatch;
      const pinyin = convertNumberedPinyin(`[${pinyinNum}]`);
      return { character: char.trim(), pinyin };
    }
    
    // Match pattern without brackets: "张zhāng"
    const directMatch = item.match(/(?:[^\|]+\|)?([^\s]+?)([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+\d?)/i);
    if (directMatch) {
      const [, char, pinyin] = directMatch;
      return { character: char.trim(), pinyin: pinyin.trim() };
    }
    
    return null;
  }).filter((item): item is { character: string; pinyin: string } => item !== null);
}

/**
 * Parse "variant of 兔[tu4]" or "variant of 兔tù" into structured data
 */
export function parseVariant(variantString: string): { character: string; pinyin: string; type: string } | null {
  if (!isVariantEntry(variantString)) return null;
  
  // Extract the type (e.g., "old variant", "archaic variant", or just "variant")
  const typeMatch = variantString.match(/^(old |archaic |Japanese |)?variant of /i);
  const type = typeMatch ? (typeMatch[1]?.trim() || '') + 'variant' : 'variant';
  
  // Extract character and pinyin from patterns like "兔[tu4]" or "兔tù" or "電|电[dian4]"
  const content = variantString.replace(/^(old |archaic |Japanese |)?variant of /i, '').trim();
  
  // Match pattern with brackets: "電|电[dian4]" or "兔[tu4]"
  const bracketMatch = content.match(/(?:([^\|]+)\|)?([^\[]+)\[([^\]]+)\]/);
  if (bracketMatch) {
    const [, , char, pinyinNum] = bracketMatch;
    const pinyin = convertNumberedPinyin(`[${pinyinNum}]`);
    return { character: char.trim(), pinyin, type };
  }
  
  // Match pattern without brackets: "兔tù" 
  const directMatch = content.match(/([^\s]+?)([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+\d?)/i);
  if (directMatch) {
    const [, char, pinyin] = directMatch;
    return { character: char.trim(), pinyin: pinyin.trim(), type };
  }
  
  // Just a character with no pinyin
  const charOnly = content.match(/^([^\s,;]+)/);
  if (charOnly) {
    return { character: charOnly[1].trim(), pinyin: '', type };
  }
  
  return null;
}

/**
 * Map jieba POS tag to our POS type
 * Common jieba tags: n=noun, v=verb, a=adjective, d=adverb, p=preposition, x=unknown
 * See: https://github.com/fxsjy/jieba (ICTCLAS tagset)
 */
export function mapJiebaTagToPOS(tag: string): POS {
  const firstChar = tag.charAt(0).toLowerCase();
  switch (firstChar) {
    case 'n':  // n, nr, ns, nt, nz, etc. (nouns)
      return 'noun';
    case 'v':  // v, vd, vn, etc. (verbs)
      return 'verb';
    case 'a':  // a, ad, an, etc. (adjectives)
      return 'adjective';
    case 'd':  // d (adverbs)
      return 'adverb';
    default:
      return 'unknown';
  }
}

/**
 * Get color for POS
 */
export function getPOSColor(pos: POS): { rest: string; hover: string } {
  switch (pos) {
    case 'verb':
      return { rest: colors.verb, hover: colors.verbHover };
    case 'noun':
      return { rest: colors.noun, hover: colors.nounHover };
    case 'adjective':
      return { rest: colors.adjective, hover: colors.adjectiveHover };
    case 'adverb':
      return { rest: colors.adverb, hover: colors.adverbHover };
    default:
      return { rest: 'var(--foreground)', hover: 'var(--hover-bg)' };
  }
}

