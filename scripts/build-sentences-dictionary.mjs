import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Chinese Example Sentences from krmanik/Chinese-Example-Sentences
const TSV_URL = 'https://raw.githubusercontent.com/krmanik/Chinese-Example-Sentences/main/Chinese%20Example%20Sentences/cmn_sen_db_2.tsv';
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'sentences-dictionary.json');
const MAX_SENTENCES_PER_CHAR = 5; // Store up to 5, display 2

function download(url) {
  return new Promise((resolve, reject) => {
    console.log('Downloading from:', url);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Follow redirect
        return download(res.headers.location).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => {
        data += chunk;
        // Progress indicator
        if (data.length % 1000000 < chunk.length) {
          console.log(`  Downloaded ${(data.length / 1024 / 1024).toFixed(1)} MB...`);
        }
      });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function isChineseChar(char) {
  const code = char.charCodeAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF) ||  // CJK Unified Ideographs
         (code >= 0x3400 && code <= 0x4DBF) ||  // CJK Extension A
         (code >= 0x2E80 && code <= 0x2EFF) ||  // CJK Radicals Supplement
         (code >= 0x2F00 && code <= 0x2FDF);    // Kangxi Radicals
}

function parseTSV(rawData) {
  const lines = rawData.trim().split('\n');
  const sentences = [];
  
  console.log(`Parsing ${lines.length} lines...`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Format: id\tsimplified\ttraditional\tpinyin\tenglish
    const parts = line.split('\t');
    if (parts.length >= 5) {
      const simplified = parts[1]?.trim();
      const pinyin = parts[3]?.trim();
      const english = parts[4]?.trim();
      
      if (simplified && pinyin && english) {
        sentences.push({
          s: simplified,
          p: pinyin,
          e: english,
          len: simplified.length
        });
      }
    }
  }
  
  if (sentences.length === 0) {
    throw new Error('No valid example sentences in the downloaded data');
  }

  console.log(`Parsed ${sentences.length} valid sentences`);
  return sentences;
}

function indexByCharacter(sentences) {
  const index = {};
  
  console.log('Indexing sentences by character...');
  
  for (const sentence of sentences) {
    // Get unique Chinese characters in this sentence
    const chars = new Set();
    for (const char of sentence.s) {
      if (isChineseChar(char)) {
        chars.add(char);
      }
    }
    
    // Add this sentence to each character's list
    for (const char of chars) {
      if (!index[char]) {
        index[char] = [];
      }
      
      // Only keep up to MAX_SENTENCES_PER_CHAR per character
      if (index[char].length < MAX_SENTENCES_PER_CHAR) {
        index[char].push({
          s: sentence.s,
          p: sentence.p,
          e: sentence.e,
          len: sentence.len
        });
      }
    }
  }
  
  // Sort sentences by length (shorter first) and remove len field
  for (const char in index) {
    index[char].sort((a, b) => a.len - b.len);
    index[char] = index[char].map(({ s, p, e }) => ({ s, p, e }));
  }
  
  return index;
}

async function main() {
  console.log('=== Building Sentences Dictionary ===\n');
  
  // Download TSV
  console.log('Step 1: Downloading sentence data...');
  const rawData = await download(TSV_URL);
  console.log(`Downloaded ${(rawData.length / 1024 / 1024).toFixed(2)} MB\n`);
  
  // Parse TSV
  console.log('Step 2: Parsing TSV data...');
  const sentences = parseTSV(rawData);
  console.log();
  
  // Sort by length (prefer shorter sentences for examples)
  sentences.sort((a, b) => a.len - b.len);
  
  // Index by character
  console.log('Step 3: Indexing by character...');
  const index = indexByCharacter(sentences);
  const charCount = Object.keys(index).length;
  console.log(`Indexed ${charCount} unique characters\n`);
  
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write JSON file (compact format to reduce size)
  console.log('Step 4: Writing JSON file...');
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index));
  
  const stats = fs.statSync(OUTPUT_PATH);
  console.log(`Saved to ${OUTPUT_PATH}`);
  console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  
  // Stats
  console.log('\n=== Summary ===');
  console.log(`Total sentences processed: ${sentences.length}`);
  console.log(`Unique characters indexed: ${charCount}`);
  console.log(`Max sentences per character: ${MAX_SENTENCES_PER_CHAR}`);
  
  // Sample output
  console.log('\n=== Sample entries ===');
  const sampleChars = ['爱', '你', '好', '学', '中'];
  for (const char of sampleChars) {
    if (index[char]) {
      console.log(`\n${char}:`);
      for (let i = 0; i < Math.min(2, index[char].length); i++) {
        const sent = index[char][i];
        console.log(`  "${sent.s}"`);
        console.log(`   ${sent.p}`);
        console.log(`   ${sent.e}`);
      }
    }
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

