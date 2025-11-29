#!/usr/bin/env node

/**
 * Build SQLite Dictionary with FTS5
 * 
 * Downloads CC-CEDICT from krmanik/cedict-json and creates a SQLite database
 * with FTS5 full-text search for fast dictionary lookups.
 */

import Database from 'better-sqlite3';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CEDICT_URL = 'https://raw.githubusercontent.com/krmanik/cedict-json/master/all_cedict.json';
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'dictionary.db');

/**
 * Download JSON data from URL
 */
function downloadJSON(url) {
  return new Promise((resolve, reject) => {
    console.log('Downloading CC-CEDICT from krmanik/cedict-json...');
    
    const request = (urlString) => {
      https.get(urlString, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Follow redirect
          request(response.headers.location);
          return;
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        
        let data = '';
        response.setEncoding('utf8');
        
        response.on('data', chunk => {
          data += chunk;
          // Progress indicator
          process.stdout.write(`\rDownloaded ${(data.length / 1024 / 1024).toFixed(1)} MB`);
        });
        
        response.on('end', () => {
          console.log('\nDownload complete!');
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse JSON: ' + e.message));
          }
        });
        
        response.on('error', reject);
      }).on('error', reject);
    };
    
    request(url);
  });
}

/**
 * Convert numbered pinyin to tone marks
 * e.g., "jiang3" -> "jiǎng"
 */
function convertPinyinToneMarks(pinyin) {
  if (!pinyin) return '';
  
  const toneMarks = {
    'a': ['ā', 'á', 'ǎ', 'à', 'a'],
    'e': ['ē', 'é', 'ě', 'è', 'e'],
    'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
    'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
    'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
    'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
    'v': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
  };
  
  // Process each syllable
  const syllables = pinyin.toLowerCase().split(' ');
  const converted = syllables.map(syllable => {
    const toneMatch = syllable.match(/(\d)$/);
    if (!toneMatch) return syllable;
    
    const tone = parseInt(toneMatch[1], 10);
    if (tone < 1 || tone > 5) return syllable;
    
    let base = syllable.slice(0, -1);
    base = base.replace(/v/g, 'ü');
    
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
 * Build the SQLite database with FTS5
 */
async function buildDatabase() {
  try {
    // Download the JSON data
    const data = await downloadJSON(CEDICT_URL);
    
    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Remove existing database
    if (fs.existsSync(OUTPUT_PATH)) {
      fs.unlinkSync(OUTPUT_PATH);
      console.log('Removed existing database');
    }
    
    // Create database
    console.log('Creating SQLite database...');
    const db = new Database(OUTPUT_PATH);
    
    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');
    
    // Create FTS5 virtual table
    console.log('Creating FTS5 virtual table...');
    db.exec(`
      CREATE VIRTUAL TABLE dict_fts USING fts5(
        simplified,
        traditional,
        pinyin,
        definitions,
        tokenize='unicode61'
      );
    `);
    
    // Prepare insert statement
    const insert = db.prepare(`
      INSERT INTO dict_fts (simplified, traditional, pinyin, definitions)
      VALUES (?, ?, ?, ?)
    `);
    
    // Count entries
    const entries = Object.entries(data);
    console.log(`Processing ${entries.length} entries...`);
    
    // Insert all entries in a transaction
    let processed = 0;
    const insertMany = db.transaction((entries) => {
      for (const [simplified, entry] of entries) {
        // Get pinyin (convert numbered to tone marks)
        const pinyinArray = entry.pinyin || [];
        const pinyin = pinyinArray
          .map(p => convertPinyinToneMarks(p))
          .join(', ');
        
        // Get definitions (join all from the object)
        const definitions = entry.definitions 
          ? Object.values(entry.definitions).join('; ')
          : '';
        
        // Get traditional (may be same as simplified)
        const traditional = entry.traditional || simplified;
        
        insert.run(simplified, traditional, pinyin, definitions);
        
        processed++;
        if (processed % 10000 === 0) {
          process.stdout.write(`\rProcessed ${processed}/${entries.length} entries`);
        }
      }
    });
    
    insertMany(entries);
    console.log(`\nInserted ${processed} entries`);
    
    // Optimize the FTS index
    console.log('Optimizing FTS5 index...');
    db.exec('INSERT INTO dict_fts(dict_fts) VALUES(\'optimize\')');
    
    // Close database
    db.close();
    
    // Report file size
    const stats = fs.statSync(OUTPUT_PATH);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n✅ Dictionary database built successfully!`);
    console.log(`   Location: ${OUTPUT_PATH}`);
    console.log(`   Size: ${sizeMB} MB`);
    console.log(`   Entries: ${processed}`);
    
    // Test the database
    console.log('\nTesting database...');
    const testDb = new Database(OUTPUT_PATH, { readonly: true });
    
    const testQueries = [
      { query: '你好', desc: 'Chinese character search' },
      { query: 'hello', desc: 'English definition search' },
      { query: 'ni3', desc: 'Pinyin search (numbered)' },
      { query: 'jiǎng', desc: 'Pinyin search (tone marks)' },
    ];
    
    for (const { query, desc } of testQueries) {
      const start = performance.now();
      const stmt = testDb.prepare(`
        SELECT simplified, pinyin, definitions 
        FROM dict_fts 
        WHERE dict_fts MATCH ?
        LIMIT 5
      `);
      const results = stmt.all(query + '*');
      const elapsed = (performance.now() - start).toFixed(2);
      console.log(`\n${desc} ("${query}"):`);
      console.log(`   Found ${results.length} results in ${elapsed}ms`);
      if (results.length > 0) {
        console.log(`   First: ${results[0].simplified} (${results[0].pinyin})`);
      }
    }
    
    testDb.close();
    
  } catch (error) {
    console.error('Error building database:', error);
    process.exit(1);
  }
}

// Run the build
buildDatabase();

