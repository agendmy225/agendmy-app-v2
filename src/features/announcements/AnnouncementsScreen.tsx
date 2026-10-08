// src/features/announcements/AnnouncementsScreen.tsx
// Caixa de comunicados do AgendMy (clientes e donos).
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

const AnnouncementsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { list, loaded, isUnread, markAllSeen } = useAnnouncements();
  // guarda quais eram novos no momento em que a tela abriu
  const [newIds, setNewIds] = useState<Set<string> | null>(null);

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
              <View key={a.id} style={[styles.card, isNew && styles.cardNew]}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{a.title}</Text>
                  {isNew && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>Novo</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardBody}>{a.body}</Text>
                <Text style={styles.cardDate}>{formatDateTime(a.createdAt)}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
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
  cardDate: { fontSize: 11, color: colors.lightText, marginTop: 8 },
});

export default AnnouncementsScreen;
