const fs = require('fs');

const filePath = 'src/features/business/BusinessSettingsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Adicionar as 3 funcoes de crop antes de handleUploadLogo
if (!c.includes('const startImageCrop')) {
  const anchor = 'const handleUploadLogo';
  if (c.includes(anchor)) {
    const newFunctions = `const startImageCrop = async (
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

  const handleCropConfirm = async (croppedUri: string) => {
    if (!cropConfig) return;
    setCropModalVisible(false);
    try {
      const downloadURL = await uploadImageToFirebase(croppedUri, {
        storageKey: cropConfig.storageKey,
      });
      cropConfig.onSuccess(downloadURL, cropConfig.storageKey);
    } catch (err) {
      Alert.alert('Erro', 'Nao foi possivel fazer upload da imagem.');
      console.error('[Crop] Erro no upload:', err);
    } finally {
      setCropImageUri(null);
      setCropConfig(null);
    }
  };

  const handleCropCancel = () => {
    setCropModalVisible(false);
    setCropImageUri(null);
    setCropConfig(null);
  };

  `;
    c = c.replace(anchor, newFunctions + anchor);
    console.log('3 funcoes de crop adicionadas');
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('Arquivo salvo!');
}

// Verificar final
const c2 = fs.readFileSync(filePath, 'utf8');
console.log('\n=== Verificacao final ===');
console.log('startImageCrop:', c2.includes('const startImageCrop') ? 'OK' : 'FALTA');
console.log('handleCropConfirm:', c2.includes('const handleCropConfirm') ? 'OK' : 'FALTA');
console.log('handleCropCancel:', c2.includes('const handleCropCancel') ? 'OK' : 'FALTA');
