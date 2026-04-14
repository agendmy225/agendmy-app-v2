import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native'; // Adicionar useNavigation
import { StackNavigationProp } from '@react-navigation/stack'; // Adicionar StackNavigationProp
import { AppStackParamList } from '../../types/types'; // Adicionar AppStackParamList
import { colors } from '../../constants/colors';
import { getClientAppointments, getBusinessAppointments, Appointment } from '../../services/appointments'; // Usar importação nomeada
import { getBusinessByOwnerId } from '../../services/businesses'; // Importar função para buscar negócio do proprietário
import { firebaseAuth } from '../../config/firebase';


// Usar o tipo Appointment importado, que é mais completo
type AppointmentType = Appointment & { image?: string }; // Adicionar image opcional se necessário para UI

const AppointmentsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [appointments, setAppointments] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOwner, setIsOwner] = useState(false); // Adicionar estado para detectar se é proprietário
  const [businessId, setBusinessId] = useState<string | null>(null); // Adicionar estado para businessId
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>() as any; // Mover inicialização de navigation para cá

  // Detectar se o usuário é proprietário
  const checkUserType = async () => {
    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) return false;

      // Verificar se o usuário possui um negócio (é proprietário)
      const business = await getBusinessByOwnerId(currentUser.uid);
      if (business) {
        setIsOwner(true);
        setBusinessId(business.id);
        console.log('âœ… [AppointmentsScreen] Usuário é proprietário, businessId:', business.id);
        return true;
      } else {
        setIsOwner(false);
        setBusinessId(null);
        console.log('âœ… [AppointmentsScreen] Usuário é cliente');
        return false;
      }
    } catch (error) {
      console.error('âŒ [AppointmentsScreen] Erro ao verificar tipo de usuário:', error);
      setIsOwner(false);
      setBusinessId(null);
      return false;
    }
  };

  // Load user appointments from Firestore
  const loadAppointments = async () => {
    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        console.log('âŒ [AppointmentsScreen] Usuário não autenticado');
        return;
      }

      console.log('ðŸ” [AppointmentsScreen] Carregando agendamentos...');
      
      // Verificar tipo de usuário primeiro
      const userIsOwner = await checkUserType();
      
      let userAppointments: Appointment[] = [];

      if (userIsOwner) {
        console.log('ðŸ‘‘ [AppointmentsScreen] Carregando agendamentos como proprietário...');
        
        // Obter o businessId atualizado
        const business = await getBusinessByOwnerId(currentUser.uid);
        const currentBusinessId = business?.id;
        
        if (currentBusinessId) {
          // Para proprietários: carregar TANTO agendamentos como cliente QUANTO agendamentos do negócio
          const [clientAppointments, businessAppointments] = await Promise.all([
            getClientAppointments().catch(err => {
              console.warn('âš ï¸ [AppointmentsScreen] Erro ao carregar agendamentos como cliente:', err);
              return [];
            }),
            getBusinessAppointments(currentBusinessId).catch(err => {
              console.warn('âš ï¸ [AppointmentsScreen] Erro ao carregar agendamentos do negócio:', err);
              return [];
            })
          ]);

          // Combinar agendamentos e remover duplicatas (se existirem)
          const allAppointments = [...clientAppointments, ...businessAppointments];
          const uniqueAppointments = allAppointments.filter((appointment, index, self) => 
            index === self.findIndex(a => a.id === appointment.id)
          );

          userAppointments = uniqueAppointments;
          console.log('âœ… [AppointmentsScreen] Agendamentos carregados para proprietário:', {
            clientAppointments: clientAppointments.length,
            businessAppointments: businessAppointments.length,
            total: userAppointments.length
          });
        } else {
          console.log('âš ï¸ [AppointmentsScreen] Proprietário sem negócio, carregando como cliente');
          userAppointments = await getClientAppointments();
        }
      } else {
        console.log('ðŸ‘¤ [AppointmentsScreen] Carregando agendamentos como cliente...');
        
        // Para clientes: carregar apenas agendamentos como cliente
        userAppointments = await getClientAppointments();
        console.log('âœ… [AppointmentsScreen] Agendamentos carregados para cliente:', userAppointments.length);
      }

      setAppointments(userAppointments);
    } catch (error) {
      console.error('âŒ [AppointmentsScreen] Erro ao carregar agendamentos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load appointments on component mount
  useEffect(() => {
    loadAppointments();
  }, []);

  // Handle pull-to-refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadAppointments();
  };

  // Filtrar agendamentos por status
  const upcomingAppointments = appointments.filter(
    (appointment: AppointmentType) => appointment.status === 'scheduled' || appointment.status === 'confirmed',
  );

  const pastAppointments = appointments.filter(
    (appointment: AppointmentType) => appointment.status === 'completed' || appointment.status === 'cancelled' || appointment.status === 'no_show',
  );

  const getStatusText = (status: AppointmentType['status']) => {
    switch (status) {
      case 'scheduled': // Adicionar 'scheduled'
        return 'Agendado';
      case 'confirmed':
        return 'Confirmado';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      case 'no_show':
        return 'Não compareceu';
      default:
        return '';
    }
  };

  const getStatusColor = (status: AppointmentType['status']) => {
    switch (status) {
      case 'scheduled': // Manter 'scheduled'
        return colors.warning;
      case 'confirmed':
        return colors.primary;
      case 'completed':
        return colors.success;
      case 'cancelled':
      case 'no_show': // Adicionar no_show se for usado
        return colors.error;
      default:
        return colors.text;
    }
  };

  const renderAppointmentItem = ({ item }: { item: AppointmentType }) => (
    <View style={styles.appointmentCardContainer}>
      <TouchableOpacity
        style={styles.appointmentCard}
        onPress={() => navigation.navigate('BusinessDetails', { businessId: item.businessId })} // Navegar para detalhes do negócio
      >
        <Image
          source={{
            uri: item.image || 'https://via.placeholder.com/100x100/CCCCCC/FFFFFF?Text=Business',
          }}
          style={styles.appointmentImage}
        />
        <View style={styles.appointmentInfo}>
          <Text style={styles.businessName}>{item.businessName}</Text>
          <Text style={styles.serviceName}>{item.serviceName}</Text>
          {/* Mostrar nome do cliente para proprietários */}
          {isOwner && item.clientName && (
            <Text style={styles.clientName}>Cliente: {item.clientName}</Text>
          )}
          <View style={styles.appointmentDetails}>
            <Text style={styles.dateTime}>{`${item.date} Ã s ${item.time}`}</Text>
            <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
          <Text style={styles.price}>{`R$ ${item.price ? item.price.toFixed(2) : 'N/A'}`}</Text>
        </View>
      </TouchableOpacity>
      {item.status === 'completed' && !isOwner && (
        <TouchableOpacity
          style={styles.reviewButton}
          onPress={() => navigation.navigate('Review', {
            businessId: item.businessId,
            businessName: item.businessName,
            serviceId: item.serviceId, // Passar serviceId
            professionalId: item.professionalId, // Passar professionalId
            professionalName: item.professionalName, // Passar professionalName
            appointmentId: item.id, // Passar appointmentId
          })}
        >
          <Text style={styles.reviewButtonText}>Avaliar Serviço</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Show loading screen while fetching appointments
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {isOwner ? 'Agendamentos do Negócio' : 'Meus Agendamentos'}
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando seus agendamentos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isOwner ? 'Agendamentos do Negócio' : 'Meus Agendamentos'}
        </Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'upcoming' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'upcoming' && styles.activeTabButtonText,
            ]}
          >
            Próximos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'past' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('past')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'past' && styles.activeTabButtonText,
            ]}
          >
            Anteriores
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'upcoming' ? (
        upcomingAppointments.length > 0 ? (
          <FlatList
            data={upcomingAppointments}
            renderItem={renderAppointmentItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.appointmentsList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
              />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>VocÃª não tem agendamentos próximos.</Text>
            <TouchableOpacity style={styles.bookButton}>
              <Text style={styles.bookButtonText}>Agendar Serviço</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        pastAppointments.length > 0 ? (
          <FlatList
            data={pastAppointments}
            renderItem={renderAppointmentItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.appointmentsList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
              />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>VocÃª não tem agendamentos anteriores.</Text>
          </View>
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 16,
    color: colors.lightText,
  },
  activeTabButtonText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  appointmentsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  appointmentCardContainer: {
    marginBottom: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  appointmentCard: {
    flexDirection: 'row',
    padding: 12,
  },
  appointmentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  appointmentInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  businessName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  clientName: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  appointmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateTime: {
    fontSize: 12,
    color: colors.lightText,
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  reviewButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  reviewButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: colors.lightText,
    textAlign: 'center',
    marginBottom: 20,
  },
  bookButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  bookButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.lightText,
    marginTop: 10,
    textAlign: 'center',
  },
});

export default AppointmentsScreen;
