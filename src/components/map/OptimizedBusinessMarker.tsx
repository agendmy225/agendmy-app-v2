import React, { memo, useState, useEffect } from 'react';
import { StyleSheet, View, Image, Text, ActivityIndicator } from 'react-native';
import { Marker } from 'react-native-maps';
import { Business } from '../../services/businesses';
import { colors } from '../../constants/colors';

interface BusinessMarkerProps {
  business: Business;
  onPress?: () => void;
}

const MARKER_SIZE = 40;

export const OptimizedBusinessMarker: React.FC<BusinessMarkerProps> = memo(({ business, onPress }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isRenderComplete, setIsRenderComplete] = useState(false);

  // Reset states when business changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setIsRenderComplete(false);
  }, [business.id]);

  // Mark render as complete after image loads or after timeout
  useEffect(() => {
    if (imageLoaded || imageError) {
      const timer = setTimeout(() => {
        setIsRenderComplete(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [imageLoaded, imageError]);

  // NÃƒÆ’Ã‚Â£o renderiza se nÃƒÆ’Ã‚Â£o tiver localizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
  if (!business.location?.latitude || !business.location?.longitude) {
    return null;
  }

  const handleImageLoad = () => {
    console.log(`ÃƒÂ¢Ã‚Å“Ã‚â€¦ Imagem carregada para ${business.name}`);
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    console.error(`ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao carregar imagem para ${business.name}`);
    setImageError(true);
    setImageLoaded(false);
  };

  return (
    <Marker
      key={`marker_${business.id}`} // Key ÃƒÆ’Ã‚Âºnica para evitar reutilizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
      coordinate={{
        latitude: business.location.latitude,
        longitude: business.location.longitude,
      }}
      onPress={onPress}
      title={business.name}
      description={business.description}
      // CRÃƒÆ’Ã‚ÂTICO: SÃƒÆ’Ã‚Â³ para de rastrear mudanÃƒÆ’Ã‚Â§as quando tudo estiver renderizado
      tracksViewChanges={!isRenderComplete}
    >
      <View style={styles.markerContainer}>
        <View style={styles.markerWrapper}>
          {business.logo && !imageError ? (
            <>
              <Image
                source={{ uri: business.logo }}
                style={styles.markerImage}
                onLoad={handleImageLoad}
                onError={handleImageError}
                resizeMode="cover"
              />
              {!imageLoaded && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </>
          ) : (
            <View style={styles.defaultMarker}>
              <Text style={styles.defaultMarkerText}>
                {business.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Marker>
  );
});

OptimizedBusinessMarker.displayName = 'OptimizedBusinessMarker';

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerWrapper: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.white,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  markerImage: {
    width: '100%',
    height: '100%',
    borderRadius: MARKER_SIZE / 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: MARKER_SIZE / 2,
  },
  defaultMarker: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: MARKER_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultMarkerText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
