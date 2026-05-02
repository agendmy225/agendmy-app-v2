const fs = require('fs');
const c = fs.readFileSync('src/features/reviews/ReviewScreen.tsx', 'utf8');

console.log('=== Tamanho:', c.length, 'bytes,', c.split('\n').length, 'linhas ===');

// Ver imports
console.log('\n=== Imports ===');
const importsEnd = c.indexOf('const ReviewScreen');
if (importsEnd > -1) {
  console.log(c.substring(0, importsEnd));
}

// Ver states e parametros da rota
console.log('\n=== Inicio do componente (states e route) ===');
const compStart = c.indexOf('const ReviewScreen');
const handleSubmitIdx = c.indexOf('handleSubmitReview');
if (compStart > -1 && handleSubmitIdx > -1) {
  console.log(c.substring(compStart, handleSubmitIdx + 50));
}
