import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../constants/colors';
import { useAuth } from '../auth/context/AuthContext';
import {
  Service,
  createService,
  deleteService,
  getServicesByBusiness,
  updateService,
  toggleServiceStatus,
} from '../../services/services';
import { getProfessionalsByBusiness, Professional } from '../../services/professionals';
import { getDocs, collection, query, where, limit, firestore } from '../../config/firebase';

const ServiceManagementScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Estado para o modal de adição/edição de serviço
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [selectedProfessionals, setSelectedProfessionals] = useState<string[]>([]);
  const [numSessions, setNumSessions] = useState('1'); // Campo para número de sessões
  const [baseServiceId, setBaseServiceId] = useState(''); // ID do serviço base para pacotes
  const [isCreatingPackage, setIsCreatingPackage] = useState(false); // Se está criando pacote
  const [userModifiedName, setUserModifiedName] = useState(false); // Se usuário modificou o nome manualmente

  const loadBusinessData = useCallback(async () => {
    if (!user) return;
    try {
      const businessQuery = query(
        collection(firestore, 'businesses'),
        where('ownerId', '==', user.uid),
        limit(1),
      );
      const businessDoc = await getDocs(businessQuery);
      if (!businessDoc.empty) {
        const id = businessDoc.docs[0].id;
        setBusinessId(id);
        return id;
      }
      return null;
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os dados do estabelecimento.');
      return null;
    }
  }, [user]);

  const loadServicesAndProfessionals = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const [servicesData, professionalsData] = await Promise.all([
        getServicesByBusiness(id),
        getProfessionalsByBusiness(id),
      ]);
      setServices(servicesData);
      setFilteredServices(servicesData);
      setProfessionals(professionalsData);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  const initialize = useCallback(async () => {
    const id = await loadBusinessData();
    if (id) {
      await loadServicesAndProfessionals(id);
    }
  }, [loadBusinessData, loadServicesAndProfessionals]);

  const filterServices = useCallback(() => {
    let filtered = [...services];

    // Filtrar por status
    if (activeFilter === 'active') {
      filtered = filtered.filter(service => service.active);
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter(service => !service.active);
    }

    // Filtrar por texto de busca
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        service =>
          service.name.toLowerCase().includes(searchLower) ||
          service.description.toLowerCase().includes(searchLower) ||
          service.category.toLowerCase().includes(searchLower),
      );
    }

    setFilteredServices(filtered);
  }, [services, searchText, activeFilter]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    filterServices();
  }, [filterServices]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (businessId) {
      await loadServicesAndProfessionals(businessId);
    }
    setRefreshing(false);
  };

  const handleToggleServiceStatus = async (id: string, currentStatus: boolean) => {
    if (!businessId) return;
    try {
      await toggleServiceStatus(businessId, id, !currentStatus);
      const updatedServices = services.map(service =>
        service.id === id ? { ...service, active: !currentStatus } : service,
      );
      setServices(updatedServices);
      Alert.alert('Sucesso', `Serviço ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o status do serviço');
    }
  };

  const openAddServiceModal = () => {
    setEditingService(null);
    setServiceName('');
    setServiceDescription('');
    setServicePrice('');
    setServiceDuration('');
    setServiceCategory('');
    setSelectedProfessionals([]);
    setNumSessions('1'); // Reset para 1 sessão (serviço normal)
    setBaseServiceId(''); // Reset serviço base
    setIsCreatingPackage(false); // Reset modo pacote
    setUserModifiedName(false); // Reset flag de modificação
    setModalVisible(true);
  };

  const openEditServiceModal = (service: Service) => {
    setEditingService(service);
    setServiceName(service.name);
    setServiceDescription(service.description);
    setServicePrice(service.price.toString());
    setServiceDuration(service.duration);
    setServiceCategory(service.category);
    setSelectedProfessionals(service.professionalIds || []);
    setNumSessions(service.numSessions?.toString() || '1'); // Carregar número de sessões ou padrão 1
    setBaseServiceId(''); // Reset para edição
    setIsCreatingPackage(false); // Reset modo pacote
    setUserModifiedName(false); // Reset flag de modificação
    setModalVisible(true);
  };

  // Função para lidar com mudança no número de sessões
  const handleNumSessionsChange = (value: string) => {
    setNumSessions(value);
    const sessions = parseInt(value, 10);

    if (sessions > 1 && !editingService) {
      // Se for pacote e não estiver editando, habilitar modo criação de pacote
      setIsCreatingPackage(true);
      // Reset outros campos para forçar seleção de serviço base
      if (!baseServiceId) {
        setServiceName('');
        setServiceDescription('');
        setServicePrice('');
        setServiceDuration('');
        setServiceCategory('');
      }
    } else {
      setIsCreatingPackage(false);
      setBaseServiceId(''); // Reset serviço base se voltar para serviço simples
    }
  };

  const toggleProfessionalSelection = (professionalId: string) => {
    setSelectedProfessionals(prev =>
      prev.includes(professionalId)
        ? prev.filter(id => id !== professionalId)
        : [...prev, professionalId],
    );
  };
  // Função para selecionar serviço base para pacote
  const handleSelectBaseService = (serviceId: string) => {
    const baseService = services.find(s => s.id === serviceId);
    if (baseService) {
      setBaseServiceId(serviceId);
      // Não sobrescrever o nome se o usuário já modificou manualmente
      if (!userModifiedName) {
        setServiceName(`${numSessions || 1}x ${baseService.name || 'Serviço'}`);
      }
      setServiceDescription(baseService.description || '');
      setServiceDuration(baseService.duration || '');
      setServiceCategory(baseService.category || '');
      // Usar preço do serviço base como sugestão inicial em vez de vazio
      setServicePrice((baseService.price || 0).toString());
    }
  };  // Atualizar nome do pacote quando mudar número de sessões
  const updatePackageName = useCallback(() => {
    if (baseServiceId && parseInt(numSessions, 10) > 1 && !userModifiedName) {
      const baseService = services.find(s => s.id === baseServiceId);
      if (baseService) {
        setServiceName(`${numSessions || 1}x ${baseService.name || 'Serviço'}`);
      }
    }
  }, [baseServiceId, numSessions, services, userModifiedName]);

  // Efeito para atualizar nome do pacote quando número de sessões muda
  useEffect(() => {
    updatePackageName();
  }, [updatePackageName]);

  // Função para lidar com mudanças manuais no nome
  const handleServiceNameChange = (name: string) => {
    setServiceName(name);
    setUserModifiedName(true); // Marcar que usuário modificou o nome
  };
  const saveService = async () => {
    if (!businessId) {
      Alert.alert('Erro', 'ID do estabelecimento não encontrado.');
      return;
    }

    // Validação básica
    if (!serviceName || !servicePrice || !serviceDuration || !serviceCategory) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Validação específica para pacotes
    const sessions = parseInt(numSessions, 10);
    if (sessions > 1 && !editingService && !baseServiceId) {
      Alert.alert('Erro', 'Para criar um pacote, você deve:\n\n1. Definir o número de sessões (maior que 1)\n2. Selecionar um serviço base na lista exibida\n3. Definir o preço do pacote\n\nPor favor, selecione um serviço base primeiro.');
      return;
    }

    if (!user) {
      Alert.alert('Erro', 'Usuário não encontrado.');
      return;
    }

    try {
      const price = parseFloat(servicePrice);
      if (isNaN(price) || price <= 0) {
        Alert.alert('Erro', 'Por favor, informe um preço válido.');
        return;
      }

      console.log('🔧 Validações passaram, construindo serviceData...');
      console.log('📊 Dados do formulário:', {
        name: serviceName,
        description: serviceDescription,
        price,
        duration: serviceDuration,
        category: serviceCategory,
        numSessions,
        selectedProfessionals
      });

      const serviceData: any = {
        name: serviceName.trim(),
        description: serviceDescription.trim(),
        price,
        duration: serviceDuration.trim(),
        category: serviceCategory.trim(),
        professionalIds: selectedProfessionals.length > 0 ? selectedProfessionals : [],
        active: true, // Default para true em novos serviços
      };

      // Adicionar numSessions apenas se for maior que 1 (evita undefined no Firestore)
      const sessionsCount = parseInt(numSessions, 10);
      if (sessionsCount > 1) {
        serviceData.numSessions = sessionsCount;
      }

      console.log('📦 ServiceData final construído:', serviceData);

      if (editingService) {
        // Editar serviço existente
        console.log('✏️ Editando serviço existente:', editingService.id);
        await updateService(businessId, editingService.id, serviceData);

        // Atualizar localmente
        const updatedServices = services.map(service =>
          service.id === editingService.id ? { ...service, ...serviceData } : service,
        );
        setServices(updatedServices);
        Alert.alert('Sucesso', 'Serviço atualizado com sucesso!');
      } else {
        // Adicionar novo serviço (profissionais já incluídos no serviceData)
        console.log('🔄 Criando novo serviço com dados:', serviceData);
        console.log('📍 BusinessID:', businessId);

        const newServiceData = { ...serviceData, businessId };
        console.log('🏢 Dados completos para criação:', newServiceData);

        const newService = await createService(businessId, newServiceData);
        console.log('✅ Serviço criado com sucesso:', newService);

        // Adicionar localmente
        setServices([...services, newService]);
        Alert.alert('Sucesso', 'Serviço criado com sucesso!');
      }

      setModalVisible(false);
    } catch (error) {
      console.error('❌ Erro detalhado ao salvar serviço:', error);
      console.error('🔍 Tipo do erro:', typeof error);
      console.error('📊 Stack trace:', (error as Error)?.stack);
      console.error('💬 Mensagem do erro:', (error as Error)?.message);

      let errorMessage = 'Ocorreu um erro ao salvar o serviço. Tente novamente.';
      if (error instanceof Error) {
        errorMessage = `Erro: ${error.message}`;
      }

      Alert.alert('Erro', errorMessage);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!businessId) return;
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              // Excluir do Firestore
              await deleteService(businessId, id);

              // Atualizar localmente
              const updatedServices = services.filter(service => service.id !== id);
              setServices(updatedServices);
              Alert.alert('Sucesso', 'Serviço excluído com sucesso!');
            } catch {
              Alert.alert('Erro', 'Ocorreu um erro ao excluir o serviço. Tente novamente.');
            }
          },
        },
      ],
    );
  };

  const renderServiceItem = ({ item }: { item: Service }) => {
    if (!item || !item.id) {
      return (
        <View style={styles.serviceCard}>
          <Text style={styles.serviceName}>Erro: Serviço inválido</Text>
        </View>
      );
    }

    return (
      <View style={styles.serviceCard}>
        <View style={styles.serviceHeader}>
          <Text style={styles.serviceName}>{String(item.name || 'Sem nome')}</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.active ? colors.success : colors.lightText },
          ]}>
            <Text style={styles.statusText}>{item.active ? 'Ativo' : 'Inativo'}</Text>
          </View>
        </View>

        <Text style={styles.serviceDescription}>{String(item.description || 'Sem descrição')}</Text>

        <View style={styles.serviceDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Preço:</Text>
            <Text style={styles.detailValue}>R$ {(item.price || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Duração:</Text>
            <Text style={styles.detailValue}>{String(item.duration || 'Não informado')}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Categoria:</Text>
            <Text style={styles.detailValue}>{String(item.category || 'Sem categoria')}</Text>
          </View>

          {item.numSessions && item.numSessions > 1 && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Tipo:</Text>
              <Text style={[styles.detailValue, styles.packageText]}>
                Pacote ({item.numSessions} sessões)
              </Text>
            </View>
          )}
        </View>

        <View style={styles.professionalsContainer}>
          <Text style={styles.professionalsTitle}>Profissionais:</Text>
          <View style={styles.professionalChipListContainer}>
            {item.professionalIds && item.professionalIds.length > 0 ? (
              item.professionalIds.map(profId => {
                const professional = professionals.find(p => p.id === profId);
                return (
                  <View key={profId} style={styles.professionalChip}>
                    <Text style={styles.professionalChipText}>
                      {String(professional?.name || 'Profissional não encontrado')}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.noProfessionalsText}>Nenhum profissional atribuído</Text>
            )}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => openEditServiceModal(item)}
          >
            <Text style={styles.actionButtonText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, item.active ? styles.deactivateButton : styles.activateButton]}
            onPress={() => handleToggleServiceStatus(item.id, item.active)}
          >
            <Text style={styles.actionButtonText}>{item.active ? 'Desativar' : 'Ativar'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteService(item.id)}
          >
            <Text style={styles.actionButtonText}>Excluir</Text>
          </TouchableOpacity>
        </View>

      </View>
    );
  };

  if (loading || !services || !Array.isArray(services)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando serviços...</Text>
      </View>
    );
  }

  // Garantir que filteredServices seja sempre um array válido
  const safeFilteredServices = Array.isArray(filteredServices) ? filteredServices : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gerenciar Serviços</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome, descrição ou categoria"
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
        data={safeFilteredServices.filter(service => service && service.id)}
        renderItem={renderServiceItem}
        keyExtractor={(item) => String(item.id || `service-${Math.random()}`)}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum serviço encontrado</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={openAddServiceModal}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      {/* Modal para adicionar/editar serviço */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingService ? 'Editar Serviço' : 'Adicionar Novo Serviço'}
              </Text>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {/* Campo de Número de Sessões movido para o topo */}
              <Text style={styles.modalLabel}>Tipo de Serviço</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="1 para serviço simples, >1 para pacote"
                value={numSessions}
                onChangeText={handleNumSessionsChange}
                keyboardType="numeric"
                editable={!editingService} // Não pode editar se for serviço existente
              />

              {parseInt(numSessions, 10) > 1 && (
                <View style={styles.packageInfoContainer}>
                  <Text style={styles.packageInfoText}>
                    💡 Modo Pacote Ativado: Selecione um serviço base abaixo para criar um pacote de {numSessions} sessões
                  </Text>
                </View>
              )}

              {isCreatingPackage ? (
                <View style={styles.packageCreationContainer}>
                  <Text style={styles.modalLabel}>Selecione o Serviço Base para o Pacote</Text>
                  {baseServiceId === '' && (
                    <Text style={styles.warningText}>⚠️ Selecione um serviço base para continuar</Text>
                  )}
                  {services
                    .filter(s => !s.numSessions || s.numSessions <= 1)
                    .map(s => (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.serviceBaseItem,
                          baseServiceId === s.id && styles.serviceBaseItemSelected,
                        ]}
                        onPress={() => handleSelectBaseService(s.id)}
                      >
                        <Text style={[
                          styles.serviceBaseItemText,
                          baseServiceId === s.id && styles.serviceBaseItemTextSelected,
                        ]}>
                          {String(s.name || 'Sem nome')} - R$ {(s.price || 0).toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              ) : null}

              <Text style={styles.modalLabel}>Nome do Serviço</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex: Corte de Cabelo"
                value={serviceName}
                onChangeText={handleServiceNameChange}
              />

              <Text style={styles.modalLabel}>Descrição</Text>
              <TextInput
                style={[styles.modalInput, styles.multilineInput]}
                placeholder="Descreva o serviço..."
                value={serviceDescription}
                onChangeText={setServiceDescription}
                multiline
              />

              <Text style={styles.modalLabel}>Preço (R$)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex: 50.00"
                value={servicePrice}
                onChangeText={setServicePrice}
                keyboardType="numeric"
              />

              <Text style={styles.modalLabel}>Duração</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex: 30 min, 1h, 1h 30m"
                value={serviceDuration}
                onChangeText={setServiceDuration}
              />

              <Text style={styles.modalLabel}>Categoria</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex: Cabelo, Manicure, Estética"
                value={serviceCategory}
                onChangeText={setServiceCategory}
              />

              <Text style={styles.modalLabel}>Atribuir Profissionais</Text>
              <View style={styles.professionalsSelectionContainer}>
                {Array.isArray(professionals) && professionals.map(prof => prof && prof.id ? (
                  <TouchableOpacity
                    key={String(prof.id)}
                    style={[
                      styles.professionalChip,
                      selectedProfessionals.includes(prof.id) && styles.professionalChipSelected,
                    ]}
                    onPress={() => toggleProfessionalSelection(prof.id)}
                  >

                    <Text
                      style={[
                        styles.professionalChipText,
                        selectedProfessionals.includes(prof.id) && styles.professionalChipTextSelected,
                      ]}
                    >
                      {String(prof.name || 'Sem nome')}
                    </Text>
                  </TouchableOpacity>
                ) : null)}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveService}
              >
                <Text style={styles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
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
    paddingBottom: 80, // Espaço para o botão de adicionar
  },
  serviceCard: {
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
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  serviceDescription: {
    fontSize: 14,
    color: colors.lightText,
    marginBottom: 10,
  },
  serviceDetails: {
    marginBottom: 15,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  detailLabel: {
    width: 80,
    fontSize: 14,
    color: colors.lightText,
  }, detailValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  packageText: {
    color: colors.primary,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  addButtonText: {
    fontSize: 30,
    color: colors.white,
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
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  packageCreationContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
  },
  serviceBaseItem: {
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.gray,
  },
  serviceBaseItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  serviceBaseItemText: {
    fontSize: 16,
    color: colors.text,
  },
  professionalsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray,
  },
  professionalsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  noProfessionalsText: {
    fontSize: 14,
    color: colors.lightText,
    fontStyle: 'italic',
    marginLeft: 10,
  },
  professionalsSelectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  professionalChip: {
    backgroundColor: colors.lightGray,
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  professionalChipSelected: { // Added for selected state in modal
    backgroundColor: colors.primary,
    // Inherits other properties like borderRadius, padding, margin from professionalChip
    // Or define them explicitly if they need to be different for selected state
  },
  professionalChipText: {
    color: colors.text,
    fontSize: 13,
  },
  professionalChipTextSelected: { // Added for text in selected chip in modal
    color: colors.white,
    // fontSize will be inherited from professionalChipText or can be set explicitly
  },
  professionalChipListContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  }, saveButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginLeft: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.gray,
    marginRight: 5,
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.text,
    fontWeight: 'bold',
  },
  packageInfoContainer: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  packageInfoText: {
    fontSize: 14,
    color: '#1565C0',
    fontWeight: '500',
  },
  warningText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '500',
    marginBottom: 10,
    textAlign: 'center',
  },
  serviceBaseItemTextSelected: {
    color: colors.white,
    fontWeight: 'bold',
  },
});

export default ServiceManagementScreen;
