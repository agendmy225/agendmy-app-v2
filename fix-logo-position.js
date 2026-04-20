const fs = require('fs');

const filePath = 'src/features/business/BusinessDetailsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// O problema: logoOverlayContainer esta position: absolute mas sem ref ao container pai
// Precisamos colocar a logo DENTRO do headerContainer para ela ficar relativa a capa
// Ou usar uma abordagem diferente: colocar a logo no wrapper que contem o headerContainer e o businessInfoContainer

// Abordagem correta: mover a logo para DENTRO do headerContainer (após o ImageBackground)
// Assim a position absolute + bottom negativo vai funcionar

// 1. Remover a logo do lugar atual (depois do </View> do headerContainer)
const oldLogoPosition = `              </ImageBackground>
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

const newLogoPosition = `                {/* Logo sobreposta estilo Facebook */}
                <View style={styles.logoOverlayContainer}>
                  {business?.logo ? (
                    <StorageImage storagePath={business.logo} style={styles.logoOverlay} />
                  ) : (
                    <View style={[styles.logoOverlay, styles.logoPlaceholder]}>
                      <Icon name="business" size={36} color={colors.lightText} />
                    </View>
                  )}
                </View>
              </ImageBackground>
            </View>

            {/* Informações do negócio */}`;

if (c.includes(oldLogoPosition)) {
  c = c.replace(oldLogoPosition, newLogoPosition);
  console.log('Logo movida para DENTRO do ImageBackground');
}

// 2. Ajustar o estilo do logoOverlayContainer para posicionar metade fora da capa
// Como agora esta dentro do ImageBackground, o "bottom" eh relativo a capa
const oldStyle = /logoOverlayContainer:\s*\{[^}]+\},/;
const newStyle = `logoOverlayContainer: {
    position: 'absolute',
    left: 16,
    bottom: -45, // metade da altura da logo (90/2) - faz ela sair pra fora da capa
    zIndex: 10,
  },`;

if (oldStyle.test(c)) {
  c = c.replace(oldStyle, newStyle);
  console.log('Estilo do logoOverlayContainer ajustado (bottom: -45)');
}

// 3. Ajustar businessInfoContainer para ter espaco pra logo (que agora sai pra fora)
// Se ja tem paddingTop: 50, precisa virar paddingTop: 60 para respirar
const infoStyleRegex = /businessInfoContainer:\s*\{([^}]+)\}/;
const m = c.match(infoStyleRegex);
if (m) {
  let infoBody = m[1];
  // Remover paddingTop se existir e re-adicionar com 60
  infoBody = infoBody.replace(/paddingTop:[^,\n]+,?\s*/g, '');
  const newInfo = `businessInfoContainer: {
    paddingTop: 60,${infoBody.includes('padding:')?'':`\n    padding: 16,`}${infoBody.replace(/^\s+/, '\n    ')}}`;
  c = c.replace(m[0], newInfo);
  console.log('businessInfoContainer ajustado com paddingTop 60');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificar
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao ===');
console.log('Logo dentro do ImageBackground:', c2.match(/<\/View>\s*<\/ImageBackground>/) && !c2.includes('<View style={styles.logoOverlayContainer}>\n              {business?.logo')?'OK':'...');
console.log('bottom: -45:', c2.includes('bottom: -45')?'OK':'FALTA');
console.log('paddingTop: 60:', c2.includes('paddingTop: 60')?'OK':'FALTA');
