const fs = require('fs');

const filePath = 'src/features/business/BusinessSettingsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Remover o import duplicado 'deleteImageFromFirebase as deleteImg'
// Preservar apenas o import original
c = c.replace(
  /import \{ uploadImageToFirebase, deleteImageFromFirebase as deleteImg \} from '\.\.\/\.\.\/services\/imageUpload';\s*\r?\n/,
  ''
);

// Garantir que uploadImageToFirebase esta no import original (com selectAndUploadImage, deleteImageFromFirebase)
// Ver como esta o import original
const importMatch = c.match(/import \{([^}]+)\} from '\.\.\/\.\.\/services\/imageUpload';/);
if (importMatch) {
  let imports = importMatch[1];
  console.log('Import original encontrado:', imports.trim());
  
  // Adicionar uploadImageToFirebase se nao estiver
  if (!imports.includes('uploadImageToFirebase')) {
    const newImports = imports.trim().replace(/,\s*$/, '') + ',\n  uploadImageToFirebase,';
    c = c.replace(
      /import \{([^}]+)\} from '\.\.\/\.\.\/services\/imageUpload';/,
      `import {\n  ${newImports.split(',').map(s => s.trim()).filter(Boolean).join(',\n  ')},\n} from '../../services/imageUpload';`
    );
    console.log('uploadImageToFirebase adicionado ao import original');
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificacao
const c2 = fs.readFileSync(filePath, 'utf8');
const imports = c2.match(/import \{([^}]+)\} from '\.\.\/\.\.\/services\/imageUpload';/g);
if (imports) {
  console.log('\n=== Imports finais de imageUpload ===');
  imports.forEach(i => console.log(i));
}
