import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Share, // Import Share API
  Alert, // Import Alert
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../auth/context/AuthContext';
import { colors } from '../../constants/colors';
import { firestore, collection, doc, getDoc, getDocs, query, where, limit } from '../../config/firebase';
import { getAppointmentStats } from '../../services/appointments';
import { AppStackParamList } from '../../types/types';
import Icon from 'react-native-vector-icons/MaterialIcons'; // Importar Icon
import CreateBusinessCard from '../business/components/CreateBusinessCard';
import { getProfessionalsByBusiness, Professional } from '../../services/professionals';

type DashboardScreenNavigationProp = StackNavigationProp<AppStackParamList, 'DashboardScreen'>;

const DashboardScreen: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
    canceledAppointments: 0,
    todayAppointments: 0,
    todayRevenue: 0, // Add todayRevenue to stats
    totalRevenue: 0,
    totalProfessionals: 0,
    totalServices: 0,
    averageRating: 0,
  });

  const fetchBusinessId = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Check if user has businessId in their profile first
    if (user.businessId) {
      setBusinessId(user.businessId);
      return;
    }

    try {
      // Buscar o ID do estabelecimento do proprietário atual
      const businessQuery = query(
        collection(firestore, 'businesses'),
        where('ownerId', '==', user.uid),
        limit(1)
      );
      const businessSnapshot = await getDocs(businessQuery);

      if (!businessSnapshot.empty) {
        const businessDoc = businessSnapshot.docs[0];
        setBusinessId(businessDoc.id);
      } else {
        // Se não encontrar um estabelecimento, não tem negócio

        setBusinessId(null);
        setLoading(false);
      }
    } catch {

      setBusinessId(null);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBusinessId();
  }, [fetchBusinessId]); const loadDashboardData = useCallback(async () => {
    if (!user || !businessId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null); // Reset error state

      // Buscar estatísticas usando nosso serviço real
      const [todayStats, monthStats] = await Promise.all([
        getAppointmentStats(businessId, 'today'),
        getAppointmentStats(businessId, 'month'),
      ]);

      // Buscar profissionais ativos - usar subcoleção
      const professionalsQuery = query(
        collection(firestore, 'businesses', businessId, 'professionals'),
        where('active', '==', true)
      );
      const professionalsSnapshot = await getDocs(professionalsQuery);

      // Buscar serviços ativos - usar subcoleção
      const servicesQuery = query(
        collection(firestore, 'businesses', businessId, 'services'),
        where('active', '==', true)
      );
      const servicesSnapshot = await getDocs(servicesQuery);

      // Buscar dados do estabelecimento para rating
      const businessDocRef = doc(firestore, 'businesses', businessId);
      const businessDoc = await getDoc(businessDocRef);

      const businessData = businessDoc.data();

      setStats({
        totalAppointments: monthStats.total,
        pendingAppointments: monthStats.confirmed, // Assuming 'confirmed' is used for 'pending completion'
        completedAppointments: monthStats.completed,
        canceledAppointments: monthStats.cancelled,
        todayAppointments: todayStats.total,
        todayRevenue: todayStats.revenue, // Add todayRevenue to stats
        totalRevenue: monthStats.revenue,
        totalProfessionals: professionalsSnapshot.size,
        totalServices: servicesSnapshot.size,
        averageRating: businessData?.rating || 0,
      });
    } catch {
      setError('Erro ao carregar dados do dashboard. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [user, businessId]); const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null); // Reset error state
    if (businessId) {
      await loadDashboardData();
    }
    setRefreshing(false);
  }, [businessId, loadDashboardData]);

  // Effect to load dashboard data when businessId is available
  useEffect(() => {
    if (businessId && user) {
      loadDashboardData();
    }
  }, [businessId, user, loadDashboardData]); if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando dashboard...</Text>
      </View>
    );
  }

  // If there's an error, show error message
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Bem-vindo, {user?.displayName || 'Proprietário'}
          </Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // If user doesn't have a business, show create business card
  if (!businessId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Bem-vindo, {user?.displayName || 'Proprietário'}
          </Text>
        </View>
        <CreateBusinessCard onBusinessCreated={() => {
          if (refreshUser) {
            refreshUser(); // Refresh user data to get new businessId
          }
          // After business creation, refetch businessId and then data
          fetchBusinessId().then(() => {
            if (businessId) { // Check if businessId was fetched
              loadDashboardData();
            }
          });
        }} />
      </View>
    );
  }

  const handleShareBusinessLink = async () => {
    if (!businessId) {
      Alert.alert('Erro', 'ID do estabelecimento não encontrado.');
      return;
    }
    try {
      const url = `https://agendmy.app/business/${businessId}`; // Replace with your actual domain
      await Share.share({
        message: `Confira nossa página: ${url}`,
        url: url,
        title: 'Compartilhar Estabelecimento',
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar o link.');
    }
  };

  const handleShareProfessionalProfile = async () => {
    if (!businessId) {
      Alert.alert('Erro', 'ID do estabelecimento não encontrado.');
      return;
    }

    try {
      // Buscar profissionais do estabelecimento
      const professionalsData = await getProfessionalsByBusiness(businessId);

      if (professionalsData.length === 0) {
        Alert.alert(
          'Nenhum Profissional',
          'Não há profissionais cadastrados para compartilhar. Cadastre um profissional primeiro.'
        );
        return;
      }

      // Se há apenas um profissional, compartilha diretamente
      if (professionalsData.length === 1) {
        await shareProfessionalProfile(professionalsData[0]);
        return;
      }

      // Se há vários profissionais, mostra modal de seleção
      setProfessionals(professionalsData);
      setShowProfessionalModal(true);

    } catch (fetchError) {
      console.error('Erro ao buscar profissionais:', fetchError);
      Alert.alert('Erro', 'Não foi possível buscar os profissionais.');
    }
  };

  const shareProfessionalProfile = async (professional: Professional) => {
    try {
      const profileUrl = `https://agendmy.app/professional/${professional.id}`;
      const appDownloadUrl = 'https://agendmy.app/download'; // Link para download do app

      const message = `ðŸŽ¯ Conheça ${professional.name} - ${professional.specialty}

ðŸ“‹ Especialista em ${professional.specialty}
ࢭ Avaliação: ${professional.rating ? professional.rating.toFixed(1) : 'N/A'}/5

ðŸ‘‡ Veja o perfil completo e agende seu horário:
${profileUrl}

ðŸ“± Baixe nosso app para uma experiência completa:
${appDownloadUrl}

#Agendmy #${professional.specialty.replace(/\s+/g, '')}`;

      await Share.share({
        message,
        url: profileUrl,
        title: `Perfil de ${professional.name}`,
      });

      // Fechar modal se estiver aberto
      setShowProfessionalModal(false);
    } catch (shareError) {
      console.error('Erro ao compartilhar perfil:', shareError);
      Alert.alert('Erro', 'Não foi possível compartilhar o perfil do profissional.');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          Bem-vindo, {user?.displayName || 'Proprietário'}
        </Text>
      </View>

      {/* Resumo de Hoje */}
      <View style={styles.todaySummary}>
        <Text style={styles.sectionTitle}>Resumo de Hoje</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.todayAppointments}</Text>
            <Text style={styles.statLabel}>Agendamentos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              R$ {(stats.todayRevenue || 0).toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Receita Estimada</Text>
          </View>
        </View>
      </View>

      {/* Estatísticas Gerais */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estatísticas Gerais</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalAppointments}</Text>
            <Text style={styles.statLabel}>Total de Agendamentos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.pendingAppointments}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.completedAppointments}</Text>
            <Text style={styles.statLabel}>Concluídos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.canceledAppointments}</Text>
            <Text style={styles.statLabel}>Cancelados</Text>
          </View>
        </View>
      </View>

      {/* Receita */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Receita</Text>
        <View style={styles.revenueCard}>
          <Text style={styles.revenueValue}>
            R$ {stats.totalRevenue.toFixed(2)}
          </Text>
          <Text style={styles.revenueLabel}>Receita Total</Text>
        </View>
      </View>

      {/* Avaliações */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Avaliações</Text>
        <View style={styles.ratingCard}>
          <Text style={styles.ratingValue}>{stats.averageRating.toFixed(1)}</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Text key={star} style={styles.starIcon}>
                {star <= Math.round(stats.averageRating) ? 'â˜…' : 'â˜†'}
              </Text>
            ))}
          </View>
          <Text style={styles.ratingLabel}>Avaliação Média</Text>
        </View>
      </View>

      {/* Ações Rápidas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AppointmentManagement')}
          >
            <Icon name="event" size={24} color={colors.primary} style={styles.actionIcon} />
            <Text style={styles.actionText}>Gerenciar Agendamentos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ProfessionalAppointmentsScreen')}
          >
            <Icon name="person" size={24} color={colors.primary} style={styles.actionIcon} />
            <Text style={styles.actionText}>Agendamentos por Profissional</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ServiceManagement')}
          >
            <Icon name="content-cut" size={24} color={colors.primary} style={styles.actionIcon} />
            <Text style={styles.actionText}>Gerenciar Serviços</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ProfessionalManagementScreen')}
          >
            <Icon name="group" size={24} color={colors.primary} style={styles.actionIcon} />
            <Text style={styles.actionText}>Gerenciar Profissionais</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('FinancialReportsScreen')}
          >
            <Icon name="assessment" size={24} color={colors.primary} style={styles.actionIcon} />
            <Text style={styles.actionText}>Relatórios Financeiros</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShareBusinessLink}
          >
            <Icon name="share" size={24} color={colors.primary} style={styles.actionIcon} />
            <Text style={styles.actionText}>Compartilhar Link</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShareProfessionalProfile}
          >
            <Icon name="person-add" size={24} color={colors.primary} style={styles.actionIcon} />
            <Text style={styles.actionText}>Compartilhar Perfil</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de Seleção de Profissional */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showProfessionalModal}
        onRequestClose={() => setShowProfessionalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Profissional</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowProfessionalModal(false)}
              >
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={professionals}
              keyExtractor={(item) => item.id}
              style={styles.professionalsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.professionalItem}
                  onPress={() => shareProfessionalProfile(item)}
                >
                  <View style={styles.professionalInfo}>
                    <Text style={styles.professionalName}>{item.name}</Text>
                    <Text style={styles.professionalSpecialty}>{item.specialty}</Text>
                    <View style={styles.professionalRating}>
                      <Icon name="star" size={16} color="#FFD700" />
                      <Text style={styles.ratingText}>
                        {item.rating ? item.rating.toFixed(1) : 'N/A'}
                      </Text>
                    </View>
                  </View>
                  <Icon name="share" size={24} color={colors.primary} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Nenhum profissional encontrado
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  }, loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    padding: 20,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.8,
  },
  todaySummary: {
    margin: 15,
    padding: 15,
    backgroundColor: colors.white,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    margin: 15,
    marginTop: 0,
    padding: 15,
    backgroundColor: colors.white,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: colors.lightText,
    textAlign: 'center',
  },
  revenueCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  revenueValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 5,
  },
  revenueLabel: {
    fontSize: 16,
    color: colors.lightText,
  },
  ratingCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  ratingValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  starIcon: {
    fontSize: 20,
    color: '#FFD700',
    marginHorizontal: 2,
  },
  ratingLabel: {
    fontSize: 16,
    color: colors.lightText,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 10,
  },
  actionIcon: {
    // fontSize: 24, // Size é controlado pelo componente Icon
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    margin: 20,
    maxHeight: '70%',
    width: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  professionalsList: {
    maxHeight: 400,
  },
  professionalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  professionalSpecialty: {
    fontSize: 14,
    color: colors.lightText,
    marginBottom: 4,
  },
  professionalRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 4,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: colors.lightText,
    fontSize: 16,
  },
});

export default DashboardScreen;
