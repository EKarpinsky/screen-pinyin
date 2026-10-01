import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

function readDictionary(name: string) {
  return JSON.parse(readFileSync(`src/data/${name}`, 'utf8'))
}

describe('generated renderer dictionaries', () => {
  it('includes Chinese words with tone-marked pinyin and English definitions', () => {
    const dictionary = readDictionary('cedict-dictionary.json')

    expect(Object.keys(dictionary).length).toBeGreaterThan(100_000)
    expect(dictionary['你好'].pinyin).toBe('nǐ hǎo')
    expect(dictionary['你好'].definitions.join('; ')).toMatch(/hello/i)
  })

  it('includes usable example sentences indexed by Chinese character', () => {
    const sentences = readDictionary('sentences-dictionary.json')

    expect(Object.keys(sentences).length).toBeGreaterThan(1000)
    expect(sentences['你'].length).toBeGreaterThan(0)
    for (const sentence of sentences['你']) {
      expect(sentence.s).toContain('你')
      expect(sentence.p.trim().length).toBeGreaterThan(0)
      expect(sentence.e.trim().length).toBeGreaterThan(0)
    }
  })
})
