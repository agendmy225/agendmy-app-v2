const fs = require('fs');
const c = fs.readFileSync('src/features/business/BusinessDetailsScreen.tsx', 'utf8');

console.log('Tem isMapMounted state:', c.includes('isMapMounted, setIsMapMounted') ? 'SIM' : 'NAO');
console.log('Tem useFocusEffect mapa:', c.includes('Mapa: montar apenas') ? 'SIM' : 'NAO');
console.log('Tem condicao no JSX:', c.includes('{isMapMounted ? (') ? 'SIM' : 'NAO');

// Ver onde esta o MapView
const idx = c.indexOf('<MapView');
if (idx > -1) {
  console.log('\n=== JSX em volta do MapView ===');
  console.log(c.substring(Math.max(0, idx - 300), idx + 200));
}
