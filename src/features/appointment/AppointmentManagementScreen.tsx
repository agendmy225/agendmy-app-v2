// src/features/appointment/AppointmentManagementScreen.tsx
// Agenda do dono: todos os agendamentos do estabelecimento, em tempo real.
// - filtros por situacao e busca por cliente, servico ou profissional
// - pacotes em um card so (sessoes dentro)
// - confirmar, recusar, remarcar, concluir, marcar falta e ligar para o cliente
// Following React Native Firebase v22 modular API patterns
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { firebaseDb } from '../../config/firebase';
import { colors } from '../../constants/colors';
import { useAuth } from '../auth/context/AuthContext';
import { updateAppointmentStatus } from '../../services/appointments';
import { formatLocalDate, toLocalDateString } from '../../utils/localDate';
import { RescheduleModal } from '../professionalArea/AgendaModals';

type Status = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
type Filter = 'pending' | 'upcoming' | 'today' | 'completed' | 'cancelled' | 'all';

interface Appt {
  id: string;
  date: string;
  time: string;
  status: Status;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  price: number;
  duration: number;
  packageId?: string;
}

type Group = { key: string; main: Appt; sessions: Appt[] };

const STATUS_INFO: Record<Status, { label: string; color: string }> = {
  scheduled: { label: 'Aguardando confirmação', color: colors.warning },
  confirmed: { label: 'Confirmado', color: colors.primary },
  completed: { label: 'Concluído', color: colors.success },
  cancelled: { label: 'Cancelado', color: colors.error },
  no_show: { label: 'Não compareceu', color: colors.lightText },
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'pending', label: 'A confirmar' },
  { key: 'today', label: 'Hoje' },
  { key: 'upcoming', label: 'Próximos' },
  { key: 'completed', label: 'Concluídos' },
  { key: 'cancelled', label: 'Cancelados e faltas' },
  { key: 'all', label: 'Todos' },
];

const brl = (v: number) => `R$ ${(Number(v) || 0).toFixed(2).replace('.', ',')}`;
const isOpen = (s: Status) => s === 'scheduled' || s === 'confirmed';

const AppointmentManagementScreen: React.FC = () => {
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(user?.businessId || null);
  const [business, setBusiness] = useState<Record<string, any> | null>(null);
  const [items, setItems] = useState<Appt[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rescheduleItem, setRescheduleItem] = useState<Appt | null>(null);

  // estabelecimento do dono
  useEffect(() => {
    if (businessId || !user?.uid) {
      return;
    }
    getDocs(query(collection(firebaseDb, 'businesses'), where('ownerId', '==', user.uid), limit(1)))
      .then((snap: { empty: boolean; docs: { id: string }[] }) => {
        if (!snap.empty) {
          setBusinessId(snap.docs[0].id);
        } else {
          setLoaded(true);
        }
      })
      .catch(() => setLoaded(true));
  }, [businessId, user?.uid]);

  useEffect(() => {
    if (!businessId) {
      return;
    }
    getDoc(doc(firebaseDb, 'businesses', businessId))
      .then((s: { data: () => Record<string, any> | undefined }) => setBusiness(s.data() || null))
      .catch(() => undefined);
  }, [businessId]);

  // agendamentos em tempo real
  useEffect(() => {
    if (!businessId) {
      return;
    }
    return onSnapshot(
      query(collection(firebaseDb, 'appointments'), where('businessId', '==', businessId)),
      (snap: { docs: { id: string; data: () => Record<string, any> | undefined }[] }) => {
        setItems(snap.docs.map((d) => {
          const a = d.data() || {};
          return {
            id: d.id,
            date: a.date || '',
            time: a.time || '',
            status: (a.status as Status) || 'scheduled',
            clientName: a.clientName || 'Cliente',
            clientPhone: a.clientPhone || '',
            serviceName: a.serviceName || '',
            professionalId: a.professionalId || '',
            professionalName: a.professionalName || '',
            price: Number(a.price) || 0,
            duration: parseInt(String(a.duration), 10) || 60,
            packageId: a.packageId || undefined,
          };
        }));
        setLoaded(true);
      },
      () => setLoaded(true),
    );
  }, [businessId]);

  const today = toLocalDateString(new Date());

  const groups = useMemo(() => {
    const s = search.trim().toLowerCase();
    let list = items.filter((i) => {
      switch (filter) {
        case 'pending':
          return i.status === 'scheduled' && i.date >= today;
        case 'today':
          return i.date === today && i.status !== 'cancelled';
        case 'upcoming':
          return isOpen(i.status) && i.date >= today;
        case 'completed':
          return i.status === 'completed';
        case 'cancelled':
          return i.status === 'cancelled' || i.status === 'no_show';
        default:
          return true;
      }
    });
    if (s) {
      list = list.filter((i) =>
        [i.clientName, i.serviceName, i.professionalName].some((t) => (t || '').toLowerCase().includes(s)));
    }
    const future = filter === 'pending' || filter === 'today' || filter === 'upcoming';
    list.sort((a, b) => (future ? 1 : -1) * (a.date + a.time).localeCompare(b.date + b.time));

    const out: Group[] = [];
    const byPkg: Record<string, Group> = {};
    list.forEach((a) => {
      if (a.packageId) {
        if (!byPkg[a.packageId]) {
          byPkg[a.packageId] = { key: 'pkg_' + a.packageId, main: a, sessions: [] };
          out.push(byPkg[a.packageId]);
        }
        byPkg[a.packageId].sessions.push(a);
      } else {
        out.push({ key: a.id, main: a, sessions: [a] });
      }
    });
    out.forEach((g) => g.sessions.sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time)));
    return out;
  }, [items, filter, search, today]);

  const count = (f: Filter): number => {
    switch (f) {
      case 'pending':
        return items.filter((i) => i.status === 'scheduled' && i.date >= today).length;
      case 'today':
        return items.filter((i) => i.date === today && i.status !== 'cancelled').length;
      case 'upcoming':
        return items.filter((i) => isOpen(i.status) && i.date >= today).length;
      default:
        return -1;
    }
  };

  const changeStatus = (item: Appt, status: Status, title: string) => {
    Alert.alert(title, `${item.clientName} - ${formatLocalDate(item.date)} às ${item.time}`, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: status === 'cancelled' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            setBusyId(item.id);
            await updateAppointmentStatus(item.id, status);
          } catch {
            Alert.alert('Erro', 'Não foi possível atualizar o agendamento.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const renderActions = (s: Appt) => {
    if (busyId === s.id) {
      return <ActivityIndicator size="small" color={colors.primary} />;
    }
    return (
      <View style={styles.actions}>
        {s.status === 'scheduled' ? (
          <TouchableOpacity style={[styles.btn, styles.btnOk]} onPress={() => changeStatus(s, 'confirmed', 'Confirmar agendamento')}>
            <Text style={styles.btnTextLight}>Confirmar</Text>
          </TouchableOpacity>
        ) : null}
        {s.status === 'confirmed' ? (
          <>
            <TouchableOpacity style={[styles.btn, styles.btnOk]} onPress={() => changeStatus(s, 'completed', 'Marcar como concluído')}>
              <Text style={styles.btnTextLight}>Concluir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={() => changeStatus(s, 'no_show', 'Cliente não compareceu')}>
              <Text style={styles.btnText}>Não veio</Text>
            </TouchableOpacity>
          </>
        ) : null}
        {isOpen(s.status) ? (
          <>
            <TouchableOpacity style={styles.btn} onPress={() => setRescheduleItem(s)}>
              <Text style={styles.btnText}>Remarcar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnDanger]}
              onPress={() => changeStatus(s, 'cancelled', s.status === 'scheduled' ? 'Recusar agendamento' : 'Cancelar agendamento')}
            >
              <Text style={styles.btnTextLight}>{s.status === 'scheduled' ? 'Recusar' : 'Cancelar'}</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    );
  };

  const renderItem = ({ item: g }: { item: Group }) => {
    const a = g.main;
    const isPackage = g.sessions.length > 1;
    const st = STATUS_INFO[a.status] || STATUS_INFO.scheduled;
    const total = g.sessions.reduce((sum, s) => sum + (s.status === 'cancelled' ? 0 : s.price), 0);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.client} numberOfLines={1}>{a.clientName}</Text>
          {!isPackage ? (
            <View style={[styles.badge, { backgroundColor: st.color }]}>
              <Text style={styles.badgeText}>{st.label}</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgePackage]}>
              <Text style={styles.badgeText}>{`Pacote: ${g.sessions.length} sessões`}</Text>
            </View>
          )}
        </View>
        <Text style={styles.line}>{a.serviceName}{a.professionalName ? ` · com ${a.professionalName}` : ''}</Text>
        {total ? <Text style={styles.price}>{brl(total)}</Text> : null}
        {a.clientPhone ? (
          <TouchableOpacity style={styles.phoneRow} onPress={() => Linking.openURL(`tel:${a.clientPhone}`)}>
            <Icon name="phone" size={16} color={colors.primary} />
            <Text style={styles.phone}>{a.clientPhone}</Text>
          </TouchableOpacity>
        ) : null}

        {g.sessions.map((s, i) => {
          const sst = STATUS_INFO[s.status] || STATUS_INFO.scheduled;
          return (
            <View key={s.id} style={[styles.session, i > 0 && styles.sessionDivider]}>
              <View style={styles.sessionTop}>
                <Icon name="event" size={18} color={colors.primary} />
                <Text style={styles.sessionDate}>
                  {isPackage ? `Sessão ${i + 1}: ` : ''}{formatLocalDate(s.date)} às {s.time}
                </Text>
                {isPackage ? <Text style={[styles.sessionStatus, { color: sst.color }]}>{sst.label}</Text> : null}
              </View>
              {renderActions(s)}
            </View>
          );
        })}
      </View>
    );
  };

  if (!loaded) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando agendamentos...</Text>
      </View>
    );
  }

  if (!businessId) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.empty}>Nenhum estabelecimento encontrado. Crie seu estabelecimento em Meu Negócio.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agendamentos</Text>
        <Text style={styles.headerSubtitle}>Atualiza sozinho quando chega um agendamento novo</Text>
      </View>

      <View style={styles.searchBox}>
        <Icon name="search" size={20} color={colors.lightText} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por cliente, serviço ou profissional"
          placeholderTextColor={colors.lightText}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => {
            const n = count(f.key);
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, filter === f.key && styles.chipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
                  {f.label}{n >= 0 ? ` (${n})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(g) => g.key}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum agendamento aqui.</Text>}
      />

      <RescheduleModal
        visible={rescheduleItem !== null}
        onClose={() => setRescheduleItem(null)}
        appointment={rescheduleItem}
        professionalId={rescheduleItem ? rescheduleItem.professionalId : ''}
        businessWorkingHours={business?.workingHours}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 10, color: colors.text },
  header: { padding: 18, backgroundColor: colors.primary, alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: colors.offWhite, fontSize: 12, marginTop: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, margin: 12, marginBottom: 6, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.lightGray },
  searchInput: { flex: 1, paddingVertical: 10, marginLeft: 6, color: colors.text, fontSize: 15 },
  filters: { paddingHorizontal: 12, paddingVertical: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.white, marginRight: 8, borderWidth: 1, borderColor: colors.lightGray },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: colors.white, fontWeight: '600' },
  list: { padding: 12, paddingBottom: 32 },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, shadowColor: colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  client: { flex: 1, fontSize: 16, fontWeight: 'bold', color: colors.text, marginRight: 8 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgePackage: { backgroundColor: colors.primary },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: 'bold' },
  line: { fontSize: 14, color: colors.text, marginTop: 4 },
  price: { fontSize: 14, fontWeight: 'bold', color: colors.primary, marginTop: 2 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  phone: { color: colors.primary, fontWeight: '600', marginLeft: 4 },
  session: { marginTop: 10 },
  sessionDivider: { borderTopWidth: 1, borderTopColor: colors.lightGray, paddingTop: 10 },
  sessionTop: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  sessionDate: { fontSize: 15, fontWeight: '600', color: colors.text, marginLeft: 6, marginRight: 8 },
  sessionStatus: { fontSize: 12, fontWeight: 'bold' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, alignItems: 'center' },
  btn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, marginBottom: 6 },
  btnOk: { backgroundColor: colors.success, borderColor: colors.success },
  btnDanger: { backgroundColor: colors.error, borderColor: colors.error },
  btnText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  btnTextLight: { fontSize: 13, color: colors.white, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.lightText, marginTop: 30, fontSize: 15 },
});

export default AppointmentManagementScreen;
