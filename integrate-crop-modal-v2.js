const fs = require('fs');

const filePath = 'src/features/business/BusinessSettingsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Primeiro ver se o integrate v1 ja adicionou o setup
const hasSetup = c.includes('cropModalVisible') && c.includes('startImageCrop');
console.log('Setup basico ja aplicado:', hasSetup);

// Agora precisamos substituir o handleLogoSelection / handleCoverSelection
// Primeiro ver como estao
const idxLogo = c.indexOf('handleLogoSelection');
const idxCover = c.indexOf('handleCoverSelection');

if (idxLogo > -1) {
  console.log('\n--- handleLogoSelection atual ---');
  console.log(c.substring(idxLogo, idxLogo + 600));
}

if (idxCover > -1) {
  console.log('\n--- handleCoverSelection atual ---');
  console.log(c.substring(idxCover, idxCover + 600));
}
