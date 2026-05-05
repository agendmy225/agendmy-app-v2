import { RouteProp, useFocusEffect, useNavigation, useRoute, CompositeNavigationProp } from '@react-navigation/native'; // Import useFocusEffect
import { StackNavigationProp } from '@react-navigation/stack';
import { BusinessMarker } from './components/BusinessMarker';
import LeafletMap from '../../components/map/LeafletMap';
import GalleryViewerModal, { GalleryItem } from './components/GalleryViewerModal';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProfessionalPortfolioModal from '../professional/ProfessionalPortfolioModal';
import ServiceDetailsModal from '../service/ServiceDetailsModal';
import TimeSlotsModal from '../appointment/components/TimeSlotsModal';
import { colors } from '../../constants/colors';
import StorageImage from '../../components/common/StorageImage';
import { useAuth } from '../auth/context/AuthContext'; // Já importado
import { HomeStackParamList, AppStackParamList } from '../../types/types';
import { hasCompletedAppointmentWithBusiness } from '../../services/appointments';
import { Business, getBusinessById } from '../../services/businesses';
import { createOrGetChat } from '../../services/chat';
import { getProfessionalsByBusiness, Professional } from '../../services/professionals';
import { getBusinessReviews, Review, updateBusinessRating } from '../../services/reviews';
import { getServicesByBusiness, Service } from '../../services/services';
import { isBusinessOpen } from '../../services/businessHours';
import { checkMultipleProfessionalsAvailability } from '../../services/professionalAvailability';
import { useCachedFirebaseImage } from '../../hooks/useCachedFirebaseImage';
// Remover imports diretos de services/favorites, usaremos o contexto
// import { addToFavorites, removeFromFavorites, isFavorite as checkIsFavorite } from '../../services/favorites';

type BusinessDetailsScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<HomeStackParamList, 'BusinessDetails'>,
  StackNavigationProp<AppStackParamList>
>;
type BusinessDetailsScreenRouteProp = RouteProp<
  HomeStackParamList,
  'BusinessDetails'
>;

const BusinessDetailsScreen: React.FC = () => {
  const navigation = useNavigation<BusinessDetailsScreenNavigationProp>();
  const route = useRoute<BusinessDetailsScreenRouteProp>();
  const { businessId } = route.params;
  const { favorites, toggleFavorite, user } = useAuth(); // Usar user ao invés de currentUser

  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [isMapMounted, setIsMapMounted] = useState(false);

  // Mapa: montar apenas quando tela em foco
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => setIsMapMounted(true), 300);
      return () => {
        clearTimeout(timer);
      };
    }, [])
  );
  
  // CRITICO: desmontar o mapa ANTES da navegacao acontecer para evitar crash NPE
  // O beforeRemove dispara antes do React desmontar a tela, dando tempo do MapView limpar
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      setIsMapMounted(false);
    });
    return unsubscribe;
  }, [navigation]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isTimeSlotsModalVisible, setIsTimeSlotsModalVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [professionalAvailability, setProfessionalAvailability] = useState<Map<string, boolean>>(new Map());
  const [isBookingAvailable, setIsBookingAvailable] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [isPortfolioModalVisible, setIsPortfolioModalVisible] = useState(false);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [mapKey, setMapKey] = useState(0); // Força re-render do mapa

  // Hook para carregar imagem de capa do Firebase Storage
  const { imageSource: coverImageSource, loading: coverImageLoading } = useCachedFirebaseImage(business?.coverImage);

  const fullAddress = useMemo(() => {
    if (!business?.address) return '';

    // Verificar se o número já está incluído no endereço principal
    const address = business.address || '';
    const number = business.addressNumber || '';

    // Se o número já estiver no endereço, não duplicar
    const addressWithNumber = number && !address.includes(number)
      ? `${address}, ${number}`
      : address;

    const parts = [addressWithNumber];
    if (business.addressComplement) parts.push(business.addressComplement);
    if (business.neighborhood) parts.push(business.neighborhood);
    if (business.city) parts.push(business.city);

    return parts.filter(part => part && part.trim()).join(', ');
  }, [business]);

  // useEffect(() => { // Change this to useFocusEffect
  useFocusEffect(
    useCallback(() => {
      // Adicionado um "guarda" para garantir que o usuário exista antes de carregar os dados.
      // Isso previne uma condição de corrida onde a tela tenta carregar dados
      // antes que o contexto de autenticação esteja totalmente inicializado.
      if (!user) {
        return; // Sai se o usuário ainda não estiver carregado.
      }

      const loadData = async () => {
        try {
          setIsLoading(true);
          const [
            businessData,
            servicesData,
            professionalsData,
            reviewsData,
            hasCompletedAppointment,
          ] = await Promise.all([
            getBusinessById(businessId),
            getServicesByBusiness(businessId),
            getProfessionalsByBusiness(businessId),
            getBusinessReviews(businessId, 'approved', 10),
            hasCompletedAppointmentWithBusiness(user?.uid, businessId),
          ]);

          if (businessData) {
            console.log('BusinessDetailsScreen: Dados do negócio carregados com sucesso:', businessData.name);
            console.log('BusinessDetailsScreen: Reviews carregadas:', reviewsData.length);

            // Recalcular a contagem de avaliações para este negócio
            try {
              await updateBusinessRating(businessId);
            } catch (error) {
              console.error('Erro ao recalcular rating do negócio:', error);
              // Silently handle the error - rating recalculation is not critical
            }

            setBusiness(businessData);
            setServices(servicesData);
            setProfessionals(professionalsData);
            setReviews(reviewsData);
            setCanReview(hasCompletedAppointment);

            console.log('BusinessDetailsScreen: Pode avaliar?', hasCompletedAppointment);

            // Força re-render do mapa quando business muda
            setMapKey(prev => prev + 1);

            // Verificar disponibilidade dos profissionais
            if (professionalsData.length > 0 && businessData) {
              try {
                const availabilityMap = await checkMultipleProfessionalsAvailability(
                  professionalsData,
                  businessData,
                  7, // Verificar próximos 7 dias
                );
                setProfessionalAvailability(availabilityMap);
              } catch {
                // Em caso de erro, marcar todos como disponíveis para não bloquear funcionalidade
                const fallbackMap = new Map<string, boolean>();
                professionalsData.forEach(prof => fallbackMap.set(prof.id, true));
                setProfessionalAvailability(fallbackMap);
              }
            }

            // Definir localização (preferir dados da coleção businessLocations)
            // A localização agora é gerenciada diretamente pela propriedade business.location

            setIsBookingAvailable(businessData ? isBusinessOpen(businessData) : false);
          } else {
            Alert.alert(
              'Erro',
              'Não foi possível carregar os dados do estabelecimento.',
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          }
        } catch {
          Alert.alert(
            'Erro',
            'Ocorreu um erro ao carregar os dados do estabelecimento.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } finally {
          setIsLoading(false);
        }
      };

      loadData();

      return () => {
        // Optional: cleanup function if needed when screen goes out of focus
        // console.log('BusinessDetailsScreen unfocused');
      };
    }, [businessId, navigation, user]), // Adicionado `user` às dependências
  );

  useEffect(() => {
    if (business && services.length > 0 && professionals.length > 0) {
      setIsBookingAvailable(business ? isBusinessOpen(business) : false);
    }
  }, [business, services, professionals]);

  // Efeito para atualizar o estado isFavorite quando a lista de favoritos do contexto mudar
  useEffect(() => {
    if (business) {
      const favoriteStatus = favorites.some(fav => fav.businessId === business.id);
      setIsFavorite(favoriteStatus);
    }
  }, [favorites, business]);

  const handleToggleFavorite = async () => {
    if (!business) {
      return;
    }
    // Os campos necessários para toggleFavorite no AuthContext são:
    // id, name, address, rating, imageUrl, coverImage
    // O objeto 'business' já deve conter esses campos.
    try {
      await toggleFavorite({
        id: business.id, name: business.name,
        address: business.address,
        rating: business.rating,
        imageUrl: business.imageUrl,
        coverImage: business.coverImage,
      });
      // O estado local isFavorite será atualizado pelo useEffect acima quando 'favorites' mudar no contexto.
    } catch {
      // Erro ao adicionar/remover favorito - ignora silenciosamente
    }
  };

  const categories = ['Todos', ...Array.from(new Set(services.map(service => service.category)))];
  const filteredServices = activeCategory === 'Todos'
    ? services
    : services.filter(service => service.category === activeCategory);

  const handleServiceSelect = (service: Service) => { // Use Service type from services
    setSelectedService(service);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  const handleScheduleService = (professionalId: string) => {
    if (selectedService) {
      setIsModalVisible(false);
      navigation.navigate('AppointmentDateTime', {
        businessId,
        serviceId: selectedService.id || '', // Ensure serviceId is string
        professionalId,
        serviceName: selectedService.name,
        professionalName: professionals.find(p => p.id === professionalId)?.name || '',
      });
    }
  };

  const handleBookNow = () => {
    // Se houver apenas um serviço, abre a seleção de profissional diretamente
    if (filteredServices.length === 1) {
      handleServiceSelect(filteredServices[0]);
      return;
    }

    // Se houver múltiplos serviços, mostra um alerta para o usuário escolher
    const serviceOptions = filteredServices.map((service) => ({
      text: service.name,
      onPress: () => handleServiceSelect(service),
    }));

    Alert.alert(
      'Escolher Serviço',
      'Selecione o serviço que deseja agendar:',
      [
        ...serviceOptions,
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  };

  const handleSelectTimeSlot = (date: string, time: string, professionalId: string) => {
    if (selectedService) {
      setIsTimeSlotsModalVisible(false);
      navigation.navigate('BookingConfirmation', {
        businessId,
        serviceId: selectedService.id || '',
        professionalId,
        date: date,
        time: time,
      });
    }
  };

  const handleCloseTimeSlotsModal = () => {
    setIsTimeSlotsModalVisible(false);
    setSelectedService(null);
  };

  const handleSendMessage = async () => {
    if (business && user && user.userType === 'client') {
      try {
        // Criar ou obter o chat entre cliente e proprietário do estabelecimento
        const chatId = await createOrGetChat(user.uid, business.ownerId, business.id, business.name);

        navigation.navigate('Chat', {
          chatId: chatId,
          otherUserId: business.ownerId,
          otherUserName: business.name,
          businessId: business.id,
          businessName: business.name,
        });
      } catch {
        Alert.alert(
          'Erro',
          'Não foi possível iniciar a conversa. Tente novamente.',
          [{ text: 'OK' }],
        );
      }
    }
  };

  const renderProfessionalItem = ({ item }: { item: Professional }) => {
    const isAvailable = professionalAvailability.get(item.id) !== false;

    return (
      <TouchableOpacity
        style={[
          styles.professionalCard,
          !isAvailable && styles.professionalCardDisabled,
        ]}
        activeOpacity={isAvailable ? 0.7 : 1}
        onPress={() => {
          if (isAvailable) {
            setSelectedProfessional(item);
            setIsPortfolioModalVisible(true);
          }
        }}
      >
        <Image
          source={{ uri: item.image || 'https://via.placeholder.com/150' }}
          style={[
            styles.professionalImage,
            !isAvailable && styles.professionalImageDisabled,
          ]}
        />
        <Text style={[
          styles.professionalName,
          !isAvailable && styles.professionalTextDisabled,
        ]}>
          {item.name}
        </Text>
        <Text style={[
          styles.professionalSpecialty,
          !isAvailable && styles.professionalTextDisabled,
        ]}>
          {item.specialty}
        </Text>
        <View style={styles.ratingContainer}>
          <Text style={[
            styles.ratingIcon,
            !isAvailable && styles.professionalTextDisabled,
          ]}>
            ⭐
          </Text>
          <Text style={[
            styles.ratingText,
            !isAvailable && styles.professionalTextDisabled,
          ]}>
            {item.rating?.toFixed(1) || 'N/A'}
          </Text>
        </View>
        {item.instagram && isAvailable && (
          <View style={styles.instagramBadge}>
            <Icon name="camera-alt" size={12} color={colors.white} />
          </View>
        )}
        {!isAvailable && (
          <View style={styles.unavailableOverlay}>
            <Text style={styles.unavailableText}>Indisponível</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const formatReviewDate = (date: any) => {
    try {
      if (!date) return 'Data não disponível';

      // Se for um Timestamp do Firebase
      if (date.seconds) {
        return new Date(date.seconds * 1000).toLocaleDateString('pt-BR');
      }

      // Se for uma data normal
      if (date instanceof Date) {
        return date.toLocaleDateString('pt-BR');
      }

      // Se for uma string
      if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('pt-BR');
      }

      return 'Data não disponível';
    } catch (error) {
      console.error('Erro ao formatar data da avaliação:', error);
      return 'Data não disponível';
    }
  };

  const renderReviewItem = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewUserName}>{item.userName}</Text>
        <Text style={styles.reviewDate}>
          {formatReviewDate(item.date)}
        </Text>
      </View>
      <View style={styles.ratingContainer}>
        {[...Array(5)].map((_, i) => (
          <Icon
            key={i}
            name={i < item.rating ? 'star' : 'star-border'}
            size={16}
            color="#FFD700"
            style={styles.ratingIcon}
          />
        ))}
      </View>
      <Text style={styles.reviewComment}>{item.comment}</Text>
      {item.response && item.response.text ? (
        <View style={styles.ownerResponseContainer}>
          <View style={styles.ownerResponseHeader}>
            <Icon name="reply" size={14} color="#d31027" />
            <Text style={styles.ownerResponseLabel}>Resposta do estabelecimento</Text>
          </View>
          <Text style={styles.ownerResponseText}>{item.response.text}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando detalhes do estabelecimento...</Text>
        </View>
      ) : business ? (
        <>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header com imagem e botões */}
            <View style={styles.headerContainer}>
              <ImageBackground
                source={{
                  uri: coverImageSource || (business.imageUrl && business.imageUrl.trim() !== ''
                    ? business.imageUrl
                    : 'https://via.placeholder.com/400x200')
                }}
                style={styles.headerImage}
              >
                {coverImageLoading && (
                  <View style={styles.coverImageLoadingOverlay}>
                    <ActivityIndicator size="large" color={colors.white} />
                  </View>
                )}
                <View style={styles.headerOverlay}>
                  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleToggleFavorite} style={styles.favoriteButton}>
                    <Icon name={isFavorite ? 'favorite' : 'favorite-border'} size={24} color={colors.white} />
                  </TouchableOpacity>
                </View>
                {/* Logo sobreposta estilo Facebook */}
                <View style={styles.logoOverlayContainer}>
                  {business?.logo ? (
                    <StorageImage storagePath={business.logo} style={styles.logoOverlay} />
                  ) : (
                    <View style={[styles.logoOverlay, styles.logoPlaceholder]}>
                      <Icon name="business" size={36} color={colors.lightText} />
                    </View>
                  )}
            </View>
              </ImageBackground>
            </View>

            {/* Informações do negócio */}
            <View style={styles.businessInfoContainer}>
              <Text style={styles.businessName}>{business?.name || 'Nome não disponível'}</Text>
              <View style={styles.ratingRow}>
                <Icon name="star" size={16} color={colors.primary} style={styles.ratingIcon} />
                <Text style={styles.ratingValue}>{business.rating?.toFixed(1) || 'N/A'}</Text>
                <Text style={styles.reviewCount}>({business.reviewCount || 0} avaliações)</Text>
              </View>
              <View style={styles.addressRow}>
                <Icon name="location-on" size={16} color={colors.text} style={styles.addressIcon} />
                <Text style={styles.addressText} numberOfLines={1}>{fullAddress || 'Endereço não disponível'}</Text>
              </View>
              <View style={styles.hoursRow}>
                <Icon name="schedule" size={16} color={colors.text} style={styles.hoursIcon} />
                {/* Lógica para exibir horário de funcionamento */}
                <Text style={styles.hoursText}>Aberto · {business.workingHours?.monday?.start || '09:00'} - {business.workingHours?.monday?.end || '18:00'}</Text>
              </View>
              <TouchableOpacity style={styles.seeAllPhotosButton} onPress={() => setIsGalleryVisible(true)}>
                <Text style={styles.seeAllPhotosText}>Ver todas as fotos</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sobre o estabelecimento</Text>
              <Text style={styles.description}>{business.description}</Text>
            </View>

            {/* Seção de Contatos */}
            <View style={styles.contactContainer}>
              <Text style={styles.sectionTitle}>Contato</Text>
              <View style={styles.contactRow}>
                <Icon name="phone" size={16} color={colors.text} style={styles.contactIcon} />
                <Text style={styles.contactText}>{business.phone || 'Telefone não informado'}</Text>
              </View>
              {business.instagram ? (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => {
                    const username = (business.instagram || '').replace('@', '').trim();
                    if (!username) return;
                    const appUrl = `instagram://user?username=${username}`;
                    const webUrl = `https://instagram.com/${username}`;
                    Linking.canOpenURL(appUrl).then((supported) => {
                      Linking.openURL(supported ? appUrl : webUrl);
                    });
                  }}
                >
                  <Icon name="camera-alt" size={16} color={colors.text} style={styles.contactIcon} />
                  <Text style={[styles.contactText, { color: '#d31027' }]}>{business.instagram}</Text>
                </TouchableOpacity>
              ) : null}
              <View style={styles.contactRow}>
                <Icon name="email" size={16} color={colors.text} style={styles.contactIcon} />
                <Text style={styles.contactText}>{business.email || 'Email não informado'}</Text>
              </View>
              {/* Botão de mensagem apenas para clientes */}
              {user?.userType === 'client' && (
                <TouchableOpacity style={styles.messageButton} onPress={handleSendMessage}>
                  <Icon name="chat" size={18} color={colors.white} style={styles.messageButtonIcon} />
                  <Text style={styles.messageButtonText}>Enviar Mensagem</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Categorias de serviços */}
            <View style={styles.categoriesContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesScrollContent}
              >
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      activeCategory === category && styles.activeCategoryButton,
                    ]}
                    onPress={() => setActiveCategory(category)}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        activeCategory === category && styles.activeCategoryButtonText,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Lista de serviços */}
            <View style={styles.servicesContainer}>
              <Text style={styles.sectionTitle}>Serviços</Text>
              {filteredServices.length > 0 ? (
                filteredServices.map((service) => (
                  <View key={service.id} style={styles.serviceCard}>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>{service.name}</Text>
                      <Text style={styles.serviceDescription}>{service.description}</Text>
                      <View style={styles.serviceDetails}>
                        <Text style={styles.serviceDuration}>⏱️ {service.duration}</Text>
                        {service.isPromotionActive && service.promotionalPrice ? (
                          <View style={styles.promotionPriceContainer}>
                            <Text style={styles.servicePriceOriginal}>R$ {service.price.toFixed(2)}</Text>
                            <Text style={styles.servicePricePromotional}>R$ {service.promotionalPrice.toFixed(2)}</Text>
                            {service.discountPercentage ? (
                              <View style={styles.discountBadge}>
                                <Text style={styles.discountBadgeText}>-{service.discountPercentage}%</Text>
                              </View>
                            ) : null}
                          </View>
                        ) : (
                          <Text style={styles.servicePrice}>R$ {service.price.toFixed(2)}</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.serviceActionsContainer}>
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => handleServiceSelect(service)}
                      >
                        <Text style={styles.addButtonText}>+</Text>
                      </TouchableOpacity>
                      {canReview && (
                        <TouchableOpacity
                          style={styles.reviewServiceButton}
                          onPress={() => {
                            try {
                              if (business && service?.id) {
                                navigation.navigate('Review', {
                                  businessId: business.id,
                                  businessName: business.name,
                                  serviceId: service.id,
                                });
                              } else {
                                Alert.alert(
                                  'Erro',
                                  'Dados do estabelecimento ou serviço não disponíveis.',
                                  [{ text: 'OK' }],
                                );
                              }
                            } catch (error) {
                              console.error('Erro ao navegar para tela de avaliação de serviço:', error);
                              Alert.alert(
                                'Erro',
                                'Não foi possível abrir a tela de avaliação. Tente novamente.',
                                [{ text: 'OK' }],
                              );
                            }
                          }}
                        >
                          <Icon name="star-outline" size={20} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noReviewsText}>Nenhum serviço encontrado para esta categoria.</Text>
              )}
            </View>

            {/* Profissionais */}
            <View style={styles.professionalsContainer}>
              <Text style={styles.sectionTitle}>Nossos Especialistas</Text>
              <FlatList
                data={professionals}
                renderItem={renderProfessionalItem}
                keyExtractor={(item) => item.id || item.name} // Fallback para item.name se id for undefined
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.professionalsListContent}
              />
            </View>

            {/* Avaliações */}
            <View style={styles.reviewsContainer}>
              <View style={styles.reviewsHeaderContainer}>
                <Text style={styles.sectionTitle}>Avaliações ({String(reviews.length)})</Text>
                <TouchableOpacity
                  style={[
                    styles.addReviewButton,
                    !canReview && styles.disabledButton,
                  ]}
                  onPress={() => {
                    if (canReview) {
                      try {
                        if (business?.id && business?.name) {
                          console.log('Navegando para tela de avaliação geral do business:', business.id);
                          navigation.navigate('Review', {
                            businessId: business.id,
                            businessName: business.name,
                            serviceId: null, // General business review, no specific service
                            // appointmentId não é necessário para avaliação geral do negócio
                          });
                        } else {
                          Alert.alert(
                            'Erro',
                            'Dados do estabelecimento não disponíveis.',
                            [{ text: 'OK' }],
                          );
                        }
                      } catch (error) {
                        console.error('Erro ao navegar para tela de avaliação:', error);
                        Alert.alert(
                          'Erro',
                          'Não foi possível abrir a tela de avaliação. Tente novamente.',
                          [{ text: 'OK' }],
                        );
                      }
                    } else {
                      Alert.alert(
                        'Avaliação não disponível',
                        'Só é possível avaliar após realização de serviço.',
                        [{ text: 'OK' }],
                      );
                    }
                  }}
                >
                  <Text style={[
                    styles.addReviewButtonText,
                    !canReview && styles.disabledButtonText,
                  ]}>
                    Avaliar
                  </Text>
                </TouchableOpacity>
              </View>
              {reviews.length > 0 ? (
                <>
                  <FlatList
                    data={showAllReviews ? reviews : reviews.slice(0, 4)}
                    renderItem={renderReviewItem}
                    keyExtractor={(item) => item.id || item.comment}
                    horizontal={false}
                    showsHorizontalScrollIndicator={false}
                  />
                  {!showAllReviews && reviews.length > 4 && (
                    <TouchableOpacity
                      style={styles.verMaisButton}
                      onPress={() => setShowAllReviews(true)}
                    >
                      <Text style={styles.verMaisButtonText}>
                        Ver mais {reviews.length - 4} avaliações
                      </Text>
                    </TouchableOpacity>
                  )}
                  {showAllReviews && reviews.length > 4 && (
                    <TouchableOpacity
                      style={styles.verMaisButton}
                      onPress={() => setShowAllReviews(false)}
                    >
                      <Text style={styles.verMaisButtonText}>Ver menos</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Text style={styles.noReviewsText}>Ainda não há avaliações para este estabelecimento.</Text>
              )}
            </View>

            {/* Localização */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Localização</Text>
              {business?.location?.latitude && business?.location?.longitude ? (
                <View style={styles.mapContainer}>
                  {isMapMounted ? (
                  <LeafletMap
                    style={styles.map}
                    initialRegion={{
                      latitude: business.location.latitude,
                      longitude: business.location.longitude,
                      zoom: 16,
                    }}
                    markers={[{
                      id: business.id,
                      latitude: business.location.latitude,
                      longitude: business.location.longitude,
                      logoUrl: business.logo || business.coverImage,
                      name: business.name,
                      category: business.category,
                    }]}
                    showUserLocation={true}
                  />
                  ) : (
                    <View style={[styles.map, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
                      <ActivityIndicator color="#d31027" />
                    </View>
                  )}
                </View>
              ) : business?.address ? (
                <View style={styles.mapContainer}>
                  <View style={styles.mapPlaceholder}>
                    <Icon name="location-on" size={48} color={colors.primary} />
                    <Text style={styles.mapPlaceholderText}>
                      Localizando endereço no mapa...
                    </Text>
                    <Text style={styles.addressText}>{business.address}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noReviewsText}>Localização não disponível.</Text>
              )}
              <Text style={styles.addressText}>{fullAddress || 'Endereço não informado'}</Text>
            </View>
          </ScrollView>

          {/* Botão de reserva */}
          <View style={styles.bookingButtonContainer}>
            <TouchableOpacity
              style={[
                styles.bookingButton,
                !isBookingAvailable && styles.disabledButton,
              ]}
              onPress={handleBookNow}
              disabled={!isBookingAvailable}
            >
              <Text style={[
                styles.bookingButtonText,
                !isBookingAvailable && styles.disabledButtonText,
              ]}>
                {isBookingAvailable ? 'Reservar' : 'Indisponível no momento'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Modal de detalhes do serviço */}
          {selectedService && (
            <ServiceDetailsModal
              visible={isModalVisible}
              onClose={handleCloseModal}
              onSchedule={handleScheduleService}
              service={selectedService!} // Usar non-null assertion se temos certeza que selectedService não é null aqui
              professionals={professionals}
            />
          )}

          {/* Modal de seleção de horários */}
          {selectedService && business && (
            <TimeSlotsModal
              visible={isTimeSlotsModalVisible}
              onClose={handleCloseTimeSlotsModal}
              onSelectTimeSlot={handleSelectTimeSlot}
              business={business}
              service={selectedService}
              professionals={professionals.filter(prof =>
                professionalAvailability.get(prof.id) !== false,
              )}
            />
          )}
          {/* Modal de galeria de fotos/video */}
          {business && (
            <GalleryViewerModal
              visible={isGalleryVisible}
              onClose={() => setIsGalleryVisible(false)}
              businessName={business.name || ''}
              items={[
                ...(((business as any).gallery || []) as string[]).map(
                  (path: string) => ({ type: 'photo', storagePath: path } as GalleryItem),
                ),
                ...((business as any).galleryVideo
                  ? [{ type: 'video', storagePath: (business as any).galleryVideo } as GalleryItem]
                  : []),
              ]}
            />
          )}

          {/* Modal de portfólio do profissional */}
          {isPortfolioModalVisible && selectedProfessional && (
            <ProfessionalPortfolioModal
              visible={isPortfolioModalVisible}
              onClose={() => {
                setIsPortfolioModalVisible(false);
                setSelectedProfessional(null);
              }}
              professional={selectedProfessional}
            />
          )}
        </>) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Estabelecimento não encontrado</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    width: '100%',
    aspectRatio: 3,
  },
  logoOverlayContainer: {
    position: 'absolute',
    left: 16,
    bottom: -45, // metade da altura da logo (90/2) - faz ela sair pra fora da capa
    zIndex: 10,
  },
  logoOverlay: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  logoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    height: '100%',
  },
  coverImageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessInfoContainer: {
    paddingTop: 60,
    // espaco para a logo sobreposta
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 14,
    color: colors.text,
    marginRight: 8,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 14,
    color: colors.lightText,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  addressText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  hoursIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  hoursText: {
    fontSize: 14,
    color: colors.text,
  },
  seeAllPhotosButton: {
    backgroundColor: colors.lightGray,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  seeAllPhotosText: {
    fontSize: 14,
    color: colors.text,
  },
  categoriesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  categoriesScrollContent: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: colors.lightGray,
  },
  activeCategoryButton: {
    backgroundColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  activeCategoryButtonText: {
    color: colors.white,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  description: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  servicesContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: colors.lightText,
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceDuration: {
    fontSize: 14,
    color: colors.lightText,
    marginRight: 16,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  promotionPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  servicePriceOriginal: {
    fontSize: 13,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  servicePricePromotional: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d31027',
    marginRight: 8,
  },
  discountBadge: {
    backgroundColor: '#d31027',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  discountBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  serviceActionsContainer: { // Styles for the new container
    flexDirection: 'column',
    alignItems: 'center',
  },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 20,
    color: colors.white,
    fontWeight: 'bold',
  },
  reviewServiceButton: { // Styles for the new review service button
    marginTop: 8,
    padding: 5, // Make it a bit smaller
    // Add other styling as needed, e.g., border
  },
  professionalsContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  professionalsListContent: {
    paddingRight: 16,
  },
  professionalCard: {
    width: 120,
    marginRight: 16,
    alignItems: 'center',
  },
  professionalImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  professionalSpecialty: {
    fontSize: 14,
    color: colors.lightText,
    textAlign: 'center',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  reviewsContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  reviewsHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addReviewButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  addReviewButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: colors.lightGray,
    opacity: 0.7,
  },
  disabledButtonText: {
    color: colors.lightText,
  },
  reviewCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewUserName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.lightText,
  },
  reviewComment: {
    fontSize: 14,
    color: colors.text,
    marginTop: 4,
  },
  ownerResponseContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9f0f2',
    borderLeftWidth: 3,
    borderLeftColor: '#d31027',
    borderRadius: 6,
  },
  ownerResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ownerResponseLabel: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#d31027',
  },
  ownerResponseText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  verMaisButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d31027',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  verMaisButtonText: {
    color: '#d31027',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noReviewsText: {
    fontSize: 14,
    color: colors.lightText,
    textAlign: 'center',
    paddingVertical: 20,
  },
  locationContainer: {
    padding: 16,
  },
  mapContainer: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.lightGray,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: colors.lightText,
  },
  bookingButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    backgroundColor: colors.background,
  },
  bookingButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bookingButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  // Estilos para profissionais indisponíveis
  professionalCardDisabled: {
    opacity: 0.5,
  },
  professionalImageDisabled: {
    opacity: 0.6,
  },
  professionalTextDisabled: {
    color: colors.lightText,
    opacity: 0.7,
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  // Estilos para a seção de contatos
  contactContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  contactText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  messageButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageButtonIcon: {
    marginRight: 8,
  },
  messageButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  instagramBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BusinessDetailsScreen;
