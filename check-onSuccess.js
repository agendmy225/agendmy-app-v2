const fs = require('fs');

const c = fs.readFileSync('src/features/business/BusinessSettingsScreen.tsx', 'utf8');

// Ver handleUploadLogo e handleUploadCoverImage completos
const logoStart = c.indexOf('const handleUploadLogo');
const coverStart = c.indexOf('const handleUploadCoverImage');

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

if (logoStart > -1) {
  console.log('=== handleUploadLogo ===');
  console.log(c.substring(logoStart, findEnd(c, logoStart)));
}

console.log('\n');

if (coverStart > -1) {
  console.log('=== handleUploadCoverImage ===');
  console.log(c.substring(coverStart, findEnd(c, coverStart)));
}
