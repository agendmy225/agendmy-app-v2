// src/features/professionalArea/ProfessionalAgendaScreen.tsx
// "Minha Agenda" do profissional: so os agendamentos dele, em lista ou calendario.
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
import AgendaCalendar, { MONTH_NAMES, ymd } from './AgendaCalendar';
import { resolveDayWindow } from '../../services/professionalSchedule';

type Status = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
type FilterKey = 'today' | 'upcoming' | 'pending' | 'history';
type ViewMode = 'list' | 'calendar';

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
  scheduled: { label: 'Aguardando confirmação', color: colors.warning },
  confirmed: { label: 'Confirmado', color: colors.success },
  completed: { label: 'Concluído', color: colors.primary },
  cancelled: { label: 'Cancelado', color: colors.error },
  no_show: { label: 'Não compareceu', color: colors.lightText },
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: STATUS_INFO.scheduled.color,
  confirmed: STATUS_INFO.confirmed.color,
  completed: STATUS_INFO.completed.color,
  cancelled: STATUS_INFO.cancelled.color,
  no_show: STATUS_INFO.no_show.color,
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'upcoming', label: 'Próximos' },
  { key: 'pending', label: 'A confirmar' },
  { key: 'history', label: 'Histórico' },
];

const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const dayTitle = (date: string) => {
  const [y, m, d] = date.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) {
    return date;
  }
  const weekday = new Date(y, m - 1, d).getDay();
  return `${WEEKDAY_NAMES[weekday]}, ${d} de ${MONTH_NAMES[m - 1].toLowerCase()}`;
};

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
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateString(new Date()));
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [profData, setProfData] = useState<Record<string, any>>({});
  const [encaixeDate, setEncaixeDate] = useState<string | undefined>(undefined);

  // horario e nome do estabelecimento
  useEffect(() => {
    if (!user?.businessId) {
      return;
    }
    getDoc(doc(firebaseDb, 'businesses', user.businessId))
      .then((s: { data: () => Record<string, any> | undefined }) => setBusiness(s.data() || null))
      .catch(() => undefined);
  }, [user?.businessId]);

  // acesso, nome e datas bloqueadas do profissional
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
        setBlockedDates(Array.isArray(data.blockedDates) ? data.blockedDates : []);
        setProfData(data);
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

  // folgas da semana no mes visivel (dias sem atendimento que nao sao bloqueios)
  const offDates = useMemo(() => {
    if (!business) {
      return [];
    }
    const out: string[] = [];
    const days = new Date(calYear, calMonth + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const date = ymd(calYear, calMonth, d);
      if (!blockedDates.includes(date) && resolveDayWindow(profData, business.workingHours, date) === null) {
        out.push(date);
      }
    }
    return out;
  }, [business, profData, blockedDates, calYear, calMonth]);

  const dayItems = useMemo(() => items.filter((i) => i.date === selectedDate), [items, selectedDate]);

  const count = (f: FilterKey) => {
    const isOpen = (s: Status) => s === 'scheduled' || s === 'confirmed';
    if (f === 'today') { return items.filter((i) => i.date === today && i.status !== 'cancelled').length; }
    if (f === 'upcoming') { return items.filter((i) => i.date >= today && isOpen(i.status)).length; }
    if (f === 'pending') { return items.filter((i) => i.date >= today && i.status === 'scheduled').length; }
    return items.filter((i) => i.date < today || !isOpen(i.status)).length;
  };

  const changeMonth = (y: number, m: number) => {
    setCalYear(y);
    setCalMonth(m);
    const [ty, tm] = today.split('-').map((n) => parseInt(n, 10));
    setSelectedDate(ty === y && tm - 1 === m ? today : ymd(y, m, 1));
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
            Alert.alert('Erro', 'Não foi possível atualizar o agendamento.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const renderCard = (item: AgendaItem, showDate: boolean) => {
    const st = STATUS_INFO[item.status] || STATUS_INFO.scheduled;
    const busy = busyId === item.id;
    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTime}>{item.time}</Text>
          <Text style={styles.cardDate}>
            {showDate ? formatLocalDate(item.date) : `${item.duration} min`}
          </Text>
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
                  <TouchableOpacity style={[styles.btn, styles.btnOk]} onPress={() => changeStatus(item, 'completed', 'Marcar como concluído')}>
                    <Text style={styles.btnTextLight}>Concluir</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btn} onPress={() => changeStatus(item, 'no_show', 'Cliente não compareceu')}>
                    <Text style={styles.btnText}>Não veio</Text>
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
  };

  if (!professionalId || !hasAccess) {
    return (
      <View style={[styles.container, styles.center]}>
        <Icon name="lock" size={56} color={colors.lightText} />
        <Text style={styles.deniedTitle}>Sem acesso a agenda</Text>
        <Text style={styles.deniedText}>
          O estabelecimento removeu seu acesso ao app. Fale com o responsável para receber um novo convite.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => signOut()}>
          <Text style={styles.primaryButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dayActive = dayItems.filter((i) => i.status !== 'cancelled').length;
  const dayCancelled = dayItems.length - dayActive;
  const daySummary =
    (dayActive === 1 ? '1 agendamento' : `${dayActive} agendamentos`) +
    (dayCancelled > 0 ? `  -  ${dayCancelled} cancelado${dayCancelled > 1 ? 's' : ''}` : '');
  const selectedBlocked = blockedDates.includes(selectedDate);
  const selectedOff = offDates.includes(selectedDate);
  const canEncaixe = selectedDate >= today && !selectedBlocked && !selectedOff;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Minha Agenda</Text>
        <Text style={styles.headerSubtitle}>{professionalName}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEncaixeDate(undefined);
            setManualOpen(true);
          }}
        >
          <Icon name="add" size={18} color={colors.primary} />
          <Text style={styles.addButtonText}>Encaixe</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
          onPress={() => setViewMode('list')}
        >
          <Icon name="view-list" size={18} color={viewMode === 'list' ? colors.white : colors.primary} />
          <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>Lista</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'calendar' && styles.toggleBtnActive]}
          onPress={() => setViewMode('calendar')}
        >
          <Icon name="date-range" size={18} color={viewMode === 'calendar' ? colors.white : colors.primary} />
          <Text style={[styles.toggleText, viewMode === 'calendar' && styles.toggleTextActive]}>Calendário</Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'list' ? (
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
      ) : null}

      {!loaded ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : viewMode === 'list' ? (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum agendamento aqui.</Text>
          ) : (
            filtered.map((item) => renderCard(item, true))
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.calendarContent}>
          <AgendaCalendar
            entries={items}
            year={calYear}
            month={calMonth}
            onChangeMonth={changeMonth}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            today={today}
            blockedDates={blockedDates}
            offDates={offDates}
            statusColors={STATUS_COLORS}
          />

          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>{dayTitle(selectedDate)}</Text>
            <Text style={styles.daySubtitle}>{daySummary}</Text>
          </View>

          {selectedOff ? (
            <View style={styles.blockedNote}>
              <Icon name="event-busy" size={16} color={colors.lightText} />
              <Text style={styles.blockedNoteText}>Folga: você não atende neste dia</Text>
            </View>
          ) : null}

          {canEncaixe ? (
            <TouchableOpacity
              style={styles.dayEncaixe}
              onPress={() => {
                setEncaixeDate(selectedDate);
                setManualOpen(true);
              }}
            >
              <Icon name="add" size={18} color={colors.white} />
              <Text style={styles.dayEncaixeText}>Encaixe neste dia</Text>
            </TouchableOpacity>
          ) : null}

          {selectedBlocked ? (
            <View style={styles.blockedNote}>
              <Icon name="block" size={16} color={colors.lightText} />
              <Text style={styles.blockedNoteText}>Dia bloqueado em Meus Horários</Text>
            </View>
          ) : null}

          {dayItems.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum agendamento neste dia.</Text>
          ) : (
            dayItems.map((item) => renderCard(item, false))
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
        initialDate={encaixeDate}
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
  toggleRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 14, backgroundColor: colors.card, borderRadius: 10, padding: 4 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: 14, color: colors.primary, fontWeight: '600', marginLeft: 6 },
  toggleTextActive: { color: colors.white },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.card, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: colors.white, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { padding: 16, paddingTop: 4, paddingBottom: 32 },
  calendarContent: { padding: 16, paddingTop: 14, paddingBottom: 32 },
  dayHeader: { marginBottom: 10 },
  dayTitle: { fontSize: 17, fontWeight: 'bold', color: colors.text },
  daySubtitle: { fontSize: 13, color: colors.lightText, marginTop: 2 },
  blockedNote: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 8, padding: 10, marginBottom: 10 },
  dayEncaixe: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, marginBottom: 12 },
  dayEncaixeText: { color: colors.white, fontWeight: 'bold', fontSize: 14, marginLeft: 4 },
  blockedNoteText: { fontSize: 13, color: colors.lightText, marginLeft: 6 },
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
