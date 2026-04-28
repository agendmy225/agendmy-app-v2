const fs = require('fs');

const filePath = 'src/features/business/BusinessDetailsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Substituir o JSX que mostra so o preço normal por uma versao com promoçao
const oldJsx = `<View style={styles.serviceDetails}>
                        <Text style={styles.serviceDuration}>⏱️ {service.duration}</Text>
                        <Text style={styles.servicePrice}>R$ {service.price.toFixed(2)}</Text>
                      </View>`;

const newJsx = `<View style={styles.serviceDetails}>
                        <Text style={styles.serviceDuration}>⏱️ {service.duration}</Text>
                        {service.isPromotionActive && service.promotionalPrice ? (
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
                        )}
                      </View>`;

if (c.includes(oldJsx)) {
  c = c.replace(oldJsx, newJsx);
  console.log('JSX dos servicos atualizado com promoçao');
}

// 2. Adicionar os estilos novos (apos servicePrice)
if (!c.includes('promotionPriceContainer:')) {
  const styleAnchor = /servicePrice:\s*\{[^}]+\},/;
  const m = c.match(styleAnchor);
  if (m) {
    const newStyles = `${m[0]}
  promotionPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  servicePriceOriginal: {
    fontSize: 13,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  servicePricePromotional: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d31027',
    marginRight: 8,
  },
  discountBadge: {
    backgroundColor: '#d31027',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  discountBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },`;
    c = c.replace(m[0], newStyles);
    console.log('Estilos de promoçao adicionados');
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}
