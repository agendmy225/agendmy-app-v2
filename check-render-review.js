const fs = require('fs');
const c = fs.readFileSync('src/features/business/BusinessDetailsScreen.tsx', 'utf8');

const idx = c.indexOf('renderReviewItem');
if (idx > -1) {
  console.log('renderReviewItem encontrado em pos:', idx);
  // Pegar a funcao inteira
  const end = c.indexOf('  );', idx);
  console.log(c.substring(idx, end + 10));
}

// Verificar tipo Review para ver se tem campo response
console.log('\n=== Tipo Review ===');
const reviewsTs = fs.readFileSync('src/services/reviews.ts', 'utf8');
const typeIdx = reviewsTs.indexOf('export interface Review');
if (typeIdx > -1) {
  const typeEnd = reviewsTs.indexOf('}', typeIdx);
  console.log(reviewsTs.substring(typeIdx, typeEnd + 1));
}
