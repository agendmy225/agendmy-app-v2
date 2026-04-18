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
  storagePath: string;
}

export interface VideoUploadResult {
  uri: string;
  downloadURL: string;
  storagePath: string;
  duration?: number;
}

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

export const uploadImageToFirebase = async (
  imageUri: string,
  options: ImageUploadOptions,
  _onProgress?: (progress: number) => void,
): Promise<string> => {
  try {
    const { storageKey } = options;
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }
    const storageRef = ref(storage, storageKey);
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const metadata = {
      contentType: 'image/jpeg',
      customMetadata: {
        uploadedBy: currentUser.uid,
        uploadedAt: new Date().toISOString(),
      },
    };
    await uploadBytes(storageRef, blob, metadata);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error: unknown) {
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

export const selectAndUploadImage = async (
  options: ImageUploadOptions,
  _onProgress?: (progress: number) => void,
): Promise<ImageUploadResult> => {
  try {
    const response = await selectImage();
    const asset = response.assets?.[0];
    if (!asset?.uri) {
      throw new Error('Nenhuma imagem selecionada ou URI indisponível');
    }
    const downloadURL = await uploadImageToFirebase(asset.uri, options, _onProgress);
    return {
      uri: asset.uri,
      downloadURL,
      storagePath: options.storageKey,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('cancelada')) {
      Alert.alert('Info', 'A seleção de imagem foi cancelada.');
    }
    throw error;
  }
};

export const selectAndUploadVideo = async (
  storageKey: string,
  _onProgress?: (progress: number) => void,
): Promise<VideoUploadResult> => {
  return new Promise((resolve, reject) => {
    const options = {
      mediaType: 'video' as MediaType,
      videoQuality: 'medium' as const,
      durationLimit: 20,
    };
    launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        Alert.alert('Info', 'A seleção de vídeo foi cancelada.');
        reject(new Error('Seleção cancelada'));
        return;
      }
      if (response.errorMessage) {
        reject(new Error(response.errorMessage));
        return;
      }
      const asset = response.assets?.[0];
      if (!asset?.uri) {
        reject(new Error('Nenhum vídeo selecionado'));
        return;
      }
      const duration = asset.duration || 0;
      if (duration > 20) {
        Alert.alert(
          'Vídeo muito longo',
          `Seu vídeo tem ${Math.round(duration)} segundos. O limite é 20 segundos. Por favor, selecione um vídeo mais curto.`,
          [{ text: 'OK' }],
        );
        reject(new Error('Vídeo muito longo'));
        return;
      }
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          reject(new Error('Usuário não autenticado'));
          return;
        }
        const storageRef = ref(storage, storageKey);
        const resp = await fetch(asset.uri);
        const blob = await resp.blob();
        const metadata = {
          contentType: 'video/mp4',
          customMetadata: {
            uploadedBy: currentUser.uid,
            uploadedAt: new Date().toISOString(),
          },
        };
        await uploadBytes(storageRef, blob, metadata);
        const downloadURL = await getDownloadURL(storageRef);
        resolve({
          uri: asset.uri,
          downloadURL,
          storagePath: storageKey,
          duration,
        });
      } catch (err) {
        reject(err);
      }
    });
  });
};

export const deleteImageFromFirebase = async (imageUrl: string): Promise<void> => {
  try {
    if (!imageUrl || imageUrl.includes('placeholder')) {
      return;
    }
    const reference = ref(storage, imageUrl);
    await deleteObject(reference);
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const firebaseError = error as { code: string };
      if (firebaseError.code !== 'storage/object-not-found') {
        console.error('Erro ao deletar arquivo:', error);
      }
    }
  }
};

export const showImagePickerDialog = (title: string, onConfirm: () => void): void => {
  Alert.alert(
    title,
    'Escolha uma opção:',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Selecionar da Galeria', onPress: onConfirm },
    ],
  );
};
