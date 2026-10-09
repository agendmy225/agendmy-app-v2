// src/features/announcements/AnnouncementsScreen.tsx
// Caixa de comunicados do AgendMy (clientes e donos).
// Cada aviso mostra as primeiras linhas; ao tocar, abre uma janela
// sobreposta com o texto completo.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';
import { useAnnouncements, UserAnnouncement } from '../../services/announcements';

const formatDateTime = (d: Date | null): string => {
  if (!d) {
    return '';
  }
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} as ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const PREVIEW_LINES = 3;

const AnnouncementsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { list, loaded, isUnread, markAllSeen } = useAnnouncements();
  // guarda quais eram novos no momento em que a tela abriu
  const [newIds, setNewIds] = useState<Set<string> | null>(null);
  const [selected, setSelected] = useState<UserAnnouncement | null>(null);

  useEffect(() => {
    if (loaded && newIds === null) {
      setNewIds(new Set(list.filter(isUnread).map((a: UserAnnouncement) => a.id)));
      markAllSeen();
    }
  }, [loaded, newIds, list, isUnread, markAllSeen]);

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
        <Text style={styles.headerSubtitle}>Novidades e avisos do AgendMy</Text>
      </View>

      {!loaded ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : list.length === 0 ? (
        <View style={styles.center}>
          <Icon name="notifications-none" size={56} color={colors.lightText} />
          <Text style={styles.emptyTitle}>Nenhum comunicado por enquanto</Text>
          <Text style={styles.emptyText}>Quando o AgendMy enviar novidades, elas aparecem aqui.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {list.map((a: UserAnnouncement) => {
            const isNew = !!newIds && newIds.has(a.id);
            return (
              <TouchableOpacity
                key={a.id}
                style={[styles.card, isNew && styles.cardNew]}
                onPress={() => setSelected(a)}
                activeOpacity={0.7}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{a.title}</Text>
                  {isNew && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>Novo</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardBody} numberOfLines={PREVIEW_LINES}>{a.body}</Text>
                <View style={styles.cardBottom}>
                  <Text style={styles.cardDate}>{formatDateTime(a.createdAt)}</Text>
                  <Text style={styles.readMore}>Toque para ler tudo</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* JANELA COM O TEXTO COMPLETO */}
      <Modal
        visible={selected !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.overlay}>
          {/* tocar fora da janela fecha */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSelected(null)}
          />
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Icon name="campaign" size={22} color={colors.primary} />
              <Text style={styles.modalTitle}>{selected?.title}</Text>
            </View>
            <Text style={styles.modalDate}>{formatDateTime(selected?.createdAt ?? null)}</Text>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.modalBody} selectable>{selected?.body}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelected(null)}>
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 24, backgroundColor: colors.primary, alignItems: 'center' },
  backIcon: { position: 'absolute', top: 24, left: 16, zIndex: 2 },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold', marginTop: 6 },
  headerSubtitle: { color: colors.offWhite, fontSize: 12, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginTop: 12 },
  emptyText: { fontSize: 13, color: colors.lightText, textAlign: 'center', marginTop: 6 },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardNew: { borderWidth: 1, borderColor: colors.brandRed },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: 'bold', color: colors.text, marginRight: 8 },
  newBadge: { backgroundColor: colors.brandRed, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  newBadgeText: { color: colors.white, fontSize: 11, fontWeight: 'bold' },
  cardBody: { fontSize: 14, color: colors.text, marginTop: 6, lineHeight: 20 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  cardDate: { fontSize: 11, color: colors.lightText },
  readMore: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: colors.text, marginLeft: 8 },
  modalDate: { fontSize: 12, color: colors.lightText, marginTop: 6 },
  modalScroll: { marginTop: 12 },
  modalScrollContent: { paddingBottom: 4 },
  modalBody: { fontSize: 15, color: colors.text, lineHeight: 22 },
  closeButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: { color: colors.white, fontWeight: '600', fontSize: 15 },
});

export default AnnouncementsScreen;
