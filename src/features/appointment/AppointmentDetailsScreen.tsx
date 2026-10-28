// src/features/appointment/AppointmentDetailsScreen.tsx
// Detalhes de um agendamento: data, horario, profissional, valor, status, endereco
// e acoes (cancelar, como chegar, ligar, avaliar, ver o estabelecimento).
// Em pacotes, mostra todas as sessoes juntas.
import React, { useCallback, useState } from 'react';
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
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { collection, doc, firebaseDb, getDoc, getDocs, query, updateDoc, where } from '../../config/firebase';
import { colors } from '../../constants/colors';
import { useAuth } from '../auth/context/AuthContext';
import { cancelAppointment } from '../../services/appointments';
import { formatLocalDate, toLocalDateString } from '../../utils/localDate';
import BusinessThumb from '../../components/BusinessThumb';

type Appt = Record<string, any> & { id: string };

const STATUS: Record<string, { label: string; color: string; icon: string }> = {
  scheduled: { label: 'Aguardando confirmação', color: colors.warning, icon: 'hourglass-empty' },
  confirmed: { label: 'Confirmado', color: colors.primary, icon: 'check-circle' },
  completed: { label: 'Concluído', color: colors.success, icon: 'done-all' },
  cancelled: { label: 'Cancelado', color: colors.error, icon: 'cancel' },
  no_show: { label: 'Não compareceu', color: colors.error, icon: 'event-busy' },
};

const brl = (v: number) => `R$ ${(Number(v) || 0).toFixed(2).replace('.', ',')}`;
const isOpen = (s: string) => s === 'scheduled' || s === 'confirmed';

const AppointmentDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const appointmentId: string = route.params?.appointmentId || '';
  const [appt, setAppt] = useState<Appt | null>(null);
  const [sessions, setSessions] = useState<Appt[]>([]);
  const [business, setBusiness] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!appointmentId) {
      setLoading(false);
      return;
    }
    try {
      const snap = await getDoc(doc(firebaseDb, 'appointments', appointmentId));
      if (!snap.exists()) {
        setAppt(null);
        return;
      }
      const a = { id: snap.id, ...(snap.data() || {}) } as Appt;
      setAppt(a);

      let list: Appt[] = [a];
      if (a.packageId && user?.uid && a.clientId === user.uid) {
        try {
          const qs = await getDocs(query(collection(firebaseDb, 'appointments'),
            where('clientId', '==', user.uid), where('packageId', '==', a.packageId)));
          const found = qs.docs.map((d: any) => ({ id: d.id, ...(d.data() || {}) }) as Appt);
          if (found.length > 0) {
            list = found;
          }
        } catch {
          // mostra so este agendamento
        }
      }
      list.sort((x, y) => String(x.date + x.time).localeCompare(String(y.date + y.time)));
      setSessions(list);

      // ao abrir os detalhes, a novidade conta como vista (some o numero da aba)
      const unreadIds = list
        .filter((s) => s.clientUnread === true && !!user?.uid && s.clientId === user.uid)
        .map((s) => s.id);
      if (unreadIds.length > 0) {
        Promise.all(unreadIds.map((id) => updateDoc(doc(firebaseDb, 'appointments', id), { clientUnread: false })))
          .catch(() => undefined);
      }

      if (a.businessId) {
        try {
          const b = await getDoc(doc(firebaseDb, 'businesses', a.businessId));
          setBusiness(b.exists() ? b.data() || null : null);
        } catch {
          setBusiness(null);
        }
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o agendamento.');
    } finally {
      setLoading(false);
    }
  }, [appointmentId, user?.uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const today = toLocalDateString(new Date());
  const isMine = !!appt && !!user?.uid && appt.clientId === user.uid;

  const handleCancel = (s: Appt) => {
    const start = new Date(`${s.date}T${s.time}:00`);
    const hoursLeft = (start.getTime() - Date.now()) / 3600000;
    const warning = hoursLeft < 24
      ? '\n\nFaltam menos de 24 horas. O estabelecimento pode cobrar pelo cancelamento.'
      : '';
    Alert.alert(
      'Cancelar agendamento',
      `${s.serviceName || 'Serviço'} em ${formatLocalDate(s.date)} às ${s.time}.${warning}`,
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Cancelar agendamento',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAppointment(s.id);
              load();
            } catch {
              // cancelAppointment ja mostra o aviso de erro
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!appt) {
    return (
      <View style={[styles.container, styles.center]}>
        <Icon name="event-busy" size={56} color={colors.lightText} />
        <Text style={styles.emptyTitle}>Agendamento não encontrado</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const st = STATUS[appt.status] || STATUS.scheduled;
  const isPackage = sessions.length > 1;
  const total = sessions.reduce((sum, s) => sum + (s.status === 'cancelled' ? 0 : Number(s.price) || 0), 0);
  const fullAddress = business
    ? [
      [business.address, business.addressNumber].filter(Boolean).join(', '),
      business.addressComplement,
      business.neighborhood,
      business.city,
    ].filter(Boolean).join(' - ')
    : '';
  const lat = business?.location?.latitude;
  const lng = business?.location?.longitude;
  const canDirections = (lat && lng) || fullAddress;

  const openDirections = () => {
    const dest = lat && lng ? `${lat},${lng}` : encodeURIComponent(fullAddress);
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`).catch(() => undefined);
  };
  const callBusiness = () => {
    if (business?.phone) {
      Linking.openURL(`tel:${String(business.phone).replace(/[^\d+]/g, '')}`).catch(() => undefined);
    }
  };

  const changed = !!(appt.previousDate || appt.previousTime);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isPackage ? 'Detalhes do pacote' : 'Detalhes do agendamento'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.businessRow}>
            <BusinessThumb businessId={appt.businessId} name={appt.businessName} style={styles.thumb} />
            <View style={styles.flex}>
              <Text style={styles.businessName}>{appt.businessName}</Text>
              <Text style={styles.service}>{appt.serviceName}</Text>
              {appt.professionalName ? <Text style={styles.muted}>com {appt.professionalName}</Text> : null}
            </View>
          </View>
          {!isPackage ? (
            <View style={[styles.statusPill, { backgroundColor: st.color }]}>
              <Icon name={st.icon} size={16} color={colors.white} />
              <Text style={styles.statusText}>{st.label}</Text>
            </View>
          ) : null}
        </View>

        {changed ? (
          <View style={styles.noticeCard}>
            <Icon name="update" size={20} color={colors.warning} />
            <Text style={styles.noticeText}>
              {`Horário alterado pelo estabelecimento: de ${appt.previousDate ? formatLocalDate(appt.previousDate) : formatLocalDate(appt.date)} às ${appt.previousTime || appt.time} para ${formatLocalDate(appt.date)} às ${appt.time}.`}
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{isPackage ? `Sessões (${sessions.length})` : 'Data e horário'}</Text>
          {sessions.map((s, i) => {
            const sst = STATUS[s.status] || STATUS.scheduled;
            const canCancel = isMine && isOpen(s.status) && s.date >= today;
            return (
              <View key={s.id} style={[styles.sessionRow, i > 0 && styles.sessionDivider]}>
                <Icon name="event" size={22} color={colors.primary} />
                <View style={styles.flex}>
                  <Text style={styles.sessionDate}>
                    {isPackage ? `Sessão ${i + 1}: ` : ''}{formatLocalDate(s.date)} às {s.time}
                  </Text>
                  <Text style={styles.muted}>{`${parseInt(String(s.duration), 10) || 60} min`}</Text>
                  {isPackage ? <Text style={[styles.sessionStatus, { color: sst.color }]}>{sst.label}</Text> : null}
                </View>
                {canCancel ? (
                  <TouchableOpacity onPress={() => handleCancel(s)} style={styles.linkButton}>
                    <Text style={styles.linkDanger}>Cancelar</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Valor</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.muted}>{isPackage ? 'Total do pacote' : 'Total'}</Text>
            <Text style={styles.total}>{brl(total)}</Text>
          </View>
          <Text style={styles.small}>Pagamento no estabelecimento.</Text>
        </View>

        {business ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Onde fica</Text>
            <View style={styles.addressRow}>
              <Icon name="location-on" size={20} color={colors.primary} />
              <Text style={styles.addressText}>{fullAddress || 'Endereço não informado'}</Text>
            </View>
            <View style={styles.actionsRow}>
              {canDirections ? (
                <TouchableOpacity style={styles.actionButton} onPress={openDirections}>
                  <Icon name="directions" size={18} color={colors.primary} />
                  <Text style={styles.actionText}>Como chegar</Text>
                </TouchableOpacity>
              ) : null}
              {business.phone ? (
                <TouchableOpacity style={styles.actionButton} onPress={callBusiness}>
                  <Icon name="phone" size={18} color={colors.primary} />
                  <Text style={styles.actionText}>Ligar</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {isMine && appt.status === 'completed' && !appt.reviewed ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Review', {
              businessId: appt.businessId,
              businessName: appt.businessName,
              serviceId: appt.serviceId || null,
              professionalId: appt.professionalId,
              professionalName: appt.professionalName,
              appointmentId: appt.id,
            })}
          >
            <Text style={styles.primaryButtonText}>Avaliar atendimento</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('BusinessDetails', { businessId: appt.businessId })}
        >
          <Text style={styles.secondaryButtonText}>Ver estabelecimento</Text>
        </TouchableOpacity>

        {isOpen(appt.status) ? (
          <Text style={styles.policy}>
            Cancelamentos com menos de 24 horas de antecedência podem ser cobrados pelo estabelecimento.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.lightGray },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  headerSpacer: { width: 24 },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  businessRow: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 56, height: 56, borderRadius: 10, marginRight: 12 },
  flex: { flex: 1 },
  businessName: { fontSize: 17, fontWeight: 'bold', color: colors.text },
  service: { fontSize: 15, color: colors.text, marginTop: 2 },
  muted: { fontSize: 13, color: colors.lightText, marginTop: 2 },
  small: { fontSize: 12, color: colors.lightText, marginTop: 6 },
  statusPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, marginTop: 12 },
  statusText: { color: colors.white, fontWeight: 'bold', fontSize: 13, marginLeft: 6 },
  noticeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.warning },
  noticeText: { flex: 1, fontSize: 14, color: colors.text, marginLeft: 10 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  sessionDivider: { borderTopWidth: 1, borderTopColor: colors.lightGray },
  sessionDate: { fontSize: 16, fontWeight: '600', color: colors.text, marginLeft: 0 },
  sessionStatus: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  linkButton: { paddingHorizontal: 8, paddingVertical: 6 },
  linkDanger: { color: colors.error, fontWeight: 'bold', fontSize: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start' },
  addressText: { flex: 1, fontSize: 14, color: colors.text, marginLeft: 8 },
  actionsRow: { flexDirection: 'row', marginTop: 12 },
  actionButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 10 },
  actionText: { color: colors.primary, fontWeight: '600', marginLeft: 6 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  primaryButtonText: { color: colors.white, fontWeight: 'bold', fontSize: 15 },
  secondaryButton: { borderWidth: 1, borderColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 10 },
  secondaryButtonText: { color: colors.primary, fontWeight: 'bold', fontSize: 15 },
  policy: { fontSize: 12, color: colors.lightText, textAlign: 'center', marginTop: 6 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginTop: 12, marginBottom: 16 },
});

export default AppointmentDetailsScreen;
