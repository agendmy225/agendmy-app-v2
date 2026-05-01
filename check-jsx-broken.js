const fs = require('fs');

const c = fs.readFileSync('src/features/business/BusinessDetailsScreen.tsx', 'utf8');

// Ver area do FlatList + verMaisButton
const idx = c.indexOf('verMaisButton');
if (idx > -1) {
  const lineNum = c.substring(0, idx).split('\n').length;
  console.log('verMaisButton em linha:', lineNum);
  
  // Procurar primeira ocorrencia (que eh JSX)
  const lines = c.split('\n');
  for (let i = Math.max(0, lineNum - 30); i < Math.min(lines.length, lineNum + 30); i++) {
    console.log((i+1) + ': ' + lines[i]);
  }
}
