// Script to download and process HSK 3.0 vocabulary from elkmovie/hsk30
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHARLIST_URL = 'https://raw.githubusercontent.com/elkmovie/hsk30/main/charlist.txt';
const WORDLIST_URL = 'https://raw.githubusercontent.com/elkmovie/hsk30/main/wordlist.txt';
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'hsk-dictionary.json');

// Map Chinese numerals to Arabic numerals
const levelMap = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9
};

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseHSKFile(content, type) {
  const entries = {};
  let currentLevel = 0;
  
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Check for level header (e.g., "一级汉字表" or "一级词汇表")
    const levelMatch = trimmed.match(/^([一二三四五六七八九])级/);
    if (levelMatch) {
      currentLevel = levelMap[levelMatch[1]];
      continue;
    }
    
    // Parse numbered entry (e.g., "1	爱" or "1	爱好")
    const entryMatch = trimmed.match(/^\d+\t(.+)$/);
    if (entryMatch && currentLevel > 0) {
      const item = entryMatch[1].trim();
      // Only add if not already present (keep lower level)
      if (!entries[item]) {
        entries[item] = { level: currentLevel, type };
      }
    }
  }
  
  return entries;
}

async function main() {
  console.log('Downloading HSK 3.0 character list...');
  const charData = await download(CHARLIST_URL);
  
  console.log('Downloading HSK 3.0 word list...');
  const wordData = await download(WORDLIST_URL);
  
  console.log('Processing character list...');
  const characters = parseHSKFile(charData, 'character');
  console.log(`  Found ${Object.keys(characters).length} characters`);
  
  console.log('Processing word list...');
  const words = parseHSKFile(wordData, 'word');
  console.log(`  Found ${Object.keys(words).length} words`);
  
  // Merge dictionaries (characters first, words added if not present)
  const dictionary = { ...characters };
  for (const [key, value] of Object.entries(words)) {
    if (!dictionary[key]) {
      dictionary[key] = value;
    }
  }
  
  const totalCount = Object.keys(dictionary).length;
  console.log(`Total unique entries: ${totalCount}`);
  
  // Show some stats by level
  const levelStats = {};
  for (const entry of Object.values(dictionary)) {
    levelStats[entry.level] = (levelStats[entry.level] || 0) + 1;
  }
  console.log('Entries by HSK level:');
  for (let i = 1; i <= 9; i++) {
    if (levelStats[i]) {
      console.log(`  HSK ${i}: ${levelStats[i]}`);
    }
  }
  
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write JSON file (compact format)
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(dictionary));
  
  const stats = fs.statSync(OUTPUT_PATH);
  console.log(`\nSaved to ${OUTPUT_PATH} (${(stats.size / 1024).toFixed(2)} KB)`);
}

main().catch(console.error);

