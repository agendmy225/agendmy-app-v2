const fs = require('fs');

const filePath = 'src/features/business/BusinessSettingsScreen.tsx';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// 1. Adicionar import de ImageCropModal e image-picker
if (!c.includes('ImageCropModal')) {
  c = c.replace(
    "import StorageImage from '../../components/common/StorageImage';",
    "import StorageImage from '../../components/common/StorageImage';\nimport ImageCropModal from '../../components/common/ImageCropModal';\nimport { launchImageLibrary } from 'react-native-image-picker';\nimport { uploadImageToFirebase, deleteImageFromFirebase as deleteImg } from '../../services/imageUpload';"
  );
  console.log('Imports adicionados');
}

// 2. Adicionar states para o crop modal (depois dos outros states)
if (!c.includes('cropModalVisible')) {
  // Procurar um state existente para inserir depois
  const anchor = 'const [isUploadingCover, setIsUploadingCover] = useState(false);';
  if (c.includes(anchor)) {
    c = c.replace(
      anchor,
      `${anchor}
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [cropImageUri, setCropImageUri] = useState<string | null>(null);
  const [cropConfig, setCropConfig] = useState<{
    aspectRatio: number;
    outputWidth: number;
    outputHeight: number;
    storageKey: string;
    onSuccess: (url: string, path: string) => void;
    title: string;
  } | null>(null);`
    );
    console.log('States adicionados');
  }
}

// 3. Adicionar função startImageCrop e handleCropConfirm
if (!c.includes('startImageCrop')) {
  // Procurar a primeira função e adicionar antes
  const anchor = 'const fetchBusinessData';
  if (c.includes(anchor)) {
    const cropFunctions = `const startImageCrop = async (
    aspectRatio: number,
    outputWidth: number,
    outputHeight: number,
    storageKey: string,
    title: string,
    onSuccess: (url: string, path: string) => void,
  ) => {
    // 1. Abrir picker para selecionar imagem
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

        // 2. Abrir crop modal
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
    c = c.replace(anchor, cropFunctions + anchor);
    console.log('Funcoes de crop adicionadas');
  }
}

// 4. Adicionar o componente ImageCropModal no final do render (antes do último </View> do container principal)
if (!c.includes('<ImageCropModal')) {
  // Adicionar antes do último </SafeAreaView> ou </View> principal
  // Procurar o fim do return
  const modalJsx = `
      {/* Modal de Crop de Imagem */}
      {cropConfig && (
        <ImageCropModal
          visible={cropModalVisible}
          imageUri={cropImageUri}
          aspectRatio={cropConfig.aspectRatio}
          outputWidth={cropConfig.outputWidth}
          outputHeight={cropConfig.outputHeight}
          title={cropConfig.title}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
`;

  // Achar o final do componente (último </SafeAreaView> ou equivalente antes do export)
  // Vamos adicionar antes de </ScrollView> final ou fim do return
  const exportIdx = c.lastIndexOf('export default');
  if (exportIdx > -1) {
    // Procurar de tras pra frente o ultimo </SafeAreaView>, </View> ou </ScrollView>
    const before = c.substring(0, exportIdx);
    const lastCloseTag = Math.max(
      before.lastIndexOf('</SafeAreaView>'),
      before.lastIndexOf('</View>'),
    );
    if (lastCloseTag > -1) {
      c = c.substring(0, lastCloseTag) + modalJsx + '    ' + c.substring(lastCloseTag);
      console.log('ImageCropModal adicionado no JSX');
    }
  }
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('BusinessSettingsScreen atualizado!');
} else {
  console.log('Nenhuma alteracao');
}
