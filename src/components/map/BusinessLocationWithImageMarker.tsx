import React, { memo, useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { Marker } from 'react-native-maps';
import FastImage from '@d11/react-native-fast-image';
import { colors } from '../../constants/colors';
import { useMarkerImage } from '../../hooks/useMarkerImage';

interface BusinessLocation {
  businessId: string;
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
}

interface BusinessLocationWithImageMarkerProps {
  business: BusinessLocation;
  onPress?: () => void;
}

const MARKER_SIZE = 40;

export const BusinessLocationWithImageMarker: React.FC<BusinessLocationWithImageMarkerProps> = memo(({ business, onPress }) => {
  const [isRenderComplete, setIsRenderComplete] = useState(false);
  
  // Usar seu hook existente para carregar a imagem
  const { uri, isLoading, error, isReady } = useMarkerImage(business.businessId, {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
  });

  // Mark render as complete when image is ready or failed
  useEffect(() => {
    if (isReady || error) {
      const timer = setTimeout(() => {
        setIsRenderComplete(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isReady, error]);

  console.log(`🔍 Marker ${business.name}: loading=${isLoading}, ready=${isReady}, error=${error}, uri=${!!uri}`);

  return (
    <Marker
      key={`img_marker_${business.businessId}`}
      coordinate={{
        latitude: business.latitude,
        longitude: business.longitude,
      }}
      onPress={onPress}
      title={business.name}
      description={business.description}
      // CRÍTICO: Para quando renderização estiver completa
      tracksViewChanges={!isRenderComplete}
    >
      <View style={styles.markerContainer}>
        <View style={styles.markerWrapper}>
          {isReady && uri && !error ? (
            <FastImage
              source={{ 
                uri,
                cache: FastImage.cacheControl.immutable,
                priority: FastImage.priority.normal,
              }}
              style={styles.markerImage}
              resizeMode={FastImage.resizeMode.cover}
              onLoad={() => console.log(`✅ FastImage renderizada para ${business.name}`)}
              onError={() => console.error(`❌ Erro FastImage renderização ${business.name}`)}
            />
          ) : (
            <View style={styles.defaultMarker}>
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.defaultMarkerText}>
                  {business.name.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    </Marker>
  );
});

BusinessLocationWithImageMarker.displayName = 'BusinessLocationWithImageMarker';

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
