import { Alert } from 'react-native';
import {
  ImagePickerResponse,
  launchImageLibrary,
  MediaType,
} from 'react-native-image-picker';
import ImageCropPicker from 'react-native-image-crop-picker';
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
        reject(new Error('Selecao cancelada'));
      } else if (response.errorMessage) {
        reject(new Error(response.errorMessage));
      } else {
        resolve(response);
      }
    });
  });
};

const uploadFileNative = async (
  uri: string,
  storageKey: string,
  contentType: string = 'image/jpeg',
): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Usuario nao autenticado');
  }

  const storageRef = ref(storage, storageKey);

  try {
    // @ts-ignore - putFile is native Firebase RN method
    if (typeof storageRef.putFile === 'function') {
      // @ts-ignore
      await storageRef.putFile(uri, { contentType });
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    }
  } catch (err) {
    console.log('[ImageUpload] putFile failed, trying uploadBytes:', err);
  }

  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const metadata = {
      contentType,
      customMetadata: {
        uploadedBy: currentUser.uid,
        uploadedAt: new Date().toISOString(),
      },
    };
    await uploadBytes(storageRef, blob, metadata);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (err) {
    throw err;
  }
};

export const uploadImageToFirebase = async (
  imageUri: string,
  options: ImageUploadOptions,
  _onProgress?: (progress: number) => void,
): Promise<string> => {
  try {
    return await uploadFileNative(imageUri, options.storageKey, 'image/jpeg');
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const firebaseError = error as { code: string };
      if (firebaseError.code === 'storage/unauthorized') {
        throw new Error('Usuario nao autorizado a fazer upload.');
      } else if (firebaseError.code === 'storage/canceled') {
        throw new Error('Upload cancelado.');
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
      throw new Error('Nenhuma imagem selecionada');
    }
    const downloadURL = await uploadImageToFirebase(asset.uri, options, _onProgress);
    return {
      uri: asset.uri,
      downloadURL,
      storagePath: options.storageKey,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('cancelada')) {
      Alert.alert('Info', 'A selecao de imagem foi cancelada.');
    }
    throw error;
  }
};

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
        Alert.alert('Info', 'A selecao de video foi cancelada.');
        reject(new Error('Selecao cancelada'));
        return;
      }
      if (response.errorMessage) {
        reject(new Error(response.errorMessage));
        return;
      }
      const asset = response.assets?.[0];
      if (!asset?.uri) {
        reject(new Error('Nenhum video selecionado'));
        return;
      }
      const duration = asset.duration || 0;
      if (duration > 20) {
        Alert.alert(
          'Video muito longo',
          'Seu video tem ' + Math.round(duration) + ' segundos. O limite e 20 segundos.',
          [{ text: 'OK' }],
        );
        reject(new Error('Video muito longo'));
        return;
      }
      try {
        const downloadURL = await uploadFileNative(asset.uri, storageKey, 'video/mp4');
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
    'Escolha uma opcao:',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Selecionar da Galeria', onPress: onConfirm },
    ],
  );
};
