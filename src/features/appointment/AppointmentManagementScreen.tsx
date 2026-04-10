import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { firebaseDb, collection, query, where, limit, getDocs } from '../../config/firebase';
import { colors } from '../../constants/colors';
import { useAuth } from '../auth/context/AuthContext';
import {
  Appointment,
  getBusinessAppointments,
  updateAppointmentStatus as updateAppointmentStatusService,
} from '../../services/appointments';

const AppointmentManagementScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | Appointment['status']>('all');

  const [businessId, setBusinessId] = useState<string | null>(null);

  const fetchBusinessId = useCallback(async () => {
    if (!user) {
      setLoading(false); // Stop loading if no user
      return;
    }
    setLoading(true); // Start loading when fetching businessId
    try {
      const businessSnapshot = await getDocs(
        query(
          collection(firebaseDb, 'businesses'),
          where('ownerId', '==', user.uid),
          limit(1)
        )
      );

      if (!businessSnapshot.empty) {
        setBusinessId(businessSnapshot.docs[0].id);
      } else {
        setBusinessId(null); // Explicitly set to null if not found
      }
    } catch (error) {
      setBusinessId(null); // Set to null on error
    } finally {
      // setLoading(false); // Loading will be stopped by loadAppointments or if no businessId
    }
  }, [user]);

  const loadAppointments = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (!businessId) {
      // If businessId is null after attempting to fetch, it means no business was found or an error occurred.
      // We should stop loading and potentially show a message to the user.
      setAppointments([]);
      setFilteredAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true); // Ensure loading is true when starting to fetch appointments
    try {
      const appointmentsData = await getBusinessAppointments(businessId);
      setAppointments(appointmentsData);
      setFilteredAppointments(appointmentsData);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  }, [user, businessId]);

  const filterAppointments = useCallback(() => {
    let filtered = [...appointments];

    // Filtrar por status
    if (activeFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === activeFilter);
    }

    // Filtrar por texto de busca
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        appointment =>
          (appointment.clientName?.toLowerCase().includes(searchLower)) ||
          (appointment.serviceName?.toLowerCase().includes(searchLower)) ||
          (appointment.professionalName?.toLowerCase().includes(searchLower)),
      );
    }

    setFilteredAppointments(filtered);
  }, [appointments, searchText, activeFilter]);

  useEffect(() => {
    fetchBusinessId();
  }, [fetchBusinessId]);

  useEffect(() => {
    // Only call loadAppointments if businessId is available (not null)
    // If fetchBusinessId resulted in businessId being null, loadAppointments will handle it.
    loadAppointments();
  }, [loadAppointments, businessId]); // businessId is a dependency here

  useEffect(() => {
    filterAppointments();
  }, [filterAppointments]); // This was the main culprit for re-renders, fixed by removing other dependencies

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  }, [loadAppointments]);

  const handleUpdateStatus = async (id: string | undefined, newStatus: Appointment['status']) => {
    if (!id) {
      return;
    }
    try {
      await updateAppointmentStatusService(id, newStatus);
      // Atualizar localmente apÃƒÆ’Ã‚Â³s sucesso
      setAppointments(prevAppointments =>
        prevAppointments.map(appointment =>
          appointment.id === id ? { ...appointment, status: newStatus } : appointment,
        ),
      );
    } catch (error) {
      // Tratar erro
    }
  }; const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled':
        return colors.warning;
      case 'confirmed':
        return colors.primary;
      case 'completed':
        return colors.success;
      case 'cancelled':
        return colors.error;
      case 'no_show':
        return colors.lightText;
      default:
        return colors.lightText;
    }
  };

  const getStatusText = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled':
        return 'Aguardando ConfirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o';
      case 'confirmed':
        return 'Confirmado';
      case 'completed':
        return 'ConcluÃƒÆ’Ã‚Â­do';
      case 'cancelled':
        return 'Cancelado';
      case 'no_show':
        return 'NÃƒÆ’Ã‚Â£o Compareceu';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando agendamentos...</Text>
      </View>
    );
  }

  // If no businessId is found after trying to fetch it.
  if (!businessId && !loading) { // Check !loading to ensure fetchBusinessId has completed
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Gerenciar Agendamentos</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Nenhum estabelecimento encontrado. Crie um estabelecimento para gerenciar agendamentos.
          </Text>
        </View>
      </View>
    );
  }

  const renderAppointmentItem = ({ item }: { item: Appointment }) => (
    <View style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <Text style={styles.clientName}>{item.clientName || 'Cliente Desconhecido'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.appointmentDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>ServiÃƒÆ’Ã‚Â§o:</Text>
          <Text style={styles.detailValue}>{item.serviceName || 'ServiÃƒÆ’Ã‚Â§o Desconhecido'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Profissional:</Text>
          <Text style={styles.detailValue}>{item.professionalName || 'Profissional NÃƒÆ’Ã‚Â£o AtribuÃƒÆ’Ã‚Â­do'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Data/Hora:</Text>
          <Text style={styles.detailValue}>{item.date} ÃƒÆ’Ã‚Â s {item.time}</Text>
        </View>
        {item.price !== undefined && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Valor:</Text>
            <Text style={styles.detailValue}>R$ {item.price.toFixed(2)}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsContainer}>
        {item.status === 'scheduled' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => handleUpdateStatus(item.id, 'confirmed')}
            >
              <Text style={styles.actionButtonText}>Confirmar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleUpdateStatus(item.id, 'cancelled')}
            >
              <Text style={styles.actionButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === 'confirmed' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => handleUpdateStatus(item.id, 'completed')}
          >
            <Text style={styles.actionButtonText}>Marcar como ConcluÃƒÆ’Ã‚Â­do</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gerenciar Agendamentos</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por cliente, serviÃƒÆ’Ã‚Â§o ou profissional"
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
            style={[styles.filterButton, activeFilter === 'scheduled' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('scheduled')}
          >
            <Text style={[styles.filterText, activeFilter === 'scheduled' && styles.activeFilterText]}>
              Agendados
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'confirmed' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('confirmed')}
          >
            <Text style={[styles.filterText, activeFilter === 'confirmed' && styles.activeFilterText]}>
              Confirmados
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'completed' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('completed')}
          >
            <Text style={[styles.filterText, activeFilter === 'completed' && styles.activeFilterText]}>
              ConcluÃƒÆ’Ã‚Â­dos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'cancelled' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('cancelled')}
          >
            <Text style={[styles.filterText, activeFilter === 'cancelled' && styles.activeFilterText]}>
              Cancelados
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'no_show' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('no_show')}
          >
            <Text style={[styles.filterText, activeFilter === 'no_show' && styles.activeFilterText]}>
              NÃƒÆ’Ã‚Â£o Compareceu
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <FlatList
        data={filteredAppointments}
        renderItem={renderAppointmentItem}
        keyExtractor={(item) => item.id || `${item.serviceId}-${item.clientId}-${item.date}-${item.time}`} // Fallback key
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum agendamento encontrado</Text>
          </View>
        }
      />
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
  },
  appointmentCard: {
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
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
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
  appointmentDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  detailLabel: {
    width: 100,
    fontSize: 14,
    color: colors.lightText,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
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
  confirmButton: {
    backgroundColor: colors.primary,
  },
  cancelButton: {
    backgroundColor: colors.error,
  },
  completeButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  headerContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    backgroundColor: colors.white,
  },
});

export default AppointmentManagementScreen;
