// patch-business-details.js
// Substitui MapView por LeafletMap em BusinessDetailsScreen.tsx
// Uso: node patch-business-details.js

const fs = require('fs');
const path = require('path');

const FILE = path.resolve(
  'src/features/business/BusinessDetailsScreen.tsx'
);

if (!fs.existsSync(FILE)) {
  console.error('ERRO: arquivo nao encontrado:', FILE);
  process.exit(1);
}

let content = fs.readFileSync(FILE, 'utf8');
const original = content;

// Backup antes de modificar
const backupPath = FILE + '.backup-' + Date.now();
fs.writeFileSync(backupPath, original, 'utf8');
console.log('Backup criado:', path.basename(backupPath));

let changes = [];

// ====================================================
// 1. ADICIONAR IMPORT DO LEAFLETMAP (se ainda nao existe)
// ====================================================
if (!content.includes('LeafletMap')) {
  const importAnchor = "import { BusinessMarker } from './components/BusinessMarker';";
  if (content.includes(importAnchor)) {
    content = content.replace(
      importAnchor,
      importAnchor + "\nimport LeafletMap from '../../components/map/LeafletMap';"
    );
    changes.push('+ import LeafletMap');
  } else {
    console.error('AVISO: nao achei o anchor do import BusinessMarker');
  }
}

// ====================================================
// 2. REMOVER IMPORT DO MAPVIEW + PROVIDER_GOOGLE
// ====================================================
const mapViewImportPatterns = [
  /^import\s+MapView\s*,\s*\{\s*PROVIDER_GOOGLE\s*\}\s*from\s*['"]react-native-maps['"];?\s*\r?\n/m,
  /^import\s+MapView\s*from\s*['"]react-native-maps['"];?\s*\r?\n/m,
];
for (const pat of mapViewImportPatterns) {
  if (pat.test(content)) {
    content = content.replace(pat, '');
    changes.push('- import MapView (react-native-maps)');
    break;
  }
}

// ====================================================
// 3. SUBSTITUIR O BLOCO <MapView>...</MapView>
// ====================================================
const mapViewBlockRegex = /<MapView[\s\S]*?<\/MapView>/;
const mapViewMatch = content.match(mapViewBlockRegex);

if (mapViewMatch) {
  const replacement = `<LeafletMap
                    style={styles.map}
                    initialRegion={{
                      latitude: business.location.latitude,
                      longitude: business.location.longitude,
                      zoom: 16,
                    }}
                    markers={[{
                      id: business.id,
                      latitude: business.location.latitude,
                      longitude: business.location.longitude,
                      logoUrl: business.logo || business.coverImage,
                      name: business.name,
                      category: business.category,
                    }]}
                    showUserLocation={true}
                  />`;
  content = content.replace(mapViewBlockRegex, replacement);
  changes.push('~ <MapView>...</MapView> -> <LeafletMap />');
} else {
  console.error('AVISO: nao achei bloco <MapView>...</MapView>');
}

// ====================================================
// 4. SALVAR (so se mudou alguma coisa)
// ====================================================
if (content === original) {
  console.log('\nNENHUMA MUDANCA aplicada. Verifique o arquivo manualmente.');
  fs.unlinkSync(backupPath);
  process.exit(1);
}

fs.writeFileSync(FILE, content, 'utf8');

console.log('\n=== MUDANCAS APLICADAS ===');
changes.forEach(c => console.log('  ' + c));
console.log('\nArquivo salvo em UTF-8.');
console.log('Linhas antes:', original.split('\n').length);
console.log('Linhas depois:', content.split('\n').length);
