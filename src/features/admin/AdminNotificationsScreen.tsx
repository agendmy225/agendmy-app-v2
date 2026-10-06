import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';
import { AppStackParamList } from '../../types/types';
import { useAuth } from '../auth/context/AuthContext';
import {
  Announcement,
  Audience,
  sendAnnouncement,
  subscribeAnnouncements,
  countRegisteredDevices,
} from '../../services/adminAnnouncements';

type NavProp = StackNavigationProp<AppStackParamList>;

const TITLE_MAX = 50;
const BODY_MAX = 200;
const STUCK_MS = 3 * 60 * 1000;

const AUDIENCES: { key: Audience; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'client', label: 'Clientes' },
  { key: 'owner', label: 'Donos' },
];

const audienceLabel = (a: Audience): string =>
  a === 'client' ? 'Clientes' : a === 'owner' ? 'Donos' : 'Todos';

const formatDateTime = (d: Date | null): string => {
  if (!d) {
    return 'agora';
  }
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const statusInfo = (a: Announcement): { label: string; color: string } => {
  if (a.status === 'sent') {
    const ok = a.successCount ?? 0;
    const total = a.tokens ?? 0;
    return { label: `Enviado: ${ok} de ${total} aparelho(s)`, color: colors.success };
  }
  if (a.status === 'error') {
    return { label: `Erro: ${a.errorMessage || 'desconhecido'}`, color: colors.error };
  }
  if (a.status === 'sending') {
    return { label: 'Enviando...', color: colors.warning };
  }
  const stuck = a.createdAt ? Date.now() - a.createdAt.getTime() > STUCK_MS : false;
  return stuck
    ? { label: 'Na fila ha muito tempo: a funcao de envio foi publicada?', color: colors.error }
    : { label: 'Na fila', color: colors.warning };
};

const AdminNotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { isAdmin, user } = useAuth();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Announcement[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [devices, setDevices] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAnnouncements((list: Announcement[]) => {
      setHistory(list);
      setHistoryLoaded(true);
    });
    countRegisteredDevices().then(setDevices);
    return () => {
      unsubscribe();
    };
  }, []);

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

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !sending;

  const handleSend = () => {
    if (!canSend) {
      return;
    }
    Alert.alert(
      'Enviar comunicado',
      `Enviar "${title.trim()}" para: ${audienceLabel(audience)}?\n\nIsso dispara uma notificacao no celular das pessoas e nao pode ser desfeito.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            try {
              setSending(true);
              await sendAnnouncement(title, body, audience, user?.uid || '');
              setTitle('');
              setBody('');
              setAudience('all');
            } catch {
              Alert.alert('Erro', 'Nao foi possivel colocar o comunicado na fila.');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

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
        <Icon name="campaign" size={30} color={colors.white} />
        <Text style={styles.headerTitle}>Comunicados</Text>
        <Text style={styles.headerSubtitle}>
          {devices === null ? 'Contando aparelhos...' : `${devices} aparelho(s) com notificacao registrada`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* FORMULARIO */}
        <Text style={styles.sectionTitle}>Novo comunicado</Text>
        <View style={styles.box}>
          <Text style={styles.inputLabel}>Titulo</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Novidade no AgendMy"
            placeholderTextColor={colors.placeholderText}
            maxLength={TITLE_MAX}
          />
          <Text style={styles.counter}>{title.length}/{TITLE_MAX}</Text>

          <Text style={styles.inputLabel}>Mensagem</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={body}
            onChangeText={setBody}
            placeholder="Escreva a mensagem que vai aparecer na notificacao"
            placeholderTextColor={colors.placeholderText}
            maxLength={BODY_MAX}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.counter}>{body.length}/{BODY_MAX}</Text>

          <Text style={styles.inputLabel}>Para quem</Text>
          <View style={styles.chipRow}>
            {AUDIENCES.map((a) => (
              <TouchableOpacity
                key={a.key}
                style={[styles.chip, audience === a.key && styles.chipActive]}
                onPress={() => setAudience(a.key)}
              >
                <Text style={[styles.chipText, audience === a.key && styles.chipTextActive]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {(title.trim() || body.trim()) ? (
            <View style={styles.preview}>
              <Icon name="notifications" size={18} color={colors.primary} />
              <View style={styles.previewTextBox}>
                <Text style={styles.previewTitle} numberOfLines={1}>{title.trim() || 'Titulo'}</Text>
                <Text style={styles.previewBody} numberOfLines={3}>{body.trim() || 'Mensagem'}</Text>
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!canSend}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Icon name="send" size={18} color={colors.white} />
                <Text style={styles.sendButtonText}>Enviar comunicado</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* HISTORICO */}
        <Text style={styles.sectionTitle}>Historico</Text>
        {!historyLoaded ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : history.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum comunicado enviado ainda.</Text>
        ) : (
          history.map((a) => {
            const st = statusInfo(a);
            return (
              <View key={a.id} style={styles.historyCard}>
                <View style={styles.historyTop}>
                  <Text style={styles.historyTitle} numberOfLines={1}>{a.title}</Text>
                  <Text style={styles.historyAudience}>{audienceLabel(a.audience)}</Text>
                </View>
                <Text style={styles.historyBody} numberOfLines={3}>{a.body}</Text>
                <Text style={styles.historyMeta}>{formatDateTime(a.createdAt)}</Text>
                <Text style={[styles.historyStatus, { color: st.color }]}>{st.label}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { padding: 24, backgroundColor: colors.primary, alignItems: 'center' },
  backIcon: { position: 'absolute', top: 24, left: 16, zIndex: 2 },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold', marginTop: 6 },
  headerSubtitle: { color: colors.offWhite, fontSize: 12, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: colors.text, marginTop: 8, marginBottom: 8 },
  box: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 6, marginBottom: 6 },
  input: {
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  textArea: { minHeight: 90 },
  counter: { fontSize: 11, color: colors.lightText, textAlign: 'right', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.white,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: colors.white, fontWeight: '600' },
  preview: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  previewTextBox: { flex: 1, marginLeft: 8 },
  previewTitle: { fontSize: 14, fontWeight: 'bold', color: colors.text },
  previewBody: { fontSize: 13, color: colors.text, marginTop: 2 },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 14,
    minHeight: 46,
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonText: { color: colors.white, fontWeight: '600', fontSize: 15, marginLeft: 6 },
  emptyText: { fontSize: 13, color: colors.lightText, textAlign: 'center', marginTop: 8 },
  historyCard: { backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 10 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text, marginRight: 8 },
  historyAudience: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  historyBody: { fontSize: 13, color: colors.text, marginTop: 4 },
  historyMeta: { fontSize: 11, color: colors.lightText, marginTop: 6 },
  historyStatus: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  deniedTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginTop: 16 },
  primaryButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: { color: colors.white, fontWeight: '600', fontSize: 15 },
});

export default AdminNotificationsScreen;
