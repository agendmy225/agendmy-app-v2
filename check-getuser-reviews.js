const fs = require('fs');
const c = fs.readFileSync('src/services/reviews.ts', 'utf8');

const idx = c.indexOf('export const getUserReviews');
if (idx > -1) {
  console.log(c.substring(idx, idx + 800));
}

// Tambem ver se ja tem alguma funcao tipo hasUserReviewed
console.log('\n=== Outras funcoes ===');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].match(/(hasReview|userHasReview|alreadyReview|checkReview)/i)) {
    console.log((i+1) + ': ' + lines[i].trim());
  }
}
