const fs = require('fs');

const filePath = 'src/features/business/BusinessDetailsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Procurar o JSX da logo que esta no lugar errado e mover para dentro do ImageBackground
// O logo bloco atual:
const logoBlock = `            </View>
            {/* Logo sobreposta estilo Facebook */}
            <View style={styles.logoOverlayContainer}>
              {business?.logo ? (
                <StorageImage storagePath={business.logo} style={styles.logoOverlay} />
              ) : (
                <View style={[styles.logoOverlay, styles.logoPlaceholder]}>
                  <Icon name="business" size={36} color={colors.lightText} />
                </View>
              )}
            </View>`;

// Vai virar (logo movida para DENTRO do ImageBackground):
const newPosition = `              {/* Logo sobreposta estilo Facebook */}
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
            </View>`;

// Procurar pelo padrao que precisamos remover/transformar
// Atual: </ImageBackground>\n</View>\n{/* Logo */}\n<View logo>...</View>
// Novo:  {/* Logo */}\n<View logo>...</View>\n</ImageBackground>\n</View>

const oldPattern = `              </ImageBackground>
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
            </View>`;

const newPattern = `                {/* Logo sobreposta estilo Facebook */}
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
            </View>`;

if (c.includes(oldPattern)) {
  c = c.replace(oldPattern, newPattern);
  console.log('Logo movida para DENTRO do ImageBackground');
} else {
  console.log('Padrao exato nao bateu, tentando alternativa');
  // Tentar versao mais flexivel ignorando whitespace
  const flexRegex = /(\s*<\/ImageBackground>)\s*(<\/View>)\s*(\{\/\* Logo sobreposta[^]*?<\/View>)/;
  const m = c.match(flexRegex);
  if (m) {
    const replacement = `\n                ${m[3].replace(/^\s+/, '').replace(/\n            /g, '\n                ')}\n              </ImageBackground>\n            </View>`;
    c = c.replace(flexRegex, replacement);
    console.log('Logo movida via regex flexivel');
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificar resultado
const c2 = fs.readFileSync(filePath, 'utf8');
const idxLogo = c2.indexOf('logoOverlayContainer');
const idxImageBg = c2.indexOf('</ImageBackground>');
console.log('\n=== Verificacao ===');
console.log('logoOverlayContainer pos:', idxLogo);
console.log('</ImageBackground> pos:', idxImageBg);
console.log('Logo esta ANTES de </ImageBackground>?', idxLogo < idxImageBg ? 'SIM (correto)' : 'NAO (ainda fora)');
