const fs = require('fs');

// ===== 1. Fixar aspectRatio 3:1 no BusinessSettingsScreen =====
const bsPath = 'src/features/business/BusinessSettingsScreen.tsx';
let bs = fs.readFileSync(bsPath, 'utf8');
const origBs = bs;

// Substituir o calculo dinamico pela proporcao fixa 3:1
const oldDynamic = `    const storageKey = \`businesses/\${businessId}/cover_\${Date.now()}.jpg\`;
    // A capa e exibida como width=100% height=200px no cliente
    // Calcular aspectRatio real baseado na largura da tela do dispositivo
    const screenWidth = Dimensions.get('window').width;
    const coverAspectRatio = screenWidth / 200;
    const outputW = Math.round(screenWidth * 2); // 2x resolution para qualidade
    const outputH = 400;
    startImageCrop(
      coverAspectRatio,
      outputW,
      outputH,
      storageKey,
      'Ajustar Capa',`;

const newFixed = `    const storageKey = \`businesses/\${businessId}/cover_\${Date.now()}.jpg\`;
    // Aspect ratio fixo 3:1 - funciona em qualquer dispositivo (mobile, tablet)
    startImageCrop(
      3,
      1200,
      400,
      storageKey,
      'Ajustar Capa',`;

if (bs.includes(oldDynamic)) {
  bs = bs.replace(oldDynamic, newFixed);
  console.log('BusinessSettings: aspectRatio fixado em 3:1');
}

if (bs !== origBs) {
  fs.writeFileSync(bsPath, bs, 'utf8');
  console.log('BusinessSettingsScreen salvo');
}

// ===== 2. Atualizar BusinessDetailsScreen para usar aspectRatio 3:1 =====
const bdPath = 'src/features/business/BusinessDetailsScreen.tsx';
let bd = fs.readFileSync(bdPath, 'utf8');
const origBd = bd;

// Substituir height: 200 do headerContainer por aspectRatio: 3
bd = bd.replace(
  `  headerContainer: {
    height: 200,
  },`,
  `  headerContainer: {
    width: '100%',
    aspectRatio: 3, // 3:1 - funciona em qualquer dispositivo
  },`
);

if (bd !== origBd) {
  fs.writeFileSync(bdPath, bd, 'utf8');
  console.log('BusinessDetailsScreen: headerContainer com aspectRatio 3:1');
}

console.log('\nDone! Agora a capa e responsiva em qualquer dispositivo.');
