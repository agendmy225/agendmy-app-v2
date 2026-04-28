const fs = require('fs');

const c = fs.readFileSync('src/features/business/BusinessDetailsScreen.tsx', 'utf8');
const lines = c.split('\n');

// Encontrar linhas em volta do logoOverlayContainer
let foundLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('logoOverlayContainer') && i < 600) {
    foundLine = i;
    break;
  }
}

if (foundLine > -1) {
  console.log('=== JSX em volta da logo (linhas', foundLine - 5, 'a', foundLine + 25, ') ===');
  for (let i = Math.max(0, foundLine - 5); i < Math.min(lines.length, foundLine + 25); i++) {
    console.log((i+1) + ': ' + lines[i]);
  }
}

// Verificar quantas vezes ImageBackground aparece (deve ser 1 abre + 1 fecha)
const openTags = (c.match(/<ImageBackground/g) || []).length;
const closeTags = (c.match(/<\/ImageBackground>/g) || []).length;
console.log('\n<ImageBackground:', openTags, '| </ImageBackground>:', closeTags);
