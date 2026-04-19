const fs = require('fs');

const filePath = 'src/services/imageUpload.ts';
let c = fs.readFileSync(filePath, 'utf8');
const original = c;

// Adicionar import do ImageCropPicker
if (!c.includes('react-native-image-crop-picker')) {
  c = c.replace(
    "import {\n  ImagePickerResponse,\n  launchImageLibrary,\n  MediaType,\n} from 'react-native-image-picker';",
    `import {
  ImagePickerResponse,
  launchImageLibrary,
  MediaType,
} from 'react-native-image-picker';
import ImageCropPicker from 'react-native-image-crop-picker';`
  );
}

// Adicionar funcao de selecionar+cortar+upload
if (!c.includes('selectCropAndUploadImage')) {
  const newFunctions = `
/**
 * Seleciona uma imagem, abre editor de crop e faz upload.
 * @param storageKey caminho do Firebase Storage
 * @param options aspect ratio (1:1 para logo, 16:9 para capa banner)
 */
export const selectCropAndUploadImage = async (
  storageKey: string,
  cropOptions: {
    width: number;
    height: number;
    cropperCircleOverlay?: boolean;
  },
): Promise<ImageUploadResult> => {
  try {
    const image = await ImageCropPicker.openPicker({
      width: cropOptions.width,
      height: cropOptions.height,
      cropping: true,
      cropperCircleOverlay: cropOptions.cropperCircleOverlay || false,
      compressImageQuality: 0.85,
      mediaType: 'photo',
      includeBase64: false,
      cropperToolbarTitle: 'Ajustar imagem',
      cropperActiveWidgetColor: '#33001b',
      cropperStatusBarColor: '#33001b',
      cropperToolbarColor: '#33001b',
      cropperToolbarWidgetColor: '#ffffff',
      freeStyleCropEnabled: false,
      hideBottomControls: false,
      enableRotationGesture: true,
    });

    if (!image || !image.path) {
      throw new Error('Nenhuma imagem selecionada');
    }

    const downloadURL = await uploadFileNative(image.path, storageKey, 'image/jpeg');
    return {
      uri: image.path,
      downloadURL,
      storagePath: storageKey,
    };
  } catch (error: unknown) {
    // Checar se foi cancelamento
    if (typeof error === 'object' && error !== null) {
      const e = error as { code?: string; message?: string };
      if (e.code === 'E_PICKER_CANCELLED' || e.message?.includes('cancelled')) {
        throw new Error('Selecao cancelada');
      }
    }
    throw error;
  }
};
`;

  // Adicionar apos a funcao selectAndUploadImage
  c = c.replace(
    /export const selectAndUploadImage = async[\s\S]*?^};$/m,
    (match) => match + '\n' + newFunctions
  );
}

if (c !== original) {
  fs.writeFileSync(filePath, c, 'utf8');
  console.log('imageUpload.ts atualizado com crop functions!');
} else {
  console.log('Nenhuma alteracao');
}
