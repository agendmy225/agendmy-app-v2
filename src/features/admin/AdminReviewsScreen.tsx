import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';
import { AppStackParamList } from '../../types/types';
import { useAuth } from '../auth/context/AuthContext';
import {
  getAllReviewsAdmin,
  setReviewStatusAdmin,
  AdminReview,
  AdminReviewStatus,
} from '../../services/adminReviews';

type NavProp = StackNavigationProp<AppStackParamList>;
type FilterType = AdminReviewStatus | 'all';

const STAR_COLOR = '#FFC107';

const stars = (value: number): string => {
  const n = Math.max(0, Math.min(5, Math.round(value)));
  return '\u2605'.repeat(n) + '\u2606'.repeat(5 - n);
};

const formatDate = (d: Date | null): string => {
  if (!d) {
    return 'sem data';
  }
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const statusInfo = (s: AdminReviewStatus): { label: string; color: string } => {
  if (s === 'approved') { return { label: 'Aprovada', color: colors.success }; }
  if (s === 'rejected') { return { label: 'Rejeitada', color: colors.error }; }
  return { label: 'Pendente', color: colors.warning };
};

const AdminReviewsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { isAdmin } = useAuth();

  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const list = await getAllReviewsAdmin();
      setReviews(list);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const handleSetStatus = (review: AdminReview, status: 'approved' | 'rejected') => {
    const acao = status === 'approved' ? 'aprovar' : 'rejeitar';
    Alert.alert(
      'Confirmar',
      `Deseja ${acao} a avaliacao de ${review.userName} em "${review.businessName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: status === 'approved' ? 'Aprovar' : 'Rejeitar',
          style: status === 'approved' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setBusyId(review.path);
              await setReviewStatusAdmin(review, status);
              setReviews((prev) =>
                prev.map((r) => (r.path === review.path ? { ...r, status } : r))
              );
            } catch {
              Alert.alert('Erro', 'Nao foi possivel atualizar a avaliacao.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  if (!isAdmin) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.center}>
        <Icon name="lock" size={64} color={colors.lightText} />
        <Text style={styles.deniedTitle}>Acesso restrito</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const count = (s: FilterType) =>
    s === 'all' ? reviews.length : reviews.filter((r) => r.status === s).length;

  const filters: { key: FilterType; label: string }[] = [
    { key: 'pending', label: 'Pendentes' },
    { key: 'approved', label: 'Aprovadas' },
    { key: 'rejected', label: 'Rejeitadas' },
    { key: 'all', label: 'Todas' },
  ];

  const term = search.trim().toLowerCase();
  const filtered = reviews.filter((r) => {
    if (filter !== 'all' && r.status !== filter) {
      return false;
    }
    if (!term) {
      return true;
    }
    return (
      r.businessName.toLowerCase().includes(term) ||
      r.userName.toLowerCase().includes(term) ||
      r.comment.toLowerCase().includes(term)
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIcon}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="arrow-back" size={26} color={colors.white} />
        </TouchableOpacity>
        <Icon name="star-rate" size={30} color={colors.white} />
        <Text style={styles.headerTitle}>Avaliacoes</Text>
        <Text style={styles.headerSubtitle}>
          {reviews.length} no total - {count('pending')} pendentes
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label} ({count(f.key)})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={colors.lightText} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar estabelecimento, cliente ou comentario"
          placeholderTextColor={colors.placeholderText}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="close" size={20} color={colors.lightText} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando avaliacoes...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="error-outline" size={48} color={colors.error} />
          <Text style={styles.loadingText}>Nao foi possivel carregar as avaliacoes.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => load(false)}>
            <Text style={styles.primaryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              colors={[colors.primary]}
            />
          }
        >
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma avaliacao encontrada.</Text>
          ) : (
            filtered.map((r) => {
              const st = statusInfo(r.status);
              const busy = busyId === r.path;
              return (
                <View key={r.path} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.businessName} numberOfLines={1}>{r.businessName}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: st.color }]}>
                      <Text style={styles.statusBadgeText}>{st.label}</Text>
                    </View>
                  </View>

                  <Text style={styles.starsText}>
                    <Text style={{ color: STAR_COLOR }}>{stars(r.rating)}</Text>
                    <Text style={styles.ratingNumber}>  {r.rating.toFixed(1)}</Text>
                  </Text>

                  <Text style={styles.meta}>
                    por {r.userName} - {formatDate(r.date)}
                    {r.isLegacy ? '  (formato antigo)' : ''}
                  </Text>

                  {r.professionalName ? (
                    <Text style={styles.meta}>
                      Profissional: {r.professionalName}
                      {r.professionalRating ? `  ${'\u2605'} ${r.professionalRating.toFixed(1)}` : ''}
                    </Text>
                  ) : null}

                  <Text style={styles.comment}>
                    {r.comment ? r.comment : 'Sem comentario.'}
                  </Text>

                  {r.hasResponse && (
                    <Text style={styles.responseTag}>O estabelecimento ja respondeu</Text>
                  )}

                  <View style={styles.actions}>
                    {busy ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        {r.status !== 'approved' && (
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.success }]}
                            onPress={() => handleSetStatus(r, 'approved')}
                          >
                            <Icon name="check" size={16} color={colors.white} />
                            <Text style={styles.actionText}>Aprovar</Text>
                          </TouchableOpacity>
                        )}
                        {r.status !== 'rejected' && (
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.error }]}
                            onPress={() => handleSetStatus(r, 'rejected')}
                          >
                            <Icon name="close" size={16} color={colors.white} />
                            <Text style={styles.actionText}>Rejeitar</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    padding: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  backIcon: {
    position: 'absolute',
    top: 24,
    left: 16,
    zIndex: 2,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 6,
  },
  headerSubtitle: {
    color: colors.offWhite,
    fontSize: 12,
    marginTop: 2,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.card,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    color: colors.text,
  },
  filterTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    margin: 16,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    color: colors.text,
    fontSize: 15,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  businessName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  starsText: {
    fontSize: 16,
    marginTop: 6,
  },
  ratingNumber: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    color: colors.lightText,
    marginTop: 3,
  },
  comment: {
    fontSize: 14,
    color: colors.text,
    marginTop: 8,
  },
  responseTag: {
    fontSize: 12,
    color: colors.success,
    marginTop: 6,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    minHeight: 34,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  actionText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 4,
  },
  loadingText: {
    marginTop: 12,
    color: colors.lightText,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.lightText,
    marginTop: 40,
    fontSize: 14,
  },
  deniedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
});

export default AdminReviewsScreen;
