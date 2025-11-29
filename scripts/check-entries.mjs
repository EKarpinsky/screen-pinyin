import d from '../src/data/hanzi-dictionary.json' with { type: 'json' };

console.log('猫 (simplified):', d['猫']?.definition);
console.log('貓 (traditional):', d['貓']?.definition);

