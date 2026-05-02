const fs = require('fs');

// 1. Ver approveReview no service
const reviews = fs.readFileSync('src/services/reviews.ts', 'utf8');
const idx = reviews.indexOf('export const approveReview');
console.log('=== approveReview no service ===');
if (idx > -1) {
  const end = reviews.indexOf('};', idx);
  console.log(reviews.substring(idx, end + 2));
} else {
  console.log('Nao tem export approveReview no services/reviews.ts');
}

// 2. Ver approveReview no painel
const panel = fs.readFileSync('src/features/reviews/ReviewsManagementScreen.tsx', 'utf8');
const idx2 = panel.indexOf('const approveReview');
console.log('\n=== approveReview no painel ===');
if (idx2 > -1) {
  const end2 = panel.indexOf('};', idx2);
  console.log(panel.substring(idx2, end2 + 2));
}

// 3. Verificar se importa updateProfessionalRating ou updateBusinessRating
console.log('\n=== Imports do painel ===');
console.log('Importa updateProfessionalRating?', panel.includes('updateProfessionalRating') ? 'SIM' : 'NAO');
console.log('Importa updateBusinessRating?', panel.includes('updateBusinessRating') ? 'SIM' : 'NAO');
