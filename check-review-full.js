const fs = require('fs');
const c = fs.readFileSync('src/features/reviews/ReviewScreen.tsx', 'utf8');

// Pegar handleSubmitReview ate o final dele
const idx = c.indexOf('const handleSubmitReview');
const idxStyles = c.indexOf('const styles');
console.log('=== handleSubmitReview completo ===');
console.log(c.substring(idx, idxStyles - 5));
