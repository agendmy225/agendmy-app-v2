const fs = require('fs');
const c = fs.readFileSync('src/features/reviews/ReviewScreen.tsx', 'utf8');

console.log('=== Inicio do componente (states) ===');
const idx = c.indexOf('const ReviewScreen');
const handleIdx = c.indexOf('const renderStars');
console.log(c.substring(idx, handleIdx));

console.log('\n\n=== Buscas por professionalRating ===');
let pos = -1;
while ((pos = c.indexOf('professionalRating', pos + 1)) !== -1) {
  const lineNum = c.substring(0, pos).split('\n').length;
  console.log('Linha ' + lineNum + ': ' + c.substring(Math.max(0, pos - 30), pos + 100).replace(/\n/g, ' | '));
}

console.log('\n=== State setProfessionalRating existe?', c.includes('setProfessionalRating') ? 'SIM' : 'NAO');
console.log('=== State useState do professionalRating?', c.includes('useState(0);') && c.match(/professionalRating, setProfessionalRating/) ? 'SIM' : 'NAO');
