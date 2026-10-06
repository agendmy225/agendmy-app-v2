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
  Modal,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';
import { AppStackParamList } from '../../types/types';
import { useAuth } from '../auth/context/AuthContext';
import {
  Category,
  useCategories,
  isUsingFirestoreCategories,
  saveCategory,
  setCategoryActive,
  moveCategory,
} from '../../services/categories';
import { getAllBusinessesAdmin, Business } from '../../services/businesses';

type NavProp = StackNavigationProp<AppStackParamList>;

// Icones disponiveis para escolher (MaterialIcons)
const ICON_OPTIONS = [
  'content-cut', 'storefront', 'spa', 'pets', 'brush', 'fitness-center',
  'healing', 'accessibility', 'colorize', 'face', 'child-care', 'school',
  'music-note', 'photo-camera', 'directions-car', 'local-car-wash',
  'local-laundry-service', 'restaurant', 'build', 'local-hospital',
  'local-florist', 'local-mall', 'hotel', 'work', 'event', 'favorite',
  'star', 'category',
];

const AdminCategoriesScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { isAdmin } = useAuth();
  const categories = useCategories(true);

  const [businessCount, setBusinessCount] = useState<Map<string, number>>(new Map());
  const [busyId, setBusyId] = useState<string | null>(null);

  // modal de criar/editar
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('category');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAllBusinessesAdmin().then((list: Business[]) => {
      const map = new Map<string, number>();
      list.forEach((b: Business) => {
        if (b.category) {
          map.set(b.category, (map.get(b.category) || 0) + 1);
        }
      });
      setBusinessCount(map);
    });
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

  const activeCount = categories.filter((c) => c.active).length;
  const usingDb = isUsingFirestoreCategories();

  const openCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormIcon('category');
    setModalVisible(true);
  };

  const openEdit = (c: Category) => {
    setEditingId(c.id);
    setFormName(c.name);
    setFormIcon(c.icon);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert('Atencao', 'Informe o nome da categoria.');
      return;
    }
    try {
      setSaving(true);
      await saveCategory({ id: editingId || undefined, name: formName, icon: formIcon });
      setModalVisible(false);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel salvar a categoria.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (c: Category) => {
    const count = businessCount.get(c.id) || 0;
    if (c.active && count > 0) {
      Alert.alert(
        'Desativar categoria',
        `"${c.name}" tem ${count} estabelecimento(s). Eles continuam com essa categoria, mas ela some dos filtros e do cadastro. Deseja desativar?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Desativar', style: 'destructive', onPress: () => applyToggle(c) },
        ]
      );
      return;
    }
    applyToggle(c);
  };

  const applyToggle = async (c: Category) => {
    try {
      setBusyId(c.id);
      await setCategoryActive(c.id, !c.active);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel alterar a categoria.');
    } finally {
      setBusyId(null);
    }
  };

  const handleMove = async (c: Category, direction: 'up' | 'down') => {
    try {
      setBusyId(c.id);
      await moveCategory(c.id, direction);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel mudar a ordem.');
    } finally {
      setBusyId(null);
    }
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
        <Icon name="category" size={30} color={colors.white} />
        <Text style={styles.headerTitle}>Categorias</Text>
        <Text style={styles.headerSubtitle}>
          {activeCount} ativas de {categories.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!usingDb && (
          <View style={styles.infoBox}>
            <Icon name="info-outline" size={18} color={colors.warning} />
            <Text style={styles.infoText}>
              As categorias ainda sao as padrao do app. Na primeira alteracao, elas serao
              copiadas para o banco automaticamente e passam a ser controladas por aqui.
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.newButton} onPress={openCreate}>
          <Icon name="add" size={20} color={colors.white} />
          <Text style={styles.newButtonText}>Nova categoria</Text>
        </TouchableOpacity>

        {categories.map((c, index) => {
          const busy = busyId === c.id;
          const count = businessCount.get(c.id) || 0;
          return (
            <View key={c.id} style={[styles.card, !c.active && styles.cardInactive]}>
              <View style={styles.iconCircle}>
                <Icon name={c.icon} size={22} color={colors.primary} />
              </View>

              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>{c.name}</Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {count} estabelecimento(s) - codigo: {c.id}
                </Text>
                <Text style={[styles.cardStatus, { color: c.active ? colors.success : colors.lightText }]}>
                  {c.active ? 'Ativa' : 'Desativada'}
                </Text>
              </View>

              {busy ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <View style={styles.actions}>
                  <View style={styles.orderButtons}>
                    <TouchableOpacity
                      onPress={() => handleMove(c, 'up')}
                      disabled={index === 0}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Icon name="keyboard-arrow-up" size={24} color={index === 0 ? colors.lightGray : colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleMove(c, 'down')}
                      disabled={index === categories.length - 1}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Icon
                        name="keyboard-arrow-down"
                        size={24}
                        color={index === categories.length - 1 ? colors.lightGray : colors.text}
                      />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => openEdit(c)} style={styles.editButton}>
                    <Icon name="edit" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <Switch
                    value={c.active}
                    onValueChange={() => handleToggle(c)}
                    trackColor={{ false: colors.gray, true: colors.success }}
                    thumbColor={colors.white}
                  />
                </View>
              )}
            </View>
          );
        })}

        <Text style={styles.footerNote}>
          Categorias desativadas somem dos filtros e do cadastro de negocios, mas os
          estabelecimentos que ja usam continuam com ela. As mudancas aparecem nos celulares na hora.
        </Text>
      </ScrollView>

      {/* MODAL CRIAR / EDITAR */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editingId ? 'Editar categoria' : 'Nova categoria'}</Text>

            <Text style={styles.inputLabel}>Nome</Text>
            <TextInput
              style={styles.input}
              value={formName}
              onChangeText={setFormName}
              placeholder="Ex: Sobrancelhas"
              placeholderTextColor={colors.placeholderText}
              maxLength={40}
            />

            <Text style={styles.inputLabel}>Icone</Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[styles.iconOption, formIcon === name && styles.iconOptionActive]}
                  onPress={() => setFormIcon(name)}
                >
                  <Icon name={name} size={22} color={formIcon === name ? colors.white : colors.primary} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.preview}>
              <View style={styles.iconCircle}>
                <Icon name={formIcon} size={22} color={colors.primary} />
              </View>
              <Text style={styles.previewText}>{formName.trim() || 'Pre-visualizacao'}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSave]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalSaveText}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  content: { padding: 16, paddingBottom: 32 },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  infoText: { flex: 1, fontSize: 12, color: colors.text, marginLeft: 8 },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 14,
  },
  newButtonText: { color: colors.white, fontWeight: '600', fontSize: 15, marginLeft: 6 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardInactive: { opacity: 0.6 },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1, marginRight: 8 },
  cardName: { fontSize: 15, fontWeight: '600', color: colors.text },
  cardMeta: { fontSize: 11, color: colors.lightText, marginTop: 2 },
  cardStatus: { fontSize: 12, fontWeight: '600', marginTop: 3 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  orderButtons: { alignItems: 'center', marginRight: 4 },
  editButton: { padding: 6, marginRight: 4 },
  footerNote: { fontSize: 12, color: colors.lightText, textAlign: 'center', marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 8, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  iconOption: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  iconOptionActive: { backgroundColor: colors.primary },
  preview: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  previewText: { fontSize: 15, fontWeight: '600', color: colors.text },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginLeft: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  modalCancel: { backgroundColor: colors.card },
  modalCancelText: { color: colors.text, fontWeight: '600' },
  modalSave: { backgroundColor: colors.primary },
  modalSaveText: { color: colors.white, fontWeight: '600' },
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

export default AdminCategoriesScreen;
