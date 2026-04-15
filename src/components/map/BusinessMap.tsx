import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useMarkerImage } from '../../hooks/useMarkerImage';
import { businessLogosService } from '../../services/businessLogos';
import { BusinessLocationIconMarker } from './BusinessLocationIconMarker'; // Marcador com ícones para BusinessLocation

interface BusinessLocation {
  businessId: string;
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  category?: string; // Adicionado para suportar ícones por categoria
}

interface BusinessMapProps {
  businesses: BusinessLocation[];
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onMarkerPress?: (business: BusinessLocation) => void;
  showTestButton?: boolean;
}

/**
 * Componente individual de marcador com logo personalizado
 */
const BusinessMarker: React.FC<{
  business: BusinessLocation;
  onPress?: () => void;
}> = ({ business, onPress }) => {
  const { uri, isLoading, error, isReady } = useMarkerImage(business.businessId, {
    width: 40,
    height: 40,
  });

  return (
    <Marker
      coordinate={{
        latitude: business.latitude,
        longitude: business.longitude,
      }}
      title={business.name}
      description={business.description}
      onPress={onPress}
      tracksViewChanges={isLoading || !isReady}
    >
      <View style={styles.markerWrapper}>
        {isReady && uri && !error ? (
          <Image
            source={{ uri }}
            style={styles.logoImage}
            onError={() => console.error(`Erro ao carregar logo para ${business.name}`)}
          />
        ) : (
          <View style={styles.fallbackMarker}>
            {isLoading ? (
              <ActivityIndicator size="small" color="hsla(0, 0%, 100%, 0.00))" />
            ) : (
              <Text style={styles.fallbackText}>
                {business.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
        )}
      </View>
    </Marker>
  );
};

/**
 * Componente principal do mapa com marcadores de businesses
 */
const BusinessMap: React.FC<BusinessMapProps> = ({
  businesses,
  initialRegion = {
    latitude: -23.5505,
    longitude: -46.6333,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  },
  onMarkerPress,
  showTestButton = false,
}) => {
  const [storageConnected, setStorageConnected] = useState<boolean | null>(null);
  const [isTestingStorage, setIsTestingStorage] = useState(false);

  /**
   * Testa a conectividade com o Firebase Storage
   */
  const testStorageConnection = async () => {
    setIsTestingStorage(true);
    console.log('Iniciando teste de conectividade do Firebase Storage...');

    try {
      const isConnected = await businessLogosService.testStorageConnection();
      setStorageConnected(isConnected);

      const message = isConnected
        ? 'Firebase Storage conectado com sucesso!'
        : 'Falha na conexão com Firebase Storage';

      console.log(message);

      if (showTestButton) {
        Alert.alert(
          'Teste de Conectividade',
          message,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('ݒ Erro no teste de conectividade:', error);
      setStorageConnected(false);

      if (showTestButton) {
        Alert.alert(
          'Erro no Teste',
          'Erro ao testar conectividade com Firebase Storage',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsTestingStorage(false);
    }
  };

  /**
   * Executa teste automático ao montar o componente
   */
  useEffect(() => {
    testStorageConnection();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkerPress = (business: BusinessLocation) => {
    console.log(`ðŸ“ Marcador pressionado: ${business.name} (${business.businessId})`);
    onMarkerPress?.(business);
  };

  return (
    <View style={styles.container}>
      {/* Status do Firebase Storage */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Firebase Storage: {' '}
          {storageConnected === null ? (
            <Text style={styles.statusTesting}>Testando...</Text>
          ) : storageConnected ? (
            <Text style={styles.statusConnected}>Conectado âœ…</Text>
          ) : (
            <Text style={styles.statusDisconnected}>Desconectado ݒ</Text>
          )}
        </Text>

        {showTestButton && (
          <TouchableOpacity
            style={styles.testButton}
            onPress={testStorageConnection}
            disabled={isTestingStorage}
          >
            <Text style={styles.testButtonText}>
              {isTestingStorage ? 'Testando...' : 'Testar Storage'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Mapa */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        toolbarEnabled={false}
      >
        {businesses.map((business) => (
          <BusinessLocationIconMarker
            key={business.businessId}
            business={business}
            onPress={() => handleMarkerPress(business)}
          />
        ))}
      </MapView>

      {/* Debug Info */}
      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>
            Businesses: {businesses.length} | Storage: {storageConnected ? 'âœ…' : 'ݒ'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
    shadowColor: 'rgba(0, 0, 0, 0)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18, // (40 - 4) / 2 = 18
  },
  statusContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: 'hsla(0, 0%, 100%, 0.00)',
    padding: 12,
    borderRadius: 8,
    zIndex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  statusTesting: {
    color: '#FF9500',
  },
  statusConnected: {
    color: '#34C759',
  },
  statusDisconnected: {
    color: '#FF3B30',
  },
  testButton: {
    backgroundColor: 'rgba(255, 255, 255, 0)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  fallbackMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.00)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  fallbackText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugContainer: {
    position: 'absolute',
    bottom: 50,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 6,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default BusinessMap;
export type { BusinessLocation };
