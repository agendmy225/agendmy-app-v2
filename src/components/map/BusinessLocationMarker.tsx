import React, { memo, useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { Marker } from 'react-native-maps';
import FastImage from '@d11/react-native-fast-image';
import { colors } from '../../constants/colors';

interface BusinessLocation {
  businessId: string;
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
}

interface BusinessLocationMarkerProps {
  business: BusinessLocation;
  onPress?: () => void;
}

const MARKER_SIZE = 40;

export const BusinessLocationMarker: React.FC<BusinessLocationMarkerProps> = memo(({ business, onPress }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isRenderComplete, setIsRenderComplete] = useState(false);

  // Reset states when business changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setIsRenderComplete(false);
  }, [business.businessId]);

  // Mark render as complete after image loads or after timeout
  useEffect(() => {
    if (imageLoaded || imageError) {
      const timer = setTimeout(() => {
        setIsRenderComplete(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [imageLoaded, imageError]);

  const handleImageLoad = () => {
    console.log(`âœ… FastImage carregada para ${business.name}`);
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    console.error(`âŒ Erro FastImage para ${business.name}`);
    setImageError(true);
    setImageLoaded(false);
  };

  return (
    <Marker
      key={`location_marker_${business.businessId}`}
      coordinate={{
        latitude: business.latitude,
        longitude: business.longitude,
      }}
      onPress={onPress}
      title={business.name}
      description={business.description}
      // CRÃTICO: Para quando renderização estiver completa
      tracksViewChanges={!isRenderComplete}
    >
      <View style={styles.markerContainer}>
        <View style={styles.markerWrapper}>
          {/* Por enquanto, vamos usar apenas o marcador padrão com inicial */}
          <View style={styles.defaultMarker}>
            <Text style={styles.defaultMarkerText}>
              {business.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
    </Marker>
  );
});

BusinessLocationMarker.displayName = 'BusinessLocationMarker';

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
