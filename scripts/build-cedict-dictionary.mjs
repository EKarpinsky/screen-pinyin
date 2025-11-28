#!/usr/bin/env node

/**
 * Build CC-CEDICT Dictionary
 * 
 * Downloads CC-CEDICT from MDBG and processes it into a JSON dictionary
 * keyed by simplified Chinese form.
 * 
 * CC-CEDICT format:
 * Traditional Simplified [pinyin] /definition1/definition2/.../
 * 
 * Example:
 * 傳統 传统 [chuan2 tong3] /tradition/traditional/
 */

import https from 'https';
import fs from 'fs';
import zlib from 'zlib';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CEDICT_URL = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';
const TEMP_FILE = path.join(__dirname, 'cedict_temp.txt');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'cedict-dictionary.json');

/**
 * Download and extract the gzipped CEDICT file
 */
async function downloadCedict() {
  console.log('Downloading CC-CEDICT from MDBG...');
  
  return new Promise((resolve, reject) => {
    https.get(CEDICT_URL, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (redirectResponse) => {
          handleResponse(redirectResponse, resolve, reject);
        }).on('error', reject);
      } else {
        handleResponse(response, resolve, reject);
      }
    }).on('error', reject);
  });
}

function handleResponse(response, resolve, reject) {
  const gunzip = zlib.createGunzip();
  const fileStream = fs.createWriteStream(TEMP_FILE);
  
  response.pipe(gunzip).pipe(fileStream);
  
  fileStream.on('finish', () => {
    fileStream.close();
    console.log('Download and extraction complete.');
    resolve();
  });
  
  fileStream.on('error', reject);
  gunzip.on('error', reject);
}

/**
 * Convert numbered pinyin to tone marks
 * e.g., "zhong1" -> "zhōng"
 */
function convertPinyinToneMarks(pinyin) {
  const toneMarks = {
    'a': ['ā', 'á', 'ǎ', 'à', 'a'],
    'e': ['ē', 'é', 'ě', 'è', 'e'],
    'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
    'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
    'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
    'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
    'v': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'], // v is sometimes used for ü
  };
  
  // Process each syllable
  const syllables = pinyin.toLowerCase().split(' ');
  const converted = syllables.map(syllable => {
    const toneMatch = syllable.match(/(\d)$/);
    if (!toneMatch) return syllable;
    
    const tone = parseInt(toneMatch[1], 10);
    if (tone < 1 || tone > 5) return syllable;
    
    let base = syllable.slice(0, -1);
    
    // Replace 'v' with 'ü'
    base = base.replace(/v/g, 'ü');
    
    // Find the vowel to add the tone mark to
    // Priority: a, e, ou -> o, otherwise the last vowel
    let toneApplied = false;
    
    // Check for 'a' or 'e' first
    for (const vowel of ['a', 'e']) {
      if (base.includes(vowel)) {
        base = base.replace(vowel, toneMarks[vowel][tone - 1]);
        toneApplied = true;
        break;
      }
    }
    
    // Check for 'ou' -> tone on 'o'
    if (!toneApplied && base.includes('ou')) {
      base = base.replace('o', toneMarks['o'][tone - 1]);
      toneApplied = true;
    }
    
    // Otherwise, apply to the last vowel
    if (!toneApplied) {
      for (let i = base.length - 1; i >= 0; i--) {
        const char = base[i];
        if (toneMarks[char]) {
          base = base.slice(0, i) + toneMarks[char][tone - 1] + base.slice(i + 1);
          break;
        }
      }
    }
    
    return base;
  });
  
  return converted.join(' ');
}

/**
 * Parse the CEDICT file and build the dictionary
 */
async function parseCedict() {
  console.log('Parsing CC-CEDICT entries...');
  
  const dictionary = {};
  let lineCount = 0;
  let entryCount = 0;
  
  const fileStream = fs.createReadStream(TEMP_FILE, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  for await (const line of rl) {
    lineCount++;
    
    // Skip comments and empty lines
    if (line.startsWith('#') || !line.trim()) continue;
    
    // Parse entry: Traditional Simplified [pinyin] /def1/def2/.../
    // Regex: captures traditional, simplified, pinyin (in brackets), and definitions
    const match = line.match(/^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/$/);
    
    if (match) {
      const [, traditional, simplified, pinyinRaw, definitionsRaw] = match;
      
      // Convert pinyin from numbered to tone marks
      const pinyin = convertPinyinToneMarks(pinyinRaw);
      
      // Split definitions (they're separated by /)
      const definitions = definitionsRaw
        .split('/')
        .map(d => d.trim())
        .filter(d => d.length > 0);
      
      // Only add entries with multiple characters (words) or single characters
      // We key by simplified form
      if (!dictionary[simplified]) {
        dictionary[simplified] = {
          traditional,
          pinyin,
          definitions
        };
        entryCount++;
      } else {
        // If entry already exists, append definitions (some words have multiple entries)
        const existing = dictionary[simplified];
        // Only add unique definitions
        for (const def of definitions) {
          if (!existing.definitions.includes(def)) {
            existing.definitions.push(def);
          }
        }
        // If pinyin is different, add it (some characters have multiple pronunciations)
        if (existing.pinyin !== pinyin && !existing.pinyin.includes(pinyin)) {
          existing.pinyin = existing.pinyin + ', ' + pinyin;
        }
      }
    }
  }
  
  console.log(`Processed ${lineCount} lines, found ${entryCount} unique entries.`);
  return dictionary;
}

/**
 * Save the dictionary to JSON
 */
function saveDictionary(dictionary) {
  console.log('Saving dictionary to JSON...');
  
  // Ensure the data directory exists
  const dataDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Write the dictionary (minified for smaller file size)
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(dictionary));
  
  const stats = fs.statSync(OUTPUT_FILE);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`Dictionary saved to ${OUTPUT_FILE} (${sizeMB} MB)`);
}

/**
 * Cleanup temporary files
 */
function cleanup() {
  if (fs.existsSync(TEMP_FILE)) {
    fs.unlinkSync(TEMP_FILE);
    console.log('Cleaned up temporary files.');
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await downloadCedict();
    const dictionary = await parseCedict();
    saveDictionary(dictionary);
    cleanup();
    
    // Print some sample entries
    console.log('\nSample entries:');
    const samples = ['最终', '击杀', '你好', '中国', '学习'];
    for (const word of samples) {
      if (dictionary[word]) {
        console.log(`  ${word}: ${dictionary[word].pinyin} - ${dictionary[word].definitions.slice(0, 2).join('; ')}`);
      }
    }
    
    console.log('\n✅ CC-CEDICT dictionary build complete!');
  } catch (error) {
    console.error('Error building dictionary:', error);
    cleanup();
    process.exit(1);
  }
}

main();

