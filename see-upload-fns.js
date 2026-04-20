const fs = require('fs');
const c = fs.readFileSync('src/features/business/BusinessSettingsScreen.tsx', 'utf8');

const idxLogo = c.indexOf('const handleUploadLogo');
if (idxLogo > -1) {
  // Achar o fim da funcao
  let depth = 0;
  let i = c.indexOf('=> {', idxLogo) + 4;
  let end = -1;
  while (i < c.length) {
    if (c[i] === '{') depth++;
    else if (c[i] === '}') {
      if (depth === 0) {
        if (c.substr(i, 2) === '};') {
          end = i + 2;
          break;
        }
      }
      depth--;
    }
    i++;
  }
  console.log('=== handleUploadLogo completo ===');
  console.log(c.substring(idxLogo, end));
  console.log('');
}

const idxCover = c.indexOf('const handleUploadCoverImage');
if (idxCover > -1) {
  let depth = 0;
  let i = c.indexOf('=> {', idxCover) + 4;
  let end = -1;
  while (i < c.length) {
    if (c[i] === '{') depth++;
    else if (c[i] === '}') {
      if (depth === 0) {
        if (c.substr(i, 2) === '};') {
          end = i + 2;
          break;
        }
      }
      depth--;
    }
    i++;
  }
  console.log('=== handleUploadCoverImage completo ===');
  console.log(c.substring(idxCover, end));
}
