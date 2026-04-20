const fs = require('fs');
const c = fs.readFileSync('src/features/business/BusinessSettingsScreen.tsx', 'utf8');

const idx = c.indexOf('handleCropConfirm');
if (idx > -1) {
  // Mostrar 200 chars antes para ver o contexto
  console.log('=== Contexto antes de handleCropConfirm ===');
  console.log(c.substring(Math.max(0, idx - 300), idx + 100));
}
