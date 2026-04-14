import { Alert } from 'react-native';
import {
  ImagePickerResponse,
  launchImageLibrary,
  MediaType,
} from 'react-native-image-picker';
import { storage, auth, ref, uploadBytes, getDownloadURL, deleteObject } from '../config/firebase';

export interface ImageUploadOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  storageKey: string;
}

export interface ImageUploadResult {
  uri: string;
  downloadURL: string;
  storagePath: string; // <-- ADICIONE ESTA LINHA
}

/**
 * Abre o seletor de imagens e permite ao usuário escolher uma foto
 */
export const selectImage = (): Promise<ImagePickerResponse> => {
  return new Promise((resolve, reject) => {
    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8 as const,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        reject(new Error('Seleção cancelada'));
      } else if (response.errorMessage) {
        reject(new Error(response.errorMessage));
      } else {
        resolve(response);
      }
    });
  });
};

/**
 * Faz upload de uma imagem para o Firebase Storage
 */
export const uploadImageToFirebase = async (
  imageUri: string,
  options: ImageUploadOptions,
  _onProgress?: (progress: number) => void,
): Promise<string> => {
  try {
    const { storageKey } = options;

    // Verificar se usuário está autenticado
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }

    // Criar referência no Firebase Storage
    const storageRef = ref(storage, storageKey);

    // Converter URI para Blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Configurar metadados
    const metadata = {
      contentType: 'image/jpeg',
      customMetadata: {
        uploadedBy: currentUser.uid,
        uploadedAt: new Date().toISOString(),
      },
    };

    // Fazer upload da imagem com metadados
    await uploadBytes(storageRef, blob, metadata);

    // Obter URL de download
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error: unknown) {

    // Mensagens de erro mais específicas
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const firebaseError = error as { code: string };
      if (firebaseError.code === 'storage/unauthorized') {
        throw new Error('Usuário não autorizado a fazer upload. Verifique as regras do Firebase Storage.');
      } else if (firebaseError.code === 'storage/canceled') {
        throw new Error('Upload cancelado.');
      } else if (firebaseError.code === 'storage/unknown') {
        throw new Error('Erro desconhecido no upload. Verifique sua conexão.');
      }
    }


    throw error;
  }
};

/**
 * Seleciona uma imagem e faz upload para o Firebase Storage
 */
export const selectAndUploadImage = async (
  options: ImageUploadOptions,
  _onProgress?: (progress: number) => void,
): Promise<ImageUploadResult> => {
  try {
    // Selecionar imagem
    const response = await selectImage();

    const asset = response.assets?.[0];

    if (!asset?.uri) {
      throw new Error('Nenhuma imagem selecionada ou URI indisponível');
    }

    // Fazer upload
    const downloadURL = await uploadImageToFirebase(asset.uri, options, _onProgress);

    return {
      uri: asset.uri,
      downloadURL,
      storagePath: options.storageKey,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('cancelada')) {
      // Não tratar como um erro fatal, apenas informar o usuário
      Alert.alert('Info', 'A seleção de imagem foi cancelada.');
    }
    throw error;
  }
};

/**
 * Remove uma imagem do Firebase Storage
 */
export const deleteImageFromFirebase = async (
  imageUrl: string,
): Promise<void> => {
  try {
    if (!imageUrl || imageUrl.includes('placeholder')) {
      return;
    }

    // A referência pode ser criada diretamente do caminho do storage
    const reference = ref(storage, imageUrl);
    await deleteObject(reference);
  } catch (error: unknown) {
    // Não propagar o erro pois a imagem pode já ter sido deletada
    // mas loggar para debug
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const firebaseError = error as { code: string };
      if (firebaseError.code !== 'storage/object-not-found') {
      }
    }
  }
};

/**
 * Mostra um dialog de confirmação para selecionar uma imagem
 */
export const showImagePickerDialog = (
  title: string,
  onConfirm: () => void,
): void => {
  Alert.alert(
    title,
    'Escolha uma opção:',
    [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Selecionar da Galeria',
        onPress: onConfirm,
      },
    ],
  );
};
