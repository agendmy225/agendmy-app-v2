const fs = require('fs');

// ===== FIX 1: MapView crash =====
const filePath = 'src/features/business/BusinessDetailsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Adicionar state isMapMounted apos showAllReviews
const stateAnchor = "const [showAllReviews, setShowAllReviews] = useState(false);";
if (c.includes(stateAnchor) && !c.includes('isMapMounted')) {
  c = c.replace(
    stateAnchor,
    `${stateAnchor}\n  const [isMapMounted, setIsMapMounted] = useState(false);`
  );
  console.log('1. State isMapMounted adicionado');
}

// Adicionar useFocusEffect que monta/desmonta o mapa
if (c.includes('isMapMounted') && !c.includes('Mapa: montar apenas quando tela em foco')) {
  const focusBlock = `  // Mapa: montar apenas quando tela em foco para evitar crash NPE no MapView ao navegar
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => setIsMapMounted(true), 300);
      return () => {
        clearTimeout(timer);
        setIsMapMounted(false);
      };
    }, [])
  );
`;
  // Inserir apos a declaracao do state isMapMounted
  c = c.replace(
    /const \[isMapMounted, setIsMapMounted\] = useState\(false\);(\r?\n)/,
    `const [isMapMounted, setIsMapMounted] = useState(false);$1\n${focusBlock}`
  );
  console.log('2. useFocusEffect para o mapa adicionado');
}

// Envolver MapView em condicao isMapMounted
const oldMapOpen = `<View style={styles.mapContainer}>
                  <MapView`;
if (c.includes(oldMapOpen) && !c.includes('{isMapMounted ? (')) {
  c = c.replace(
    oldMapOpen,
    `<View style={styles.mapContainer}>
                  {isMapMounted ? (
                  <MapView`
  );
  console.log('3a. Abertura condicional adicionada antes do MapView');
  
  // Procurar o fechamento do MapView e fechar o ternario
  // Padrao tipico: </MapView>\n                </View>
  // Vamos procurar o primeiro </MapView> e adicionar fechamento depois
  const mapCloseRegex = /(<\/MapView>)(\s*<\/View>\s*\) : \(\s*<View style=\{styles\.mapPlaceholder\})/;
  if (mapCloseRegex.test(c)) {
    c = c.replace(mapCloseRegex, `$1
                  ) : (
                    <View style={[styles.map, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                      <ActivityIndicator color="#d31027" />
                    </View>
                  )}$2`);
    console.log('3b. Fechamento condicional adicionado');
  } else {
    // Tentar padrao mais simples
    const simpleMatch = c.match(/(<\/MapView>)(\s*)(<\/View>)/);
    if (simpleMatch) {
      c = c.replace(simpleMatch[0], `${simpleMatch[1]}
                  ) : (
                    <View style={[styles.map, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                      <ActivityIndicator color="#d31027" />
                    </View>
                  )}${simpleMatch[2]}${simpleMatch[3]}`);
      console.log('3b. Fechamento condicional adicionado (padrao simples)');
    }
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo BusinessDetailsScreen salvo!');
}

// ===== VERIFICAR fix da resposta ao avaliacao =====
const reviewMgmtPath = 'src/features/reviews/ReviewsManagementScreen.tsx';
const reviewC = fs.readFileSync(reviewMgmtPath, 'utf8');
console.log('\n=== Verificacao do fix da resposta ===');
console.log("Tem 'status: responded':", reviewC.includes("status: 'responded'") ? 'SIM (BUG)' : 'NAO (OK)');
console.log("Tem comentario approved:", reviewC.includes('mantido como approved') || reviewC.includes('manter \'approved\'') ? 'SIM' : 'NAO');

// ===== Verificacao final =====
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao do fix do MapView ===');
console.log('isMapMounted state:', c2.includes('isMapMounted') ? 'OK' : 'FALTA');
console.log('useFocusEffect mapa:', c2.includes('Mapa: montar apenas quando tela em foco') ? 'OK' : 'FALTA');
console.log('Condicao no JSX:', c2.includes('{isMapMounted ? (') ? 'OK' : 'FALTA');
