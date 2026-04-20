const fs = require('fs');

const filePath = 'src/features/business/BusinessSettingsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');

if (c.includes('startImageCrop')) {
  console.log('startImageCrop ja existe');
} else {
  // Procurar handleCropConfirm para adicionar antes dele
  const anchor = '  const handleCropConfirm = async';
  if (c.includes(anchor)) {
    const newFunctions = `  const startImageCrop = async (
    aspectRatio: number,
    outputWidth: number,
    outputHeight: number,
    storageKey: string,
    title: string,
    onSuccess: (url: string, path: string) => void,
  ) => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: false,
        quality: 1,
      },
      (response) => {
        if (response.didCancel || response.errorMessage) {
          return;
        }
        const asset = response.assets?.[0];
        if (!asset?.uri) return;

        setCropConfig({
          aspectRatio,
          outputWidth,
          outputHeight,
          storageKey,
          title,
          onSuccess,
        });
        setCropImageUri(asset.uri);
        setCropModalVisible(true);
      },
    );
  };

`;
    c = c.replace(anchor, newFunctions + anchor);
    fs.writeFileSync(filePath, c, 'utf8');
    console.log('startImageCrop adicionado!');
  } else {
    console.log('Anchor nao encontrado - handleCropConfirm');
  }
}

// Verificar se handleCropCancel existe tambem
if (!c.includes('handleCropCancel')) {
  console.log('handleCropCancel nao existe - adicionar depois do handleCropConfirm');
}
