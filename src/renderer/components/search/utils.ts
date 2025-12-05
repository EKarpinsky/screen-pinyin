/**
 * Search-specific utility functions
 */

import { isClassifierEntry, isVariantEntry, isSurnameEntry } from '../../../shared/definition-utils';
import { convertNumberedPinyin } from '../../utils/pinyin';

import type { SQLiteDictionaryEntry, DictionaryEntry } from './types';

function isUnhelpfulDefinition(d: string): boolean {
  return isVariantEntry(d) || isSurnameEntry(d);
}

/**
 * Transform a SQLite dictionary entry to the internal DictionaryEntry format.
 * Cleans up definitions by removing classifiers, converting pinyin notation,
 * and prioritizing meaningful definitions over variants/surnames.
 */
export function transformSqliteEntry(entry: SQLiteDictionaryEntry): DictionaryEntry {
  const pinyinArray = entry.pinyin ? entry.pinyin.split(', ').filter(p => p.trim()) : [];
  const definitions = entry.definitions ? entry.definitions.split('; ') : [];

  const cleanDefs = definitions
    .filter(d => !isClassifierEntry(d))
    .map(d => d.replaceAll(/\s*\(CL:[^)]+\)/g, '').trim())
    .map(d => convertNumberedPinyin(d))
    .filter(d => d.length > 0);

  const meaningDefs = cleanDefs.filter(d => !isUnhelpfulDefinition(d));
  const unhelpfulDefs = cleanDefs.filter(d => isUnhelpfulDefinition(d));
  const sortedDefs = meaningDefs.length > 0 ? [...meaningDefs, ...unhelpfulDefs] : unhelpfulDefs;

  return {
    character: entry.simplified,
    pinyin: pinyinArray,
    definition: sortedDefs[0] || '',
  };
}
