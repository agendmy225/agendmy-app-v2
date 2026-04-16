import { useFocusEffect, useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
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
import { useAuth } from '../features/auth/context/AuthContext';
import { HomeStackParamList, AppStackParamList } from '../types/types';
import {
  Business,
  getAllActiveBusinesses,
  getAllBusinessesForOwner,
  getBusinessesWithPromotions,
  getMostRecentBusinesses,
  getTopRatedBusinesses,
  searchBusinesses,
} from '../services/businesses';
import { cacheService } from '../services/cache';
import { getAddressFromCoordinates, getCoordinatesFromAddress } from '../services/maps';
import CachedImage from '../components/common/CachedImage';

const GOOGLE_MAPS_API_KEY = 'AIzaSyBRowlrsBPawKX_Fgi8ZIWNt1_HO2DYI84';
const RADIUS_KM = 30;

type BusinessItemType = Business;

type HomeScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<HomeStackParamList>,
  StackNavigationProp<AppStackParamList>
>;

// Calcula distancia em km entre dois pontos GPS (Haversine)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Filtra estabelecimentos por raio de distancia
const filterByRadius = (businesses: Business[], userLat: number, userLon: number, radiusKm: number): Business[] => {
  return businesses.filter(business => {
    const lat = business.location?.latitude;
    const lon = business.location?.longitude;
    if (!lat || !lon) { return false; }
    return calculateDistance(userLat, userLon, lat, lon) <= radiusKm;
  });
};

const HomeScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userFriendlyLocation, setUserFriendlyLocation] = useState('Obtendo localizacao...');
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const userCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const [businessesForMap, setBusinessesForMap] = useState<Business[]>([]);
  const [allBusinessesLoaded, setAllBusinessesLoaded] = useState<Business[]>([]);
  const allBusinessesRef = useRef<Business[]>([]);
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
  const mapViewRef = useRef<MapView>(null);
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuth();
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

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
    if (hasLocationPermission && !isLocationWatching) {
      startLocationWatching();
    }
  }, [hasLocationPermission, isLocationWatching, startLocationWatching]);

  const handleLocationPermission = async () => {
    if (!hasLocationPermission) {
      await requestLocationPermission();
    } else {
      setIsChangeLocationModalVisible(true);
    }
  };

  const handleCategoryPress = (categoryId: string) => {
    if (selectedCategoryFilter === categoryId || categoryId === 'todos') {
      setSelectedCategoryFilter(null);
      setSearchQuery('');
    } else {
      setSelectedCategoryFilter(categoryId);
      setSearchQuery('');
    }
  };

  const applyLocationAndFilter = useCallback((lat: number, lon: number) => {
    const newRegion = { latitude: lat, longitude: lon, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    setUserCoords({ lat, lon });
    userCoordsRef.current = { lat, lon };
    setMapRegion(newRegion);
    // Incrementa key para forcar remontagem do MapView com nova regiao
    setMapKey(k => k + 1);

    if (allBusinessesRef.current.length > 0) {
      setBusinessesForMap(filterByRadius(allBusinessesRef.current, lat, lon, RADIUS_KM));
    }
  }, []);

  // Atualiza localizacao quando GPS muda
  useEffect(() => {
    if (realTimeLocation) {
      applyLocationAndFilter(realTimeLocation.latitude, realTimeLocation.longitude);

      if (GOOGLE_MAPS_API_KEY) {
        getAddressFromCoordinates(realTimeLocation.latitude, realTimeLocation.longitude, GOOGLE_MAPS_API_KEY)
          .then((address: string | null) => {
            if (address) { setUserFriendlyLocation(address); }
          })
          .catch(() => {
            setUserFriendlyLocation(`Lat: ${realTimeLocation.latitude.toFixed(4)}, Lon: ${realTimeLocation.longitude.toFixed(4)}`);
          });
      }
    }
  }, [realTimeLocation, applyLocationAndFilter]);

  useEffect(() => {
    if (locationError) { setUserFriendlyLocation(locationError); }
  }, [locationError]);

  // Reaplicar filtro quando lista de negocios mudar
  useEffect(() => {
    if (allBusinessesLoaded.length > 0) {
      allBusinessesRef.current = allBusinessesLoaded;
      const coords = userCoordsRef.current;
      if (coords) {
        setBusinessesForMap(filterByRadius(allBusinessesLoaded, coords.lat, coords.lon, RADIUS_KM));
      } else {
        setBusinessesForMap(allBusinessesLoaded);
      }
    }
  }, [allBusinessesLoaded]);

  const updateLocationStates = useCallback((latitude: number, longitude: number, friendlyName?: string) => {
    applyLocationAndFilter(latitude, longitude);
    if (friendlyName) {
      setUserFriendlyLocation(friendlyName);
    } else if (GOOGLE_MAPS_API_KEY) {
      getAddressFromCoordinates(latitude, longitude, GOOGLE_MAPS_API_KEY)
        .then((address: string | null) => {
          if (address) { setUserFriendlyLocation(address); }
          else { setUserFriendlyLocation(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`); }
        })
        .catch(() => { setUserFriendlyLocation(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`); });
    }
  }, [applyLocationAndFilter]);

  const handleChangeLocation = async () => {
    if (!newAddress.trim()) { Alert.alert('Endereco Invalido', 'Por favor, insira um endereco.'); return; }
    setIsGeocoding(true);
    try {
      const coords = await getCoordinatesFromAddress(newAddress.trim(), GOOGLE_MAPS_API_KEY);
      if (coords) {
        updateLocationStates(coords.latitude, coords.longitude, newAddress.trim());
        setIsChangeLocationModalVisible(false);
        setNewAddress('');
      } else {
        Alert.alert('Erro', 'Nao foi possivel encontrar coordenadas para o endereco informado.');
      }
    } catch { Alert.alert('Erro', 'Ocorreu um erro ao tentar alterar a localizacao.'); }
    finally { setIsGeocoding(false); }
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
        const biz = (cachedData.allActive || []).filter((b: Business) => b.location?.latitude && b.location?.longitude);
        setAllBusinessesLoaded(biz);
        allBusinessesRef.current = biz;
        const coords = userCoordsRef.current;
        setBusinessesForMap(coords ? filterByRadius(biz, coords.lat, coords.lon, RADIUS_KM) : biz);
        setIsLoadingInitialData(false);
        if (Date.now() - (cachedData.lastUpdate || 0) < 3 * 60 * 1000) { return; }
      }

      let allBiz: Business[] = [];
      if (user?.userType === 'owner') {
        allBiz = await getAllBusinessesForOwner();
      } else {
        const [mr, tr, pr, all] = await Promise.all([
          getMostRecentBusinesses(20), getTopRatedBusinesses(10),
          getBusinessesWithPromotions(10), getAllActiveBusinesses(100),
        ]);
        setMostRecent(mr); setTopRated(tr); setPromotions(pr);
        allBiz = all;
        try { await cacheService.saveCachedData({ mostRecent: mr, topRated: tr, promotions: pr, allActive: all }); }
        catch (e) { console.warn('Cache save error:', e); }
      }

      const biz = allBiz.filter((b: Business) => b.location?.latitude && b.location?.longitude);
      setAllBusinessesLoaded(biz);
      allBusinessesRef.current = biz;

      const coords = userCoordsRef.current;
      if (coords) {
        setBusinessesForMap(filterByRadius(biz, coords.lat, coords.lon, RADIUS_KM));
      } else {
        setBusinessesForMap(biz);
        // Centralizar no centro dos estabelecimentos se nao tiver GPS
        if (biz.length > 0) {
          const lats = biz.map(b => b.location!.latitude);
          const lons = biz.map(b => b.location!.longitude);
          const center = {
            latitude: lats.reduce((a, b) => a + b, 0) / lats.length,
            longitude: lons.reduce((a, b) => a + b, 0) / lons.length,
            latitudeDelta: Math.max(0.05, (Math.max(...lats) - Math.min(...lats)) * 1.5),
            longitudeDelta: Math.max(0.05, (Math.max(...lons) - Math.min(...lons)) * 1.5),
          };
          setMapRegion(center);
          setMapKey(k => k + 1);
          setUserFriendlyLocation('Negocios na area');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      if (mostRecent.length === 0) {
        const ec = await cacheService.getCachedData();
        if (ec) {
          setMostRecent(ec.mostRecent || []); setTopRated(ec.topRated || []); setPromotions(ec.promotions || []);
          const biz = (ec.allActive || []).filter((b: Business) => b.location?.latitude && b.location?.longitude);
          setAllBusinessesLoaded(biz); allBusinessesRef.current = biz;
          const coords = userCoordsRef.current;
          setBusinessesForMap(coords ? filterByRadius(biz, coords.lat, coords.lon, RADIUS_KM) : biz);
        } else {
          setMostRecent([]); setTopRated([]); setPromotions([]);
          setAllBusinessesLoaded([]); setBusinessesForMap([]);
          setInitialLoadError('Nao foi possivel carregar os dados. Verifique sua conexao e tente novamente.');
        }
      }
    } finally { setIsLoadingInitialData(false); }
  }, [user?.userType, mostRecent.length]);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  useFocusEffect(
    useCallback(() => {
      setSearchQuery(''); setSelectedCategoryFilter(null); setSearchResults([]);
      if (realTimeLocation) {
        applyLocationAndFilter(realTimeLocation.latitude, realTimeLocation.longitude);
      }
    }, [realTimeLocation, applyLocationAndFilter]),
  );

  const performSearch = useCallback(async () => {
    try {
      setIsSearching(true);
      let results: Business[] = [];
      const searchFilters = selectedCategoryFilter ? { category: selectedCategoryFilter } : undefined;
      if (searchQuery.trim()) { results = await searchBusinesses(searchQuery, searchFilters); }
      else if (selectedCategoryFilter) { results = await searchBusinesses('', searchFilters); }
      else { setSearchResults([]); setIsSearching(false); return; }
      setSearchResults(results);
    } catch { setSearchResults([]); }
    finally { setIsSearching(false); }
  }, [searchQuery, selectedCategoryFilter]);

  useEffect(() => {
    if (searchQuery.trim() || selectedCategoryFilter) {
      const t = setTimeout(() => { performSearch(); }, 500);
      return () => clearTimeout(t);
    } else { setSearchResults([]); }
  }, [searchQuery, selectedCategoryFilter, performSearch]);

  const renderInfoCard = ({ item }: { item: BusinessItemType }) => (
    <TouchableOpacity activeOpacity={0.7}
      onPress={() => { if (item.id) { navigation.navigate('BusinessDetails', { businessId: item.id }); } }}
      style={styles.infoCardItem}>
      <CachedImage storagePath={item.coverImage || item.logo || null} style={styles.infoCardImage} defaultSource={require('../assets/images/banner-home.png')} />
      <Text style={styles.infoCardTitle} numberOfLines={1}>{item.name || 'Nome nao disponivel'}</Text>
      <Text style={styles.infoCardSubtitle} numberOfLines={1}>{getCategoryById(item.category)?.name || item.category || 'Servicos'}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenContainer}>
        <View style={styles.headerContainer}>
          <View style={styles.headerLocationContainer}>
            <Icon name="location-on" size={20} color={colors.primary} />
            <View style={styles.headerLocationInfo}>
              <Text style={styles.headerLocationText} numberOfLines={1}>SUA LOCALIZACAO</Text>
              <View style={styles.locationAddressContainer}>
                {isLocationLoading && <ActivityIndicator size="small" color={colors.primary} style={styles.locationLoadingSpinner} />}
                <Text style={styles.headerLocationAddress} numberOfLines={1}>
                  {isLocationLoading ? 'Obtendo sua localizacao...' : (userFriendlyLocation || 'Localizacao nao disponivel')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleLocationPermission}>
              <Text style={styles.headerChangeLocationText}>{!hasLocationPermission ? 'PERMITIR' : 'ALTERAR'}</Text>
            </TouchableOpacity>
          </View>
          <Image source={require('../assets/images/logo.png')} style={styles.headerLogo} resizeMode="contain" />
        </View>

        <Modal animationType="slide" transparent={true} visible={isChangeLocationModalVisible}
          onRequestClose={() => { setIsChangeLocationModalVisible(false); setNewAddress(''); }}>
          <View style={styles.modalCenteredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalText}>Alterar Localizacao</Text>
              <TextInput style={styles.modalInput} placeholder="Digite o novo endereco"
                placeholderTextColor={colors.lightText} value={newAddress} onChangeText={setNewAddress} />
              {isGeocoding && <ActivityIndicator size="small" color={colors.primary} style={styles.geocodingSpinner} />}
              <View style={styles.modalButtonContainer}>
                <Button title="Cancelar" onPress={() => { setIsChangeLocationModalVisible(false); setNewAddress(''); }} color={colors.error} />
                <Button title="Confirmar" onPress={handleChangeLocation} disabled={isGeocoding || !newAddress.trim()} />
              </View>
            </View>
          </View>
        </Modal>

        <Modal animationType="slide" transparent={true} visible={isFilterModalVisible} onRequestClose={() => setIsFilterModalVisible(false)}>
          <View style={styles.modalCenteredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalText}>Filtros Avancados</Text>
              <Text style={styles.filterModalText}>Opcoes de filtro por data, hora, localizacao, preco, avaliacao serao adicionadas aqui.</Text>
              <View style={styles.modalButtonContainer}>
                <Button title="Limpar" onPress={() => setIsFilterModalVisible(false)} color={colors.lightText} />
                <Button title="Aplicar" onPress={() => setIsFilterModalVisible(false)} />
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
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContentContainer}>
            <View style={styles.searchBarContainer}>
              <Icon name="search" size={20} color={colors.lightText} />
              <TextInput style={styles.searchInput} placeholder="Buscar estabelecimentos ou servicos"
                placeholderTextColor={colors.lightText} value={searchQuery}
                onChangeText={(text) => { setSearchQuery(text); setSelectedCategoryFilter(null); }} />
              {isSearching && <ActivityIndicator size="small" color={colors.primary} style={styles.searchSpinner} />}
              <TouchableOpacity onPress={() => setIsFilterModalVisible(true)} style={styles.filterIconContainer}>
                <Icon name="filter-list" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {!searchQuery.trim() && !selectedCategoryFilter && promotions.length > 0 && (
              <View style={styles.bannerContainer}>
                <Text style={styles.sectionTitle}>Destaques</Text>
                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.bannerScrollView}>
                  {promotions.map((item) => (
                    <TouchableOpacity key={`promo-${item.id}`} style={styles.bannerItem} activeOpacity={0.7}
                      onPress={() => { if (item.id) { navigation.navigate('BusinessDetails', { businessId: item.id }); } }}>
                      <CachedImage storagePath={item.coverImage || item.logo} style={styles.bannerImage} resizeMode="cover" />
                      <View style={styles.bannerTextContainer}>
                        <Text style={styles.bannerTitle} numberOfLines={1}>{item.name || 'Nome nao disponivel'}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {searchQuery.trim() || selectedCategoryFilter ? (
              <>
                <View style={styles.sectionHeader}>
                  <TouchableOpacity style={styles.backButton}
                    onPress={() => { setSearchQuery(''); setSelectedCategoryFilter(null); setSearchResults([]); }}>
                    <Icon name="arrow-back" size={24} color={colors.primary} />
                  </TouchableOpacity>
                  <View style={styles.searchTitleContainer}>
                    <Text style={styles.sectionTitle}>
                      {searchQuery.trim() ? `Resultados para "${searchQuery}"` : `Negocios em "${selectedCategoryFilter}"`}
                    </Text>
                    {searchResults.length > 0 && <Text style={styles.resultsCount}>{searchResults.length} encontrados</Text>}
                  </View>
                </View>
                {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
                {!isSearching && searchResults.length === 0 && (
                  <Text style={styles.emptyListText}>{`Nenhum resultado encontrado para "${searchQuery || selectedCategoryFilter || 'filtro selecionado'}".`}</Text>
                )}
                {searchResults.length > 0 && (
                  <FlatList data={searchResults} renderItem={renderInfoCard} keyExtractor={(item) => item.id}
                    horizontal={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.verticalListContent}
                    removeClippedSubviews={false} scrollEnabled={false} nestedScrollEnabled={true} />
                )}
              </>
            ) : (
              <>
                <View style={styles.mapContainer}>
                  {mapRegion ? (
                    <MapView
                      key={mapKey}
                      ref={mapViewRef}
                      provider={PROVIDER_GOOGLE}
                      style={styles.map}
                      initialRegion={mapRegion}
                      showsUserLocation={true}
                      showsMyLocationButton={true}
                    >
                      {businessesForMap.map(business => (
                        <BusinessMarker key={business.id} business={business}
                          onPress={() => navigation.navigate('BusinessDetails', { businessId: business.id })} />
                      ))}
                    </MapView>
                  ) : (
                    <View style={[styles.map, styles.loadingContainer]}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={styles.loadingText}>Obtendo sua localizacao...</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.sectionTitle}>Categorias</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
                  <TouchableOpacity key="Todos" style={[styles.categoryItem, selectedCategoryFilter === null && styles.activeCategoryItem]} onPress={() => handleCategoryPress('todos')}>
                    <View style={styles.categoryIconContainer}><Icon name="apps" size={24} color={colors.white} /></View>
                    <Text style={[styles.categoryName, selectedCategoryFilter === null && styles.activeCategoryName]}>Todos</Text>
                  </TouchableOpacity>
                  {BUSINESS_CATEGORIES.map((category) => (
                    <TouchableOpacity key={category.id} style={[styles.categoryItem, selectedCategoryFilter === category.id && styles.activeCategoryItem]} onPress={() => handleCategoryPress(category.id)}>
                      <View style={styles.categoryIconContainer}><Icon name={category.icon} size={24} color={colors.white} /></View>
                      <Text style={[styles.categoryName, selectedCategoryFilter === category.id && styles.activeCategoryName]}>{category.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Os 20 mais recentes</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('AllBusinesses', { listType: 'recent', userCity: userCoords ? `${userCoords.lat},${userCoords.lon}` : undefined })}>
                    <Text style={styles.seeAllText}>Ver todos</Text>
                  </TouchableOpacity>
                </View>
                <FlatList data={mostRecent} renderItem={renderInfoCard} keyExtractor={(item) => item.id} horizontal
                  showsHorizontalScrollIndicator={false} style={styles.horizontalList} contentContainerStyle={styles.horizontalListContent}
                  removeClippedSubviews={false} scrollEnabled={true} nestedScrollEnabled={true}
                  ListEmptyComponent={!isLoadingInitialData ? <Text style={styles.emptyListText}>Nenhum estabelecimento encontrado.</Text> : null} />

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Os top 10 mais avaliados da regiao</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('AllBusinesses', { listType: 'topRated', userCity: userCoords ? `${userCoords.lat},${userCoords.lon}` : undefined })}>
                    <Text style={styles.seeAllText}>Ver todos</Text>
                  </TouchableOpacity>
                </View>
                <FlatList data={topRated} renderItem={renderInfoCard} keyExtractor={(item) => item.id} horizontal
                  showsHorizontalScrollIndicator={false} style={styles.horizontalList} contentContainerStyle={styles.horizontalListContent}
                  removeClippedSubviews={false} scrollEnabled={true} nestedScrollEnabled={true}
                  ListEmptyComponent={!isLoadingInitialData ? <Text style={styles.emptyListText}>Nenhum estabelecimento encontrado.</Text> : null} />

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Estabelecimentos com promocoes</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('AllBusinesses', { listType: 'promotions', userCity: userCoords ? `${userCoords.lat},${userCoords.lon}` : undefined })}>
                    <Text style={styles.seeAllText}>Ver todas</Text>
                  </TouchableOpacity>
                </View>
                <FlatList data={promotions} renderItem={renderInfoCard} keyExtractor={(item) => item.id} horizontal
                  showsHorizontalScrollIndicator={false} style={styles.horizontalList} contentContainerStyle={styles.horizontalListContent}
                  removeClippedSubviews={false} scrollEnabled={true} nestedScrollEnabled={true}
                  ListEmptyComponent={!isLoadingInitialData ? <Text style={styles.emptyListText}>Nenhuma promocao encontrada.</Text> : null} />
              </>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screenContainer: { flex: 1, backgroundColor: colors.background },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  headerLogo: { height: 28, width: 120 },
  headerLocationContainer: { flexDirection: 'row', alignItems: 'center' },
  headerLocationInfo: { marginLeft: 5, flexShrink: 1 },
  locationAddressContainer: { flexDirection: 'row', alignItems: 'center' },
  locationLoadingSpinner: { marginRight: 6 },
  headerLocationText: { fontSize: 10, color: colors.lightText },
  headerLocationAddress: { fontSize: 12, color: colors.text },
  headerChangeLocationText: { fontSize: 12, color: colors.primary, marginLeft: 10, fontWeight: 'bold' },
  scrollContent: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  scrollContentContainer: { paddingBottom: 20 },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.lightGray, borderRadius: 8, marginVertical: 16, paddingHorizontal: 12, height: 46 },
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
  infoCardItem: { width: 200, borderRadius: 12, marginRight: 16, overflow: 'hidden', backgroundColor: colors.card, elevation: 2, shadowColor: colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, pointerEvents: 'auto' },
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
  bannerItem: { width: 300, height: 180, marginRight: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.card, elevation: 3, shadowColor: colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, pointerEvents: 'auto' },
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
  filterModalText: { marginVertical: 20, color: colors.text },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  searchTitleContainer: { flex: 1, alignItems: 'center' },
  modalInput: { height: 40, borderColor: colors.lightGray, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginBottom: 20, color: colors.text },
});

export default HomeScreen;
