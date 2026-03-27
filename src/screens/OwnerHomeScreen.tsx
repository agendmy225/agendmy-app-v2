// C:\Users\Marcos\Documents\VS Code\clientes\agendmy\src\screens\owner\OwnerHomeScreen.tsx
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
import Config from 'react-native-config';

type BusinessItemType = Business;

const defaultPlaceholderImage = require('../assets/images/banner-home.png');

const OwnerHomeScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userFriendlyLocation, setUserFriendlyLocation] = useState('Obtendo localização...');
  const [, setUserCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>({
    latitude: -15.7801, // Centro do Brasil
    longitude: -47.9292, // Centro do Brasil (Brasília)
    latitudeDelta: 20.0, // Zoom para mostrar o Brasil todo
    longitudeDelta: 20.0,
  });
  const [businessesForMap, setBusinessesForMap] = useState<Business[]>([]);
  const [allBusinessesLoaded, setAllBusinessesLoaded] = useState<Business[]>([]); // Armazena todos os negócios carregados inicialmente
  const [mostRecent, setMostRecent] = useState<Business[]>([]);
  const [topRated, setTopRated] = useState<Business[]>([]);
  const [promotions, setPromotions] = useState<Business[]>([]);
  const [searchResults, setSearchResults] = useState<Business[]>([]);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true); // Estado para o carregamento inicial de todos os dados
  const [isSearching, setIsSearching] = useState(false);
  const [isChangeLocationModalVisible, setIsChangeLocationModalVisible] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filterSortBy, setFilterSortBy] = useState<'rating' | 'recent' | 'name'>('rating');
  const [filterMinRating, setFilterMinRating] = useState<number>(0);
  const [activeFilters, setActiveFilters] = useState<{ sortBy: 'rating' | 'recent' | 'name'; minRating: number }>({ sortBy: 'rating', minRating: 0 });
  const applyFilters = (list) => { return list.filter(b => (b.rating || 0) >= activeFilters.minRating).sort((a, b) => { if (activeFilters.sortBy === 'rating') return (b.rating || 0) - (a.rating || 0); if (activeFilters.sortBy === 'name') return (a.name || '').localeCompare(b.name || ''); return 0; }); }; const mapRef = useRef<MapView>(null);
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>() as any;

  // Ref para controlar o primeiro foco da tela
  const isInitialMount = useRef(true);

  // NOVO ESTADO PARA O FILTRO DE CATEGORIA
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Hook para localização em tempo real
  const {
    location: realTimeLocation,
    isLoading: isLocationLoading,
    error: locationError,
    hasPermission: hasLocationPermission,
    requestPermission: requestLocationPermission,
    startWatching: startLocationWatching,
    isWatching: isLocationWatching,
  } = useLocation();

  // Automaticamente iniciar a observação quando a permissão for concedida
  useEffect(() => {
    if (hasLocationPermission && !isLocationWatching && !locationError) {
      console.log('Permissão concedida, iniciando observação de localização');
      startLocationWatching();
    }
  }, [hasLocationPermission, isLocationWatching, locationError, startLocationWatching]);

  const handleLocationPermission = async () => {
    if (!hasLocationPermission) {
      const permissionGranted = await requestLocationPermission();
      if (permissionGranted) {
        console.log('Permissão concedida, aguardando início automático da observação');
      }
    } else {
      setIsChangeLocationModalVisible(true);
    }
  };

  // Lógica de clique na categoria
  const handleCategoryPress = (categoryName: string) => {
    // Se a categoria clicada já for a selecionada, ou se for 'Todos', desliga o filtro.
    // Caso contrário, define a categoria clicada como filtro.
    if (selectedCategoryFilter === categoryName || categoryName === 'Todos') {
      setSelectedCategoryFilter(null); // Desliga o filtro
      setSearchQuery(''); // Limpa a busca de texto
    } else {
      setSelectedCategoryFilter(categoryName); // Define a categoria
      setSearchQuery(''); // Limpa a busca de texto quando um filtro de categoria é ativado
    }
  };

  // Efeito para filtrar negócios para o mapa sempre que mapRegion muda
  useEffect(() => {
    // Só filtra se há dados carregados
    if (allBusinessesLoaded && allBusinessesLoaded.length > 0 && mapRegion) {
      const { latitude, longitude, latitudeDelta, longitudeDelta } = mapRegion;
      const filtered = allBusinessesLoaded.filter(business => {
        if (!business.location) {
          return false;
        }
        const inLatitude = business.location.latitude >= latitude - latitudeDelta / 2 &&
          business.location.latitude <= latitude + latitudeDelta / 2;
        const inLongitude = business.location.longitude >= longitude - longitudeDelta / 2 &&
          business.location.longitude <= longitude + longitudeDelta / 2;
        return inLatitude && inLongitude;
      });
      setBusinessesForMap(filtered);
    }
  }, [mapRegion, allBusinessesLoaded]); // Dependências necessárias

  // Effect para usar localização do usuário quando ela estiver disponível
  useEffect(() => {
    if (realTimeLocation && !mapRegion) {
      console.log('Usando localização do usuário:', realTimeLocation);
      const newRegionDetails = {
        latitude: realTimeLocation.latitude,
        longitude: realTimeLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.01,
      };
      setMapRegion(newRegionDetails);
      setUserCoordinates({ latitude: realTimeLocation.latitude, longitude: realTimeLocation.longitude });

      // Buscar endereço da localização
      if (Config.GOOGLE_MAPS_API_KEY) {
        getAddressFromCoordinates(realTimeLocation.latitude, realTimeLocation.longitude, Config.GOOGLE_MAPS_API_KEY || '').then((address: string | null) => {
          if (address) {
            setUserFriendlyLocation(address);
          } else {
            setUserFriendlyLocation(`Lat: ${realTimeLocation.latitude.toFixed(4)}, Lon: ${realTimeLocation.longitude.toFixed(4)}`);
          }
        }).catch(() => {
          setUserFriendlyLocation(`Lat: ${realTimeLocation.latitude.toFixed(4)}, Lon: ${realTimeLocation.longitude.toFixed(4)}`);
        });
      } else {
        setUserFriendlyLocation(`Lat: ${realTimeLocation.latitude.toFixed(4)}, Lon: ${realTimeLocation.longitude.toFixed(4)}`);
      }
    }
  }, [realTimeLocation, mapRegion]);

  // Effect para mostrar erros de localização
  useEffect(() => {
    if (locationError) {
      console.error('Erro de localização:', locationError);
      setUserFriendlyLocation(locationError);
    }
  }, [locationError]);

  // Função para atualizar os estados de localização e região do mapa
  const updateLocationStates = useCallback((latitude: number, longitude: number, friendlyName?: string) => {
    const newRegionDetails = {
      latitude,
      longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.01,
    };



    setUserCoordinates({ latitude, longitude }); // Atualiza as coordenadas do usuário
    setMapRegion(newRegionDetails); // Atualiza a região do mapa

    // Anima o mapa para a nova localização
    if (mapRef.current) {

      mapRef.current.animateToRegion(newRegionDetails, 1000);
    }

    if (friendlyName) {
      setUserFriendlyLocation(friendlyName);
    } else {
      getAddressFromCoordinates(latitude, longitude, Config.GOOGLE_MAPS_API_KEY || '').then((address: string | null) => {
        if (address) {
          setUserFriendlyLocation(address);
        } else {
          setUserFriendlyLocation(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)} (Endereço não encontrado)`);
        }
      }).catch((_geoError: any) => {
        setUserFriendlyLocation(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)} (Endereço não encontrado)`);
      });
    }
  }, []); // Dependências estáveis

  const handleChangeLocation = async () => {
    if (!newAddress.trim()) {
      Alert.alert('Endereço Inválido', 'Por favor, insira um endereço.');
      return;
    }
    setIsGeocoding(true);
    try {
      const coords = await getCoordinatesFromAddress(newAddress.trim(), Config.GOOGLE_MAPS_API_KEY || '');
      if (coords) {
        updateLocationStates(coords.latitude, coords.longitude, newAddress.trim());
        setIsChangeLocationModalVisible(false);
        setNewAddress('');
      } else {
        Alert.alert('Erro', 'Não foi possível encontrar coordenadas para o endereço informado.');
      }
    } catch {
      Alert.alert('Erro', 'Ocorreu um erro ao tentar alterar a localização.');
    } finally {
      setIsGeocoding(false);
    }
  };

  // Função para carregar os dados iniciais (com sistema de cache)
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoadingInitialData(true);
      setInitialLoadError(null);

      // Verificar se temos dados em cache primeiro
      const cachedData = await cacheService.getCachedData();

      if (cachedData) {
        console.log('📦 Carregando dados do cache...');
        setMostRecent(cachedData.mostRecent || []);
        setTopRated(cachedData.topRated || []);
        setPromotions(cachedData.promotions || []);

        const businessesWithLocation = (cachedData.allActive || []).filter(
          (b: Business) => b.location?.latitude && b.location?.longitude,
        );
        setAllBusinessesLoaded(businessesWithLocation);
        setBusinessesForMap(businessesWithLocation);

        console.log('Estabelecimentos do cache carregados:', businessesWithLocation.length);
        setIsLoadingInitialData(false);

        // Se o cache é recente (menos de 3 minutos), não recarregar
        const cacheAge = Date.now() - (cachedData.lastUpdate || 0);
        const CACHE_REFRESH_THRESHOLD = 3 * 60 * 1000; // 3 minutos

        if (cacheAge < CACHE_REFRESH_THRESHOLD) {
          console.log('📦 Cache ainda válido, não recarregando');
          return;
        }
      }

      // Solicitar permissão de localização se ainda não tiver
      if (!hasLocationPermission) {
        const permissionGranted = await requestLocationPermission();
        if (permissionGranted) {
          console.log('✅ Permissão de localização concedida');
        }
      }

      // Carregar dados do Firestore
      console.log('🔄 Carregando dados do Firestore...');
      let allBusinessesForUser: Business[] = [];

      // Carregar dados organizados com cache (tanto para proprietários quanto clientes)
      const [mostRecentData, topRatedData, promotionsData, allActiveData] = await Promise.all([
        getMostRecentBusinesses(20),
        getTopRatedBusinesses(10),
        getBusinessesWithPromotions(10),
        getAllActiveBusinesses(100),
      ]);

      setMostRecent(mostRecentData);
      setTopRated(topRatedData);
      setPromotions(promotionsData);
      allBusinessesForUser = allActiveData;

      // Salvar no cache
      try {
        await cacheService.saveCachedData({
          mostRecent: mostRecentData,
          topRated: topRatedData,
          promotions: promotionsData,
          allActive: allActiveData,
        });
        console.log('💾 Dados salvos no cache');
      } catch (cacheError) {
        console.warn('⚠️ Erro ao salvar cache:', cacheError);
      }

      // Filtrar estabelecimentos com localização válida
      const businessesWithLocation = allBusinessesForUser.filter(
        (b: Business) => b.location?.latitude && b.location?.longitude,
      );
      setAllBusinessesLoaded(businessesWithLocation);
      setBusinessesForMap(businessesWithLocation);

      console.log('✅ Dados carregados com sucesso:', businessesWithLocation.length);

    } catch (error) {
      console.error('❌ Erro ao carregar dados iniciais:', error);

      // Tentar usar cache expirado como fallback
      if (mostRecent.length === 0) {
        const expiredCache = await cacheService.getCachedData();
        if (expiredCache) {
          console.log('📦 Usando cache expirado como fallback');
          setMostRecent(expiredCache.mostRecent || []);
          setTopRated(expiredCache.topRated || []);
          setPromotions(expiredCache.promotions || []);

          const businessesWithLocation = (expiredCache.allActive || []).filter(
            (b: Business) => b.location?.latitude && b.location?.longitude,
          );
          setAllBusinessesLoaded(businessesWithLocation);
          setBusinessesForMap(businessesWithLocation);
        } else {
          // Se não tem nem cache, limpar tudo e mostrar erro
          setMostRecent([]);
          setTopRated([]);
          setPromotions([]);
          setAllBusinessesLoaded([]);
          setBusinessesForMap([]);
          setInitialLoadError('Não foi possível carregar os dados. Verifique sua conexão e tente novamente.');
        }
      }
    } finally {
      setIsLoadingInitialData(false);
    }
  }, [hasLocationPermission, requestLocationPermission, mostRecent.length]);

  // Efeito para carregar dados iniciais APENAS uma vez no montagem do componente
  // Substituído por useFocusEffect para recarregar ao voltar para a tela
  /*
  useEffect(() => {
    loadInitialData();
  }, []);
  */
  // Efeito para recarregar dados quando a tela é focada (exceto no mount inicial)
  useFocusEffect(
    useCallback(() => {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        // Primeiro carregamento sempre executa
        loadInitialData();
      } else {
        // Verificação antes de recarregar ao voltar ao foco
        // Só recarrega se não tiver dados
        const hasRecentData = topRated.length > 0 && promotions.length > 0;

        if (!hasRecentData) {
          loadInitialData();
        }
      }

      // Opcional: cleanup function se necessário ao desfocar a tela
      return () => {
      };
    }, [loadInitialData, topRated.length, promotions.length]), // Dependências atualizadas
  );

  // Função para executar busca de negócios
  const performSearch = useCallback(async (query: string, categoryFilter?: string | null) => {
    if ((!query || query.trim().length === 0) && !categoryFilter) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      let results: Business[] = [];

      if (query && query.trim().length > 0) {
        // Busca por texto
        results = await searchBusinesses(query.trim());
      } else if (categoryFilter) {
        // Filtro por categoria (busca pela categoria)
        results = await searchBusinesses(categoryFilter);
      }

      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Executa a busca quando searchQuery ou selectedCategoryFilter mudam
  useEffect(() => {
    if (searchQuery && searchQuery.trim().length > 0) {
      // Se há texto de busca, realiza busca de texto
      const timeoutId = setTimeout(() => {
        performSearch(searchQuery.trim(), null);
      }, 500); // Debounce de 500ms para texto

      return () => clearTimeout(timeoutId);
    } else if (selectedCategoryFilter) {
      // Se há filtro de categoria, realiza busca de categoria
      performSearch('', selectedCategoryFilter);
    } else {
      // Se não houver nenhum dos dois, limpa os resultados da busca
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
      <Text style={styles.infoCardSubtitle} numberOfLines={1}>{getCategoryById(item.category)?.name || item.category || 'Serviços'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screenContainer}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLocationContainer}>
          <Icon name="location-on" size={20} color={colors.primary} />
          <View style={styles.headerLocationInfo}>
            <Text style={styles.headerLocationText} numberOfLines={1}>SUA LOCALIZAÇÃO</Text>
            <Text style={styles.headerLocationAddress} numberOfLines={1}>
              {isLocationLoading ? 'Obtendo sua localização...' : (userFriendlyLocation || 'Localização não disponível')}
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

      {/* Change Location Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isChangeLocationModalVisible}
        onRequestClose={() => {
          setIsChangeLocationModalVisible(!isChangeLocationModalVisible);
          setNewAddress('');
        }}
      >
        <View style={styles.modalCenteredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Alterar Localização</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Digite o novo endereço"
              placeholderTextColor={colors.lightText}
              value={newAddress}
              onChangeText={setNewAddress}
            />
            {isGeocoding && <ActivityIndicator size="small" color={colors.primary} style={styles.geocodingSpinner} />}
            <View style={styles.modalButtonContainer}>
              <Button
                title="Cancelar"
                onPress={() => {
                  setIsChangeLocationModalVisible(false);
                  setNewAddress('');
                }}
                color={colors.error}
              />
              <Button
                title="Confirmar"
                onPress={handleChangeLocation}
                disabled={isGeocoding || !newAddress.trim()}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
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
              {([['rating', 'Avaliação'], ['recent', 'Recentes'], ['name', 'Nome']] as const).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setFilterSortBy(key)}
                  style={{
                    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                    backgroundColor: filterSortBy === key ? colors.primary : colors.lightGray,
                  }}
                >
                  <Text style={{ fontSize: 13, color: filterSortBy === key ? colors.white : colors.text, fontWeight: filterSortBy === key ? '600' : '400' }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Avaliação mínima</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
              {[0, 3, 4, 4.5].map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setFilterMinRating(r)}
                  style={{
                    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                    backgroundColor: filterMinRating === r ? colors.primary : colors.lightGray,
                  }}
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

      {/* Main Content or Loading/Error State */}
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
              placeholder="Buscar estabelecimentos ou serviços"
              placeholderTextColor={colors.lightText}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setSelectedCategoryFilter(null); // Limpa o filtro de categoria ao digitar na busca
              }}
            />
            {isSearching && (
              <ActivityIndicator size="small" color={colors.primary} style={styles.searchSpinner} />
            )}
            <TouchableOpacity onPress={() => { setFilterSortBy(activeFilters.sortBy); setFilterMinRating(activeFilters.minRating); setIsFilterModalVisible(true); }} style={[styles.filterIconContainer, (activeFilters.sortBy !== 'rating' || activeFilters.minRating > 0) && { backgroundColor: colors.primary }]}>
              <Icon name="filter-list" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Seção de Destaques/Banner, aparece apenas se não houver busca de texto nem filtro de categoria */}
          {!searchQuery.trim() && !selectedCategoryFilter && promotions.length > 0 && (
            <View style={styles.bannerContainer}>
              <Text style={styles.sectionTitle}>Destaques</Text>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.bannerScrollView}
              >
                {promotions.map((item) => (
                  <TouchableOpacity
                    key={`promo-${item.id}`}
                    style={styles.bannerItem}
                    onPress={() => navigation.navigate('BusinessDetails', { businessId: item.id })}
                  >
                    <CachedImage
                      storagePath={item.coverImage || item.logo || null}
                      style={styles.bannerImage}
                      resizeMode="cover"
                      defaultSource={defaultPlaceholderImage}
                    />
                    <View style={styles.bannerTextContainer}>
                      <Text style={styles.bannerTitle} numberOfLines={1}>{item.name}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Seção de Resultados da Busca ou Filtro de Categoria */}
          {searchQuery.trim() || selectedCategoryFilter ? (
            <>
              <View style={styles.sectionHeader}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCategoryFilter(null);
                    setSearchResults([]);
                  }}
                >
                  <Icon name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.resultsHeaderContent}>
                  <Text style={styles.sectionTitle}>
                    {searchQuery.trim()
                      ? `Resultados para "${searchQuery}"`
                      : `Negócios em "${selectedCategoryFilter}"`}
                  </Text>
                  {searchResults.length > 0 && <Text style={styles.resultsCount}>{searchResults.length} encontrados</Text>}
                </View>
              </View>
              {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
              {!isSearching && searchResults.length === 0 && (
                <Text style={styles.emptyListText}>
                  Nenhum resultado encontrado para &quot;{searchQuery || selectedCategoryFilter}&quot;.
                </Text>
              )}
              {searchResults.length > 0 && (
                <FlatList
                  data={searchResults}
                  renderItem={renderInfoCard}
                  keyExtractor={(item) => item.id}
                  horizontal={false} // Para mostrar a lista verticalmente se houver muitos resultados de busca/filtro
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.verticalListContent} // Novo estilo para lista vertical
                />
              )}
            </>
          ) : (
            // Conteúdo padrão da Home, se não houver busca de texto nem filtro de categoria
            <>
              <View style={styles.mapContainer}>
                {mapRegion ? (
                  <MapView
                    ref={mapRef}
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    region={mapRegion} // Usar region para atualização dinâmica
                    showsUserLocation
                    showsMyLocationButton
                  >
                    {businessesForMap.map(business => (
                      <BusinessMarker
                        key={business.id}
                        business={business}
                        onPress={() => navigation.navigate('BusinessDetails', { businessId: business.id })}
                      />
                    ))}
                  </MapView>
                ) : (
                  <View style={[styles.map, styles.loadingContainer]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Obtendo sua localização...</Text>
                  </View>
                )}
              </View>

              <Text style={styles.sectionTitle}>Categorias</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
                {/* Botão "Todos" para limpar o filtro de categoria */}
                <TouchableOpacity
                  key="Todos"
                  style={[
                    styles.categoryItem,
                    selectedCategoryFilter === null && styles.activeCategoryItem, // Se `selectedCategoryFilter` for null, "Todos" está ativo
                  ]}
                  onPress={() => handleCategoryPress('Todos')}
                >
                  <View style={styles.categoryIconContainer}>
                    <Icon
                      name="apps" // Ícone genérico para "Todos"
                      size={24}
                      color={colors.white}
                    />
                  </View>
                  <Text style={[styles.categoryName, selectedCategoryFilter === null && styles.activeCategoryName]}>Todos</Text>
                </TouchableOpacity>

                {/* Mapeia as categorias de negócio */}
                {BUSINESS_CATEGORIES.map((category: { id: string; name: string; icon: string }) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryItem,
                      selectedCategoryFilter === category.name && styles.activeCategoryItem, // Ativa se for a categoria selecionada
                    ]}
                    onPress={() => handleCategoryPress(category.name)}
                  >
                    <View style={styles.categoryIconContainer}>
                      <Icon
                        name={category.icon}
                        size={24}
                        color={colors.white}
                      />
                    </View>
                    <Text style={[styles.categoryName, selectedCategoryFilter === category.name && styles.activeCategoryName]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Os 20 mais recentes</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>Ver todos</Text>
                </TouchableOpacity>
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
                <Text style={styles.sectionTitle}>Os top 10 mais avaliados da região</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>Ver todos</Text>
                </TouchableOpacity>
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
                <Text style={styles.sectionTitle}>Estabelecimentos com promoções</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>Ver todas</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={applyFilters(promotions)}
                renderItem={renderInfoCard}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalList}
                contentContainerStyle={styles.horizontalListContent}
                ListEmptyComponent={!isLoadingInitialData ? <Text style={styles.emptyListText}>Nenhuma promoção encontrada.</Text> : null}
              />
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 10,
    paddingBottom: 8,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  headerLogo: {
    height: 28,
    width: 120,
  },
  headerLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLocationInfo: {
    marginLeft: 5,
    flexShrink: 1,
  },
  headerLocationText: {
    fontSize: 10,
    color: colors.lightText,
  },
  headerLocationAddress: {
    fontSize: 12,
    color: colors.text,
  },
  headerChangeLocationText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 10,
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    marginVertical: 16,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: colors.text,
    fontSize: 14,
    marginLeft: 8,
  },
  mapContainer: {
    height: 250,
    marginVertical: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginVertical: 16,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
    paddingVertical: 8, // Aumenta a área clicável
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent', // Borda transparente por padrão
  },
  activeCategoryItem: {
    borderColor: colors.primary, // Borda visível para item ativo
    backgroundColor: colors.lightGray, // Ou outra cor para indicar ativação
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  categoryName: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
  },
  activeCategoryName: {
    fontWeight: 'bold', // Texto mais forte para a categoria ativa
    color: colors.primary, // Cor do texto da categoria ativa
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
  },
  horizontalList: {
    marginBottom: 24,
  },
  horizontalListContent: {
    paddingRight: 16,
  },
  verticalListContent: { // Novo estilo para quando a FlatList for vertical
    paddingBottom: 24, // Espaçamento inferior
  },
  infoCardItem: {
    width: 200,
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: colors.card,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoCardImage: {
    width: '100%',
    height: 120,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginHorizontal: 12,
    marginTop: 8,
  },
  infoCardSubtitle: {
    fontSize: 12,
    color: colors.lightText,
    marginHorizontal: 12,
    marginBottom: 12,
    marginTop: 4,
  },
  searchSpinner: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -10,
  },
  resultsCount: {
    fontSize: 12,
    color: colors.lightText,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.lightText,
  },
  emptyListText: {
    textAlign: 'center',
    color: colors.lightText,
    marginTop: 20,
    width: '100%', // Para centralizar o texto
  },
  bannerContainer: {
    marginVertical: 16,
  },
  bannerScrollView: {
    height: 200,
  },
  bannerItem: {
    width: 300,
    height: 180,
    marginRight: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.card,
    elevation: 3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerTextContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
  },
  bannerTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalCenteredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  geocodingSpinner: {
    marginVertical: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginVertical: 16,
  },
  filterIconContainer: {
    paddingLeft: 10,
  },
  filterModalText: {
    marginVertical: 20,
    color: colors.text,
  },
  modalInput: {
    height: 40,
    borderColor: colors.lightGray,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
    color: colors.text,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultsHeaderContent: {
    flex: 1,
  },
});

export default OwnerHomeScreen;
