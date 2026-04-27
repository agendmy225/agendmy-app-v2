const fs = require('fs');
const c = fs.readFileSync('src/features/business/BusinessSettingsScreen.tsx', 'utf8');

// Ver as duas chamadas de startImageCrop
const matches = [...c.matchAll(/startImageCrop\([\s\S]*?\}\),?\s*\n\s*\)/g)];
matches.forEach((m, i) => {
  console.log(`=== Chamada ${i+1} ===`);
  console.log(m[0]);
  console.log('');
});
