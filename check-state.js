const fs = require('fs');
const c = fs.readFileSync('src/features/business/BusinessSettingsScreen.tsx', 'utf8');

console.log('Import ImageCropModal:', c.includes('ImageCropModal') ? 'OK' : 'FALTA');
console.log('Import launchImageLibrary:', c.includes('launchImageLibrary') ? 'OK' : 'FALTA');
console.log('Import uploadImageToFirebase:', c.includes('uploadImageToFirebase') ? 'OK' : 'FALTA');
console.log('State cropModalVisible:', c.includes('cropModalVisible') ? 'OK' : 'FALTA');
console.log('State cropConfig:', c.includes('cropConfig') ? 'OK' : 'FALTA');
console.log('Funcao startImageCrop:', c.includes('startImageCrop') ? 'OK' : 'FALTA');
console.log('Funcao handleCropConfirm:', c.includes('handleCropConfirm') ? 'OK' : 'FALTA');
console.log('JSX <ImageCropModal:', c.includes('<ImageCropModal') ? 'OK' : 'FALTA');

// Procurar handleLogoSelection
const idx = c.indexOf('handleLogoSelection');
if (idx > -1) {
  console.log('\n=== handleLogoSelection atual ===');
  console.log(c.substring(idx, idx + 500));
}
