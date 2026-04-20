const fs = require('fs');

const filePath = 'src/features/business/BusinessSettingsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Função helper para encontrar o fim de uma arrow function async
function findFunctionEnd(text, startIdx) {
  let i = text.indexOf('=> {', startIdx) + 4;
  let depth = 0;
  while (i < text.length) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      if (depth === 0) {
        if (text.substr(i, 2) === '};') return i + 2;
      }
      depth--;
    }
    i++;
  }
  return -1;
}

// ===== 1. Substituir handleUploadLogo =====
const logoStart = c.indexOf('const handleUploadLogo');
if (logoStart !== -1) {
  const logoEnd = findFunctionEnd(c, logoStart);
  if (logoEnd !== -1) {
    const newLogoFn = `const handleUploadLogo = async () => {
    if (!businessId) {
      Alert.alert('Erro', 'ID do negócio não encontrado');
      return;
    }
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
      return;
    }
    const storageKey = \`businesses/\${businessId}/logo_\${Date.now()}.jpg\`;
    startImageCrop(
      1,
      512,
      512,
      storageKey,
      'Ajustar Logo',
      async (_url, path) => {
        if (settings.logo && !settings.logo.includes('placeholder')) {
          await deleteImageFromFirebase(settings.logo);
        }
        updateSettings('logo', path);
        Alert.alert('Sucesso', 'Logo atualizado com sucesso!');
      },
    );
  };`;
    c = c.substring(0, logoStart) + newLogoFn + c.substring(logoEnd);
    console.log('handleUploadLogo substituido (posicoes', logoStart, 'a', logoEnd, ')');
  }
}

// ===== 2. Substituir handleUploadCoverImage =====
// Busca novamente porque posicoes mudaram
const coverStart = c.indexOf('const handleUploadCoverImage');
if (coverStart !== -1) {
  const coverEnd = findFunctionEnd(c, coverStart);
  if (coverEnd !== -1) {
    const newCoverFn = `const handleUploadCoverImage = async () => {
    if (!businessId) {
      Alert.alert('Erro', 'ID do negócio não encontrado');
      return;
    }
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
      return;
    }
    const storageKey = \`businesses/\${businessId}/cover_\${Date.now()}.jpg\`;
    startImageCrop(
      16 / 9,
      1200,
      675,
      storageKey,
      'Ajustar Capa',
      async (_url, path) => {
        if (settings.coverImage && !settings.coverImage.includes('placeholder')) {
          await deleteImageFromFirebase(settings.coverImage);
        }
        updateSettings('coverImage', path);
        Alert.alert('Sucesso', 'Imagem de capa atualizada com sucesso!');
      },
    );
  };`;
    c = c.substring(0, coverStart) + newCoverFn + c.substring(coverEnd);
    console.log('handleUploadCoverImage substituido');
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}
