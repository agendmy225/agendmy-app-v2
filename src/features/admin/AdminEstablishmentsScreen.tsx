import React, { useState, useEffect, useCallback } from 'react';
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
  getAllBusinessesAdmin,
  updateBusiness,
  Business,
} from '../../services/businesses';

type NavProp = StackNavigationProp<AppStackParamList>;

const AdminEstablishmentsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { isAdmin } = useAuth();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await getAllBusinessesAdmin();
    setBusinesses(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleActive = (item: Business) => {
    const willDeactivate = item.active;
    const acao = willDeactivate ? 'desativar' : 'ativar';
    Alert.alert(
      'Confirmar',
      `Deseja ${acao} o estabelecimento "${item.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: willDeactivate ? 'Desativar' : 'Ativar',
          style: willDeactivate ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setTogglingId(item.id);
              await updateBusiness(item.id, { active: !item.active });
              // atualiza localmente sem recarregar tudo
              setBusinesses((prev) =>
                prev.map((b) =>
                  b.id === item.id ? { ...b, active: !item.active } : b
                )
              );
            } catch {
              Alert.alert('Erro', 'Nao foi possivel atualizar o estabelecimento.');
            } finally {
              setTogglingId(null);
            }
          },
        },
      ]
    );
  };

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

  const term = search.trim().toLowerCase();
  const filtered = term
    ? businesses.filter(
        (b) =>
          (b.name || '').toLowerCase().includes(term) ||
          (b.city || '').toLowerCase().includes(term)
      )
    : businesses;

  const totalAtivos = businesses.filter((b) => b.active).length;
  const totalInativos = businesses.length - totalAtivos;

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
        <Icon name="store" size={30} color={colors.white} />
        <Text style={styles.headerTitle}>Estabelecimentos</Text>
        <Text style={styles.headerSubtitle}>
          {businesses.length} no total - {totalAtivos} ativos, {totalInativos} inativos
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={colors.lightText} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nome ou cidade"
          placeholderTextColor={colors.placeholderText}
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
          <Text style={styles.loadingText}>Carregando estabelecimentos...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum estabelecimento encontrado.</Text>
          ) : (
            filtered.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {item.name || 'Sem nome'}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {[item.city, item.state].filter(Boolean).join(' - ') || 'Sem cidade'}
                    {item.rating ? `  -  ${Number(item.rating).toFixed(1)} estrelas` : ''}
                  </Text>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: item.active ? colors.success : colors.error },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: item.active ? colors.success : colors.error },
                      ]}
                    >
                      {item.active ? 'Ativo' : 'Inativo'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    { backgroundColor: item.active ? colors.error : colors.success },
                  ]}
                  onPress={() => handleToggleActive(item)}
                  disabled={togglingId === item.id}
                >
                  {togglingId === item.id ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.toggleButtonText}>
                      {item.active ? 'Desativar' : 'Ativar'}
                    </Text>
                  )}
                </TouchableOpacity>
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
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.lightText,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 92,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 13,
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

export default AdminEstablishmentsScreen;
