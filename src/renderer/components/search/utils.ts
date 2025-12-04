/**
 * Search-specific utility functions
 */

import { convertNumberedPinyin } from '../../utils/pinyin';
import { isClassifierEntry, isVariantEntry, isSurnameEntry } from '../../../shared/definition-utils';
import type { SQLiteDictionaryEntry, DictionaryEntry } from './types';

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
    .map(d => d.replace(/\s*\(CL:[^)]+\)/g, '').trim())
    .map(d => convertNumberedPinyin(d))
    .filter(d => d.length > 0);

  const isUnhelpful = (d: string) => isVariantEntry(d) || isSurnameEntry(d);
  const meaningDefs = cleanDefs.filter(d => !isUnhelpful(d));
  const unhelpfulDefs = cleanDefs.filter(d => isUnhelpful(d));
  const sortedDefs = meaningDefs.length > 0 ? [...meaningDefs, ...unhelpfulDefs] : unhelpfulDefs;

  return {
    character: entry.simplified,
    pinyin: pinyinArray,
    definition: sortedDefs[0] || '',
  };
}
