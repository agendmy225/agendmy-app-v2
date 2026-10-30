// src/features/admin/AdminOverdueScreen.tsx
// Painel Admin > Inadimplentes: situacao da assinatura de cada negocio.
// Following React Native Firebase v22 modular API patterns
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Timestamp, doc, updateDoc } from '@react-native-firebase/firestore';
import { firebaseDb } from '../../config/firebase';
import { colors } from '../../constants/colors';
import { useAuth } from '../auth/context/AuthContext';
import { getAllBusinessesAdmin, Business } from '../../services/businesses';
import { getAllUsersAdmin, AdminUser } from '../../services/adminUsers';
import { formatDate, getSubscriptionView, SubscriptionView } from '../../services/subscription';

type FilterKey = 'overdue' | 'suspended' | 'ending' | 'trial' | 'active' | 'exempt' | 'all';

interface Row {
  business: Business;
  owner?: AdminUser;
  view: SubscriptionView;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const matches = (row: Row, f: FilterKey): boolean => {
  const v = row.view;
  if (f === 'all') { return true; }
  if (f === 'exempt') { return v.exempt; }
  if (v.exempt) { return false; }
  if (f === 'overdue') { return v.status === 'past_due'; }
  if (f === 'suspended') { return v.status === 'suspended'; }
  if (f === 'ending') { return v.status === 'trial' && v.daysLeft !== null && v.daysLeft <= 7; }
  if (f === 'trial') { return v.status === 'trial'; }
  return v.status === 'active';
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'overdue', label: 'Atrasados' },
  { key: 'suspended', label: 'Suspensos' },
  { key: 'ending', label: 'Teste acabando' },
  { key: 'trial', label: 'Em teste' },
  { key: 'active', label: 'Em dia' },
  { key: 'exempt', label: 'Isentos' },
  { key: 'all', label: 'Todos' },
];

const AdminOverdueScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('overdue');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) { setRefreshing(true); } else { setLoading(true); }
    const [businesses, users] = await Promise.all([getAllBusinessesAdmin(), getAllUsersAdmin()]);
    const byUid = new Map<string, AdminUser>();
    users.forEach((u: AdminUser) => byUid.set(u.uid, u));
    setRows(businesses.map((b: Business) => ({
      business: b,
      owner: byUid.get(b.ownerId),
      view: getSubscriptionView(b as unknown as Record<string, any>),
    })));
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.center]}>
        <Icon name="lock" size={64} color={colors.lightText} />
        <Text style={styles.deniedTitle}>Acesso restrito</Text>
      </View>
    );
  }

  const runAction = (row: Row, title: string, message: string, data: Record<string, any>) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          try {
            setBusyId(row.business.id);
            await updateDoc(doc(firebaseDb, 'businesses', row.business.id), data);
            await load(true);
          } catch {
            Alert.alert('Erro', 'Não foi possível atualizar este negócio.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const release30 = (row: Row) =>
    runAction(row, 'Liberar 30 dias', `Liberar "${row.business.name}" por 30 dias, mesmo sem pagamento?`, {
      'subscription.status': 'active',
      'subscription.manualUntil': Timestamp.fromDate(new Date(Date.now() + 30 * DAY_MS)),
      'subscription.overdueSince': null,
      suspendedForPayment: false,
      active: true,
    });

  const addTrial7 = (row: Row) => {
    const base = row.view.trialEndsAt && row.view.trialEndsAt.getTime() > Date.now()
      ? row.view.trialEndsAt.getTime()
      : Date.now();
    runAction(row, '+7 dias de teste', `Dar mais 7 dias de teste para "${row.business.name}"?`, {
      'subscription.status': 'trial',
      'subscription.trialEndsAt': Timestamp.fromDate(new Date(base + 7 * DAY_MS)),
      'subscription.overdueSince': null,
      suspendedForPayment: false,
      active: true,
    });
  };

  const toggleExempt = (row: Row) =>
    row.view.exempt
      ? runAction(row, 'Remover isencao', `"${row.business.name}" volta a pagar mensalidade. Confirmar?`, {
        'subscription.exempt': false,
      })
      : runAction(row, 'Isentar', `"${row.business.name}" não vai pagar mensalidade nem ser suspenso. Confirmar?`, {
        'subscription.exempt': true,
        'subscription.overdueSince': null,
        suspendedForPayment: false,
        active: true,
      });

  const count = (f: FilterKey) => rows.filter((r) => matches(r, f)).length;
  const filtered = rows.filter((r) => matches(r, filter));

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
        <Icon name="money-off" size={30} color={colors.white} />
        <Text style={styles.headerTitle}>Inadimplentes</Text>
        <Text style={styles.headerSubtitle}>
          {count('overdue')} atrasado(s) - {count('suspended')} suspenso(s) - {count('ending')} com teste acabando
        </Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
              {f.label} ({count(f.key)})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />}
        >
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum negócio nesta situação.</Text>
          ) : (
            filtered.map((row) => {
              const v = row.view;
              const busy = busyId === row.business.id;
              return (
                <View key={row.business.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardName} numberOfLines={1}>{row.business.name || 'Sem nome'}</Text>
                    <View style={[styles.badge, { backgroundColor: v.color }]}>
                      <Text style={styles.badgeText}>{v.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.meta} numberOfLines={1}>
                    {row.owner ? `${row.owner.name || 'Sem nome'} - ${row.owner.email}` : 'Dono não encontrado'}
                  </Text>
                  {row.business.phone ? <Text style={styles.meta}>Tel: {row.business.phone}</Text> : null}
                  {v.status === 'trial' && !v.exempt && (
                    <Text style={styles.detail}>Teste até {formatDate(v.trialEndsAt)} ({v.daysLeft} dia(s))</Text>
                  )}
                  {v.status === 'past_due' && !v.exempt && (
                    <Text style={[styles.detail, { color: colors.warning }]}>{v.overdueDays} dia(s) de atraso</Text>
                  )}
                  {v.paidCount > 0 && <Text style={styles.detail}>{v.paidCount} mensalidade(s) paga(s)</Text>}

                  <View style={styles.actions}>
                    {busy ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        {!v.exempt && v.status !== 'active' && (
                          <TouchableOpacity style={styles.actionBtn} onPress={() => release30(row)}>
                            <Text style={styles.actionText}>Liberar 30 dias</Text>
                          </TouchableOpacity>
                        )}
                        {!v.exempt && (
                          <TouchableOpacity style={styles.actionBtn} onPress={() => addTrial7(row)}>
                            <Text style={styles.actionText}>+7 dias teste</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.actionBtn} onPress={() => toggleExempt(row)}>
                          <Text style={styles.actionText}>{v.exempt ? 'Remover isencao' : 'Isentar'}</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            })
          )}
          <Text style={styles.footerNote}>
            A rotina automática roda todo dia as 8h: avisa os donos, marca atraso e suspende após a tolerância.
          </Text>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { padding: 24, backgroundColor: colors.primary, alignItems: 'center' },
  backIcon: { position: 'absolute', top: 24, left: 16, zIndex: 2 },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold', marginTop: 6 },
  headerSubtitle: { color: colors.offWhite, fontSize: 12, marginTop: 2, textAlign: 'center' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.card, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 12, color: colors.text },
  chipTextActive: { color: colors.white, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { padding: 16, paddingTop: 4, paddingBottom: 32 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text, marginRight: 8 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: 'bold' },
  meta: { fontSize: 12, color: colors.lightText, marginTop: 3 },
  detail: { fontSize: 13, color: colors.text, marginTop: 4, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, minHeight: 32, alignItems: 'center' },
  actionBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, marginBottom: 6 },
  actionText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: colors.lightText, marginTop: 30 },
  footerNote: { fontSize: 11, color: colors.lightText, textAlign: 'center', marginTop: 12 },
  deniedTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginTop: 16 },
});

export default AdminOverdueScreen;
