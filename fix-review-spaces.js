const fs = require('fs');

const filePath = 'src/features/reviews/ReviewScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Corrigir os espaços entre > e {/* Header */}
const oldLine = `<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>        {/* Header */}`;
const newLine = `<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}`;

if (c.includes(oldLine)) {
  c = c.replace(oldLine, newLine);
  console.log('Espacos entre tags corrigidos');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
} else {
  console.log('Nao bateu. Vou tentar regex flexivel');
  // Regex mais flexivel
  c = c.replace(
    /(<ScrollView[^>]+>)\s+(\{\/\* Header \*\/\})/,
    '$1\n        $2'
  );
  if (c !== original) {
    fs.writeFileSync(filePath, c, 'utf8');
    console.log('Arquivo salvo via regex flexivel!');
  }
}
