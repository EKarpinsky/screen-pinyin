#!/usr/bin/env node
import https from 'https';
import zlib from 'zlib';

const url = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';

https.get(url, (res) => {
  let data = [];
  const gunzip = zlib.createGunzip();
  res.pipe(gunzip);
  gunzip.on('data', chunk => data.push(chunk));
  gunzip.on('end', () => {
    const text = Buffer.concat(data).toString('utf8');
    
    // Find the cat line
    const catLine = text.split('\n').find(l => l.startsWith('貓 猫'));
    console.log('Cat line:', catLine);
    console.log('Line length:', catLine?.length);
    console.log('Char codes:', catLine?.split('').slice(0, 10).map(c => c.charCodeAt(0)));
    
    // Test the regex
    const regex = /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/$/;
    const match = catLine?.match(regex);
    console.log('Regex match:', match ? 'YES' : 'NO');
    if (match) {
      console.log('Traditional:', match[1]);
      console.log('Simplified:', match[2]);
      console.log('Pinyin:', match[3]);
      console.log('Definitions:', match[4]);
    } else {
      // Debug: try simpler patterns
      console.log('\nDebug - trying parts:');
      console.log('Starts with 貓:', catLine?.startsWith('貓'));
      console.log('Has [ ]:', catLine?.includes('[') && catLine?.includes(']'));
      console.log('Has /:', catLine?.includes('/'));
      console.log('Ends with /:', catLine?.endsWith('/'));
    }
  });
});

