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
import { firebaseAuth } from '../../config/firebase'; // Adicionar auth na importaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
import { colors } from '../../constants/colors';
import { AppStackParamList } from '../../types/types';
import { saveAppointment } from '../../services/appointments';
import { Business, getBusinessById, getBusinessByOwnerId } from '../../services/businesses'; // Adicionar getBusinessByOwnerId
import { Professional, getProfessionalById } from '../../services/professionals';
import { Service, getServiceById } from '../../services/services';

// FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para detectar se o usuÃƒÆ’Ã‚Â¡rio ÃƒÆ’Ã‚Â© proprietÃƒÆ’Ã‚Â¡rio
const checkIfUserIsOwner = async (): Promise<boolean> => {
  try {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) return false;

    // Verificar se o usuÃƒÆ’Ã‚Â¡rio possui um negÃƒÆ’Ã‚Â³cio (ÃƒÆ’Ã‚Â© proprietÃƒÆ’Ã‚Â¡rio)
    const business = await getBusinessByOwnerId(currentUser.uid);
    return business !== null;
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ [checkIfUserIsOwner] Erro ao verificar tipo de usuÃƒÆ’Ã‚Â¡rio:', error);
    return false;
  }
};

// FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para testar conectividade com Firestore
const testFirestoreConnection = async (): Promise<boolean> => {
  try {
    console.log('ÃƒÂ°Ã‚Å¸Ã‚Â§Ã‚Âª [testFirestore] Testando conectividade...');

    // Verificar autenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ [testFirestore] UsuÃƒÆ’Ã‚Â¡rio nÃƒÆ’Ã‚Â£o autenticado');
      return false;
    }

    console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ [testFirestore] UsuÃƒÆ’Ã‚Â¡rio autenticado, conectividade OK');
    return true;
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ [testFirestore] Erro de conectividade:', error);
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

  // Verificar se ÃƒÆ’Ã‚Â© um pacote com mÃƒÆ’Ã‚Âºltiplas sessÃƒÆ’Ã‚Âµes
  const isPackage = Boolean(sessions && sessions.length > 0);
  const appointmentSessions = isPackage ? sessions : [{ date: date!, time: time! }];

  // Load real data from Firestore
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Âµ [BookingConfirmation] Iniciando carregamento de dados...');
        console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Å  [BookingConfirmation] IDs recebidos:', { businessId, serviceId, professionalId });

        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          console.error('ÃƒÂ¢Ã‚ÂÃ‚Â° [BookingConfirmation] Timeout ao carregar dados');
          setLoading(false);
          Alert.alert('Erro', 'Tempo limite excedido ao carregar dados. Tente novamente.');
        }, 15000); // 15 seconds timeout

        // Testar conectividade com Firestore
        const isConnected = await testFirestoreConnection();
        if (!isConnected) {
          console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ [BookingConfirmation] Sem conectividade com Firestore');
          clearTimeout(timeoutId);
          Alert.alert('Erro', 'Sem conexÃƒÆ’Ã‚Â£o com o Firestore. Verifique sua conexÃƒÆ’Ã‚Â£o e tente novamente.');
          // Set default empty data to prevent infinite loading
          setBusinessData({ id: businessId, name: 'Estabelecimento', address: 'EndereÃƒÆ’Ã‚Â§o indisponÃƒÆ’Ã‚Â­vel', imageUrl: '' } as Business);
          setServiceData({ id: serviceId, name: 'ServiÃƒÆ’Ã‚Â§o', price: 0, duration: '60min' } as Service);
          setProfessionalData({ id: professionalId, name: 'Profissional' } as Professional);
          return;
        }

        console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ [BookingConfirmation] Conectividade OK, carregando documentos...');

        // Load business data
        console.log('ÃƒÂ°Ã‚Å¸Ã‚ÂÃ‚Â¢ [BookingConfirmation] Carregando dados do estabelecimento...');
        const businessData = await getBusinessById(businessId);

        // Load service data  
        console.log('ÃƒÂ°Ã‚Å¸Ã‚â€ºÃ‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â [BookingConfirmation] Carregando dados do serviÃƒÆ’Ã‚Â§o...');
        const serviceData = await getServiceById(businessId, serviceId);

        // Load professional data
        console.log('ÃƒÂ°Ã‚Å¸Ã‚â€˜Ã‚Â¤ [BookingConfirmation] Carregando dados do profissional...');
        const professionalData = await getProfessionalById(professionalId);

        // Clear the timeout since we got a response
        clearTimeout(timeoutId);

        if (businessData) {
          console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ [BookingConfirmation] Dados do estabelecimento carregados');
          setBusinessData(businessData);
        } else {
          console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ [BookingConfirmation] Documento do estabelecimento nÃƒÆ’Ã‚Â£o encontrado');
          setBusinessData({ id: businessId, name: 'Estabelecimento', address: 'EndereÃƒÆ’Ã‚Â§o indisponÃƒÆ’Ã‚Â­vel', imageUrl: '' } as Business);
        }

        if (serviceData) {
          console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ [BookingConfirmation] Dados do serviÃƒÆ’Ã‚Â§o carregados');
          setServiceData(serviceData);
        } else {
          console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ [BookingConfirmation] Documento do serviÃƒÆ’Ã‚Â§o nÃƒÆ’Ã‚Â£o encontrado');
          setServiceData({ id: serviceId, name: 'ServiÃƒÆ’Ã‚Â§o', price: 0, duration: '60min' } as Service);
        }

        if (professionalData) {
          console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ [BookingConfirmation] Dados do profissional carregados');
          setProfessionalData(professionalData);
        } else {
          console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ [BookingConfirmation] Documento do profissional nÃƒÆ’Ã‚Â£o encontrado');
          setProfessionalData({ id: professionalId, name: 'Profissional' } as Professional);
        }

        console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ [BookingConfirmation] Carregamento de dados concluÃƒÆ’Ã‚Â­do');
      } catch (error) {
        console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ [BookingConfirmation] Erro ao carregar dados:', error);

        // Set default data to prevent infinite loading
        setBusinessData({ id: businessId, name: 'Estabelecimento', address: 'EndereÃƒÆ’Ã‚Â§o indisponÃƒÆ’Ã‚Â­vel', imageUrl: '' } as Business);
        setServiceData({ id: serviceId, name: 'ServiÃƒÆ’Ã‚Â§o', price: 0, duration: '60min' } as Service);
        setProfessionalData({ id: professionalId, name: 'Profissional' } as Professional);

        Alert.alert(
          'Erro',
          'NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel carregar alguns dados do agendamento. Por favor, verifique se os dados estÃƒÆ’Ã‚Â£o corretos.',
        );
      } finally {
        console.log('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚â€ž [BookingConfirmation] Finalizando carregamento...');
        setLoading(false);
      }
    };

    loadData();
  }, [businessId, serviceId, professionalId]);

  // Formatar a data para exibiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
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
      console.log('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Âµ Iniciando confirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do agendamento...');

      // Testar conectividade primeiro
      const isConnected = await testFirestoreConnection();
      if (!isConnected) {
        throw new Error('NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel conectar ao banco de dados. Verifique sua conexÃƒÆ’Ã‚Â£o com a internet.');
      }

      console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Å  Dados do agendamento:', {
        businessId,
        serviceId,
        professionalId,
        date,
        time,
        sessions,
        isPackage,
      });

      if (isPackage && appointmentSessions) {
        console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Â¦ Processando pacote com mÃƒÆ’Ã‚Âºltiplas sessÃƒÆ’Ã‚Âµes:', appointmentSessions.length);
        // Para pacotes, criar mÃƒÆ’Ã‚Âºltiplos agendamentos
        const appointmentPromises = appointmentSessions.map(async (session, index) => {
          console.log(`ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚â€¦ Criando sessÃƒÆ’Ã‚Â£o ${index + 1}:`, session);
          const appointmentData = {
            businessId,
            serviceId,
            professionalId,
            date: session.date,
            time: session.time,
            serviceName: serviceData?.name || 'ServiÃƒÆ’Ã‚Â§o',
            professionalName: professionalData?.name || 'Profissional',
            businessName: businessData?.name || 'Estabelecimento',
            price: (serviceData?.price || 0) / appointmentSessions.length, // Dividir o preÃƒÆ’Ã‚Â§o entre as sessÃƒÆ’Ã‚Âµes
            duration: String(serviceData?.duration || 0),
            status: 'scheduled' as const,
          };
          const result = await saveAppointment(appointmentData);
          console.log(`ÃƒÂ¢Ã‚Å“Ã‚â€¦ SessÃƒÆ’Ã‚Â£o ${index + 1} salva com ID:`, result);
          return result;
        });

        const results = await Promise.all(appointmentPromises);
        console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ Todas as sessÃƒÆ’Ã‚Âµes do pacote foram salvas:', results);

      } else {
        console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚â€¦ Processando sessÃƒÆ’Ã‚Â£o ÃƒÆ’Ã‚Âºnica');
        // Para sessÃƒÆ’Ã‚Â£o ÃƒÆ’Ã‚Âºnica, manter comportamento original
        const appointmentData = {
          businessId,
          serviceId,
          professionalId,
          date: date!,
          time: time!,
          serviceName: serviceData?.name || 'ServiÃƒÆ’Ã‚Â§o',
          professionalName: professionalData?.name || 'Profissional',
          businessName: businessData?.name || 'Estabelecimento',
          price: serviceData?.price || 0,
          duration: String(serviceData?.duration || 0),
          status: 'scheduled' as const,
        };

        console.log('ÃƒÂ°Ã‚Å¸Ã‚â€™Ã‚Â¾ Salvando agendamento ÃƒÆ’Ã‚Âºnico:', appointmentData);
        const result = await saveAppointment(appointmentData);
        console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ Agendamento ÃƒÆ’Ã‚Âºnico salvo com ID:', result);
      }
      console.log('ÃƒÂ°Ã‚Å¸Ã‚Å½Ã‚â€° Agendamento confirmado com sucesso!');

      const goToAppointments = async () => {
        const isOwner = await checkIfUserIsOwner();
        navigation.reset({ index: 0, routes: [{ name: isOwner ? 'OwnerTabs' : 'ClientTabs', params: { screen: 'Appointments' } }] });
      };

      const inAppPaymentEnabled = businessData?.paymentMethods?.inApp ?? false;
      if (inAppPaymentEnabled && (serviceData?.price ?? 0) > 0) {
        Alert.alert(
          'Agendamento Confirmado! ÃƒÂ°Ã‚Å¸Ã‚Å½Ã‚â€°',
          'Deseja pagar agora pelo app com Pix ou cartÃƒÆ’Ã‚Â£o?',
          [
            { text: 'Pagar agora', onPress: () => {
              navigation.navigate('Payment', {
                appointmentId: `${businessId}_${Date.now()}`,
                amount: serviceData?.price ?? 0,
                description: `${serviceData?.name ?? 'ServiÃƒÆ’Ã‚Â§o'} ÃƒÂ¢Ã‚â‚¬Ã‚â€ ${professionalData?.name ?? ''}`,
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
          ? `Seu pacote com ${appointmentSessions.length} sessÃƒÆ’Ã‚Âµes foi confirmado com sucesso!`
          : 'Seu agendamento foi confirmado com sucesso!',
        [
          {
            text: 'Ver Meus Agendamentos',
            onPress: async () => {
              console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Â± Navegando para tela de agendamentos...');
              
              // Detectar se o usuÃƒÆ’Ã‚Â¡rio ÃƒÆ’Ã‚Â© proprietÃƒÆ’Ã‚Â¡rio para navegar para a tela correta
              const isOwner = await checkIfUserIsOwner();
              
              if (isOwner) {
                console.log('ÃƒÂ°Ã‚Å¸Ã‚â€˜Ã‚â€˜ [BookingConfirmation] UsuÃƒÆ’Ã‚Â¡rio ÃƒÆ’Ã‚Â© proprietÃƒÆ’Ã‚Â¡rio, navegando para OwnerTabs');
                // Reset para garantir que volta para a tab de agendamentos do proprietÃƒÆ’Ã‚Â¡rio
                navigation.reset({
                  index: 0,
                  routes: [
                    { name: 'OwnerTabs', params: { screen: 'Appointments' } },
                  ],
                });
              } else {
                console.log('ÃƒÂ°Ã‚Å¸Ã‚â€˜Ã‚Â¤ [BookingConfirmation] UsuÃƒÆ’Ã‚Â¡rio ÃƒÆ’Ã‚Â© cliente, navegando para ClientTabs');
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
      console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ Erro ao confirmar agendamento:', error);
      console.error('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Å  Detalhes do erro:', {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });

      Alert.alert(
        'Erro',
        `NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel confirmar seu agendamento.\n\nDetalhes: ${error instanceof Error ? error.message : 'Erro desconhecido'}\n\nTente novamente ou entre em contato conosco.`,
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
            <Text style={styles.backButtonText}>ÃƒÂ¢Ã‚â€ Ã‚Â</Text>
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
            <Text style={styles.backButtonText}>ÃƒÂ¢Ã‚â€ Ã‚Â</Text>
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
          <Text style={styles.backButtonText}>ÃƒÂ¢Ã‚â€ Ã‚Â</Text>
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
          <Text style={styles.sectionTitle}>Detalhes do ServiÃƒÆ’Ã‚Â§o</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ServiÃƒÆ’Ã‚Â§o:</Text>
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
                  Pacote com {appointmentSessions?.length || 0} sessÃƒÆ’Ã‚Âµes
                </Text>
              </View>
              <Text style={styles.sessionsTitle}>SessÃƒÆ’Ã‚Âµes agendadas:</Text>
              {appointmentSessions?.map((session, index) => (
                <View key={index} style={styles.sessionRow}>
                  <Text style={styles.sessionNumber}>SessÃƒÆ’Ã‚Â£o {index + 1}:</Text>
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
                <Text style={styles.detailLabel}>HorÃƒÆ’Ã‚Â¡rio:</Text>
                <Text style={styles.detailValue}>{time}</Text>
              </View>
            </>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>DuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:</Text>
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
          <Text style={styles.sectionTitle}>PolÃƒÆ’Ã‚Â­tica de Cancelamento</Text>
          <Text style={styles.policyText}>
            Cancelamentos devem ser realizados com pelo menos 24 horas de antecedÃƒÆ’Ã‚Âªncia.
            Cancelamentos com menos de 24 horas ou nÃƒÆ’Ã‚Â£o comparecimento podem estar sujeitos a cobranÃƒÆ’Ã‚Â§a.
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
              {isPackage && appointmentSessions ? `Confirmar ${appointmentSessions.length} SessÃƒÆ’Ã‚Âµes` : 'Confirmar Agendamento'}
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
