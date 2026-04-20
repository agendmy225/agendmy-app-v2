const fs = require('fs');

const filePath = 'src/features/business/BusinessDetailsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// ===== 1. Substituir headerContainer =====
const oldHeader = `  headerContainer: {
    height: 200,
  },`;

const newHeader = `  headerContainer: {
    width: '100%',
    aspectRatio: 3,
  },
  logoOverlayContainer: {
    position: 'absolute',
    left: 16,
    top: '20%',
    zIndex: 10,
  },
  logoOverlay: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  logoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },`;

if (c.includes(oldHeader)) {
  c = c.replace(oldHeader, newHeader);
  console.log('headerContainer + estilos da logo OK');
}

// ===== 2. Adicionar JSX da logo =====
const oldJsx = `              </ImageBackground>
            </View>
            {/* Informações do negócio */}`;

const newJsx = `              </ImageBackground>
            </View>

            {/* Logo sobreposta estilo Facebook */}
            <View style={styles.logoOverlayContainer}>
              {business?.logo ? (
                <StorageImage storagePath={business.logo} style={styles.logoOverlay} />
              ) : (
                <View style={[styles.logoOverlay, styles.logoPlaceholder]}>
                  <Icon name="business" size={36} color={colors.lightText} />
                </View>
              )}
            </View>

            {/* Informações do negócio */}`;

if (c.includes(oldJsx) && !c.includes('logoOverlayContainer}>')) {
  c = c.replace(oldJsx, newJsx);
  console.log('JSX da logo OK');
}

// Salvar
if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificar
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Final ===');
console.log('aspectRatio 3:', c2.includes('aspectRatio: 3,') ? 'OK' : 'FALTA');
console.log('logoOverlayContainer style:', c2.includes('logoOverlayContainer:') ? 'OK' : 'FALTA');
console.log('Logo JSX:', c2.includes('<StorageImage storagePath={business.logo}') ? 'OK' : 'FALTA');
console.log('StorageImage import:', c2.includes('import StorageImage') ? 'OK' : 'FALTA');
