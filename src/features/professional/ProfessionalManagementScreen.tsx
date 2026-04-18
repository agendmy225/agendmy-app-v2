import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Button,
  Image,
  RefreshControl,
} from 'react-native';
import { addDoc, collection, deleteDoc, doc, firestore, getDocs, limit, query, serverTimestamp, updateDoc, where, orderBy } from '../../config/firebase';
import { colors } from '../../constants/colors';
import { useAuth } from '../auth/context/AuthContext';
import { selectAndUploadImage, selectAndUploadVideo, showImagePickerDialog } from '../../services/imageUpload';

interface Professional {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  rating: number;
  image: string;
  active: boolean;
  instagram?: string;
  portfolioImages?: string[];
}

const ProfessionalManagementScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState<Professional[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Estado para o modal de adição/edição de profissional
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [professionalName, setProfessionalName] = useState('');
  const [professionalSpecialty, setProfessionalSpecialty] = useState('');
  const [professionalBio, setProfessionalBio] = useState('');
  const [professionalImage, setProfessionalImage] = useState('');
  const [professionalInstagram, setProfessionalInstagram] = useState('');
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [portfolioVideo, setPortfolioVideo] = useState<string>('');

  // Estado para controlar o upload de imagens
  const [isUploading, setIsUploading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBusinessId = useCallback(async () => {
    if (!user) return;
    try {
      const businessQuery = query(
        collection(firestore, 'businesses'),
        where('ownerId', '==', user.uid),
        limit(1)
      );
      const businessSnapshot = await getDocs(businessQuery);

      if (!businessSnapshot.empty) {
        setBusinessId(businessSnapshot.docs[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Erro ao buscar ID do negócio:", error);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBusinessId();
  }, [fetchBusinessId]);

  const fetchProfessionals = useCallback(async () => {
    if (!user || !businessId) return;

    try {
      setLoading(true);

      // Buscar profissionais
      const professionalsQuery = query(
        collection(firestore, 'professionals'),
        where('businessId', '==', businessId),
        orderBy('name')
      );
      const professionalsSnapshot = await getDocs(professionalsQuery);

      const professionalsList: Professional[] = professionalsSnapshot.docs.map((docSnapshot: any) => ({
        id: docSnapshot.id,
        ...(docSnapshot.data() as Omit<Professional, 'id'>),
      }));

      setProfessionals(professionalsList);
    } catch (error) {
      console.error("Erro ao buscar profissionais:", error);
      Alert.alert('Erro', 'Ocorreu um erro ao buscar os profissionais.');
    } finally {
      setLoading(false);
    }
  }, [user, businessId]);

  useEffect(() => {
    if (businessId) {
      fetchProfessionals();
    }
  }, [businessId, fetchProfessionals]);

  useEffect(() => {
    let filtered = professionals;

    if (activeFilter === 'active') {
      filtered = filtered.filter(p => p.active);
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter(p => !p.active);
    }

    if (searchText) {
      const lowercasedText = searchText.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(lowercasedText) ||
        p.specialty.toLowerCase().includes(lowercasedText)
      );
    }

    setFilteredProfessionals(filtered);
  }, [professionals, searchText, activeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfessionals().finally(() => setRefreshing(false));
  }, [fetchProfessionals]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
    }
  };

  const handleImageSelection = async (type: 'profile' | 'portfolio') => {
    const storagePath = `professional_images/${user?.uid}/${Date.now()}.jpg`;

    showImagePickerDialog(`Selecionar Imagem ${type === 'profile' ? 'de Perfil' : 'do Portfólio'}`, async () => {
      try {
        setIsUploading(true);
        const result = await selectAndUploadImage({ storageKey: storagePath });
        if (type === 'profile') {
          setProfessionalImage(result.downloadURL);
        } else {
          setPortfolioImages(prev => [...prev, result.downloadURL]);
        }
      } catch (error) {
        if (error instanceof Error && !error.message.includes('cancelada')) {
          Alert.alert('Erro', 'Falha no upload da imagem.');
        }
      } finally {
        setIsUploading(false);
      }
    });
  };

  const handleRemovePortfolioImage = (index: number) => {
    setPortfolioImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleVideoSelection = async () => {
    const storagePath = `professional_images/${user?.uid}/video_${Date.now()}.mp4`;
    try {
      setIsUploading(true);
      const result = await selectAndUploadVideo(storagePath);
      setPortfolioVideo(result.downloadURL);
      Alert.alert('Sucesso', 'Vídeo adicionado ao portfólio!');
    } catch (error) {
      if (error instanceof Error && !error.message.includes('cancelada') && !error.message.includes('longo')) {
        Alert.alert('Erro', 'Não foi possível fazer upload do vídeo.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveVideo = () => {
    Alert.alert(
      'Remover vídeo',
      'Tem certeza que deseja remover o vídeo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => setPortfolioVideo('') },
      ],
    );
  };

  const openAddModal = () => {
    setEditingProfessional(null);
    setProfessionalName('');
    setProfessionalSpecialty('');
    setProfessionalBio('');
    setProfessionalImage('');
    setProfessionalInstagram('');
    setPortfolioImages([]);
    setModalVisible(true);
  };

  const openEditModal = (professional: Professional) => {
    setEditingProfessional(professional);
    setProfessionalName(professional.name);
    setProfessionalSpecialty(professional.specialty);
    setProfessionalBio(professional.bio);
    setProfessionalImage(professional.image);
    setProfessionalInstagram(professional.instagram || '');
    setPortfolioImages(professional.portfolioImages || []);
    setModalVisible(true);
  };

  const saveProfessional = async () => {
    if (!professionalName || !professionalSpecialty) {
      Alert.alert('Erro de Validação', 'Nome e Especialidade são campos obrigatórios.');
      return;
    }
    if (!businessId) {
      Alert.alert('Erro Crítico', 'O estabelecimento não foi identificado. Não é possível salvar.');
      return;
    }

    setIsUploading(true);

    try {
      const professionalData = {
        businessId,
        name: professionalName,
        specialty: professionalSpecialty,
        bio: professionalBio,
        image: professionalImage || null,
        instagram: professionalInstagram || null,
        portfolioImages: portfolioImages || [],
        portfolioVideo: portfolioVideo || null,
        active: editingProfessional ? editingProfessional.active : true,
        rating: editingProfessional ? editingProfessional.rating : 0,
        updatedAt: serverTimestamp(),
      };

      if (editingProfessional) {
        const professionalRef = doc(firestore, 'professionals', editingProfessional.id);
        await updateDoc(professionalRef, professionalData);
        Alert.alert('Sucesso', 'Profissional atualizado com sucesso!');
      } else {
        await addDoc(collection(firestore, 'professionals'), {
          ...professionalData,
          createdAt: serverTimestamp(),
        });
        Alert.alert('Sucesso', 'Profissional adicionado com sucesso!');
      }
      setModalVisible(false);
      fetchProfessionals();
    } catch (error) {
      console.error("Erro ao salvar profissional:", error);
      Alert.alert('Erro', 'Não foi possível salvar o profissional.');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleProfessionalStatus = async (professional: Professional) => {
    try {
      const professionalRef = doc(firestore, 'professionals', professional.id);
      await updateDoc(professionalRef, { active: !professional.active });
      Alert.alert('Sucesso', `Profissional ${!professional.active ? 'ativado' : 'desativado'} com sucesso!`);
      fetchProfessionals();
    } catch (error) {
      console.error("Erro ao alterar status do profissional:", error);
      Alert.alert('Erro', 'Não foi possível alterar o status do profissional.');
    }
  };

  const deleteProfessional = async (id: string) => {
    if (!businessId) {
      Alert.alert('Erro', 'Estabelecimento não identificado.');
      return;
    }
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este profissional?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const professionalRef = doc(firestore, 'professionals', id);
              await deleteDoc(professionalRef);
              Alert.alert('Sucesso', 'Profissional excluído com sucesso!');
              fetchProfessionals();
            } catch (error) {
              console.error("Erro ao excluir profissional:", error);
              Alert.alert('Erro', 'Não foi possível excluir o profissional.');
            }
          },
        },
      ],
      { cancelable: false },
    );
  };

  const renderProfessionalItem = ({ item }: { item: Professional }) => (
    <View style={styles.professionalCard}>
      <View style={styles.professionalHeader}>
        <Image source={{ uri: item.image || 'https://via.placeholder.com/80' }} style={styles.professionalImage} />
        <View style={styles.professionalInfo}>
          <Text style={styles.professionalName}>{item.name}</Text>
          <Text style={styles.professionalSpecialty}>{item.specialty}</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            <Text style={[styles.statusBadge, { backgroundColor: item.active ? colors.success : colors.error }]}>
              {item.active ? 'Ativo' : 'Inativo'}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.professionalBio}>{item.bio}</Text>
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => openEditModal(item)}>
          <Text style={styles.actionButtonText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, item.active ? styles.deactivateButton : styles.activateButton]}
          onPress={() => toggleProfessionalStatus(item)}
        >
          <Text style={styles.actionButtonText}>{item.active ? 'Desativar' : 'Ativar'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => deleteProfessional(item.id)}>
          <Text style={styles.actionButtonText}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando profissionais...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gerenciar Profissionais</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome ou especialidade"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'all' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterText, activeFilter === 'all' && styles.activeFilterText]}>
              Todos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'active' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('active')}
          >
            <Text style={[styles.filterText, activeFilter === 'active' && styles.activeFilterText]}>
              Ativos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'inactive' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('inactive')}
          >
            <Text style={[styles.filterText, activeFilter === 'inactive' && styles.activeFilterText]}>
              Inativos
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <FlatList
        data={filteredProfessionals}
        renderItem={renderProfessionalItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhum profissional encontrado.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Text style={styles.addButtonText}>Adicionar Novo Profissional</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        <Text style={styles.logoutButtonText}>Sair da Conta</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingProfessional ? 'Editar Profissional' : 'Adicionar Novo Profissional'}</Text>

              <TextInput
                style={styles.input}
                placeholder="Nome do Profissional"
                value={professionalName}
                onChangeText={setProfessionalName}
              />

              <TextInput
                style={styles.input}
                placeholder="Especialidade (Ex: Cabeleireiro, Barbeiro)"
                value={professionalSpecialty}
                onChangeText={setProfessionalSpecialty}
              />

              <TextInput
                style={styles.input}
                placeholder="Descrição (fale sobre o profissional)"
                value={professionalBio}
                onChangeText={setProfessionalBio}
                multiline
              />

              <TextInput
                style={styles.input}
                placeholder="Instagram (opcional, ex: @seu_usuario)"
                value={professionalInstagram}
                onChangeText={setProfessionalInstagram}
              />

              <Button title="Selecionar Imagem de Perfil" onPress={() => handleImageSelection('profile')} disabled={isUploading} />
              {professionalImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: professionalImage }} style={styles.profileImagePreview} />
                </View>
              ) : null}

              <Button title="Adicionar Imagem ao Portfólio" onPress={() => handleImageSelection('portfolio')} disabled={isUploading} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portfolioScrollView}>
                {portfolioImages.map((uri, index) => (
                  <View key={index} style={styles.portfolioImageContainer}>
                    <Image source={{ uri }} style={styles.portfolioImage} />
                    <TouchableOpacity style={styles.removeImageButton} onPress={() => handleRemovePortfolioImage(index)}>
                      <Text style={styles.removeImageButtonText}>X</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              <Text style={styles.videoLabel}>Vídeo do Portfólio (máx. 20s)</Text>
              {portfolioVideo ? (
                <View style={styles.videoPreviewContainer}>
                  <Text style={styles.videoPreviewText}>▶ Vídeo carregado</Text>
                  <TouchableOpacity style={styles.removeVideoButton} onPress={handleRemoveVideo}>
                    <Text style={styles.removeVideoButtonText}>Remover vídeo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Button
                  title="Adicionar Vídeo (máx. 20s)"
                  onPress={handleVideoSelection}
                  disabled={isUploading}
                />
              )}

              

              <TouchableOpacity style={[styles.saveButton, isUploading && styles.disabledButton]} onPress={saveProfessional} disabled={isUploading}>
                {isUploading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveButtonText}>Salvar</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)} disabled={isUploading}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
  },
  header: {
    padding: 20,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  searchContainer: {
    padding: 15,
    backgroundColor: colors.white,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: colors.text,
  },
  filtersContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: colors.background,
  },
  activeFilterButton: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: colors.text,
  },
  activeFilterText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 80,
  },
  professionalCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  professionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  professionalImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  professionalSpecialty: {
    fontSize: 14,
    color: colors.lightText,
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingIcon: {
    fontSize: 14,
    marginRight: 4,
    color: '#FFD700',
  },
  ratingText: {
    fontSize: 14,
    color: colors.text,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  professionalBio: {
    fontSize: 14,
    color: colors.text,
    marginVertical: 10,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  activateButton: {
    backgroundColor: colors.success,
  },
  deactivateButton: {
    backgroundColor: colors.warning,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.lightText,
  },
  addButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    margin: 20,
    alignItems: 'center',
  },
  addButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: colors.error,
    padding: 15,
    borderRadius: 8,
    margin: 20,
    marginTop: 0,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 20,
    elevation: 10,
  },
  modalContent: {
    // O ScrollView interno cuidará da rolagem
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  profileImagePreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  portfolioScrollView: {
    marginVertical: 10,
  },
  portfolioImageContainer: {
    marginRight: 10,
    position: 'relative',
  },
  portfolioImage: {
    width: 100,
    height: 100,
    borderRadius: 5,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  removeImageButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: colors.lightGray,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: colors.text,
  },
  disabledButton: {
    backgroundColor: colors.lightGray,
  },
});

export default ProfessionalManagementScreen;
