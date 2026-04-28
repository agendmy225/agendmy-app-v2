const fs = require('fs');
const c = fs.readFileSync('src/services/services.ts', 'utf8');
const idx = c.indexOf('export interface Service');
if (idx > -1) {
  // Achar o fim da interface
  const end = c.indexOf('}', idx);
  console.log(c.substring(idx, end + 1));
}
