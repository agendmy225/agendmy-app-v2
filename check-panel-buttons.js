const fs = require('fs');
const c = fs.readFileSync('src/features/reviews/ReviewsManagementScreen.tsx', 'utf8');

// Procurar onde sao renderizados os cards de review
console.log('=== Procurando renderItem ou map de reviews ===');
const renderItemMatch = c.match(/(renderItem|renderReview|ReviewCard)\s*=\s*[\s\S]*?\};/);
if (renderItemMatch) {
  console.log(renderItemMatch[0].substring(0, 3000));
}

console.log('\n\n=== Procurando aprovar/rejeitar na UI ===');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].match(/(approveReview|rejectReview|Aprovar|Rejeitar|Aceitar|Recusar)/i)) {
    console.log((i+1) + ': ' + lines[i].trim());
  }
}
