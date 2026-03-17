// Crie este novo arquivo: src/components/StorageImage.tsx

import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, ImageSourcePropType } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';
import { firebaseStorage } from '../../config/firebase';

interface StorageImageProps {
  storagePath?: string | null;
  style: any;
  defaultSource?: ImageSourcePropType;
}

const StorageImage: React.FC<StorageImageProps> = ({ storagePath, style, defaultSource }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (storagePath && !storagePath.includes('placeholder')) {
      setIsLoading(true);
      setHasError(false);

      const imageRef = firebaseStorage.ref(storagePath);
      imageRef.getDownloadURL()
        .then((url: string) => {
          if (isMounted) {
            setImageUrl(url);
          }
        })
        .catch((error: any) => {
          console.error(`[StorageImage] Falha ao obter URL para: ${storagePath}`, error);
          if (isMounted) {
            setHasError(true);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    } else {
      setIsLoading(false);
      setHasError(true); // Se não houver caminho, considere como um erro para mostrar o fallback
    }

    return () => {
      isMounted = false;
    };
  }, [storagePath]);

  if (isLoading) {
    return (
      <View style={[style, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (hasError || !imageUrl) {
    if (defaultSource) {
      return <Image source={defaultSource} style={style} />;
    }
    return (
      <View style={[style, styles.errorContainer]}>
        <Icon name="image-not-supported" size={24} color={colors.lightText} />
      </View>
    );
  }

  return <Image source={{ uri: imageUrl }} style={style} />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
  },
});

export default StorageImage;
