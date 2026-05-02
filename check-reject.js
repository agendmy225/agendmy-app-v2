const fs = require('fs');
const c = fs.readFileSync('src/services/reviews.ts', 'utf8');
const idx = c.indexOf('export const rejectReview');
if (idx > -1) {
  const end = c.indexOf('};', idx);
  console.log(c.substring(idx, end + 2));
}
