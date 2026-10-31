// src/features/dashboard/DashboardScreen.tsx
// Painel do dono, sincronizado em tempo real com os agendamentos.
// - resumo de hoje, estatisticas e receita do periodo escolhido
// - aba "Cancelamentos e faltas" com a lista do periodo
// Following React Native Firebase v22 modular API patterns
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { firebaseDb } from '../../config/firebase';
import { colors } from '../../constants/colors';
import { useAuth } from '../auth/context/AuthContext';
import { AppStackParamList } from '../../types/types';
import CreateBusinessCard from '../business/components/CreateBusinessCard';
import { getProfessionalsByBusiness, Professional } from '../../services/professionals';
import { getServicesByBusiness } from '../../services/services';
import { formatLocalDate, toLocalDateString } from '../../utils/localDate';

type Nav = StackNavigationProp<AppStackParamList, 'DashboardScreen'>;
type Period = 'today' | 'week' | 'month' | 'lastMonth';
type Tab = 'overview' | 'losses';

interface Appt {
  id: string;
  date: string;
  time: string;
  status: string;
  price: number;
  clientName: string;
  serviceName: string;
  professionalName: string;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'week', label: '7 dias' },
  { key: 'month', label: 'Este mês' },
  { key: 'lastMonth', label: 'Mês passado' },
];

const brl = (v: number) => `R$ ${(Number(v) || 0).toFixed(2).replace('.', ',')}`;
const pct = (v: number) => `${Math.round(v * 100)}%`;

const periodRange = (p: Period): { start: string; end: string } => {
  const now = new Date();
  const today = toLocalDateString(now);
  if (p === 'today') {
    return { start: today, end: today };
  }
  if (p === 'week') {
    return { start: toLocalDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)), end: today };
  }
  if (p === 'month') {
    return {
      start: toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1)),
      end: toLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }
  return {
    start: toLocalDateString(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    end: toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 0)),
  };
};

const DashboardScreen: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigation = useNavigation<Nav>();
  const [businessId, setBusinessId] = useState<string | null>(user?.businessId || null);
  const [checkedBusiness, setCheckedBusiness] = useState(!!user?.businessId);
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [business, setBusiness] = useState<Record<string, any> | null>(null);
  const [counts, setCounts] = useState({ professionals: 0, services: 0 });
  const [period, setPeriod] = useState<Period>('month');
  const [tab, setTab] = useState<Tab>('overview');
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);

  // estabelecimento do dono
  useEffect(() => {
    if (businessId || !user?.uid) {
      setCheckedBusiness(true);
      return;
    }
    getDocs(query(collection(firebaseDb, 'businesses'), where('ownerId', '==', user.uid), limit(1)))
      .then((snap: { empty: boolean; docs: { id: string }[] }) => {
        if (!snap.empty) {
          setBusinessId(snap.docs[0].id);
        }
      })
      .catch(() => undefined)
      .finally(() => setCheckedBusiness(true));
  }, [businessId, user?.uid]);

  // agendamentos em tempo real
  useEffect(() => {
    if (!businessId) {
      return;
    }
    return onSnapshot(
      query(collection(firebaseDb, 'appointments'), where('businessId', '==', businessId)),
      (snap: { docs: { id: string; data: () => Record<string, any> | undefined }[] }) => {
        setAppointments(snap.docs.map((d) => {
          const a = d.data() || {};
          return {
            id: d.id,
            date: a.date || '',
            time: a.time || '',
            status: a.status || 'scheduled',
            price: Number(a.price) || 0,
            clientName: a.clientName || 'Cliente',
            serviceName: a.serviceName || '',
            professionalName: a.professionalName || '',
          };
        }));
        setLoaded(true);
      },
      () => setLoaded(true),
    );
  }, [businessId]);

  // nota, profissionais e servicos
  const loadExtras = useCallback(async () => {
    if (!businessId) {
      return;
    }
    try {
      const [bizSnap, profs, services] = await Promise.all([
        getDoc(doc(firebaseDb, 'businesses', businessId)),
        getProfessionalsByBusiness(businessId).catch(() => [] as Professional[]),
        getServicesByBusiness(businessId).catch(() => []),
      ]);
      setBusiness(bizSnap.exists() ? bizSnap.data() || null : null);
      setCounts({ professionals: profs.length, services: services.length });
    } catch {
      // painel continua com os agendamentos
    }
  }, [businessId]);

  useEffect(() => {
    loadExtras();
  }, [loadExtras]);

  const today = toLocalDateString(new Date());

  const todayStats = useMemo(() => {
    const list = appointments.filter((a) => a.date === today);
    const active = list.filter((a) => a.status !== 'cancelled');
    return {
      count: active.length,
      pending: list.filter((a) => a.status === 'scheduled').length,
      expected: active.filter((a) => a.status !== 'no_show').reduce((s, a) => s + a.price, 0),
      done: list.filter((a) => a.status === 'completed').reduce((s, a) => s + a.price, 0),
    };
  }, [appointments, today]);

  const range = periodRange(period);
  const periodStats = useMemo(() => {
    const list = appointments.filter((a) => a.date >= range.start && a.date <= range.end);
    const completed = list.filter((a) => a.status === 'completed');
    const noShow = list.filter((a) => a.status === 'no_show');
    const cancelled = list.filter((a) => a.status === 'cancelled');
    const open = list.filter((a) => a.status === 'scheduled' || a.status === 'confirmed');
    const revenue = completed.reduce((s, a) => s + a.price, 0);
    const attended = completed.length + noShow.length;
    return {
      total: list.length,
      pending: list.filter((a) => a.status === 'scheduled').length,
      confirmed: list.filter((a) => a.status === 'confirmed').length,
      completed: completed.length,
      cancelled: cancelled.length,
      noShow: noShow.length,
      revenue,
      expected: open.reduce((s, a) => s + a.price, 0),
      lost: cancelled.concat(noShow).reduce((s, a) => s + a.price, 0),
      ticket: completed.length ? revenue / completed.length : 0,
      attendanceRate: attended ? completed.length / attended : 0,
      cancelRate: list.length ? cancelled.length / list.length : 0,
      losses: cancelled.concat(noShow).sort((x, y) => (y.date + y.time).localeCompare(x.date + x.time)),
    };
  }, [appointments, range.start, range.end]);

  const handleShareBusinessLink = async () => {
    if (!businessId) {
      return;
    }
    try {
      const url = `https://agendmy.app/business/${businessId}`;
      await Share.share({ message: `Confira nossa página: ${url}`, url, title: 'Compartilhar Estabelecimento' });
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar o link.');
    }
  };

  const shareProfessionalProfile = async (professional: Professional) => {
    try {
      const profileUrl = `https://agendmy.app/professional/${professional.id}`;
      const specialty = professional.specialty || '';
      const message = `Conheça ${professional.name}${specialty ? ` - ${specialty}` : ''}\n\n` +
        `Veja o perfil completo e agende seu horário:\n${profileUrl}`;
      await Share.share({ message, url: profileUrl, title: `Perfil de ${professional.name}` });
      setShowProfessionalModal(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar o perfil do profissional.');
    }
  };

  const handleShareProfessionalProfile = async () => {
    if (!businessId) {
      return;
    }
    try {
      const list = await getProfessionalsByBusiness(businessId);
      if (list.length === 0) {
        Alert.alert('Nenhum profissional', 'Cadastre um profissional primeiro.');
        return;
      }
      if (list.length === 1) {
        await shareProfessionalProfile(list[0]);
        return;
      }
      setProfessionals(list);
      setShowProfessionalModal(true);
    } catch {
      Alert.alert('Erro', 'Não foi possível buscar os profissionais.');
    }
  };

  if (!checkedBusiness || (businessId && !loaded)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando painel...</Text>
      </View>
    );
  }

  if (!businessId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Painel</Text>
        </View>
        <CreateBusinessCard onBusinessCreated={() => refreshUser && refreshUser()} />
      </View>
    );
  }

  const rating = Number(business?.rating) || 0;
  const reviewCount = Number(business?.reviewCount) || 0;

  const Stat = ({ value, label, color }: { value: string | number; label: string; color?: string }) => (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Painel</Text>
        <Text style={styles.headerSubtitle}>Atualiza sozinho com os agendamentos</Text>
      </View>

      {/* Resumo de hoje */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{`Hoje, ${formatLocalDate(today)}`}</Text>
        <View style={styles.statsGrid}>
          <Stat value={todayStats.count} label="Agendamentos" />
          <Stat value={todayStats.pending} label="A confirmar" color={todayStats.pending ? colors.warning : undefined} />
          <Stat value={brl(todayStats.expected)} label="Previsto hoje" />
          <Stat value={brl(todayStats.done)} label="Recebido hoje" color={colors.success} />
        </View>
      </View>

      {/* Periodo */}
      <View style={styles.chips}>
        {PERIODS.map((p) => (
          <TouchableOpacity key={p.key} style={[styles.chip, period === p.key && styles.chipActive]} onPress={() => setPeriod(p.key)}>
            <Text style={[styles.chipText, period === p.key && styles.chipTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'overview' && styles.tabActive]} onPress={() => setTab('overview')}>
          <Text style={[styles.tabText, tab === 'overview' && styles.tabTextActive]}>Visão geral</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'losses' && styles.tabActive]} onPress={() => setTab('losses')}>
          <Text style={[styles.tabText, tab === 'losses' && styles.tabTextActive]}>
            {`Cancelamentos e faltas (${periodStats.cancelled + periodStats.noShow})`}
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'overview' ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estatísticas</Text>
            <View style={styles.statsGrid}>
              <Stat value={periodStats.total} label="Total" />
              <Stat value={periodStats.pending} label="A confirmar" color={periodStats.pending ? colors.warning : undefined} />
              <Stat value={periodStats.confirmed} label="Confirmados" color={colors.primary} />
              <Stat value={periodStats.completed} label="Concluídos" color={colors.success} />
              <Stat value={periodStats.cancelled} label="Cancelados" color={colors.error} />
              <Stat value={periodStats.noShow} label="Faltas" color={colors.error} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Receita</Text>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueValue}>{brl(periodStats.revenue)}</Text>
              <Text style={styles.revenueLabel}>Recebido (atendimentos concluídos)</Text>
            </View>
            <View style={styles.statsGrid}>
              <Stat value={brl(periodStats.expected)} label="A receber (agendados)" />
              <Stat value={brl(periodStats.ticket)} label="Ticket médio" />
              <Stat value={pct(periodStats.attendanceRate)} label="Comparecimento" color={colors.success} />
              <Stat value={brl(periodStats.lost)} label="Perdido (cancel. e faltas)" color={colors.error} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seu negócio</Text>
            <View style={styles.statsGrid}>
              <Stat value={rating ? rating.toFixed(1).replace('.', ',') : '-'} label={`Nota (${reviewCount} avaliações)`} color="#FFC107" />
              <Stat value={counts.professionals} label="Profissionais" />
              <Stat value={counts.services} label="Serviços ativos" />
            </View>
          </View>
        </>
      ) : (
        <View style={styles.section}>
          <View style={styles.statsGrid}>
            <Stat value={periodStats.cancelled} label="Cancelados" color={colors.error} />
            <Stat value={periodStats.noShow} label="Faltas" color={colors.error} />
            <Stat value={pct(periodStats.cancelRate)} label="Taxa de cancelamento" />
            <Stat value={brl(periodStats.lost)} label="Valor perdido" color={colors.error} />
          </View>
          {periodStats.losses.length === 0 ? (
            <Text style={styles.empty}>Nenhum cancelamento ou falta neste período.</Text>
          ) : (
            periodStats.losses.map((a) => (
              <View key={a.id} style={styles.lossItem}>
                <View style={styles.flex}>
                  <Text style={styles.lossClient}>{a.clientName}</Text>
                  <Text style={styles.lossLine}>{`${a.serviceName}${a.professionalName ? ` · ${a.professionalName}` : ''}`}</Text>
                  <Text style={styles.lossLine}>{`${formatLocalDate(a.date)} às ${a.time}`}</Text>
                </View>
                <View style={[styles.lossBadge, { backgroundColor: a.status === 'no_show' ? colors.lightText : colors.error }]}>
                  <Text style={styles.lossBadgeText}>{a.status === 'no_show' ? 'Faltou' : 'Cancelado'}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Acoes rapidas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ações rápidas</Text>
        {[
          { icon: 'event', label: 'Gerenciar agendamentos', onPress: () => navigation.navigate('OwnerTabs', { screen: 'AppointmentManagement' }) },
          { icon: 'person', label: 'Agendamentos por profissional', onPress: () => navigation.navigate('ProfessionalAppointmentsScreen') },
          { icon: 'content-cut', label: 'Gerenciar serviços', onPress: () => navigation.navigate('ServiceManagement') },
          { icon: 'group', label: 'Gerenciar profissionais', onPress: () => navigation.navigate('ProfessionalManagementScreen') },
          { icon: 'assessment', label: 'Relatórios financeiros', onPress: () => navigation.navigate('FinancialReportsScreen') },
          { icon: 'share', label: 'Compartilhar link', onPress: handleShareBusinessLink },
          { icon: 'person-add', label: 'Compartilhar perfil', onPress: handleShareProfessionalProfile },
        ].map((a) => (
          <TouchableOpacity key={a.label} style={styles.actionButton} onPress={a.onPress}>
            <Icon name={a.icon} size={22} color={colors.primary} />
            <Text style={styles.actionText}>{a.label}</Text>
            <Icon name="chevron-right" size={22} color={colors.lightText} />
          </TouchableOpacity>
        ))}
      </View>

      <Modal animationType="slide" transparent visible={showProfessionalModal} onRequestClose={() => setShowProfessionalModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar profissional</Text>
              <TouchableOpacity onPress={() => setShowProfessionalModal(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={professionals}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.profItem} onPress={() => shareProfessionalProfile(item)}>
                  <Text style={styles.profName}>{item.name}</Text>
                  {item.specialty ? <Text style={styles.lossLine}>{item.specialty}</Text> : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  loadingText: { marginTop: 10, color: colors.text },
  flex: { flex: 1 },
  header: { padding: 20, backgroundColor: colors.primary, alignItems: 'center' },
  backButton: { position: 'absolute', left: 16, top: 20 },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: colors.offWhite, fontSize: 12, marginTop: 2 },
  section: { backgroundColor: colors.white, marginHorizontal: 12, marginTop: 12, borderRadius: 12, padding: 14 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  statItem: { width: '50%', padding: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  statLabel: { fontSize: 12, color: colors.lightText, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginTop: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lightGray, marginRight: 8, marginBottom: 6 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: colors.white, fontWeight: '600' },
  tabs: { flexDirection: 'row', marginHorizontal: 12, marginTop: 6, backgroundColor: colors.white, borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, color: colors.primary, fontWeight: '600', textAlign: 'center' },
  tabTextActive: { color: colors.white },
  revenueCard: { alignItems: 'center', paddingVertical: 8, marginBottom: 8 },
  revenueValue: { fontSize: 26, fontWeight: 'bold', color: colors.success },
  revenueLabel: { fontSize: 12, color: colors.lightText },
  empty: { textAlign: 'center', color: colors.lightText, marginTop: 12 },
  lossItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.lightGray },
  lossClient: { fontSize: 15, fontWeight: 'bold', color: colors.text },
  lossLine: { fontSize: 13, color: colors.lightText, marginTop: 2 },
  lossBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  lossBadgeText: { color: colors.white, fontSize: 11, fontWeight: 'bold' },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.lightGray },
  actionText: { flex: 1, fontSize: 15, color: colors.text, marginLeft: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: colors.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: colors.text },
  profItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  profName: { fontSize: 15, fontWeight: '600', color: colors.text },
});

export default DashboardScreen;
