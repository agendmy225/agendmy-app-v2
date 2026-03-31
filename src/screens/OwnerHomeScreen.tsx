// OwnerHomeScreen.tsx - Corrigido
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { BusinessMarker } from '../features/business/components/BusinessMarker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useLocation } from '../context/LocationContext';
import { BUSINESS_CATEGORIES, getCategoryById } from '../services/categories';
import { colors } from '../constants/colors';
import { AppStackParamList } from '../types/types';
import { Business, getAllActiveBusinesses, getBusinessesWithPromotions, getMostRecentBusinesses, getTopRatedBusinesses, searchBusinesses } from '../services/businesses';
import { cacheService } from '../services/cache';
import { getAddressFromCoordinates, getCoordinatesFromAddress } from '../services/maps';
import CachedImage from '../components/common/CachedImage';

const GOOGLE_MAPS_API_KEY = 'AIzaSyBRowlrsBPawKX_Fgi8ZIWNt1_HO2DYI84';

type BusinessItemType = Business;

const defaultPlaceholderImage = require('../assets/images/banner-home.png');

// Extrai cidade do endereco
const extractCity = (address: string): string => {
  if (!address) { return ''; }
  const parts = address.split(',');
  if (parts.length >= 2) {
    return parts[parts.length - 2].trim().toLowerCase().replace(/\s*-\s*\w+$/, '').trim();
  }
  return address.trim().toLowerCase();
};

// Verifica se o estabelecimento e da mesma cidade
const isSameCity = (businessAddress: string, userCity: string): boolean => {
  if (!businessAddress || !userCity || userCity.length < 3) { return true; }
  const bizCity = businessAddress.toLowerCase();
  const cleanUserCity = userCity.toLowerCase().trim();
  return bizCity.includes(cleanUserCity) || cleanUserCity.includes(bizCity);
};

const OwnerHomeScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userFriendlyLocation, setUserFriendlyLocation] = useState('Obtendo localizacao...');
  const [userCity, setUserCity] = useState('');
  const [, setUserCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: -22.3154,
    longitude: -49.9600,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [businessesForMap, setBusinessesForMap] = useState<Business[]>([]);
  const [allBusinessesLoaded, setAllBusinessesLoaded] = useState<Business[]>([]);
  const [mostRecent, setMostRecent] = useState<Business[]>([]);
  const [topRated, setTopRated] = useState<Business[]>([]);
  const [promotions, setPromotions] = useState<Business[]>([]);
  const [searchResults, setSearchResults] = useState<Business[]>([]);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isChangeLocationModalVisible, setIsChangeLocationModalVisible] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filterSortBy, setFilterSortBy] = useState<'rating' | 'recent' | 'name'>('rating');
  const [filterMinRating, setFilterMinRating] = useState<number>(0);
  const [activeFilters, setActiveFilters] = useState<{ sortBy: 'rating' | 'recent' | 'name'; minRating: number }>({ sortBy: 'rating', minRating: 0 });
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [locationSet, setLocationSet] = useState(false);

  const mapRef = useRef<MapView>(null);
  const isInitialMount = useRef(true);
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>() as any;

  const applyFilters = (list: Business[]) => {
    return list
      .filter(b => (b.rating || 0) >= activeFilters.minRating)
      .sort((a, b) => {
        if (activeFilters.sortBy === 'rating') { return (b.rating || 0) - (a.rating || 0); }
        if (activeFilters.sortBy === 'name') { return (a.name || '').localeCompare(b.name || ''); }
        return 0;
      });
  };

  const {
    location: realTimeLocation,
    isLoading: isLocationLoading,
    error: locationError,
    hasPermission: hasLocationPermission,
    requestPermission: requestLocationPermission,
    startWatching: startLocationWatching,
    isWatching: isLocationWatching,
  } = useLocation();

  useEffect(() => {
    if (hasLocationPermission && !isLocationWatching && !locationError) {
      startLocationWatching();
    }
  }, [hasLocationPermission, isLocationWatching, locationError, startLocationWatching]);

  const handleLocationPermission = async () => {
    if (!hasLocationPermission) {
      await requestLocationPermission();
    } else {
      setIsChangeLocationModalVisible(true);
    }
  };

  const handleCategoryPress = (categoryName: string) => {
    if (selectedCategoryFilter === categoryName || categoryName === 'Todos') {
      setSelectedCategoryFilter(null);
      setSearchQuery('');
    } else {
      setSelectedCategoryFilter(categoryName);
      setSearchQuery('');
    }
  };

  // CORRIGIDO: filtrar por cidade
  const filterBusinessesByCity = useCallback((allBusinesses: Business[], city: string) => {
    const filtered = allBusinesses.filter(business => {
      const hasLocation = business.location?.latitude && business.location?.longitude;
      if (!hasLocation) { return false; }
      if (!city || city.length < 3) { return true; }
      return isSameCity(business.address || '', city);
    });
    setBusinessesForMap(filtered);
  }, []);

  // CORRIGIDO: sempre atualiza localizacao (removido condicao !mapRegion)
  useEffect(() => {
    if (realTimeLocation) {
      const newRegion = {
        latitude: realTimeLocation.latitude,
        longitude: realTimeLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.01,
      };
      setMapRegion(newRegion);
      setUserCoordinates({ latitude: realTimeLocation.latitude, longitude: realTimeLocation.longitude });
      setLocationSet(true);

      setTimeout(() => {
        mapRef.current?.animateToRegion(newRegion, 1000);
      }, 100);

      if (GOOGLE_MAPS_API_KEY) {
        getAddressFromCoordinates(realTimeLocation.latitude, realTimeLocation.longitude, GOOGLE_MAPS_API_KEY)
          .then((address: string | null) => {
            if (address) {
              setUserFriendlyLocation(address);
              setUserCity(extractCity(address));
            } else {
              setUserFriendlyLocation(`Lat: ${realTimeLocation.latitude.toFixed(4)}, Lon: ${realTimeLocation.longitude.toFixed(4)}`);
            }
          })
          .catch(() => {
            setUserFriendlyLocation(`Lat: ${realTimeLocation.latitude.toFixed(4)}, Lon: ${realTimeLocation.longitude.toFixed(4)}`);
          });
      } else {
        setUserFriendlyLocation(`Lat: ${realTimeLocation.latitude.toFixed(4)}, Lon: ${realTimeLocation.longitude.toFixed(4)}`);
      }
    }
  }, [realTimeLocation]);

  useEffect(() => {
    if (locationError) {
      setUserFriendlyLocation(locationError);
    }
  }, [locationError]);

  // Filtrar por cidade quando mudar
  useEffect(() => {
    if (allBusinessesLoaded.length > 0) {
      filterBusinessesByCity(allBusinessesLoaded, userCity);
    }
  }, [userCity, allBusinessesLoaded, filterBusinessesByCity]);

  const updateLocationStates = useCallback((latitude: number, longitude: number, friendlyName?: string) => {
    const newRegionDetails = {
      latitude,
      longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.01,
    };
    setUserCoordinates({ latitude, longitude });
    setMapRegion(newRegionDetails);
    setLocationSet(true);

    setTimeout(() => {
      mapRef.current?.animateToRegion(newRegionDetails, 1000);
    }, 100);

    if (friendlyName) {
      setUserFriendlyLocation(friendlyName);
      setUserCity(extractCity(friendlyName));
    } else {
      getAddressFromCoordinates(latitude, longitude, GOOGLE_MAPS_API_KEY || '').then((address: string | null) => {
        if (address) {
          setUserFriendlyLocation(address);
          setUserCity(extractCity(address));
        } else {
          setUserFriendlyLocation(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
        }
      }).catch(() => {
        setUserFriendlyLocation(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
      });
    }
  }, []);

  const handleChangeLocation = async () => {
    if (!newAddress.trim()) {
      Alert.alert('Endereco Invalido', 'Por favor, insira um endereco.');
      return;
    }
    setIsGeocoding(true);
    try {
      const coords = await getCoordinatesFromAddress(newAddress.trim(), GOOGLE_MAPS_API_KEY || '');
      if (coords) {
        updateLocationStates(coords.latitude, coords.longitude, newAddress.trim());
        setIsChangeLocationModalVisible(false);
        setNewAddress('');
      } else {
        Alert.alert('Erro', 'Nao foi possivel encontrar coordenadas para o endereco informado.');
      }
    } catch {
      Alert.alert('Erro', 'Ocorreu um erro ao tentar alterar a localizacao.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoadingInitialData(true);
      setInitialLoadError(null);

      const cachedData = await cacheService.getCachedData();

      if (cachedData) {
        setMostRecent(cachedData.mostRecent || []);
        setTopRated(cachedData.topRated || []);
        setPromotions(cachedData.promotions || []);

        const businessesWithLocation = (cachedData.allActive || []).filter(
          (b: Business) => b.location?.latitude && b.location?.longitude,
        );
        setAllBusinessesLoaded(businessesWithLocation);
        setBusinessesForMap(businessesWithLocation);
        setIsLoadingInitialData(false);

        const cacheAge = Date.now() - (cachedData.lastUpdate || 0);
        const CACHE_REFRESH_THRESHOLD = 3 * 60 * 1000;
        if (cacheAge < CACHE_REFRESH_THRESHOLD) { return; }
      }

      if (!hasLocationPermission) {
        await requestLocationPermission();
      }

      const [mostRecentData, topRatedData, promotionsData, allActiveData] = await Promise.all([
        getMostRecentBusinesses(20),
        getTopRatedBusinesses(10),
        getBusinessesWithPromotions(10),
        getAllActiveBusinesses(100),
      ]);

      setMostRecent(mostRecentData);
      setTopRated(topRatedData);
      setPromotions(promotionsData);

      try {
        await cacheService.saveCachedData({
          mostRecent: mostRecentData,
          topRated: topRatedData,
          promotions: promotionsData,
          allActive: allActiveData,
        });
      } catch (cacheError) {
        console.warn('Erro ao salvar cache:', cacheError);
      }

      const businessesWithLocation = allActiveData.filter(
        (b: Business) => b.location?.latitude && b.location?.longitude,
      );
      setAllBusinessesLoaded(businessesWithLocation);
      setBusinessesForMap(businessesWithLocation);

    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      if (mostRecent.length === 0) {
        const expiredCache = await cacheService.getCachedData();
        if (expiredCache) {
          setMostRecent(expiredCache.mostRecent || []);
          setTopRated(expiredCache.topRated || []);
          setPromotions(expiredCache.promotions || []);
          const businessesWithLocation = (expiredCache.allActive || []).filter(
            (b: Business) => b.location?.latitude && b.location?.longitude,
          );
          setAllBusinessesLoaded(businessesWithLocation);
          setBusinessesForMap(businessesWithLocation);
        } else {
          setMostRecent([]);
          setTopRated([]);
          setPromotions([]);
          setAllBusinessesLoaded([]);
          setBusinessesForMap([]);
          setInitialLoadError('Nao foi possivel carregar os dados. Verifique sua conexao e tente novamente.');
        }
      }
    } finally {
      setIsLoadingInitialData(false);
    }
  }, [hasLocationPermission, requestLocationPermission, mostRecent.length]);

  useFocusEffect(
    useCallback(() => {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        loadInitialData();
      } else {
        const hasRecentData = topRated.length > 0 && promotions.length > 0;
        if (!hasRecentData) { loadInitialData(); }
      }

      // CORRIGIDO: sempre re-centraliza ao voltar para a tela
      if (realTimeLocation) {
        const currentRegion = {
          latitude: realTimeLocation.latitude,
          longitude: realTimeLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.01,
        };
        setMapRegion(currentRegion);
        setTimeout(() => {
          mapRef.current?.animateToRegion(currentRegion, 1000);
        }, 300);
      }
    }, [loadInitialData, topRated.length, promotions.length, realTimeLocation]),
  );

  const performSearch = useCallback(async (query: string, categoryFilter?: string | null) => {
    if ((!query || query.trim().length === 0) && !categoryFilter) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      let results: Business[] = [];
      if (query && query.trim().length > 0) {
        results = await searchBusinesses(query.trim());
      } else if (categoryFilter) {
        results = await searchBusinesses(categoryFilter);
      }
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchQuery && searchQuery.trim().length > 0) {
      const timeoutId = setTimeout(() => {
        performSearch(searchQuery.trim(), null);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else if (selectedCategoryFilter) {
      performSearch('', selectedCategoryFilter);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, selectedCategoryFilter, performSearch]);

  const renderInfoCard = ({ item }: { item: BusinessItemType }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('BusinessDetails', { businessId: item.id })}
      style={styles.infoCardItem}
    >
      <CachedImage
        storagePath={item.coverImage || item.logo || null}
        style={styles.infoCardImage}
        defaultSource={defaultPlaceholderImage}
      />
      <Text style={styles.infoCardTitle} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.infoCardSubtitle} numberOfLines={1}>{getCategoryById(item.category)?.name || item.category || 'Servicos'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screenContainer}>
      <View style={styles.headerContainer}>
        <View style={styles.headerLocationContainer}>
          <Icon name="location-on" size={20} color={colors.primary} />
          <View style={styles.headerLocationInfo}>
            <Text style={styles.headerLocationText} numberOfLines={1}>SUA LOCALIZACAO</Text>
            <Text style={styles.headerLocationAddress} numberOfLines={1}>
              {isLocationLoading ? 'Obtendo sua localizacao...' : (userFriendlyLocation || 'Localizacao nao disponivel')}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLocationPermission}>
            <Text style={styles.headerChangeLocationText}>
              {!hasLocationPermission ? 'PERMITIR' : 'ALTERAR'}
            </Text>
          </TouchableOpacity>
        </View>
        <Image source={require('../assets/images/logo.png')} style={styles.headerLogo} resizeMode="contain" />
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isChangeLocationModalVisible}
        onRequestClose={() => { setIsChangeLocationModalVisible(false); setNewAddress(''); }}
      >
        <View style={styles.modalCenteredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Alterar Localizacao</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Digite o novo endereco"
              placeholderTextColor={colors.lightText}
              value={newAddress}
              onChangeText={setNewAddress}
            />
            {isGeocoding && <ActivityIndicator size="small" color={colors.primary} style={styles.geocodingSpinner} />}
            <View style={styles.modalButtonContainer}>
              <Button title="Cancelar" onPress={() => { setIsChangeLocationModalVisible(false); setNewAddress(''); }} color={colors.error} />
              <Button title="Confirmar" onPress={handleChangeLocation} disabled={isGeocoding || !newAddress.trim()} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isFilterModalVisible}
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalCenteredView}>
          <View style={styles.modalView}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.modalText}>Filtros</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Ordenar por</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {([['rating', 'Avaliacao'], ['recent', 'Recentes'], ['name', 'Nome']] as const).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setFilterSortBy(key)}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: filterSortBy === key ? colors.primary : colors.lightGray }}
                >
                  <Text style={{ fontSize: 13, color: filterSortBy === key ? colors.white : colors.text, fontWeight: filterSortBy === key ? '600' : '400' }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Avaliacao minima</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
              {[0, 3, 4, 4.5].map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setFilterMinRating(r)}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: filterMinRating === r ? colors.primary : colors.lightGray }}
                >
                  <Text style={{ fontSize: 13, color: filterMinRating === r ? colors.white : colors.text, fontWeight: filterMinRating === r ? '600' : '400' }}>
                    {r === 0 ? 'Todas' : `${r}+★`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.primary }}
                onPress={() => { setFilterSortBy('rating'); setFilterMinRating(0); setActiveFilters({ sortBy: 'rating', minRating: 0 }); setIsFilterModalVisible(false); }}
              >
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: colors.primary }}
                onPress={() => { setActiveFilters({ sortBy: filterSortBy, minRating: filterMinRating }); setIsFilterModalVisible(false); }}
              >
                <Text style={{ color: colors.white, fontWeight: '600' }}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isLoadingInitialData && !initialLoadError ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      ) : initialLoadError ? (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>{initialLoadError}</Text>
          <Button title="Tentar Novamente" onPress={loadInitialData} color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.searchBarContainer}>
            <Icon name="search" size={20} color={colors.lightText} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar estabelecimentos ou servicos"
              placeholderTextColor={colors.lightText}
              value={searchQuery}
              onChangeText={(text) => { setSearchQuery(text); setSelectedCategoryFilter(null); }}
            />
            {isSearching && <ActivityIndicator size="small" color={colors.primary} style={styles.searchSpinner} />}
            <TouchableOpacity
              onPress={() => { setFilterSortBy(activeFilters.sortBy); setFilterMinRating(activeFilters.minRating); setIsFilterModalVisible(true); }}
              style={styles.filterIconContainer}
            >
              <Icon name="filter-list" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {!searchQuery.trim() && !selectedCategoryFilter && promotions.length > 0 && (
            <View style={styles.bannerContainer}>
              <Text style={styles.sectionTitle}>Destaques</Text>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.bannerScrollView}>
                {promotions.map((item) => (
                  <TouchableOpacity
                    key={`promo-${item.id}`}
                    style={styles.bannerItem}
                    onPress={() => navigation.navigate('BusinessDetails', { businessId: item.id })}
                  >
                    <CachedImage storagePath={item.coverImage || item.logo || null} style={styles.bannerImage} resizeMode="cover" defaultSource={defaultPlaceholderImage} />
                    <View style={styles.bannerTextContainer}>
                      <Text style={styles.bannerTitle} numberOfLines={1}>{item.name}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {searchQuery.trim() || selectedCategoryFilter ? (
            <>
              <View style={styles.sectionHeader}>
                <TouchableOpacity style={styles.backButton} onPress={() => { setSearchQuery(''); setSelectedCategoryFilter(null); setSearchResults([]); }}>
                  <Icon name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.resultsHeaderContent}>
                  <Text style={styles.sectionTitle}>
                    {searchQuery.trim() ? `Resultados para "${searchQuery}"` : `Negocios em "${selectedCategoryFilter}"`}
                  </Text>
                  {searchResults.length > 0 && <Text style={styles.resultsCount}>{searchResults.length} encontrados</Text>}
                </View>
              </View>
              {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
              {!isSearching && searchResults.length === 0 && (
                <Text style={styles.emptyListText}>Nenhum resultado encontrado para "{searchQuery || selectedCategoryFilter}".</Text>
              )}
              {searchResults.length > 0 && (
                <FlatList
                  data={searchResults}
                  renderItem={renderInfoCard}
                  keyExtractor={(item) => item.id}
                  horizontal={false}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.verticalListContent}
                />
              )}
            </>
          ) : (
            <>
              <View style={styles.mapContainer}>
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={mapRegion}
                  showsUserLocation={true}
                  showsMyLocationButton={true}
                >
                  {businessesForMap.map(business => (
                    <BusinessMarker
                      key={business.id}
                      business={business}
                      onPress={() => navigation.navigate('BusinessDetails', { businessId: business.id })}
                    />
                  ))}
                </MapView>
              </View>

              <Text style={styles.sectionTitle}>Categorias</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
                <TouchableOpacity
                  key="Todos"
                  style={[styles.categoryItem, selectedCategoryFilter === null && styles.activeCategoryItem]}
                  onPress={() => handleCategoryPress('Todos')}
                >
                  <View style={styles.categoryIconContainer}>
                    <Icon name="apps" size={24} color={colors.white} />
                  </View>
                  <Text style={[styles.categoryName, selectedCategoryFilter === null && styles.activeCategoryName]}>Todos</Text>
                </TouchableOpacity>

                {BUSINESS_CATEGORIES.map((category: { id: string; name: string; icon: string }) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.categoryItem, selectedCategoryFilter === category.name && styles.activeCategoryItem]}
                    onPress={() => handleCategoryPress(category.name)}
                  >
                    <View style={styles.categoryIconContainer}>
                      <Icon name={category.icon} size={24} color={colors.white} />
                    </View>
                    <Text style={[styles.categoryName, selectedCategoryFilter === category.name && styles.activeCategoryName]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Os 20 mais recentes</Text>
                <TouchableOpacity><Text style={styles.seeAllText}>Ver todos</Text></TouchableOpacity>
              </View>
              <FlatList
                data={applyFilters(mostRecent)}
                renderItem={renderInfoCard}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalList}
                contentContainerStyle={styles.horizontalListContent}
                ListEmptyComponent={!isLoadingInitialData ? <Text style={styles.emptyListText}>Nenhum estabelecimento encontrado.</Text> : null}
              />

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Os top 10 mais avaliados da regiao</Text>
                <TouchableOpacity><Text style={styles.seeAllText}>Ver todos</Text></TouchableOpacity>
              </View>
              <FlatList
                data={applyFilters(topRated)}
                renderItem={renderInfoCard}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalList}
                contentContainerStyle={styles.horizontalListContent}
                ListEmptyComponent={!isLoadingInitialData ? <Text style={styles.emptyListText}>Nenhum estabelecimento encontrado.</Text> : null}
              />

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Estabelecimentos com promocoes</Text>
                <TouchableOpacity><Text style={styles.seeAllText}>Ver todas</Text></TouchableOpacity>
              </View>
              <FlatList
                data={applyFilters(promotions)}
                renderItem={renderInfoCard}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalList}
                contentContainerStyle={styles.horizontalListContent}
                ListEmptyComponent={!isLoadingInitialData ? <Text style={styles.emptyListText}>Nenhuma promocao encontrada.</Text> : null}
              />
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: colors.background },
  headerContainer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 16 : 10, paddingBottom: 8,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.lightGray,
  },
  headerLogo: { height: 28, width: 120 },
  headerLocationContainer: { flexDirection: 'row', alignItems: 'center' },
  headerLocationInfo: { marginLeft: 5, flexShrink: 1 },
  headerLocationText: { fontSize: 10, color: colors.lightText },
  headerLocationAddress: { fontSize: 12, color: colors.text },
  headerChangeLocationText: { fontSize: 12, color: colors.primary, marginLeft: 10, fontWeight: 'bold' },
  scrollContent: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  searchBarContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.lightGray,
    borderRadius: 8, marginVertical: 16, paddingHorizontal: 12, height: 46,
  },
  searchInput: { flex: 1, height: '100%', color: colors.text, fontSize: 14, marginLeft: 8 },
  mapContainer: { height: 250, marginVertical: 16, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.lightGray },
  map: { ...StyleSheet.absoluteFillObject },
  categoriesContainer: { flexDirection: 'row', marginVertical: 16 },
  categoryItem: { alignItems: 'center', marginRight: 16, width: 80, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  activeCategoryItem: { borderColor: colors.primary, backgroundColor: colors.lightGray },
  categoryIconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 8, elevation: 2, shadowColor: colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
  categoryName: { fontSize: 12, color: colors.text, textAlign: 'center' },
  activeCategoryName: { fontWeight: 'bold', color: colors.primary },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  seeAllText: { fontSize: 14, color: colors.primary },
  horizontalList: { marginBottom: 24 },
  horizontalListContent: { paddingRight: 16 },
  verticalListContent: { paddingBottom: 24 },
  infoCardItem: { width: 200, borderRadius: 12, marginRight: 16, overflow: 'hidden', backgroundColor: colors.card, elevation: 2, shadowColor: colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  infoCardImage: { width: '100%', height: 120 },
  infoCardTitle: { fontSize: 14, fontWeight: 'bold', color: colors.text, marginHorizontal: 12, marginTop: 8 },
  infoCardSubtitle: { fontSize: 12, color: colors.lightText, marginHorizontal: 12, marginBottom: 12, marginTop: 4 },
  searchSpinner: { position: 'absolute', right: 12, top: '50%', marginTop: -10 },
  resultsCount: { fontSize: 12, color: colors.lightText },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.lightText },
  emptyListText: { textAlign: 'center', color: colors.lightText, marginTop: 20, width: '100%' },
  bannerContainer: { marginVertical: 16 },
  bannerScrollView: { height: 200 },
  bannerItem: { width: 300, height: 180, marginRight: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.card, elevation: 3, shadowColor: colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  bannerImage: { width: '100%', height: '100%' },
  bannerTextContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8 },
  bannerTitle: { color: colors.white, fontSize: 14, fontWeight: 'bold' },
  modalCenteredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { margin: 20, backgroundColor: colors.white, borderRadius: 20, padding: 35, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '80%' },
  modalText: { marginBottom: 15, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: colors.text },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  geocodingSpinner: { marginVertical: 10 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: colors.error, textAlign: 'center', marginVertical: 16 },
  filterIconContainer: { paddingLeft: 10 },
  modalInput: { height: 40, borderColor: colors.lightGray, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginBottom: 20, color: colors.text },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.lightGray, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  resultsHeaderContent: { flex: 1 },
});

export default OwnerHomeScreen;
