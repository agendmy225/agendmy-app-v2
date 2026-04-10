import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { HomeStackParamList, AppStackParamList } from '../../types/types';
import { colors } from '../../constants/colors';
import { Business ,
  getAllActiveBusinesses,
  getTopRatedBusinesses,
  getMostRecentBusinesses,
  getBusinessesWithPromotions,
} from '../../services/businesses';

import { getCategoryById } from '../../services/categories';
import Geolocation from '@react-native-community/geolocation';
import CachedImage from '../../components/common/CachedImage';

type AllBusinessesScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'AllBusinesses'> & {
  navigate<RouteName extends keyof AppStackParamList>(
    ...args: undefined extends AppStackParamList[RouteName]
      ? [screen: RouteName] | [screen: RouteName, params: AppStackParamList[RouteName]]
      : [screen: RouteName, params: AppStackParamList[RouteName]]
  ): void;
};
type AllBusinessesScreenRouteProp = RouteProp<HomeStackParamList, 'AllBusinesses'>;

const defaultPlaceholderImage = require('../../assets/images/banner-home.png');

const AllBusinessesScreen: React.FC = () => {
  const navigation = useNavigation<AllBusinessesScreenNavigationProp>() as any;
  const route = useRoute<AllBusinessesScreenRouteProp>();
  const { listType, userCity } = route.params;

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    // Obter localizaÃ§Ã£o do usuÃ¡rio
    const getUserLocation = async () => {
      try {
        // Request permission for Android
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'PermissÃ£o de LocalizaÃ§Ã£o',
              message: 'O app precisa acessar sua localizaÃ§Ã£o para encontrar estabelecimentos prÃ³ximos.',
              buttonNeutral: 'Perguntar depois',
              buttonNegative: 'Cancelar',
              buttonPositive: 'OK',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('PermissÃ£o de localizaÃ§Ã£o negada');
            return;
          }
        }

        // Get current position
        Geolocation.getCurrentPosition(
          (position) => {
            setUserCoordinates({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            console.log('Erro ao obter localizaÃ§Ã£o:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          }
        );
      } catch (error) {
        console.log('Erro ao obter localizaÃ§Ã£o:', error);
      }
    };
    
    getUserLocation();

    loadBusinesses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Filtrar negÃ³cios sempre que a lista mudar ou a localizaÃ§Ã£o for obtida
    filterBusinessesByCity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businesses, userCoordinates, userCity]);

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      let data: Business[] = [];

      switch (listType) {
        case 'recent':
          data = await getMostRecentBusinesses(100); // Carrega mais negÃ³cios
          break;
        case 'topRated':
          data = await getTopRatedBusinesses(100);
          break;
        case 'promotions':
          data = await getBusinessesWithPromotions(100);
          break;
        default:
          data = await getAllActiveBusinesses(100);
      }

      setBusinesses(data);
    } catch (error: any) {
      // Exibe alerta amigÃ¡vel ao usuÃ¡rio em caso de erro
      // (convenÃ§Ã£o: mensagem em portuguÃªs)
      Alert.alert('Erro', 'Erro ao carregar estabelecimentos. Tente novamente mais tarde.');
      console.log('Erro ao carregar estabelecimentos:', error?.message || error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterBusinessesByCity = () => {
    if (!businesses || businesses.length === 0) {
      setFilteredBusinesses([]);
      return;
    }

    // Se tem cidade do usuÃ¡rio, filtra por ela
    if (userCity) {
      const filtered = businesses.filter(business => {
        // Verifica se o endereÃ§o contÃ©m a cidade
        return business.address?.toLowerCase().includes(userCity.toLowerCase());
      });
      setFilteredBusinesses(filtered);
    } else if (userCoordinates) {
      // Se tem coordenadas, filtra por proximidade (raio de 20km)
      const MAX_DISTANCE_KM = 20;
      const filtered = businesses.filter(business => {
        if (!business.location?.latitude || !business.location?.longitude) { return false; }

        const distance = calculateDistance(
          userCoordinates.latitude,
          userCoordinates.longitude,
          business.location.latitude,
          business.location.longitude,
        );

        return distance <= MAX_DISTANCE_KM;
      });
      setFilteredBusinesses(filtered);
    } else {
      // Se nÃ£o tem nem cidade nem coordenadas, mostra todos
      setFilteredBusinesses(businesses);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBusinesses();
  };

  const getTitle = () => {
    switch (listType) {
      case 'recent':
        return 'Estabelecimentos Recentes';
      case 'topRated':
        return 'Mais Bem Avaliados';
      case 'promotions':
        return 'PromoÃ§Ãµes';
      default:
        return 'Todos os Estabelecimentos';
    }
  };

  const renderBusinessItem = ({ item }: { item: Business }) => (
    <TouchableOpacity
      style={styles.businessCard}
      onPress={() => navigation.navigate('BusinessDetails', { businessId: item.id })}
    >
      <CachedImage
        storagePath={item.coverImage || item.imageUrl || item.logo}
        style={styles.businessImage}
        defaultSource={defaultPlaceholderImage}
      />
      <View style={styles.businessInfo}>
        <Text style={styles.businessName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.businessCategory} numberOfLines={1}>
          {getCategoryById(item.category)?.name || 'ServiÃ§os'}
        </Text>
        {item.address && (
          <View style={styles.addressContainer}>
            <Icon name="location-on" size={14} color={colors.lightText} />
            <Text style={styles.businessAddress} numberOfLines={2}>
              {item.address}
            </Text>
          </View>
        )}
        {item.reviewCount > 0 && (
          <View style={styles.ratingContainer}>
            <Icon name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>
              {item.rating?.toFixed(1) || '0.0'} ({item.reviewCount} avaliaÃ§Ãµes)
            </Text>
          </View>
        )}
        {listType === 'promotions' && item.hasActivePromotions && (
          <View style={styles.promotionBadge}>
            <Text style={styles.promotionText}>
              PROMOÃ‡ÃƒO
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando estabelecimentos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getTitle()}</Text>
      </View>

      {userCity && (
        <View style={styles.filterInfo}>
          <Icon name="location-on" size={16} color={colors.primary} />
          <Text style={styles.filterText}>
            Mostrando estabelecimentos em {userCity}
          </Text>
        </View>
      )}

      <FlatList
        data={filteredBusinesses}
        renderItem={renderBusinessItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="business" size={64} color={colors.lightText} />
            <Text style={styles.emptyTitle}>
              {userCity
                ? `Nenhum estabelecimento encontrado em ${userCity}`
                : 'Nenhum estabelecimento encontrado na sua regiÃ£o'
              }
            </Text>
            <Text style={styles.emptyText}>
              Tente ajustar sua localizaÃ§Ã£o ou buscar em outras cidades prÃ³ximas.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  filterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.lightGray,
  },
  filterText: {
    marginLeft: 5,
    fontSize: 14,
    color: colors.text,
  },
  listContent: {
    padding: 20,
  },
  businessCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  businessImage: {
    width: 100,
    height: 100,
  },
  businessInfo: {
    flex: 1,
    padding: 12,
  },
  businessName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  businessCategory: {
    fontSize: 14,
    color: colors.lightText,
    marginBottom: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  businessAddress: {
    fontSize: 12,
    color: colors.lightText,
    marginLeft: 4,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 4,
  },
  promotionBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  promotionText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.lightText,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
});

export default AllBusinessesScreen;
