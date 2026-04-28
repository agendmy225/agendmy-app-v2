const fs = require('fs');

const filePath = 'src/features/business/BusinessDetailsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Padrao quebrado:
// <View style={[styles.logoOverlay, styles.logoPlaceholder]}>
//   <Icon ... />
// </View>
// </ImageBackground>
// </View>
//   )}
// </View>

// Vai virar:
// <View style={[styles.logoOverlay, styles.logoPlaceholder]}>
//   <Icon ... />
// </View>
//   )}
// </View>
// </ImageBackground>
// </View>

// Procurar o trecho quebrado com regex flexivel
const brokenRegex = /(<View style=\{\[styles\.logoOverlay, styles\.logoPlaceholder\]\}>\s*<Icon name="business"[^/]+\/>\s*<\/View>)\s*<\/ImageBackground>\s*<\/View>\s*(\)\}\s*<\/View>)/;

const m = c.match(brokenRegex);
if (m) {
  console.log('Padrao quebrado encontrado!');
  // Reordenar: a View do placeholder, ) do ternario, View do logoOverlayContainer, depois ImageBackground e a View externa
  const replacement = `${m[1]}
                  ${m[2]}
              </ImageBackground>
            </View>`;
  c = c.replace(brokenRegex, replacement);
  console.log('JSX corrigido!');
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificar resultado
const c2 = fs.readFileSync(filePath, 'utf8');
const lines = c2.split('\n');
let foundLine = -1;
for (let i = 0; i < lines.length && i < 600; i++) {
  if (lines[i].includes('logoOverlayContainer')) {
    foundLine = i;
    break;
  }
}
if (foundLine > -1) {
  console.log('\n=== Apos fix - linhas em volta da logo ===');
  for (let i = Math.max(0, foundLine - 2); i < Math.min(lines.length, foundLine + 18); i++) {
    console.log((i+1) + ': ' + lines[i]);
  }
}
