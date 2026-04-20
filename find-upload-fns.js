const fs = require('fs');
const c = fs.readFileSync('src/features/business/BusinessSettingsScreen.tsx', 'utf8');

// Procurar funcoes relacionadas a logo/cover
const patterns = ['Logo', 'logo', 'Cover', 'cover', 'handleSelect', 'SelectLogo', 'uploadLogo'];
for (const p of patterns) {
  const regex = new RegExp(`(const |async |function )\\w*${p}\\w*`, 'g');
  const matches = [...c.matchAll(regex)];
  if (matches.length > 0) {
    console.log(`Pattern "${p}":`);
    matches.forEach(m => console.log(`  - ${m[0]}`));
  }
}

// Mostrar contexto de setIsUploadingLogo e setIsUploadingCover
const idxSetLogo = c.indexOf('setIsUploadingLogo(true)');
if (idxSetLogo > -1) {
  console.log('\n=== Contexto de setIsUploadingLogo(true) - funcao que chama ===');
  // Voltar ate achar "const" ou "async"
  let start = idxSetLogo;
  while (start > 0 && c.substr(start, 6) !== 'const ' && c.substr(start, 5) !== 'async') {
    start--;
  }
  console.log(c.substring(start, idxSetLogo + 50));
}
