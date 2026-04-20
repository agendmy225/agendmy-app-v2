const fs = require('fs');

const filePath = 'src/features/business/BusinessSettingsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Procurar um anchor unico que sabemos que existe - o handleLogoSelection
const idxLogo = c.indexOf('const handleLogoSelection');
if (idxLogo === -1) {
  console.log('Nao encontrei handleLogoSelection');
} else {
  // Inserir as funcoes antes de handleLogoSelection
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

  c = c.substring(0, idxLogo) + newFunctions + c.substring(idxLogo);
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('As 3 funcoes de crop adicionadas!');
}
