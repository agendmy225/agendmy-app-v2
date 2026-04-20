const fs = require('fs');

const filePath = 'src/features/business/BusinessDetailsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// ===== 1. Corrigir headerContainer quebrado =====
// Estado atual: headerContainer: { height: 200,   headerImage: ...
// Precisa virar: headerContainer: { width: '100%', aspectRatio: 3 },  + novos estilos + headerImage: ...
const brokenPattern = `headerContainer: {
    height: 200,
  headerImage: {`;

const fixedPattern = `headerContainer: {
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
  },
  headerImage: {`;

if (c.includes(brokenPattern)) {
  c = c.replace(brokenPattern, fixedPattern);
  console.log('headerContainer corrigido + estilos da logo adicionados');
}

// ===== 2. Adicionar JSX da logo =====
const jsxOld = `              </ImageBackground>
            </View>
            {/* Informações do negócio */}`;

const jsxNew = `              </ImageBackground>
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

if (c.includes(jsxOld) && !c.includes('logoOverlayContainer}>')) {
  c = c.replace(jsxOld, jsxNew);
  console.log('JSX da logo adicionado');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificacao
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao ===');
console.log('headerContainer bem formado:', c2.match(/headerContainer:\s*\{\s*width:[^}]+\}/)?'OK':'FALTA');
console.log('logoOverlayContainer style:', c2.includes('logoOverlayContainer:')?'OK':'FALTA');
console.log('logoOverlay JSX:', c2.includes('<StorageImage storagePath={business.logo}')?'OK':'FALTA');
