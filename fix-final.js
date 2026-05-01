const fs = require('fs');

// ===== FIX 1: Completar fix do MapView (condicao no JSX) =====
const filePath1 = 'src/features/business/BusinessDetailsScreen.tsx';
let c1 = fs.readFileSync(filePath1, 'utf8');
const original1 = c1;

// Primeiro vamos ver onde esta o MapView
const mapViewIdx = c1.indexOf('<MapView');
const mapViewCloseIdx = c1.indexOf('</MapView>');
console.log('MapView abre em pos:', mapViewIdx);
console.log('MapView fecha em pos:', mapViewCloseIdx);

if (mapViewIdx > -1 && mapViewCloseIdx > -1 && !c1.includes('{isMapMounted ? (')) {
  // 1a. Adicionar { isMapMounted ? ( antes do <MapView
  // Pegar tudo antes ate encontrar <MapView e ver o que tem
  const beforeMapView = c1.substring(0, mapViewIdx);
  const afterMapView = c1.substring(mapViewIdx);
  
  // Procurar pelo <View style={styles.mapContainer}> antes
  const lastContainerIdx = beforeMapView.lastIndexOf('<View style={styles.mapContainer}>');
  if (lastContainerIdx > -1) {
    // Inserir o {isMapMounted ? ( apos a abertura do mapContainer
    const containerEnd = lastContainerIdx + '<View style={styles.mapContainer}>'.length;
    c1 = c1.substring(0, containerEnd) + '\n                  {isMapMounted ? (' + c1.substring(containerEnd);
    console.log('1a. Abertura do ternario adicionada');
    
    // 1b. Adicionar fechamento depois do </MapView>
    const newCloseIdx = c1.indexOf('</MapView>');
    const afterClose = c1.substring(newCloseIdx + '</MapView>'.length);
    const endChar = afterClose.indexOf('</View>');
    if (endChar > -1) {
      const replacement = `</MapView>
                  ) : (
                    <View style={[styles.map, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                      <ActivityIndicator color="#d31027" />
                    </View>
                  )}`;
      c1 = c1.substring(0, newCloseIdx) + replacement + c1.substring(newCloseIdx + '</MapView>'.length);
      console.log('1b. Fechamento do ternario adicionado');
    }
  }
}

if (c1 !== original1) {
  fs.writeFileSync(filePath1, c1, 'utf8');
  console.log('BusinessDetailsScreen salvo!');
}

// ===== FIX 2: Aplicar fix do status responded =====
const filePath2 = 'src/features/reviews/ReviewsManagementScreen.tsx';
let c2 = fs.readFileSync(filePath2, 'utf8');
const original2 = c2;

// Tentar varias formas de remover o status: 'responded'
const patterns = [
  // Padrao 1: linha exata com comentario
  {
    old: `status: 'responded', // Opcional: atualizar status para indicar que foi respondido`,
    new: `// status mantido como approved para a avaliacao continuar visivel ao cliente`
  },
  // Padrao 2: linha exata sem comentario
  {
    old: `status: 'responded',`,
    new: `// status mantido como approved`
  }
];

let applied = false;
for (const p of patterns) {
  if (c2.includes(p.old)) {
    c2 = c2.replace(p.old, p.new);
    console.log('Status responded removido (padrao bateu)');
    applied = true;
    break;
  }
}

if (!applied) {
  // Regex flexivel
  const flexRegex = /status:\s*['"]responded['"],?\s*(\/\/[^\r\n]*)?/;
  if (flexRegex.test(c2)) {
    c2 = c2.replace(flexRegex, '// status mantido como approved');
    console.log('Status responded removido via regex');
    applied = true;
  }
}

if (c2 !== original2) {
  fs.writeFileSync(filePath2, c2, 'utf8');
  console.log('ReviewsManagementScreen salvo!');
}

// Verificacao final
const c1Final = fs.readFileSync(filePath1, 'utf8');
const c2Final = fs.readFileSync(filePath2, 'utf8');
console.log('\n=== Verificacao final ===');
console.log('MapView com {isMapMounted ? (:', c1Final.includes('{isMapMounted ? (') ? 'OK' : 'FALTA');
console.log('MapView fechamento ) }:', c1Final.includes(') : (\n                    <View style={[styles.map') ? 'OK' : 'FALTA');
console.log("Status responded removido:", !c2Final.includes("status: 'responded'") ? 'OK' : 'AINDA PRESENTE');
