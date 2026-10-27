// src/features/business/AllBusinessesScreen.tsx
// "Ver todos" da tela inicial: recentes, mais avaliados, promocoes ou todos,
// filtrados pela cidade do cliente (ou distancia / todas as cidades).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';
import { Business, getAllActiveBusinesses } from '../../services/businesses';
import { getCategoryById } from '../../services/categories';
import { useUserLocation } from '../../hooks/useUserLocation';
import {
  applyExtraFilters,
  BusinessFilters,
  DEFAULT_FILTERS,
  filterByScope,
  getCityFromCoordinates,
  scopeLabel,
  Scope,
  sortRecent,
  sortTopRated,
} from '../../services/cityLocation';
import CachedImage from '../../components/common/CachedImage';

type ListType = 'recent' | 'topRated' | 'promotions' | 'all';

const defaultPlaceholderImage = require('../../assets/images/banner-home.png');

const TITLES: Record<ListType, string> = {
  recent: 'Estabelecimentos recentes',
  topRated: 'Mais bem avaliados',
  promotions: 'Promoções',
  all: 'Todos os estabelecimentos',
};

const SCOPES: { key: Scope; label: string }[] = [
  { key: 'city', label: 'Minha cidade' },
  { key: 'radius30', label: 'Até 30 km' },
  { key: 'all', label: 'Todas' },
];

const AllBusinessesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params || {};
  const listType: ListType = (['recent', 'topRated', 'promotions', 'all'].includes(params.listType)
    ? params.listType : 'all') as ListType;

  const userLocation = useUserLocation();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [city, setCity] = useState<string | undefined>(
    typeof params.city === 'string' && params.city ? params.city : undefined,
  );
  const [filters, setFilters] = useState<BusinessFilters>({
    scope: (['city', 'radius10', 'radius30', 'all'].includes(params.scope) ? params.scope : DEFAULT_FILTERS.scope) as Scope,
    minRating: Number(params.minRating) || 0,
    onlyPromotions: params.onlyPromotions === true,
  });

  const load = useCallback(async () => {
    try {
      setError(false);
      const data = await getAllActiveBusinesses(200);
      setBusinesses(Array.isArray(data) ? data : []);
    } catch {
      setError(true);
      setBusinesses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // cidade do cliente (quando nao veio da tela inicial)
  const lat = userLocation ? userLocation.latitude : undefined;
  const lon = userLocation ? userLocation.longitude : undefined;
  useEffect(() => {
    if (city || typeof lat !== 'number' || typeof lon !== 'number') {
      return;
    }
    let active = true;
    getCityFromCoordinates(lat, lon).then((p) => {
      if (active && p && p.city) {
        setCity(p.city);
      }
    });
    return () => {
      active = false;
    };
  }, [city, lat, lon]);

  const list = useMemo(() => {
    let out = filterByScope(businesses, filters.scope, { city, lat, lon });
    out = applyExtraFilters(out, filters);
    if (listType === 'promotions') {
      out = out.filter((b) => b.hasActivePromotions === true);
    }
    if (listType === 'recent') {
      return sortRecent(out);
    }
    if (listType === 'topRated') {
      return sortTopRated(out);
    }
    return [...out].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
  }, [businesses, filters, city, lat, lon, listType]);

  const renderItem = ({ item }: { item: Business }) => {
    const category = getCategoryById(item.category);
    const address = [item.address, item.addressNumber].filter(Boolean).join(', ');
    const place = [item.neighborhood, item.city].filter(Boolean).join(' - ');
    const rating = Number(item.rating) || 0;
    const reviews = Number(item.reviewCount) || 0;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('BusinessDetails', { businessId: item.id })}
      >
        <CachedImage
          storagePath={item.coverImage || item.logo || item.imageUrl || null}
          style={styles.image}
          defaultSource={defaultPlaceholderImage}
        />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name || 'Estabelecimento'}</Text>
          <Text style={styles.category} numberOfLines={1}>{(category && category.name) || 'Serviços'}</Text>
          {address || place ? (
            <View style={styles.addressRow}>
              <Icon name="location-on" size={14} color={colors.lightText} />
              <Text style={styles.address} numberOfLines={2}>{[address, place].filter(Boolean).join(' · ')}</Text>
            </View>
          ) : null}
          {rating > 0 ? (
            <View style={styles.ratingRow}>
              <Icon name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>
                {rating.toFixed(1).replace('.', ',')}{reviews > 0 ? ` (${reviews} avaliações)` : ''}
              </Text>
            </View>
          ) : null}
          {item.hasActivePromotions ? (
            <View style={styles.promoBadge}>
              <Text style={styles.promoText}>PROMOÇÃO</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const setScope = (scope: Scope) => setFilters((f) => ({ ...f, scope }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{TITLES[listType]}</Text>
      </View>

      <View style={styles.filterBar}>
        <View style={styles.chipsRow}>
          {SCOPES.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.chip, filters.scope === s.key && styles.chipActive]}
              onPress={() => setScope(s.key)}
            >
              <Text style={[styles.chipText, filters.scope === s.key && styles.chipTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.chip, filters.minRating >= 4 && styles.chipActive]}
            onPress={() => setFilters((f) => ({ ...f, minRating: f.minRating >= 4 ? 0 : 4 }))}
          >
            <Text style={[styles.chipText, filters.minRating >= 4 && styles.chipTextActive]}>Nota 4+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.scopeText}>{scopeLabel(filters, city)}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando estabelecimentos...</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name={error ? 'cloud-off' : 'storefront'} size={56} color={colors.lightText} />
              <Text style={styles.emptyTitle}>
                {error
                  ? 'Não foi possível carregar os estabelecimentos.'
                  : filters.scope === 'city' && city
                    ? `Nenhum estabelecimento encontrado em ${city}.`
                    : 'Nenhum estabelecimento encontrado.'}
              </Text>
              {!error && filters.scope !== 'all' ? (
                <TouchableOpacity style={styles.emptyButton} onPress={() => setScope('all')}>
                  <Text style={styles.emptyButtonText}>Ver de todas as cidades</Text>
                </TouchableOpacity>
              ) : null}
              {error ? (
                <TouchableOpacity style={styles.emptyButton} onPress={load}>
                  <Text style={styles.emptyButtonText}>Tentar novamente</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  backButton: { marginRight: 14 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  filterBar: { backgroundColor: colors.white, paddingHorizontal: 12, paddingBottom: 10, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: colors.primary, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 6 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  scopeText: { fontSize: 12, color: colors.lightText, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 15, color: colors.text },
  listContent: { padding: 16, flexGrow: 1 },
  card: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 12, marginBottom: 12, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
  image: { width: 100, height: 100 },
  info: { flex: 1, padding: 12 },
  name: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 2, marginRight: 70 },
  category: { fontSize: 13, color: colors.lightText, marginBottom: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  address: { flex: 1, fontSize: 12, color: colors.lightText, marginLeft: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  ratingText: { fontSize: 13, color: colors.text, marginLeft: 4 },
  promoBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: colors.error, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  promoText: { color: colors.white, fontSize: 11, fontWeight: 'bold' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginTop: 14, textAlign: 'center' },
  emptyButton: { marginTop: 16, borderWidth: 1, borderColor: colors.primary, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  emptyButtonText: { color: colors.primary, fontWeight: 'bold' },
});

export default AllBusinessesScreen;
