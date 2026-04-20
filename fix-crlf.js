const fs = require('fs');

const filePath = 'src/features/business/BusinessDetailsScreen.tsx';
// Ler em modo binario para preservar CRLF
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Detectar qual tipo de quebra de linha o arquivo usa
const hasCRLF = c.includes('\r\n');
const EOL = hasCRLF ? '\r\n' : '\n';
console.log('Arquivo usa:', hasCRLF ? 'CRLF (Windows)' : 'LF (Unix)');

// ===== 1. Substituir headerContainer =====
// Procurar usando regex flexivel para qualquer EOL
const headerRegex = /(\s*)headerContainer:\s*\{\s*height:\s*200,\s*\},/;
const headerMatch = c.match(headerRegex);
if (headerMatch) {
  const indent = headerMatch[1];
  const newHeader = `${indent}headerContainer: {${EOL}    width: '100%',${EOL}    aspectRatio: 3,${EOL}  },${EOL}  logoOverlayContainer: {${EOL}    position: 'absolute',${EOL}    left: 16,${EOL}    top: '20%',${EOL}    zIndex: 10,${EOL}  },${EOL}  logoOverlay: {${EOL}    width: 90,${EOL}    height: 90,${EOL}    borderRadius: 45,${EOL}    borderWidth: 4,${EOL}    borderColor: '#fff',${EOL}    backgroundColor: '#fff',${EOL}  },${EOL}  logoPlaceholder: {${EOL}    justifyContent: 'center',${EOL}    alignItems: 'center',${EOL}  },`;
  
  c = c.replace(headerRegex, newHeader);
  console.log('headerContainer + estilos da logo substituidos');
}

// ===== 2. Adicionar JSX da logo (com regex flexivel) =====
if (!c.includes('logoOverlayContainer}>')) {
  const jsxRegex = /(\s*<\/ImageBackground>\s*<\/View>)(\s*\{\/\* Informações do negócio \*\/\})/;
  const jsxMatch = c.match(jsxRegex);
  if (jsxMatch) {
    const logoJsx = `${jsxMatch[1]}${EOL}${EOL}            {/* Logo sobreposta estilo Facebook */}${EOL}            <View style={styles.logoOverlayContainer}>${EOL}              {business?.logo ? (${EOL}                <StorageImage storagePath={business.logo} style={styles.logoOverlay} />${EOL}              ) : (${EOL}                <View style={[styles.logoOverlay, styles.logoPlaceholder]}>${EOL}                  <Icon name="business" size={36} color={colors.lightText} />${EOL}                </View>${EOL}              )}${EOL}            </View>${EOL}${jsxMatch[2]}`;
    c = c.replace(jsxRegex, logoJsx);
    console.log('JSX da logo adicionado');
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificar
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Final ===');
console.log('aspectRatio 3:', c2.includes('aspectRatio: 3,') ? 'OK' : 'FALTA');
console.log('logoOverlayContainer:', c2.includes('logoOverlayContainer:') ? 'OK' : 'FALTA');
console.log('Logo JSX:', c2.includes('<StorageImage storagePath={business.logo}') ? 'OK' : 'FALTA');
