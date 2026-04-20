const fs = require('fs');

const filePath = 'src/features/business/BusinessDetailsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Verificar se ja tem StorageImage importado
const hasStorageImage = c.includes("import StorageImage");
if (!hasStorageImage) {
  console.log('StorageImage nao importado, adicionando...');
  c = c.replace(
    /from '\.\.\/\.\.\/constants\/colors';/,
    "from '../../constants/colors';\nimport StorageImage from '../../components/common/StorageImage';"
  );
}

// 2. Adicionar a logo sobreposta apos </ImageBackground></View> (fim do headerContainer)
// Encontrar e modificar essa parte
const oldHeader = `            </View>
            {/* Informações do negócio */}
            <View style={styles.businessInfoContainer}>
              <Text style={styles.businessName}>{business?.name || 'Nome não disponível'}</Text>`;

const newHeader = `            </View>

            {/* Container da logo sobreposta (estilo Facebook) */}
            <View style={styles.logoOverlayContainer}>
              {business?.logo ? (
                <StorageImage storagePath={business.logo} style={styles.logoOverlay} />
              ) : (
                <View style={[styles.logoOverlay, styles.logoPlaceholder]}>
                  <Icon name="business" size={36} color={colors.lightText} />
                </View>
              )}
            </View>

            {/* Informações do negócio */}
            <View style={styles.businessInfoContainer}>
              <Text style={styles.businessName}>{business?.name || 'Nome não disponível'}</Text>`;

if (c.includes(oldHeader)) {
  c = c.replace(oldHeader, newHeader);
  console.log('Logo sobreposta adicionada no JSX');
}

// 3. Adicionar estilos da logo sobreposta
// Procurar businessInfoContainer e adicionar os novos estilos antes
if (!c.includes('logoOverlayContainer:')) {
  const oldStyle = `  headerContainer: {
    width: '100%',
    aspectRatio: 3, // 3:1 - funciona em qualquer dispositivo
  },`;

  const newStyle = `  headerContainer: {
    width: '100%',
    aspectRatio: 3, // 3:1 - funciona em qualquer dispositivo
  },
  logoOverlayContainer: {
    position: 'absolute',
    left: 16,
    // Posicao: a capa tem aspectRatio 3 (1/3 da largura = altura)
    // Queremos a logo sobreposta metade na capa, metade fora
    // Usamos um valor aproximado que funciona em qualquer tela
    top: '25%', // na parte final da capa
    zIndex: 10,
  },
  logoOverlay: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: colors.white,
    backgroundColor: colors.white,
  },
  logoPlaceholder: {
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },`;

  if (c.includes(oldStyle)) {
    c = c.replace(oldStyle, newStyle);
    console.log('Estilos da logo adicionados');
  }
}

// 4. Ajustar o businessInfoContainer para nao ficar embaixo da logo
// Adicionar paddingLeft para nao sobrepor
if (!c.includes('businessInfoContainer:') || c.includes('businessInfoContainer:')) {
  // Procurar estilo atual de businessInfoContainer
  const m = c.match(/businessInfoContainer:\s*\{[^}]+\}/);
  if (m) {
    const currentStyle = m[0];
    // Verificar se ja tem paddingTop apropriado
    if (!currentStyle.includes('paddingTop: 50')) {
      const newInfoStyle = currentStyle.replace(
        'businessInfoContainer: {',
        'businessInfoContainer: {\n    paddingTop: 50, // espaco para a logo sobreposta'
      );
      c = c.replace(currentStyle, newInfoStyle);
      console.log('businessInfoContainer ajustado com paddingTop');
    }
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
} else {
  console.log('Nenhuma alteracao');
}
