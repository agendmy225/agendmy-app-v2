import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import { Business } from '../../services/businesses';

interface TestMarkerProps {
  business: Business;
  onPress?: () => void;
}

export const TestMarker: React.FC<TestMarkerProps> = ({ business, onPress }) => {
  if (!business.location?.latitude || !business.location?.longitude) {
    return null;
  }

  console.log(`ðŸ§ª TestMarker para ${business.name}:`, {
    logo: business.logo,
    coverImage: business.coverImage,
  });

  return (
    <Marker
      coordinate={{
        latitude: business.location.latitude,
        longitude: business.location.longitude,
      }}
      onPress={onPress}
    >
      <View style={styles.markerContainer}>
        <Text style={styles.markerText}>{business.name.charAt(0)}</Text>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
