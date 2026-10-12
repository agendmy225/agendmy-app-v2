// src/features/professionalArea/AgendaModals.tsx
// Janelas da agenda do profissional: Remarcar e Encaixe (marcar manualmente).
// Following React Native Firebase v22 modular API patterns
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from '@react-native-firebase/firestore';
import { firebaseDb } from '../../config/firebase';
import { colors } from '../../constants/colors';
import { getServicesByBusiness, Service } from '../../services/services';
import { getFreeSlots, nextDays } from '../../services/professionalSchedule';
import { parseLocalDate } from '../../utils/localDate';

const WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

// ---------- seletor de data + horario ----------
const SlotPicker: React.FC<{
  professionalId: string;
  businessWorkingHours: any;
  durationMin: number;
  ignoreAppointmentId?: string;
  date: string | null;
  time: string | null;
  onChange: (date: string | null, time: string | null) => void;
}> = ({ professionalId, businessWorkingHours, durationMin, ignoreAppointmentId, date, time, onChange }) => {
  const days = nextDays(30);
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!date) {
      setSlots([]);
      return;
    }
    setLoading(true);
    getFreeSlots({ professionalId, date, durationMin, businessWorkingHours, ignoreAppointmentId })
      .then((s) => { if (active) { setSlots(s); } })
      .catch(() => { if (active) { setSlots([]); } })
      .finally(() => { if (active) { setLoading(false); } });
    return () => { active = false; };
  }, [professionalId, date, durationMin, businessWorkingHours, ignoreAppointmentId]);

  return (
    <View>
      <Text style={styles.label}>Data</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
        {days.map((d) => {
          const dt = parseLocalDate(d);
          const active = d === date;
          return (
            <TouchableOpacity
              key={d}
              style={[styles.dayChip, active && styles.dayChipActive]}
              onPress={() => onChange(d, null)}
            >
              <Text style={[styles.dayWeek, active && styles.textLight]}>{WEEK[dt.getDay()]}</Text>
              <Text style={[styles.dayNum, active && styles.textLight]}>{dt.getDate()}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {date && (
        <>
          <Text style={styles.label}>Horario</Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : slots.length === 0 ? (
            <Text style={styles.empty}>Sem horarios livres nesse dia.</Text>
          ) : (
            <View style={styles.slotGrid}>
              {slots.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.slot, s === time && styles.slotActive]}
                  onPress={() => onChange(date, s)}
                >
                  <Text style={[styles.slotText, s === time && styles.textLight]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
};

// ---------- REMARCAR ----------
export const RescheduleModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  appointment: { id: string; clientName: string; duration: number } | null;
  professionalId: string;
  businessWorkingHours: any;
}> = ({ visible, onClose, appointment, professionalId, businessWorkingHours }) => {
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setDate(null);
      setTime(null);
    }
  }, [visible]);

  const save = async () => {
    if (!appointment || !date || !time) {
      return;
    }
    try {
      setSaving(true);
      await updateDoc(doc(firebaseDb, 'appointments', appointment.id), {
        date,
        time,
        status: 'confirmed',
        rescheduledBy: 'professional',
        updatedAt: serverTimestamp(),
      });
      onClose();
    } catch {
      Alert.alert('Erro', 'Nao foi possivel remarcar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Remarcar</Text>
          <Text style={styles.subtitle}>{appointment?.clientName}</Text>
          <ScrollView style={styles.scroll}>
            {appointment && (
              <SlotPicker
                professionalId={professionalId}
                businessWorkingHours={businessWorkingHours}
                durationMin={appointment.duration}
                ignoreAppointmentId={appointment.id}
                date={date}
                time={time}
                onChange={(d, t) => { setDate(d); setTime(t); }}
              />
            )}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onClose} disabled={saving}>
              <Text style={styles.btnGhostText}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, (!date || !time) && styles.btnDisabled]}
              onPress={save}
              disabled={!date || !time || saving}
            >
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>Remarcar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ---------- ENCAIXE ----------
export const ManualBookingModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  professionalId: string;
  professionalName: string;
  businessId: string;
  businessName: string;
  businessWorkingHours: any;
  userId: string;
}> = (p) => {
  const [services, setServices] = useState<Service[]>([]);
  const [service, setService] = useState<Service | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!p.visible) {
      return;
    }
    setService(null);
    setClientName('');
    setClientPhone('');
    setDate(null);
    setTime(null);
    getServicesByBusiness(p.businessId).then(setServices).catch(() => setServices([]));
  }, [p.visible, p.businessId]);

  const duration = service ? parseInt(String(service.duration), 10) || 60 : 60;
  const price = service
    ? (service.isPromotionActive && service.promotionalPrice ? service.promotionalPrice : service.price) || 0
    : 0;
  const canSave = !!service && clientName.trim().length >= 2 && !!date && !!time;

  const save = async () => {
    if (!canSave || !service || !date || !time) {
      return;
    }
    try {
      setSaving(true);
      await addDoc(collection(firebaseDb, 'appointments'), {
        businessId: p.businessId,
        businessName: p.businessName,
        serviceId: service.id,
        serviceName: service.name,
        price,
        duration: String(duration),
        professionalId: p.professionalId,
        professionalName: p.professionalName,
        clientId: p.userId,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        date,
        time,
        status: 'confirmed',
        notes: '',
        createdBy: 'professional',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      p.onClose();
    } catch {
      Alert.alert('Erro', 'Nao foi possivel salvar o encaixe.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={p.visible} transparent animationType="slide" onRequestClose={p.onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Encaixe</Text>
          <Text style={styles.subtitle}>Marcar um cliente manualmente</Text>
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Nome do cliente</Text>
            <TextInput style={styles.input} value={clientName} onChangeText={setClientName} placeholder="Ex: Maria Silva" placeholderTextColor={colors.placeholderText} />
            <Text style={styles.label}>Telefone (opcional)</Text>
            <TextInput style={styles.input} value={clientPhone} onChangeText={setClientPhone} placeholder="(00) 00000-0000" keyboardType="phone-pad" placeholderTextColor={colors.placeholderText} />

            <Text style={styles.label}>Servico</Text>
            <View style={styles.slotGrid}>
              {services.length === 0 ? (
                <Text style={styles.empty}>Nenhum servico cadastrado.</Text>
              ) : services.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.serviceChip, service?.id === s.id && styles.slotActive]}
                  onPress={() => { setService(s); setTime(null); }}
                >
                  <Text style={[styles.slotText, service?.id === s.id && styles.textLight]}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {service && (
              <SlotPicker
                professionalId={p.professionalId}
                businessWorkingHours={p.businessWorkingHours}
                durationMin={duration}
                date={date}
                time={time}
                onChange={(d, t) => { setDate(d); setTime(t); }}
              />
            )}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={p.onClose} disabled={saving}>
              <Text style={styles.btnGhostText}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, !canSave && styles.btnDisabled]} onPress={save} disabled={!canSave || saving}>
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>Salvar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  box: { backgroundColor: colors.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '90%' },
  title: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 13, color: colors.lightText, marginTop: 2, marginBottom: 6 },
  scroll: { marginTop: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: colors.card, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text },
  dayScroll: { flexGrow: 0 },
  dayChip: { width: 52, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', marginRight: 8 },
  dayChipActive: { backgroundColor: colors.primary },
  dayWeek: { fontSize: 11, color: colors.lightText },
  dayNum: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  slot: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.card, marginRight: 8, marginBottom: 8 },
  serviceChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.card, marginRight: 8, marginBottom: 8 },
  slotActive: { backgroundColor: colors.primary },
  slotText: { fontSize: 14, color: colors.text },
  textLight: { color: colors.white },
  empty: { fontSize: 13, color: colors.lightText },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
  btn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginLeft: 10, minWidth: 100, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: colors.white, fontWeight: '600' },
  btnGhost: { backgroundColor: colors.card },
  btnGhostText: { color: colors.text, fontWeight: '600' },
});
