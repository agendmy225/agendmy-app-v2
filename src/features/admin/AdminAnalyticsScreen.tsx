import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';
import { AppStackParamList } from '../../types/types';
import { useAuth } from '../auth/context/AuthContext';
import {
  getAdminAnalytics,
  AdminAnalytics,
  RankItem,
} from '../../services/adminAnalytics';

type NavProp = StackNavigationProp<AppStackParamList>;

const formatMoney = (value: number): string => {
  const [intPart, decPart] = value.toFixed(2).split('.');
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${withDots},${decPart}`;
};

const formatDateTime = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} as ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const StatCard = ({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
}) => (
  <View style={styles.statCard}>
    <Icon name={icon} size={22} color={colors.primary} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
  </View>
);

const RankList = ({
  items,
  emptyText,
  max,
}: {
  items: RankItem[];
  emptyText: string;
  max?: number;
}) => {
  const shown = max ? items.slice(0, max) : items;
  if (shown.length === 0) {
    return <Text style={styles.emptyText}>{emptyText}</Text>;
  }
  const top = shown[0].count || 1;
  return (
    <View>
      {shown.map((item) => {
        const pct = Math.max(4, Math.round((item.count / top) * 100));
        return (
          <View key={item.label} style={styles.rankRow}>
            <View style={styles.rankHeader}>
              <Text style={styles.rankLabel} numberOfLines={1}>{item.label}</Text>
              <Text style={styles.rankCount}>{item.count}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { flex: pct }]} />
              <View style={{ flex: 100 - pct }} />
            </View>
          </View>
        );
      })}
      {max && items.length > max ? (
        <Text style={styles.moreText}>+ {items.length - max} outros</Text>
      ) : null}
    </View>
  );
};

const AdminAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { isAdmin } = useAuth();

  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const result = await getAdminAnalytics();
      setData(result);
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

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backIcon}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Icon name="arrow-back" size={26} color={colors.white} />
      </TouchableOpacity>
      <Icon name="insights" size={30} color={colors.white} />
      <Text style={styles.headerTitle}>Analytics</Text>
      <Text style={styles.headerSubtitle}>Visao geral do AgendMy</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Calculando numeros...</Text>
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.center}>
          <Icon name="error-outline" size={48} color={colors.error} />
          <Text style={styles.loadingText}>Nao foi possivel carregar os dados.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => load(false)}>
            <Text style={styles.primaryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { businesses, users, appointments } = data;

  const statusRows: { label: string; value: number; color: string }[] = [
    { label: 'Agendados', value: appointments.scheduled, color: colors.warning },
    { label: 'Confirmados', value: appointments.confirmed, color: colors.primary },
    { label: 'Concluidos', value: appointments.completed, color: colors.success },
    { label: 'Cancelados', value: appointments.cancelled, color: colors.error },
    { label: 'Nao compareceu', value: appointments.noShow, color: colors.lightText },
  ];

  return (
    <View style={styles.container}>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            colors={[colors.primary]}
          />
        }
      >
        {/* RESUMO */}
        <Text style={styles.sectionTitle}>Resumo</Text>
        <View style={styles.grid}>
          <StatCard
            icon="store"
            label="Estabelecimentos"
            value={businesses.total}
            sub={`${businesses.active} ativos - ${businesses.inactive} inativos`}
          />
          <StatCard
            icon="people"
            label="Usuarios"
            value={users.total}
            sub={`${users.clients} clientes - ${users.owners} donos`}
          />
          <StatCard
            icon="event"
            label="Agendamentos"
            value={appointments.total}
            sub={`${appointments.newLast30} nos ultimos 30 dias`}
          />
          <StatCard
            icon="person-add"
            label="Novos usuarios (30d)"
            value={users.newLast30}
            sub={`${businesses.newLast30} novos estabelecimentos`}
          />
        </View>

        {/* AGENDAMENTOS */}
        <Text style={styles.sectionTitle}>Agendamentos por status</Text>
        <View style={styles.box}>
          {statusRows.map((row) => (
            <View key={row.label} style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: row.color }]} />
              <Text style={styles.statusLabel}>{row.label}</Text>
              <Text style={styles.statusValue}>{row.value}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.statusRow}>
            <Icon name="payments" size={18} color={colors.success} style={styles.moneyIcon} />
            <Text style={styles.statusLabel}>Valor em servicos concluidos</Text>
            <Text style={[styles.statusValue, { color: colors.success }]}>
              {formatMoney(appointments.completedValue)}
            </Text>
          </View>
        </View>

        {/* POR ESTADO */}
        <Text style={styles.sectionTitle}>Estabelecimentos por estado</Text>
        <View style={styles.box}>
          <RankList items={data.byState} emptyText="Nenhum estabelecimento com estado cadastrado." />
        </View>

        {/* POR CIDADE */}
        <Text style={styles.sectionTitle}>Estabelecimentos por cidade</Text>
        <View style={styles.box}>
          <RankList items={data.byCity} emptyText="Nenhum estabelecimento com cidade cadastrada." max={15} />
        </View>

        {/* POR CATEGORIA */}
        <Text style={styles.sectionTitle}>Estabelecimentos por categoria</Text>
        <View style={styles.box}>
          <RankList items={data.byCategory} emptyText="Nenhuma categoria encontrada." />
        </View>

        {/* SEM CIDADE */}
        {data.withoutCity.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Sem cidade cadastrada ({data.withoutCity.length})
            </Text>
            <View style={[styles.box, styles.warningBox]}>
              <Text style={styles.warningText}>
                Estes estabelecimentos nao aparecem nos rankings por regiao. O dono precisa
                preencher o CEP em Configuracoes do Negocio.
              </Text>
              {data.withoutCity.map((name, idx) => (
                <Text key={`${name}-${idx}`} style={styles.withoutCityItem} numberOfLines={1}>
                  - {name}
                </Text>
              ))}
            </View>
          </>
        )}

        <Text style={styles.footerNote}>
          Atualizado em {formatDateTime(data.generatedAt)}. Puxe para baixo para atualizar.
        </Text>
      </ScrollView>
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
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 18,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48.5%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  statSub: {
    fontSize: 11,
    color: colors.lightText,
    marginTop: 4,
  },
  box: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  moneyIcon: {
    marginRight: 6,
  },
  statusLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  statusValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.lightGray,
    marginVertical: 6,
  },
  rankRow: {
    marginBottom: 10,
  },
  rankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rankLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginRight: 8,
  },
  rankCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  barTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lightGray,
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  moreText: {
    fontSize: 12,
    color: colors.lightText,
    marginTop: 2,
  },
  warningBox: {
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warningText: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 8,
  },
  withoutCityItem: {
    fontSize: 13,
    color: colors.text,
    paddingVertical: 2,
  },
  emptyText: {
    fontSize: 13,
    color: colors.lightText,
  },
  loadingText: {
    marginTop: 12,
    color: colors.lightText,
    textAlign: 'center',
  },
  footerNote: {
    fontSize: 12,
    color: colors.lightText,
    textAlign: 'center',
    marginTop: 20,
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

export default AdminAnalyticsScreen;
