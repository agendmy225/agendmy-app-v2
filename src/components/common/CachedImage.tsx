import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StyleProp, Image, ImageStyle, ImageSourcePropType } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';
import { useCachedFirebaseImage } from '../../hooks/useCachedFirebaseImage';

interface CachedImageProps {
  storagePath: string | null | undefined;
  style: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  defaultSource?: ImageSourcePropType;
}

const CachedImage: React.FC<CachedImageProps> = ({ storagePath, style, resizeMode = 'cover', defaultSource }) => {
  const { imageSource, loading, error } = useCachedFirebaseImage(storagePath);
  const [imageLoadComplete, setImageLoadComplete] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Mostra loading apenas enquanto o hook estÃ¡ carregando E a imagem nÃ£o foi carregada ainda
  const isLoading = loading && !imageLoadComplete;

  // Mostra erro se: hook tem erro OU falha no carregamento da imagem OU nÃ£o tem imageSource
  const hasError = error || imageError || (!loading && !imageSource);

  // LÃ³gica de renderizaÃ§Ã£o simplificada
  if (hasError) {
    if (defaultSource) {
      return <Image source={defaultSource} style={style} resizeMode={resizeMode} />;
    }
    return (
      <View style={[style, styles.placeholder]}>
        <Icon name="image-not-supported" size={24} color={colors.lightText} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[style, styles.placeholder]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (imageSource && !hasError) {
    return (
      <Image
        style={style}
        source={{ uri: imageSource }}
        resizeMode={resizeMode}
        onLoadEnd={() => {
          setImageLoadComplete(true);
          setImageError(false);
        }}
        onError={() => {
          setImageError(true);
          setImageLoadComplete(true);
        }}
      />
    );
  }

  // Fallback final (nÃ£o deveria chegar aqui normalmente)
  return (
    <View style={[style, styles.placeholder]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
  },
  activityIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  }
});

export default CachedImage;