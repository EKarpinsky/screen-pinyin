/**
 * Convert numbered pinyin like [quan3] to tone marks like quǎn
 */
export function convertNumberedPinyin(text: string): string {
  const toneMarks: Record<string, string[]> = {
    'a': ['ā', 'á', 'ǎ', 'à', 'a'],
    'e': ['ē', 'é', 'ě', 'è', 'e'],
    'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
    'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
    'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
    'v': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
  };

  // Match patterns like [pinyin1] or [pin1 yin2]
  return text.replace(/\[([^\]]+)\]/g, (match, pinyin) => {
    const syllables = pinyin.toLowerCase().split(' ');
    const converted = syllables.map((syllable: string) => {
      const toneMatch = syllable.match(/([a-zü]+)(\d)$/);
      if (!toneMatch) return syllable;
      
      let [, base, toneStr] = toneMatch;
      const tone = parseInt(toneStr, 10);
      if (tone < 1 || tone > 5) return syllable;
      
      // Find vowel to add tone mark
      for (const vowel of ['a', 'e']) {
        if (base.includes(vowel)) {
          return base.replace(vowel, toneMarks[vowel][tone - 1]);
        }
      }
      if (base.includes('ou')) {
        return base.replace('o', toneMarks['o'][tone - 1]);
      }
      // Last vowel
      for (let i = base.length - 1; i >= 0; i--) {
        const char = base[i];
        if (toneMarks[char]) {
          return base.slice(0, i) + toneMarks[char][tone - 1] + base.slice(i + 1);
        }
      }
      return base;
    });
    return converted.join(' ');
  });
}

