// Script to download and process makemeahanzi dictionary
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DICTIONARY_URL = 'https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt';
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'hanzi-dictionary.json');

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

async function main() {
  console.log('Downloading makemeahanzi dictionary...');
  const rawData = await download(DICTIONARY_URL);
  
  console.log('Processing dictionary...');
  const lines = rawData.trim().split('\n');
  const dictionary = {};
  
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.character) {
        dictionary[entry.character] = {
          character: entry.character,
          pinyin: entry.pinyin || [],
          definition: entry.definition || '',
          radical: entry.radical || '',
          decomposition: entry.decomposition || '',
          etymology: entry.etymology || null,
        };
      }
    } catch (e) {
      // Skip malformed lines
    }
  }
  
  const count = Object.keys(dictionary).length;
  console.log(`Processed ${count} characters`);
  
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write JSON file
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(dictionary, null, 0));
  
  const stats = fs.statSync(OUTPUT_PATH);
  console.log(`Saved to ${OUTPUT_PATH} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch(console.error);

