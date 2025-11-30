// Definition filtering utilities - shared between main and renderer

/**
 * Check if a definition is a classifier entry (CL:...)
 */
export function isClassifierEntry(def: string): boolean {
  return def.startsWith('CL:');
}

/**
 * Check if a definition is a "variant of" entry
 */
export function isVariantEntry(def: string): boolean {
  return /^(old |archaic |Japanese )?variant of /i.test(def);
}

/**
 * Check if a definition is just a surname entry
 */
export function isSurnameEntry(def: string): boolean {
  return /^surname /i.test(def);
}

/**
 * Check if a definition is unhelpful for language learners
 */
export function isUnhelpfulEntry(def: string): boolean {
  return isClassifierEntry(def) || isVariantEntry(def) || isSurnameEntry(def);
}

/**
 * Filter definitions to prioritize helpful entries.
 * Falls back to unhelpful entries if nothing else is available.
 */
export function filterDefinitions(definitions: string | string[]): string[] {
  const defs = Array.isArray(definitions) ? definitions : definitions.split('; ');
  const cleaned = defs.map(d => d.trim()).filter(d => d.length > 0);
  const helpful = cleaned.filter(d => !isUnhelpfulEntry(d));
  // Fall back to non-classifier entries if all helpful ones filtered out
  return helpful.length > 0 ? helpful : cleaned.filter(d => !isClassifierEntry(d));
}

/**
 * Get the first helpful definition
 */
export function getFirstDefinition(definitions: string | string[]): string {
  return filterDefinitions(definitions)[0] || '';
}

/**
 * Extract inline classifier from definition like "song (CL:首shǒu)"
 */
export function extractInlineClassifier(def: string): { cleanDef: string; classifier: string | null } {
  const match = def.match(/\(CL:([^)]+)\)/);
  if (match) {
    return {
      cleanDef: def.replace(/\s*\(CL:[^)]+\)/, '').trim(),
      classifier: `CL:${match[1]}`,
    };
  }
  return { cleanDef: def, classifier: null };
}

/**
 * Check if definition contains an inline classifier
 */
export function hasInlineClassifier(def: string): boolean {
  return /\(CL:[^)]+\)/.test(def);
}

