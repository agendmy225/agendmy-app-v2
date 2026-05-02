const fs = require('fs');
const c = fs.readFileSync('src/services/reviews.ts', 'utf8');

// Ver updateProfessionalRating
const idx = c.indexOf('export const updateProfessionalRating');
if (idx > -1) {
  const end = c.indexOf('};', idx);
  console.log('=== updateProfessionalRating ===');
  console.log(c.substring(idx, end + 2));
}

// Ver getProfessionalReviews
const idx2 = c.indexOf('export const getProfessionalReviews');
if (idx2 > -1) {
  const end2 = c.indexOf('};', idx2);
  console.log('\n=== getProfessionalReviews ===');
  console.log(c.substring(idx2, end2 + 2));
}

// Ver addReview - se chama updateProfessionalRating
console.log('\n=== Em addReview, chama updateProfessionalRating? ===');
const idx3 = c.indexOf('export const addReview');
const end3 = c.indexOf('};', idx3);
const addReviewCode = c.substring(idx3, end3 + 2);
console.log('Chama updateProfessionalRating?', addReviewCode.includes('updateProfessionalRating') ? 'SIM' : 'NAO');
console.log('Trecho relevante:');
const ratingCallIdx = addReviewCode.indexOf('updateBusinessRating');
if (ratingCallIdx > -1) {
  console.log(addReviewCode.substring(ratingCallIdx, ratingCallIdx + 400));
}
