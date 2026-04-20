const fs = require('fs');
const c = fs.readFileSync('src/features/business/BusinessSettingsScreen.tsx', 'utf8');

// Procurar handleCropConfirm e handleCropCancel
const idxConfirm = c.indexOf('handleCropConfirm');
const idxCancel = c.indexOf('handleCropCancel');
console.log('handleCropConfirm em:', idxConfirm);
console.log('handleCropCancel em:', idxCancel);

// Procurar declaracoes de const (fora de JSX)
const allConfirm = [];
let idx = 0;
while ((idx = c.indexOf('handleCropConfirm', idx)) !== -1) {
  // Pegar 50 chars antes para contexto
  const before = c.substring(Math.max(0, idx - 30), idx);
  allConfirm.push({ pos: idx, context: before });
  idx++;
}
console.log('\nTodas ocorrencias de handleCropConfirm:');
allConfirm.forEach(a => console.log(`Pos ${a.pos}: "${a.context}"`));

// Se eh só uso inline (não tem declaracao), precisa criar as funcoes
const hasDeclaration = c.includes('const handleCropConfirm');
console.log('\nTem declaracao const handleCropConfirm:', hasDeclaration);
