const fs = require('fs');
const c = fs.readFileSync('src/features/reviews/ReviewScreen.tsx', 'utf8');

// Verificar se renderStars original ainda esta no arquivo
console.log('=== renderStars no arquivo ===');
const idx1 = c.indexOf('const renderStars');
if (idx1 > -1) {
  const end1 = c.indexOf('};', idx1);
  console.log(c.substring(idx1, end1 + 2));
}

console.log('\n\n=== Secao Como foi sua experiencia (atual) ===');
const idx2 = c.indexOf('Como foi sua');
if (idx2 > -1) {
  console.log(c.substring(Math.max(0, idx2 - 100), idx2 + 500));
}

console.log('\n\n=== Tamanho atual:', c.length, 'bytes ===');
console.log('Tem renderStars(rating, setRating)?', c.includes('renderStars(rating, setRating)') ? 'SIM' : 'NAO');
console.log('Tem "Como foi o atendimento de"?', c.includes('Como foi o atendimento de') ? 'SIM' : 'NAO');
