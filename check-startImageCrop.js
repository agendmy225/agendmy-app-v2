const fs = require('fs');
const c = fs.readFileSync('src/features/business/BusinessSettingsScreen.tsx', 'utf8');

// Ver startImageCrop completo
const idx = c.indexOf('const startImageCrop');
function findEnd(text, start) {
  let depth = 0;
  let i = text.indexOf('=> {', start) + 4;
  while (i < text.length) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      if (depth === 0) { if (text.substr(i, 2) === '};') return i + 2; }
      depth--;
    }
    i++;
  }
  return -1;
}

if (idx > -1) {
  console.log('=== startImageCrop completo ===');
  console.log(c.substring(idx, findEnd(c, idx)));
}

// Ver o type cropConfig
const typeIdx = c.indexOf('cropConfig, setCropConfig');
if (typeIdx > -1) {
  console.log('\n=== Type cropConfig ===');
  // Voltar para achar useState
  let s = typeIdx;
  while (s > 0 && c[s] !== '<') s--;
  console.log(c.substring(s, typeIdx + 200));
}
