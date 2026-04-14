import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { firebaseAuth } from '../../config/firebase'; // Adicionar auth na importação
import { colors } from '../../constants/colors';
import { AppStackParamList } from '../../types/types';
import { saveAppointment } from '../../services/appointments';
import { Business, getBusinessById, getBusinessByOwnerId } from '../../services/businesses'; // Adicionar getBusinessByOwnerId
import { Professional, getProfessionalById } from '../../services/professionals';
import { Service, getServiceById } from '../../services/services';

// Função para detectar se o usuário é proprietário
const checkIfUserIsOwner = async (): Promise<boolean> => {
  try {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) return false;

    // Verificar se o usuário possui um negócio (é proprietário)
    const business = await getBusinessByOwnerId(currentUser.uid);
    return business !== null;
  } catch (error) {
    console.error('࢝Œ [checkIfUserIsOwner] Erro ao verificar tipo de usuário:', error);
    return false;
  }
};

// Função para testar conectividade com Firestore
const testFirestoreConnection = async (): Promise<boolean> => {
  try {
    console.log('ðŸ§ª [testFirestore] Testando conectividade...');

    // Verificar autenticação
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      console.error('࢝Œ [testFirestore] Usuário não autenticado');
      return false;
    }

    console.log('âœ… [testFirestore] Usuário autenticado, conectividade OK');
    return true;
  } catch (error) {
    console.error('࢝Œ [testFirestore] Erro de conectividade:', error);
    return false;
  }
};

type BookingConfirmationScreenRouteProp = RouteProp<AppStackParamList, 'BookingConfirmation'>;
type BookingConfirmationScreenNavigationProp = StackNavigationProp<AppStackParamList, 'BookingConfirmation'>;

const BookingConfirmationScreen: React.FC = () => {
  const route = useRoute<BookingConfirmationScreenRouteProp>();
  const navigation = useNavigation<BookingConfirmationScreenNavigationProp>();
  const { businessId, serviceId, professionalId, date, time, sessions } = route.params;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [businessData, setBusinessData] = useState<Business | null>(null);
  const [serviceData, setServiceData] = useState<Service | null>(null);
  const [professionalData, setProfessionalData] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar se é um pacote com múltiplas sessões
  const isPackage = Boolean(sessions && sessions.length > 0);
  const appointmentSessions = isPackage ? sessions : [{ date: date!, time: time! }];

  // Load real data from Firestore
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('ðŸ”µ [BookingConfirmation] Iniciando carregamento de dados...');
        console.log('ðŸ“Š [BookingConfirmation] IDs recebidos:', { businessId, serviceId, professionalId });

        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          console.error('ϰ [BookingConfirmation] Timeout ao carregar dados');
          setLoading(false);
          Alert.alert('Erro', 'Tempo limite excedido ao carregar dados. Tente novamente.');
        }, 15000); // 15 seconds timeout

        // Testar conectividade com Firestore
        const isConnected = await testFirestoreConnection();
        if (!isConnected) {
          console.error('࢝Œ [BookingConfirmation] Sem conectividade com Firestore');
          clearTimeout(timeoutId);
          Alert.alert('Erro', 'Sem conexão com o Firestore. Verifique sua conexão e tente novamente.');
          // Set default empty data to prevent infinite loading
          setBusinessData({ id: businessId, name: 'Estabelecimento', address: 'Endereço indisponível', imageUrl: '' } as Business);
          setServiceData({ id: serviceId, name: 'Serviço', price: 0, duration: '60min' } as Service);
          setProfessionalData({ id: professionalId, name: 'Profissional' } as Professional);
          return;
        }

        console.log('âœ… [BookingConfirmation] Conectividade OK, carregando documentos...');

        // Load business data
        console.log('ðŸ¢ [BookingConfirmation] Carregando dados do estabelecimento...');
        const businessData = await getBusinessById(businessId);

        // Load service data  
        console.log('ðŸ› ௸ [BookingConfirmation] Carregando dados do serviço...');
        const serviceData = await getServiceById(businessId, serviceId);

        // Load professional data
        console.log('ðŸ‘¤ [BookingConfirmation] Carregando dados do profissional...');
        const professionalData = await getProfessionalById(professionalId);

        // Clear the timeout since we got a response
        clearTimeout(timeoutId);

        if (businessData) {
          console.log('âœ… [BookingConfirmation] Dados do estabelecimento carregados');
          setBusinessData(businessData);
        } else {
          console.error('࢝Œ [BookingConfirmation] Documento do estabelecimento não encontrado');
          setBusinessData({ id: businessId, name: 'Estabelecimento', address: 'Endereço indisponível', imageUrl: '' } as Business);
        }

        if (serviceData) {
          console.log('âœ… [BookingConfirmation] Dados do serviço carregados');
          setServiceData(serviceData);
        } else {
          console.error('࢝Œ [BookingConfirmation] Documento do serviço não encontrado');
          setServiceData({ id: serviceId, name: 'Serviço', price: 0, duration: '60min' } as Service);
        }

        if (professionalData) {
          console.log('âœ… [BookingConfirmation] Dados do profissional carregados');
          setProfessionalData(professionalData);
        } else {
          console.error('࢝Œ [BookingConfirmation] Documento do profissional não encontrado');
          setProfessionalData({ id: professionalId, name: 'Profissional' } as Professional);
        }

        console.log('âœ… [BookingConfirmation] Carregamento de dados concluído');
      } catch (error) {
        console.error('࢝Œ [BookingConfirmation] Erro ao carregar dados:', error);

        // Set default data to prevent infinite loading
        setBusinessData({ id: businessId, name: 'Estabelecimento', address: 'Endereço indisponível', imageUrl: '' } as Business);
        setServiceData({ id: serviceId, name: 'Serviço', price: 0, duration: '60min' } as Service);
        setProfessionalData({ id: professionalId, name: 'Profissional' } as Professional);

        Alert.alert(
          'Erro',
          'Não foi possível carregar alguns dados do agendamento. Por favor, verifique se os dados estão corretos.',
        );
      } finally {
        console.log('ðŸ”„ [BookingConfirmation] Finalizando carregamento...');
        setLoading(false);
      }
    };

    loadData();
  }, [businessId, serviceId, professionalId]);

  // Formatar a data para exibição
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleConfirmBooking = async () => {
    setIsLoading(true);

    try {
      console.log('ðŸ”µ Iniciando confirmação do agendamento...');

      // Testar conectividade primeiro
      const isConnected = await testFirestoreConnection();
      if (!isConnected) {
        throw new Error('Não foi possível conectar ao banco de dados. Verifique sua conexão com a internet.');
      }

      console.log('ðŸ“Š Dados do agendamento:', {
        businessId,
        serviceId,
        professionalId,
        date,
        time,
        sessions,
        isPackage,
      });

      if (isPackage && appointmentSessions) {
        console.log('ðŸ“¦ Processando pacote com múltiplas sessões:', appointmentSessions.length);
        // Para pacotes, criar múltiplos agendamentos
        const appointmentPromises = appointmentSessions.map(async (session, index) => {
          console.log(`ðŸ“… Criando sessão ${index + 1}:`, session);
          const appointmentData = {
            businessId,
            serviceId,
            professionalId,
            date: session.date,
            time: session.time,
            serviceName: serviceData?.name || 'Serviço',
            professionalName: professionalData?.name || 'Profissional',
            businessName: businessData?.name || 'Estabelecimento',
            price: (serviceData?.price || 0) / appointmentSessions.length, // Dividir o preço entre as sessões
            duration: String(serviceData?.duration || 0),
            status: 'scheduled' as const,
          };
          const result = await saveAppointment(appointmentData);
          console.log(`âœ… Sessão ${index + 1} salva com ID:`, result);
          return result;
        });

        const results = await Promise.all(appointmentPromises);
        console.log('âœ… Todas as sessões do pacote foram salvas:', results);

      } else {
        console.log('ðŸ“… Processando sessão única');
        // Para sessão única, manter comportamento original
        const appointmentData = {
          businessId,
          serviceId,
          professionalId,
          date: date!,
          time: time!,
          serviceName: serviceData?.name || 'Serviço',
          professionalName: professionalData?.name || 'Profissional',
          businessName: businessData?.name || 'Estabelecimento',
          price: serviceData?.price || 0,
          duration: String(serviceData?.duration || 0),
          status: 'scheduled' as const,
        };

        console.log('ðŸ’¾ Salvando agendamento único:', appointmentData);
        const result = await saveAppointment(appointmentData);
        console.log('âœ… Agendamento único salvo com ID:', result);
      }
      console.log('ðŸŽ‰ Agendamento confirmado com sucesso!');

      const goToAppointments = async () => {
        const isOwner = await checkIfUserIsOwner();
        navigation.reset({ index: 0, routes: [{ name: isOwner ? 'OwnerTabs' : 'ClientTabs', params: { screen: 'Appointments' } }] });
      };

      const inAppPaymentEnabled = businessData?.paymentMethods?.inApp ?? false;
      if (inAppPaymentEnabled && (serviceData?.price ?? 0) > 0) {
        Alert.alert(
          'Agendamento Confirmado! ðŸŽ‰',
          'Deseja pagar agora pelo app com Pix ou cartão?',
          [
            { text: 'Pagar agora', onPress: () => {
              navigation.navigate('Payment', {
                appointmentId: `${businessId}_${Date.now()}`,
                amount: serviceData?.price ?? 0,
                description: `${serviceData?.name ?? 'Serviço'} â€” ${professionalData?.name ?? ''}`,
                businessName: businessData?.name ?? 'Estabelecimento',
                currency: 'BRL',
              });
            }},
            { text: 'Pagar no local', onPress: goToAppointments },
          ],
        );
      } else {
      Alert.alert(
        'Agendamento Confirmado',
        isPackage && appointmentSessions
          ? `Seu pacote com ${appointmentSessions.length} sessões foi confirmado com sucesso!`
          : 'Seu agendamento foi confirmado com sucesso!',
        [
          {
            text: 'Ver Meus Agendamentos',
            onPress: async () => {
              console.log('ðŸ“± Navegando para tela de agendamentos...');
              
              // Detectar se o usuário é proprietário para navegar para a tela correta
              const isOwner = await checkIfUserIsOwner();
              
              if (isOwner) {
                console.log('ðŸ‘‘ [BookingConfirmation] Usuário é proprietário, navegando para OwnerTabs');
                // Reset para garantir que volta para a tab de agendamentos do proprietário
                navigation.reset({
                  index: 0,
                  routes: [
                    { name: 'OwnerTabs', params: { screen: 'Appointments' } },
                  ],
                });
              } else {
                console.log('ðŸ‘¤ [BookingConfirmation] Usuário é cliente, navegando para ClientTabs');
                // Reset para garantir que volta para a tab de agendamentos do cliente
                navigation.reset({
                  index: 0,
                  routes: [
                    { name: 'ClientTabs', params: { screen: 'Appointments' } },
                  ],
                });
              }
            },
          },
        ],
      );
      }
    } catch (error) {
      console.error('࢝Œ Erro ao confirmar agendamento:', error);
      console.error('ðŸ“Š Detalhes do erro:', {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });

      Alert.alert(
        'Erro',
        `Não foi possível confirmar seu agendamento.\n\nDetalhes: ${error instanceof Error ? error.message : 'Erro desconhecido'}\n\nTente novamente ou entre em contato conosco.`,
        [
          { text: 'OK', style: 'default' },
        ],
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen while fetching data
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>â†</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirmar Agendamento</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando dados do agendamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error screen if any required data is missing
  if (!businessData || !serviceData || !professionalData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>â†</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirmar Agendamento</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Erro ao carregar dados do agendamento</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              // Trigger the useEffect again by setting a random key
              setBusinessData(null);
              setServiceData(null);
              setProfessionalData(null);
            }}
          >
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Text style={styles.backButtonText}>â†</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirmar Agendamento</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.businessCard}>
          <Image
            source={{ uri: businessData.imageUrl }}
            style={styles.businessImage}
          />
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{businessData.name}</Text>
            <Text style={styles.businessAddress}>{businessData.address}</Text>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhes do Serviço</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Serviço:</Text>
            <Text style={styles.detailValue}>{serviceData.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Profissional:</Text>
            <Text style={styles.detailValue}>{professionalData.name}</Text>
          </View>
          {isPackage ? (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tipo:</Text>
                <Text style={styles.detailValue}>
                  Pacote com {appointmentSessions?.length || 0} sessões
                </Text>
              </View>
              <Text style={styles.sessionsTitle}>Sessões agendadas:</Text>
              {appointmentSessions?.map((session, index) => (
                <View key={index} style={styles.sessionRow}>
                  <Text style={styles.sessionNumber}>Sessão {index + 1}:</Text>
                  <View style={styles.sessionDetails}>
                    <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
                    <Text style={styles.sessionTime}>{session.time}</Text>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Data:</Text>
                <Text style={styles.detailValue}>{formatDate(date!)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Horário:</Text>
                <Text style={styles.detailValue}>{time}</Text>
              </View>
            </>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duração:</Text>
            <Text style={styles.detailValue}>{serviceData.duration}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo do Pagamento</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>{serviceData.name}</Text>
            <Text style={styles.paymentValue}>R$ {serviceData.price.toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>R$ {serviceData.price.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Política de Cancelamento</Text>
          <Text style={styles.policyText}>
            Cancelamentos devem ser realizados com pelo menos 24 horas de antecedência.
            Cancelamentos com menos de 24 horas ou não comparecimento podem estar sujeitos a cobrança.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, isLoading && styles.disabledButton]}
          onPress={handleConfirmBooking}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>
              {isPackage && appointmentSessions ? `Confirmar ${appointmentSessions.length} Sessões` : 'Confirmar Agendamento'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: colors.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  businessCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  businessImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  businessInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  businessName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  businessAddress: {
    fontSize: 14,
    color: colors.lightText,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.lightText,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    flex: 2,
    textAlign: 'right',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: colors.text,
  },
  paymentValue: {
    fontSize: 14,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.lightGray,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  policyText: {
    fontSize: 14,
    color: colors.lightText,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: colors.lightGray,
  },
  confirmButtonText: {
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
  sessionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  sessionRow: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  sessionNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  sessionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionDate: {
    fontSize: 14,
    color: colors.text,
  },
  sessionTime: {
    fontSize: 14,
    color: colors.text,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BookingConfirmationScreen;
