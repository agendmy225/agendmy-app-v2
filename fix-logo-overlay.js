const fs = require('fs');

const filePath = 'src/features/business/BusinessDetailsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Verificar se StorageImage ja foi importado
if (!c.includes("import StorageImage")) {
  c = c.replace(
    /import \{ colors \} from '\.\.\/\.\.\/constants\/colors';/,
    "import { colors } from '../../constants/colors';\nimport StorageImage from '../../components/common/StorageImage';"
  );
  console.log('StorageImage importado');
}

// 2. Adicionar JSX da logo - procurar o fecha </View> do headerContainer e a linha {/* Informações do negócio */}
const jsxTarget = "            </View>\n            {/* Informações do negócio */}";
const jsxReplacement = `            </View>

            {/* Logo sobreposta estilo Facebook */}
            <View style={styles.logoOverlayContainer} pointerEvents="none">
              {business?.logo ? (
                <StorageImage storagePath={business.logo} style={styles.logoOverlay} />
              ) : (
                <View style={[styles.logoOverlay, styles.logoPlaceholder]}>
                  <Icon name="business" size={36} color={colors.lightText} />
                </View>
              )}
            </View>

            {/* Informações do negócio */}`;

if (c.includes(jsxTarget) && !c.includes('logoOverlayContainer')) {
  c = c.replace(jsxTarget, jsxReplacement);
  console.log('JSX da logo adicionado');
}

// 3. Adicionar estilos da logo
if (!c.includes('logoOverlayContainer:')) {
  // Adicionar apos headerContainer
  const styleTarget = `  headerContainer: {
    width: '100%',
    aspectRatio: 3, // 3:1 - funciona em qualquer dispositivo
  },`;
  
  const styleReplacement = `  headerContainer: {
    width: '100%',
    aspectRatio: 3, // 3:1 - funciona em qualquer dispositivo
  },
  logoOverlayContainer: {
    position: 'absolute',
    left: 16,
    top: '20%',
    zIndex: 10,
    aspectRatio: 1,
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
  
  if (c.includes(styleTarget)) {
    c = c.replace(styleTarget, styleReplacement);
    console.log('Estilos da logo adicionados');
  }
}

// 4. Para a logo ficar sobreposta corretamente, precisamos que o logoOverlayContainer
// esteja fora do ScrollView ou que o headerContainer não clipe o conteudo
// A melhor opcao eh envolver o headerContainer + logo em um wrapper
// Mas como ja fizemos, vamos apenas garantir que o headerContainer nao tenha overflow hidden

// Salvar
if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
} else {
  console.log('Nenhuma alteracao feita');
}

// Verificar estado final
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao ===');
console.log('logoOverlayContainer style:', c2.includes('logoOverlayContainer:') ? 'OK' : 'FALTA');
console.log('logoOverlay JSX:', c2.includes('<StorageImage storagePath={business.logo}') ? 'OK' : 'FALTA');
console.log('StorageImage import:', c2.includes('import StorageImage') ? 'OK' : 'FALTA');
