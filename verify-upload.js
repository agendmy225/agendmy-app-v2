const fs = require('fs');

const c = fs.readFileSync('src/features/business/BusinessSettingsScreen.tsx', 'utf8');

// Ver a funcao uploadImageToFirebase na pagina
const idx = c.indexOf('uploadImageToFirebase');
if (idx > -1) {
  console.log('=== Uso de uploadImageToFirebase no arquivo ===');
  let i = 0;
  let pos = 0;
  while ((pos = c.indexOf('uploadImageToFirebase', pos)) !== -1) {
    const contextBefore = c.substring(Math.max(0, pos - 50), pos);
    const contextAfter = c.substring(pos, pos + 100);
    console.log(`Ocorrencia ${++i}: ...${contextBefore}${contextAfter}...`);
    console.log('');
    pos++;
  }
}

// Ver handleCropConfirm completo
const ccIdx = c.indexOf('const handleCropConfirm');
if (ccIdx > -1) {
  console.log('=== handleCropConfirm ===');
  // achar o fim
  let depth = 0;
  let i = c.indexOf('=> {', ccIdx) + 4;
  let end = -1;
  while (i < c.length) {
    if (c[i] === '{') depth++;
    else if (c[i] === '}') {
      if (depth === 0) { if (c.substr(i, 2) === '};') { end = i + 2; break; } }
      depth--;
    }
    i++;
  }
  console.log(c.substring(ccIdx, end));
}
