// src/features/professionalArea/ProfessionalAgendaScreen.tsx
// "Minha Agenda" do profissional: so os agendamentos dele.
// Following React Native Firebase v22 modular API patterns
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { collection, doc, getDoc, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { firebaseDb } from '../../config/firebase';
import { colors } from '../../constants/colors';
import { useAuth } from '../auth/context/AuthContext';
import { updateAppointmentStatus } from '../../services/appointments';
import { formatLocalDate, toLocalDateString } from '../../utils/localDate';
import { ManualBookingModal, RescheduleModal } from './AgendaModals';

type Status = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
type FilterKey = 'today' | 'upcoming' | 'pending' | 'history';

interface AgendaItem {
  id: string;
  date: string;
  time: string;
  status: Status;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  price: number;
  duration: number;
}

const STATUS_INFO: Record<Status, { label: string; color: string }> = {
  scheduled: { label: 'Aguardando confirmacao', color: colors.warning },
  confirmed: { label: 'Confirmado', color: colors.success },
  completed: { label: 'Concluido', color: colors.primary },
  cancelled: { label: 'Cancelado', color: colors.error },
  no_show: { label: 'Nao compareceu', color: colors.lightText },
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'upcoming', label: 'Proximos' },
  { key: 'pending', label: 'A confirmar' },
  { key: 'history', label: 'Historico' },
];

const ProfessionalAgendaScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const professionalId = user?.professionalId;
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);
  const [professionalName, setProfessionalName] = useState('');
  const [filter, setFilter] = useState<FilterKey>('today');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [business, setBusiness] = useState<Record<string, any> | null>(null);
  const [rescheduleItem, setRescheduleItem] = useState<AgendaItem | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  // horario e nome do estabelecimento
  useEffect(() => {
    if (!user?.businessId) {
      return;
    }
    getDoc(doc(firebaseDb, 'businesses', user.businessId))
      .then((s: { data: () => Record<string, any> | undefined }) => setBusiness(s.data() || null))
      .catch(() => undefined);
  }, [user?.businessId]);

  // acesso e nome do profissional
  useEffect(() => {
    if (!professionalId) {
      return;
    }
    return onSnapshot(
      doc(firebaseDb, 'professionals', professionalId),
      (snap: { data: () => Record<string, any> | undefined }) => {
        const data = snap.data() || {};
        setHasAccess(data.appAccess === true && data.accessUserId === user?.uid);
        setProfessionalName(data.name || '');
      },
      () => undefined,
    );
  }, [professionalId, user?.uid]);

  // agendamentos em tempo real
  useEffect(() => {
    if (!professionalId) {
      setLoaded(true);
      return;
    }
    return onSnapshot(
      query(collection(firebaseDb, 'appointments'), where('professionalId', '==', professionalId)),
      (snap: { docs: { id: string; data: () => Record<string, any> | undefined }[] }) => {
        const list: AgendaItem[] = snap.docs.map((d) => {
          const a = d.data() || {};
          return {
            id: d.id,
            date: a.date || '',
            time: a.time || '',
            status: (a.status as Status) || 'scheduled',
            clientName: a.clientName || 'Cliente',
            clientPhone: a.clientPhone || '',
            serviceName: a.serviceName || '',
            price: Number(a.price) || 0,
            duration: parseInt(String(a.duration), 10) || 60,
          };
        });
        list.sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
        setItems(list);
        setLoaded(true);
      },
      () => setLoaded(true),
    );
  }, [professionalId]);

  const today = toLocalDateString(new Date());

  const filtered = useMemo(() => {
    const isOpen = (s: Status) => s === 'scheduled' || s === 'confirmed';
    switch (filter) {
      case 'today':
        return items.filter((i) => i.date === today && i.status !== 'cancelled');
      case 'upcoming':
        return items.filter((i) => i.date >= today && isOpen(i.status));
      case 'pending':
        return items.filter((i) => i.date >= today && i.status === 'scheduled');
      default:
        return items.filter((i) => i.date < today || !isOpen(i.status)).reverse();
    }
  }, [items, filter, today]);

  const count = (f: FilterKey) => {
    const isOpen = (s: Status) => s === 'scheduled' || s === 'confirmed';
    if (f === 'today') { return items.filter((i) => i.date === today && i.status !== 'cancelled').length; }
    if (f === 'upcoming') { return items.filter((i) => i.date >= today && isOpen(i.status)).length; }
    if (f === 'pending') { return items.filter((i) => i.date >= today && i.status === 'scheduled').length; }
    return items.filter((i) => i.date < today || !isOpen(i.status)).length;
  };

  const changeStatus = (item: AgendaItem, status: Status, title: string) => {
    Alert.alert(title, `${item.clientName} - ${formatLocalDate(item.date)} as ${item.time}`, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: status === 'cancelled' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            setBusyId(item.id);
            await updateAppointmentStatus(item.id, status);
          } catch {
            Alert.alert('Erro', 'Nao foi possivel atualizar o agendamento.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  if (!professionalId || !hasAccess) {
    return (
      <View style={[styles.container, styles.center]}>
        <Icon name="lock" size={56} color={colors.lightText} />
        <Text style={styles.deniedTitle}>Sem acesso a agenda</Text>
        <Text style={styles.deniedText}>
          O estabelecimento removeu seu acesso ao app. Fale com o responsavel para receber um novo convite.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => signOut()}>
          <Text style={styles.primaryButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Minha Agenda</Text>
        <Text style={styles.headerSubtitle}>{professionalName}</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setManualOpen(true)}>
          <Icon name="add" size={18} color={colors.primary} />
          <Text style={styles.addButtonText}>Encaixe</Text>
        </TouchableOpacity>
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

      {!loaded ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum agendamento aqui.</Text>
          ) : (
            filtered.map((item) => {
              const st = STATUS_INFO[item.status] || STATUS_INFO.scheduled;
              const busy = busyId === item.id;
              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTime}>{item.time}</Text>
                    <Text style={styles.cardDate}>{formatLocalDate(item.date)}</Text>
                    <View style={[styles.badge, { backgroundColor: st.color }]}>
                      <Text style={styles.badgeText}>{st.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardClient}>{item.clientName}</Text>
                  <Text style={styles.cardService}>
                    {item.serviceName}{item.price ? `  -  R$ ${item.price.toFixed(2).replace('.', ',')}` : ''}
                  </Text>
                  {item.clientPhone ? (
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.clientPhone}`)}>
                      <Text style={styles.phone}>{item.clientPhone}</Text>
                    </TouchableOpacity>
                  ) : null}

                  <View style={styles.actions}>
                    {busy ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        {item.status === 'scheduled' && (
                          <TouchableOpacity style={[styles.btn, styles.btnOk]} onPress={() => changeStatus(item, 'confirmed', 'Aceitar agendamento')}>
                            <Text style={styles.btnTextLight}>Aceitar</Text>
                          </TouchableOpacity>
                        )}
                        {item.status === 'confirmed' && (
                          <>
                            <TouchableOpacity style={[styles.btn, styles.btnOk]} onPress={() => changeStatus(item, 'completed', 'Marcar como concluido')}>
                              <Text style={styles.btnTextLight}>Concluir</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btn} onPress={() => changeStatus(item, 'no_show', 'Cliente nao compareceu')}>
                              <Text style={styles.btnText}>Nao veio</Text>
                            </TouchableOpacity>
                          </>
                        )}
                        {(item.status === 'scheduled' || item.status === 'confirmed') && (
                          <TouchableOpacity style={styles.btn} onPress={() => setRescheduleItem(item)}>
                            <Text style={styles.btnText}>Remarcar</Text>
                          </TouchableOpacity>
                        )}
                        {(item.status === 'scheduled' || item.status === 'confirmed') && (
                          <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => changeStatus(item, 'cancelled', 'Cancelar agendamento')}>
                            <Text style={styles.btnTextLight}>Cancelar</Text>
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

      <RescheduleModal
        visible={rescheduleItem !== null}
        onClose={() => setRescheduleItem(null)}
        appointment={rescheduleItem}
        professionalId={professionalId}
        businessWorkingHours={business?.workingHours}
      />
      <ManualBookingModal
        visible={manualOpen}
        onClose={() => setManualOpen(false)}
        professionalId={professionalId}
        professionalName={professionalName}
        businessId={user?.businessId || ''}
        businessName={business?.name || ''}
        businessWorkingHours={business?.workingHours}
        userId={user?.uid || ''}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { padding: 20, backgroundColor: colors.primary, alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: colors.offWhite, fontSize: 13, marginTop: 2 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 },
  addButtonText: { color: colors.primary, fontWeight: 'bold', fontSize: 13, marginLeft: 4 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.card, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: colors.white, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { padding: 16, paddingTop: 4, paddingBottom: 32 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  cardTime: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginRight: 8 },
  cardDate: { fontSize: 13, color: colors.lightText, flex: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: 'bold' },
  cardClient: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 6 },
  cardService: { fontSize: 13, color: colors.text, marginTop: 2 },
  phone: { fontSize: 13, color: colors.primary, marginTop: 4, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, minHeight: 34, alignItems: 'center' },
  btn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, marginBottom: 6 },
  btnOk: { backgroundColor: colors.success, borderColor: colors.success },
  btnDanger: { backgroundColor: colors.error, borderColor: colors.error },
  btnText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  btnTextLight: { fontSize: 13, color: colors.white, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: colors.lightText, marginTop: 30 },
  deniedTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 12 },
  deniedText: { fontSize: 14, color: colors.lightText, textAlign: 'center', marginTop: 6 },
  primaryButton: { marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  primaryButtonText: { color: colors.white, fontWeight: '600', fontSize: 15 },
});

export default ProfessionalAgendaScreen;
