import React, { memo, useState, useEffect } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { Marker } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Business } from '../../../services/businesses';
import { colors } from '../../../constants/colors';

interface BusinessMarkerProps {
  business: Business;
  onPress: () => void;
}

const MARKER_SIZE = 44;

const getCategoryIcon = (category: string): string => {
  switch (category) {
    case 'saloes-beleza': return 'content-cut';
    case 'barbearias': return 'storefront';
    case 'estetica': return 'spa';
    case 'pet-shops': return 'pets';
    case 'tatuagem': return 'brush';
    case 'academia': return 'fitness-center';
    case 'odontologia': return 'local-hospital';
    case 'fisioterapia': return 'accessibility';
    case 'massagem': return 'healing';
    case 'manicure': return 'colorize';
    default: return 'store';
  }
};

const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'saloes-beleza': return '#E91E63';
    case 'barbearias': return '#795548';
    case 'estetica': return '#9C27B0';
    case 'pet-shops': return '#FF9800';
    case 'tatuagem': return '#424242';
    case 'academia': return '#F44336';
    case 'odontologia': return '#2196F3';
    case 'fisioterapia': return '#4CAF50';
    case 'massagem': return '#00BCD4';
    case 'manicure': return '#FF5722';
    default: return colors.primary;
  }
};

export const BusinessMarker: React.FC<BusinessMarkerProps> = memo(({ business, onPress }) => {
  const [isRenderComplete, setIsRenderComplete] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRenderComplete(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [business.id]);

  if (!business.location?.latitude || !business.location?.longitude) {
    return null;
  }

  const backgroundColor = getCategoryColor(business.category);
  const logoUrl = business.logo || business.coverImage || null;
  const showLogo = logoUrl && !logoError;

  return (
    <Marker
      key={`business_marker_${business.id}`}
      coordinate={{
        latitude: business.location.latitude,
        longitude: business.location.longitude,
      }}
      onPress={onPress}
      title={business.name}
      description={business.description}
      tracksViewChanges={!isRenderComplete}
    >
      <View style={styles.markerContainer}>
        <View style={[styles.markerWrapper, { borderColor: backgroundColor }]}>
          {showLogo ? (
            <Image
              source={{ uri: logoUrl }}
              style={styles.logoImage}
              onError={() => setLogoError(true)}
            />
          ) : (
            <View style={[styles.fallbackBackground, { backgroundColor }]}>
              <Icon
                name={getCategoryIcon(business.category)}
                size={22}
                color={colors.white}
              />
            </View>
          )}
        </View>
        <View style={[styles.markerTriangle, { borderTopColor: backgroundColor }]} />
      </View>
    </Marker>
  );
});

BusinessMarker.displayName = 'BusinessMarker';

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerWrapper: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    borderWidth: 2.5,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  logoImage: {
    width: MARKER_SIZE - 5,
    height: MARKER_SIZE - 5,
    borderRadius: (MARKER_SIZE - 5) / 2,
  },
  fallbackBackground: {
    width: MARKER_SIZE - 5,
    height: MARKER_SIZE - 5,
    borderRadius: (MARKER_SIZE - 5) / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});
