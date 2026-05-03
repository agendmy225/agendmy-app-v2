const fs = require('fs');

const filePath = 'src/features/business/BusinessDetailsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Substituir o useFocusEffect do mapa por uma combinacao de useFocusEffect + beforeRemove listener
const oldFocus = `  // Mapa: montar apenas quando tela em foco para evitar crash NPE no MapView ao navegar
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => setIsMapMounted(true), 300);
      return () => {
        clearTimeout(timer);
        setIsMapMounted(false);
      };
    }, [])
  );`;

const newFocus = `  // Mapa: montar apenas quando tela em foco
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => setIsMapMounted(true), 300);
      return () => {
        clearTimeout(timer);
      };
    }, [])
  );
  
  // CRITICO: desmontar o mapa ANTES da navegacao acontecer para evitar crash NPE
  // O beforeRemove dispara antes do React desmontar a tela, dando tempo do MapView limpar
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      setIsMapMounted(false);
    });
    return unsubscribe;
  }, [navigation]);`;

if (c.includes(oldFocus)) {
  c = c.replace(oldFocus, newFocus);
  console.log('useFocusEffect + beforeRemove listener adicionados');
} else {
  console.log('Padrao nao bateu - tentando regex');
  const flexRegex = /\/\/ Mapa: montar apenas quando tela em foco[\s\S]*?useFocusEffect\([\s\S]*?\}, \[\]\)\s*\);/;
  if (flexRegex.test(c)) {
    c = c.replace(flexRegex, newFocus);
    console.log('Substituido via regex');
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificacao
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao ===');
console.log('beforeRemove listener:', c2.includes("addListener('beforeRemove'") ? 'OK' : 'FALTA');
console.log('setIsMapMounted no beforeRemove:', c2.match(/beforeRemove[\s\S]{0,200}setIsMapMounted\(false\)/) ? 'OK' : 'FALTA');
