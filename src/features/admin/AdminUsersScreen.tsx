import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';
import { AppStackParamList } from '../../types/types';
import { useAuth } from '../auth/context/AuthContext';
import { getAllUsersAdmin, AdminUser } from '../../services/adminUsers';

type NavProp = StackNavigationProp<AppStackParamList>;
type FilterType = 'all' | 'client' | 'owner';

const formatDate = (d: Date | null): string => {
  if (!d) {
    return 'Data desconhecida';
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const typeLabel = (t: AdminUser['userType']): string => {
  if (t === 'owner') { return 'Proprietario'; }
  if (t === 'client') { return 'Cliente'; }
  return 'Sem tipo';
};

const AdminUsersScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { isAdmin } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const list = await getAllUsersAdmin();
    setUsers(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!isAdmin) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.center}>
        <Icon name="lock" size={64} color={colors.lightText} />
        <Text style={styles.deniedTitle}>Acesso restrito</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const totalClients = users.filter((u) => u.userType === 'client').length;
  const totalOwners = users.filter((u) => u.userType === 'owner').length;

  const term = search.trim().toLowerCase();
  const filtered = users.filter((u) => {
    if (filter !== 'all' && u.userType !== filter) {
      return false;
    }
    if (!term) {
      return true;
    }
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  });

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: users.length },
    { key: 'client', label: 'Clientes', count: totalClients },
    { key: 'owner', label: 'Proprietarios', count: totalOwners },
  ];

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
        <Icon name="people" size={30} color={colors.white} />
        <Text style={styles.headerTitle}>Usuarios</Text>
        <Text style={styles.headerSubtitle}>
          {users.length} no total - {totalClients} clientes, {totalOwners} proprietarios
        </Text>
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label} ({f.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={colors.lightText} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nome ou e-mail"
          placeholderTextColor={colors.placeholderText}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="close" size={20} color={colors.lightText} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando usuarios...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum usuario encontrado.</Text>
          ) : (
            filtered.map((u) => (
              <View key={u.uid} style={styles.card}>
                <View style={styles.avatar}>
                  <Icon
                    name={u.userType === 'owner' ? 'store' : 'person'}
                    size={22}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {u.name || 'Sem nome'}
                    </Text>
                    {u.role === 'admin' && (
                      <View style={styles.adminBadge}>
                        <Text style={styles.adminBadgeText}>ADMIN</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {u.email || 'Sem e-mail'}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {typeLabel(u.userType)} - desde {formatDate(u.createdAt)}
                  </Text>
                  {u.userType === 'owner' && (
                    <Text
                      style={[
                        styles.businessStatus,
                        { color: u.businessId ? colors.success : colors.warning },
                      ]}
                    >
                      {u.businessId ? 'Negocio cadastrado' : 'Ainda sem negocio'}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    padding: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  backIcon: {
    position: 'absolute',
    top: 24,
    left: 16,
    zIndex: 2,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 6,
  },
  headerSubtitle: {
    color: colors.offWhite,
    fontSize: 12,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.card,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    color: colors.text,
  },
  filterTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    margin: 16,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    color: colors.text,
    fontSize: 15,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  adminBadge: {
    backgroundColor: colors.brandRed,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  adminBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardMeta: {
    fontSize: 12,
    color: colors.lightText,
    marginTop: 2,
  },
  businessStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  loadingText: {
    marginTop: 12,
    color: colors.lightText,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.lightText,
    marginTop: 40,
    fontSize: 14,
  },
  deniedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
});

export default AdminUsersScreen;
