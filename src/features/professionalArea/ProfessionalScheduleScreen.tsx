// src/features/professionalArea/ProfessionalScheduleScreen.tsx
// "Meus Horarios": dias e horarios de atendimento, intervalo e datas bloqueadas.
// Following React Native Firebase v22 modular API patterns
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { doc, getDoc, serverTimestamp, updateDoc } from '@react-native-firebase/firestore';
import { firebaseDb } from '../../config/firebase';
import { colors } from '../../constants/colors';
import { useAuth } from '../auth/context/AuthContext';
import {
  DAY_LABELS,
  WEEK_ORDER,
  WeekSchedule,
  businessDayWindow,
  countOpenAppointments,
  isValidTime,
  toMinutes,
} from '../../services/professionalSchedule';
import { formatLocalDate, toLocalDateString } from '../../utils/localDate';

interface DayForm {
  on: boolean;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
}

const emptyDay = (): DayForm => ({ on: false, start: '09:00', end: '18:00', breakStart: '', breakEnd: '' });

const ProfessionalScheduleScreen: React.FC = () => {
  const { user } = useAuth();
  const professionalId = user?.professionalId;
  const [form, setForm] = useState<Record<string, DayForm>>({});
  const [blocked, setBlocked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [usingBusinessHours, setUsingBusinessHours] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!professionalId) {
        setLoading(false);
        return;
      }
      try {
        const [profSnap, bizSnap] = await Promise.all([
          getDoc(doc(firebaseDb, 'professionals', professionalId)),
          user?.businessId ? getDoc(doc(firebaseDb, 'businesses', user.businessId)) : Promise.resolve(null),
        ]);
        const prof = (profSnap && profSnap.data()) || {};
        const businessWH = (bizSnap && (bizSnap as any).data && (bizSnap as any).data()?.workingHours) || {};
        const schedule = prof.schedule as WeekSchedule | undefined;
        const hasOwn = !!schedule && Object.keys(schedule).length > 0;
        setUsingBusinessHours(!hasOwn);
        const next: Record<string, DayForm> = {};
        WEEK_ORDER.forEach((day) => {
          const src = hasOwn ? (schedule as WeekSchedule)[day] : businessDayWindow(businessWH, day);
          next[day] = src
            ? { on: true, start: src.start, end: src.end, breakStart: src.breakStart || '', breakEnd: src.breakEnd || '' }
            : emptyDay();
        });
        setForm(next);
        setBlocked(Array.isArray(prof.blockedDates) ? [...prof.blockedDates].sort() : []);
      } catch {
        Alert.alert('Erro', 'Não foi possível carregar seus horários.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [professionalId, user?.businessId]);

  const update = (day: string, patch: Partial<DayForm>) =>
    setForm((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));

  const validate = (): string | null => {
    for (const day of WEEK_ORDER) {
      const d = form[day];
      if (!d || !d.on) { continue; }
      const label = DAY_LABELS[day];
      if (!isValidTime(d.start) || !isValidTime(d.end)) { return `${label}: use horários no formato 00:00.`; }
      if (toMinutes(d.start) >= toMinutes(d.end)) { return `${label}: o início precisa ser antes do fim.`; }
      const hasBreak = d.breakStart || d.breakEnd;
      if (hasBreak) {
        if (!isValidTime(d.breakStart) || !isValidTime(d.breakEnd)) { return `${label}: preencha o intervalo no formato 00:00 ou deixe vazio.`; }
        if (toMinutes(d.breakStart) >= toMinutes(d.breakEnd) ||
            toMinutes(d.breakStart) <= toMinutes(d.start) || toMinutes(d.breakEnd) >= toMinutes(d.end)) {
          return `${label}: o intervalo precisa ficar dentro do horário de atendimento.`;
        }
      }
    }
    return null;
  };

  const save = async (nextBlocked?: string[]) => {
    if (!professionalId) { return; }
    const err = validate();
    if (err) {
      Alert.alert('Confira os horários', err);
      return;
    }
    const schedule: WeekSchedule = {};
    WEEK_ORDER.forEach((day) => {
      const d = form[day];
      schedule[day] = d && d.on
        ? { start: d.start, end: d.end, ...(d.breakStart && d.breakEnd ? { breakStart: d.breakStart, breakEnd: d.breakEnd } : {}) }
        : null;
    });
    try {
      setSaving(true);
      await updateDoc(doc(firebaseDb, 'professionals', professionalId), {
        schedule,
        blockedDates: nextBlocked || blocked,
        updatedAt: serverTimestamp(),
      });
      setUsingBusinessHours(false);
      if (!nextBlocked) {
        Alert.alert('Pronto', 'Seus horários foram salvos. Os clientes já veem os horários novos.');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const addBlocked = async (date: Date) => {
    if (!professionalId) { return; }
    const ds = toLocalDateString(date);
    if (ds < toLocalDateString(new Date())) {
      Alert.alert('Data inválida', 'Escolha hoje ou uma data futura.');
      return;
    }
    if (blocked.includes(ds)) { return; }
    const open = await countOpenAppointments(professionalId, ds).catch(() => 0);
    if (open > 0) {
      Alert.alert(
        'Existem agendamentos nesse dia',
        `Você tem ${open} agendamento(s) em ${formatLocalDate(ds)}. Remarque ou cancele antes de bloquear a data.`,
      );
      return;
    }
    const next = [...blocked, ds].sort();
    setBlocked(next);
    await save(next);
  };

  const removeBlocked = async (ds: string) => {
    const next = blocked.filter((d) => d !== ds);
    setBlocked(next);
    await save(next);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const today = toLocalDateString(new Date());
  const upcomingBlocked = blocked.filter((d) => d >= today);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus Horários</Text>
        <Text style={styles.headerSubtitle}>Os clientes so conseguem agendar nesses horários</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {usingBusinessHours && (
          <View style={styles.info}>
            <Icon name="info-outline" size={18} color={colors.warning} />
            <Text style={styles.infoText}>
              Você ainda usa o horário do estabelecimento. Ajuste e salve para ter seu próprio horário.
            </Text>
          </View>
        )}

        <Text style={styles.section}>Dias e horários</Text>
        {WEEK_ORDER.map((day) => {
          const d = form[day] || emptyDay();
          return (
            <View key={day} style={styles.dayCard}>
              <View style={styles.dayTop}>
                <Text style={styles.dayName}>{DAY_LABELS[day]}</Text>
                <Text style={styles.dayStatus}>{d.on ? 'Atende' : 'Folga'}</Text>
                <Switch
                  value={d.on}
                  onValueChange={(v) => update(day, { on: v })}
                  trackColor={{ false: colors.gray, true: colors.success }}
                  thumbColor={colors.white}
                />
              </View>
              {d.on && (
                <>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Das</Text>
                    <TextInput style={styles.time} value={d.start} onChangeText={(v) => update(day, { start: v })} placeholder="09:00" maxLength={5} keyboardType="numbers-and-punctuation" />
                    <Text style={styles.rowLabel}>as</Text>
                    <TextInput style={styles.time} value={d.end} onChangeText={(v) => update(day, { end: v })} placeholder="18:00" maxLength={5} keyboardType="numbers-and-punctuation" />
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Intervalo</Text>
                    <TextInput style={styles.time} value={d.breakStart} onChangeText={(v) => update(day, { breakStart: v })} placeholder="12:00" maxLength={5} keyboardType="numbers-and-punctuation" />
                    <Text style={styles.rowLabel}>as</Text>
                    <TextInput style={styles.time} value={d.breakEnd} onChangeText={(v) => update(day, { breakEnd: v })} placeholder="13:00" maxLength={5} keyboardType="numbers-and-punctuation" />
                  </View>
                </>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={styles.saveButton} onPress={() => save()} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Salvar horários</Text>}
        </TouchableOpacity>

        <Text style={styles.section}>Datas bloqueadas</Text>
        <Text style={styles.hint}>Folgas, consultas, viagens... Nesses dias ninguém consegue agendar com você.</Text>
        {upcomingBlocked.length === 0 ? (
          <Text style={styles.empty}>Nenhuma data bloqueada.</Text>
        ) : (
          upcomingBlocked.map((ds) => (
            <View key={ds} style={styles.blockedRow}>
              <Icon name="event-busy" size={20} color={colors.error} />
              <Text style={styles.blockedText}>{formatLocalDate(ds)}</Text>
              <TouchableOpacity onPress={() => removeBlocked(ds)} disabled={saving}>
                <Text style={styles.removeText}>Desbloquear</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        <TouchableOpacity style={styles.blockButton} onPress={() => setShowPicker(true)} disabled={saving}>
          <Icon name="add" size={20} color={colors.primary} />
          <Text style={styles.blockButtonText}>Bloquear uma data</Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={new Date()}
            mode="date"
            minimumDate={new Date()}
            onChange={(event: any, selected?: Date) => {
              setShowPicker(false);
              if (event?.type === 'set' && selected) {
                addBlocked(selected);
              }
            }}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { padding: 20, backgroundColor: colors.primary, alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: colors.offWhite, fontSize: 12, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  info: { flexDirection: 'row', borderWidth: 1, borderColor: colors.warning, borderRadius: 10, padding: 10, backgroundColor: colors.card, marginBottom: 6 },
  infoText: { flex: 1, fontSize: 12, color: colors.text, marginLeft: 8 },
  section: { fontSize: 15, fontWeight: 'bold', color: colors.text, marginTop: 16, marginBottom: 8 },
  hint: { fontSize: 12, color: colors.lightText, marginBottom: 8 },
  dayCard: { backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 8 },
  dayTop: { flexDirection: 'row', alignItems: 'center' },
  dayName: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 },
  dayStatus: { fontSize: 12, color: colors.lightText, marginRight: 6 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  rowLabel: { fontSize: 13, color: colors.text, marginHorizontal: 6, minWidth: 22 },
  time: { backgroundColor: colors.white, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, width: 70, textAlign: 'center', color: colors.text, fontSize: 15 },
  saveButton: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveText: { color: colors.white, fontWeight: 'bold', fontSize: 15 },
  empty: { fontSize: 13, color: colors.lightText, marginBottom: 6 },
  blockedRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 6 },
  blockedText: { flex: 1, fontSize: 14, color: colors.text, marginLeft: 8 },
  removeText: { fontSize: 13, color: colors.primary, fontWeight: 'bold' },
  blockButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: 10, paddingVertical: 12, marginTop: 6 },
  blockButtonText: { color: colors.primary, fontWeight: 'bold', marginLeft: 6 },
});

export default ProfessionalScheduleScreen;
