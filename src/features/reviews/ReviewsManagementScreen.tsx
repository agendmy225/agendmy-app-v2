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
import {
  firestore,
  serverTimestamp,
  Timestamp,
  collection,
  query,
  where,
  limit,
  getDocs,
  doc,
  orderBy,
  updateDoc,
} from '../../config/firebase';
import { colors } from '../../constants/colors';
import { useAuth } from '../auth/context/AuthContext';
import { Review } from '../../services/reviews';

const ReviewsManagementScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  const fetchBusinessId = useCallback(async () => {
    if (!user) { return; }

    try {
      // Buscar o ID do estabelecimento do proprietÃ¡rio atual
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
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, [user]);
  const loadReviews = useCallback(async () => {
    if (!businessId) { return; }

    try {
      setLoading(true);

      // Buscar avaliaÃ§Ãµes do estabelecimento - correÃ§Ã£o: usar subcoleÃ§Ã£o dentro do business
      const reviewsQuery = query(
        collection(firestore, 'businesses', businessId, 'reviews'),
        orderBy('date', 'desc')
      );
      const reviewsSnapshot = await getDocs(reviewsQuery);

      const reviewsData: Review[] = [];

      reviewsSnapshot.forEach((docSnapshot: any) => {
        reviewsData.push({
          id: docSnapshot.id,
          ...docSnapshot.data() as Review,
        });
      });

      // Simplesmente definir os dados reais, ou um array vazio se nÃ£o houver dados
      setReviews(reviewsData);
      // setFilteredReviews(reviewsData); // filterReviews farÃ¡ isso
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar avaliaÃ§Ãµes:', error);
      setReviews([]); // Define array vazio em caso de erro
      setLoading(false);
    }
  }, [businessId]);
  const filterReviews = useCallback(() => {
    let filtered = [...reviews];

    // Filtrar por status
    if (activeFilter !== 'all') {
      filtered = filtered.filter(review => review.status === activeFilter);
    }

    // Filtrar por texto de busca
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        review =>
          review.userName.toLowerCase().includes(searchLower) ||
          review.comment.toLowerCase().includes(searchLower) ||
          (review.professionalName && review.professionalName.toLowerCase().includes(searchLower)),
      );
    }

    setFilteredReviews(filtered);
  }, [reviews, activeFilter, searchText]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  };
  const approveReview = async (reviewId: string) => {
    if (!businessId) return;
    try {
      const reviewRef = doc(firestore, 'businesses', businessId, 'reviews', reviewId);
      await updateDoc(reviewRef, { status: 'approved' });

      const updatedReviews = reviews.map(review => {
        if (review.id === reviewId) {
          return { ...review, status: 'approved' as const };
        }
        return review;
      });

      setReviews(updatedReviews);

      Alert.alert('Sucesso', 'AvaliaÃ§Ã£o aprovada com sucesso!');
    } catch {
      Alert.alert('Erro', 'Ocorreu um erro ao aprovar a avaliaÃ§Ã£o. Tente novamente.');
    }
  };

  const rejectReview = async (reviewId: string) => {
    if (!businessId) return;
    try {
      const reviewRef = doc(firestore, 'businesses', businessId, 'reviews', reviewId);
      await updateDoc(reviewRef, { status: 'rejected' });

      const updatedReviews = reviews.map(review => {
        if (review.id === reviewId) {
          return { ...review, status: 'rejected' as const };
        }
        return review;
      });

      setReviews(updatedReviews);

      Alert.alert('Sucesso', 'AvaliaÃ§Ã£o rejeitada com sucesso!');
    } catch {
      Alert.alert('Erro', 'Ocorreu um erro ao rejeitar a avaliaÃ§Ã£o. Tente novamente.');
    }
  };

  const openResponseModal = (review: Review) => {
    setSelectedReview(review);
    setResponseText(review.response?.text || '');
    setResponseModalVisible(true);
  };

  const submitResponse = async () => {
    if (!selectedReview || !responseText.trim()) {
      Alert.alert('Erro', 'Por favor, digite uma resposta.');
      return;
    }

    try {
      setSubmittingResponse(true);
      if (!businessId) {
        throw new Error('Business ID not found');
      }
      const reviewRef = doc(firestore, 'businesses', businessId, 'reviews', selectedReview.id!);
      await updateDoc(reviewRef, {
        response: {
          text: responseText,
          date: serverTimestamp(),
        },
        status: 'responded', // Opcional: atualizar status para indicar que foi respondido
      });

      // Atualizar localmente apÃ³s sucesso
      const updatedReviews = reviews.map(review => {
        if (review.id === selectedReview.id) {
          return {
            ...review,
            response: {
              text: responseText,
              date: Timestamp.now(), // Usar Timestamp.now() para consistÃªncia local
            },
            status: 'responded' as Review['status'], // Atualizar status localmente
          };
        }
        return review;
      });
      setReviews(updatedReviews);


      setResponseModalVisible(false);
      setSelectedReview(null);
      setResponseText('');

      Alert.alert('Sucesso', 'Resposta enviada com sucesso!');
      loadReviews(); // Recarregar as avaliaÃ§Ãµes para refletir a mudanÃ§a
      setSubmittingResponse(false);
    } catch {
      Alert.alert('Erro', 'Ocorreu um erro ao enviar a resposta. Tente novamente.');
      setSubmittingResponse(false);
    }
  };

  const formatDate = (timestamp: any) => {
    try {
      if (!timestamp) return '';

      // Se for um Timestamp do Firebase com toDate()
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString('pt-BR');
      }

      // Se for um Timestamp do Firebase com seconds
      if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('pt-BR');
      }

      // Se for uma data normal
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString('pt-BR');
      }

      // Se for uma string
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString('pt-BR');
      }

      return '';
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return '';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'approved':
        return 'Aprovada';
      case 'rejected':
        return 'Rejeitada';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'approved':
        return colors.success;
      case 'rejected':
        return colors.error;
      default:
        return colors.lightText;
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={[styles.starIcon, i <= rating && styles.filledStar]}>
          {i <= rating ? 'â˜…' : 'â˜†'}
        </Text>,
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderReviewItem = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.userName}</Text>
          <Text style={styles.reviewDate}>{formatDate(item.date)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.ratingContainer}>
        {renderStars(item.rating)}
        {item.professionalName && (
          <Text style={styles.professionalName}>
            Profissional: {item.professionalName}
          </Text>
        )}
      </View>

      <Text style={styles.reviewComment}>{item.comment}</Text>

      {item.response && (
        <View style={styles.responseContainer}>
          <Text style={styles.responseLabel}>Sua resposta:</Text>
          <Text style={styles.responseText}>{item.response.text}</Text>
          <Text style={styles.responseDate}>
            Respondido em {formatDate(item.response.date)}
          </Text>
        </View>
      )}

      <View style={styles.actionsContainer}>
        {item.status === 'pending' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => approveReview(item.id!)}
            >
              <Text style={styles.actionButtonText}>Aprovar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => rejectReview(item.id!)}
            >
              <Text style={styles.actionButtonText}>Rejeitar</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.respondButton]}
          onPress={() => openResponseModal(item)}
        >
          <Text style={styles.actionButtonText}>            {item.response ? 'Editar Resposta' : 'Responder'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  useEffect(() => {
    fetchBusinessId();
  }, [fetchBusinessId]);

  useEffect(() => {
    if (businessId) {
      loadReviews();
    }
  }, [businessId, loadReviews]);

  useEffect(() => {
    filterReviews();
  }, [filterReviews]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando avaliaÃ§Ãµes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gerenciar AvaliaÃ§Ãµes</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por cliente, comentÃ¡rio ou profissional"
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
              Todas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'pending' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('pending')}
          >
            <Text style={[styles.filterText, activeFilter === 'pending' && styles.activeFilterText]}>
              Pendentes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'approved' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('approved')}
          >
            <Text style={[styles.filterText, activeFilter === 'approved' && styles.activeFilterText]}>
              Aprovadas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'rejected' && styles.activeFilterButton]}
            onPress={() => setActiveFilter('rejected')}
          >
            <Text style={[styles.filterText, activeFilter === 'rejected' && styles.activeFilterText]}>
              Rejeitadas
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <FlatList
        data={filteredReviews}
        renderItem={renderReviewItem}
        keyExtractor={(item) => item.id!}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma avaliaÃ§Ã£o encontrada</Text>
          </View>
        }
      />

      {/* Modal para responder avaliaÃ§Ã£o */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={responseModalVisible}
        onRequestClose={() => setResponseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedReview?.response ? 'Editar Resposta' : 'Responder AvaliaÃ§Ã£o'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setResponseModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>âœ•</Text>
              </TouchableOpacity>
            </View>

            {selectedReview && (
              <View style={styles.modalContent}>
                <View style={styles.reviewSummary}>
                  <Text style={styles.reviewSummaryName}>{selectedReview.userName}</Text>
                  <View style={styles.reviewSummaryRating}>
                    {renderStars(selectedReview.rating)}
                  </View>
                  <Text style={styles.reviewSummaryComment}>{selectedReview.comment}</Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Sua Resposta</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={responseText}
                    onChangeText={setResponseText}
                    placeholder="Digite sua resposta para esta avaliaÃ§Ã£o..."
                    multiline
                    numberOfLines={6}
                  />
                </View>
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setResponseModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={submitResponse}
                disabled={submittingResponse}
              >
                {submittingResponse ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Enviar</Text>
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
  reviewCard: {
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
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.lightText,
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
  ratingContainer: {
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  starIcon: {
    fontSize: 18,
    color: colors.lightText,
    marginRight: 2,
  },
  filledStar: {
    color: '#FFD700',
  },
  professionalName: {
    fontSize: 12,
    color: colors.lightText,
  },
  reviewComment: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 15,
    lineHeight: 20,
  },
  responseContainer: {
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  responseText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 5,
  },
  responseDate: {
    fontSize: 10,
    color: colors.lightText,
    textAlign: 'right',
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
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  respondButton: {
    backgroundColor: colors.primary,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  modalContent: {
    padding: 15,
  },
  reviewSummary: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  reviewSummaryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  reviewSummaryRating: {
    marginBottom: 5,
  },
  reviewSummaryComment: {
    fontSize: 14,
    color: colors.text,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 5,
    marginRight: 10,
    backgroundColor: colors.lightGray,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: 'bold',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  submitButtonText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: 'bold',
  },
});

export default ReviewsManagementScreen;
