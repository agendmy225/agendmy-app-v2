const fs = require('fs');
const c = fs.readFileSync('src/services/reviews.ts', 'utf8');
const idx = c.indexOf('export interface Review');
const end = c.indexOf('}', idx);
console.log(c.substring(idx, end + 1));
