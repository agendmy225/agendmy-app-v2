const fs = require('fs');

const filePath = 'src/screens/HomeScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// ===== 1. Modificar useFocusEffect para chamar loadInitialData =====
const oldFocus = `useFocusEffect(
    useCallback(() => {
      setSearchQuery(''); setSelectedCategoryFilter(null); setSearchResults([]);
      if (realTimeLocation) {
        applyLocationAndFilter(realTimeLocation.latitude, realTimeLocation.longitude);
      }
    }, [realTimeLocation, applyLocationAndFilter]),
  );`;

const newFocus = `useFocusEffect(
    useCallback(() => {
      setSearchQuery(''); setSelectedCategoryFilter(null); setSearchResults([]);
      if (realTimeLocation) {
        applyLocationAndFilter(realTimeLocation.latitude, realTimeLocation.longitude);
      }
      // Recarregar dados ao voltar para a tela (para atualizar promoçoes, novos estabelecimentos, etc)
      loadInitialData();
    }, [realTimeLocation, applyLocationAndFilter, loadInitialData]),
  );`;

if (c.includes(oldFocus)) {
  c = c.replace(oldFocus, newFocus);
  console.log('useFocusEffect agora chama loadInitialData');
}

// ===== 2. Reduzir o tempo do cache de 3 min para 30 segundos =====
// (suficiente para nao spammar Firebase, mas curto o bastante para reflexao das promoçoes)
const oldCache = `if (Date.now() - (cachedData.lastUpdate || 0) < 3 * 60 * 1000) { return; }`;
const newCache = `if (Date.now() - (cachedData.lastUpdate || 0) < 30 * 1000) { return; }`;

if (c.includes(oldCache)) {
  c = c.replace(oldCache, newCache);
  console.log('Tempo de cache reduzido de 3min para 30 segundos');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}
