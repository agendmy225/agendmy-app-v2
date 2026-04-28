const fs = require('fs');

const filePath = 'src/features/business/BusinessDetailsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Detectar EOL
const hasCRLF = c.includes('\r\n');
const EOL = hasCRLF ? '\r\n' : '\n';
console.log('Arquivo usa:', hasCRLF ? 'CRLF' : 'LF');

// Regex flexivel para encontrar o Text de servicePrice e substituir
const flexRegex = /<Text style=\{styles\.servicePrice\}>R\$ \{service\.price\.toFixed\(2\)\}<\/Text>/;

const m = c.match(flexRegex);
if (m) {
  console.log('Encontrei o Text de servicePrice');
  
  const replacement = `{service.isPromotionActive && service.promotionalPrice ? (
                          <View style={styles.promotionPriceContainer}>
                            <Text style={styles.servicePriceOriginal}>R$ {service.price.toFixed(2)}</Text>
                            <Text style={styles.servicePricePromotional}>R$ {service.promotionalPrice.toFixed(2)}</Text>
                            {service.discountPercentage ? (
                              <View style={styles.discountBadge}>
                                <Text style={styles.discountBadgeText}>-{service.discountPercentage}%</Text>
                              </View>
                            ) : null}
                          </View>
                        ) : (
                          <Text style={styles.servicePrice}>R$ {service.price.toFixed(2)}</Text>
                        )}`;
  
  c = c.replace(flexRegex, replacement);
  console.log('JSX substituido');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificar
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao ===');
console.log('JSX tem isPromotionActive:', c2.includes('service.isPromotionActive') ? 'OK' : 'FALTA');
console.log('JSX tem discountBadge:', c2.includes('discountBadge') ? 'OK' : 'FALTA');
console.log('Estilos tem promotionPriceContainer:', c2.includes('promotionPriceContainer:') ? 'OK' : 'FALTA');
