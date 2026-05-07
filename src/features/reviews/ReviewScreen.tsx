import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';
import { useAuth } from '../auth/context/AuthContext';
import { addReview } from '../../services/reviews';
import { getProfessionalById, Professional } from '../../services/professionals';
import { firestore, collection, query, where, getDocs } from '../../config/firebase';
import { useResolvedFirebaseUrl } from '../../hooks/useResolvedFirebaseUrl';

interface ReviewScreenParams {
  businessId: string;
  businessName: string;
  serviceId: string | null; // Allow null for general business reviews
  professionalId?: string;
  professionalName?: string;
  appointmentId?: string; // Tornar opcional para permitir avaliações gerais
}

const ReviewScreen: React.FC = () => {
  const [rating, setRating] = useState(0);
  const [professionalRating, setProfessionalRating] = useState(0);
  const [professional, setProfessional] = useState<Professional | null>(null);
  const professionalImageUrl = useResolvedFirebaseUrl(professional?.image);
  useEffect(() => {
    let mounted = true;
    if (route.params && (route.params as ReviewScreenParams).professionalId) {
      const pid = (route.params as ReviewScreenParams).professionalId!;
      getProfessionalById(pid)
        .then((p) => { if (mounted) setProfessional(p); })
        .catch((err) => console.warn('[ReviewScreen] erro ao buscar profissional:', err?.message));
    }
    return () => { mounted = false; };
  }, [route.params]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { businessId, businessName, serviceId, professionalId, professionalName, appointmentId } =
    route.params as ReviewScreenParams;

  const screenTitle = serviceId ? 'Avaliar Serviço' : 'Avaliar Estabelecimento';

  const renderStars = (currentRating: number, setCurrentRating: (n: number) => void) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setCurrentRating(i)}
          style={styles.starButton}
        >
          <Icon
            name={i <= currentRating ? 'star' : 'star-border'}
            size={40}
            color={i <= currentRating ? '#FFD700' : colors.lightText}
          />
        </TouchableOpacity>,
      );
    }
    return stars;
  };

  const getRatingText = (r: number) => {
    switch (r) {
      case 1: return 'Muito Ruim';
      case 2: return 'Ruim';
      case 3: return 'Regular';
      case 4: return 'Bom';
      case 5: return 'Excelente';
      default: return 'Toque nas estrelas para avaliar';
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert('Avaliação obrigatória', 'Por favor, selecione uma classificação de 1 a 5 estrelas.');
      return;
    }

    if (comment.trim().length < 10) {
      Alert.alert('Comentário muito curto', 'Por favor, escreva um comentário de pelo menos 10 caracteres.');
      return;
    }

    // Allow reviews without serviceId for general business reviews
    // if (!serviceId) { // Remove this check since general business reviews don't have serviceId
    //   Alert.alert('Erro', 'ID do serviço não encontrado. Não é possível enviar a avaliação.');
    //   return;
    // }

    try {
      setIsSubmitting(true);
      
      // Verificar se o usuario ja avaliou este estabelecimento (limite 1 por cliente)
      // Buscamos direto na subcolecao do business para nao precisar de indice composto
      if (user?.uid) {
        try {
          const reviewsRef = collection(firestore, 'businesses', businessId, 'reviews');
          const q = query(reviewsRef, where('userId', '==', user.uid));
          const snap = await getDocs(q);
          if (!snap.empty) {
            // Verificar se algum nao esta rejeitado (rejeitado pode reavaliar)
            const hasActiveReview = snap.docs.some(d => {
              const data = d.data();
              return data.status !== 'rejected';
            });
            if (hasActiveReview) {
              setIsSubmitting(false);
              Alert.alert(
                'Avaliacao ja realizada',
                'Voce ja avaliou este estabelecimento. Cada cliente pode fazer apenas uma avaliacao.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
              return;
            }
          }
        } catch (checkErr) {
          console.warn('Erro ao verificar avaliacoes anteriores:', checkErr);
          // Nao bloquear se falhar a verificacao
        }
      }
      
      // Construir objeto removendo campos undefined (Firestore nao aceita undefined)
      // Avaliacao UNIFICADA: 1 review com nota do estabelecimento + nota do profissional + comentario
      const reviewData: any = {
        businessId,
        userId: user?.uid || 'anonymous',
        userName: user?.displayName || user?.email?.split('@')[0] || 'Usuario Anonimo',
        rating, // Nota do estabelecimento
        comment: comment.trim(),
      };
      if (serviceId) { reviewData.serviceId = serviceId; }
      if (appointmentId) { reviewData.appointmentId = appointmentId; }
      // Adicionar dados do profissional se houver
      if (professionalId) {
        reviewData.professionalId = professionalId;
        reviewData.professionalName = professionalName;
        if (professionalRating > 0) {
          reviewData.professionalRating = professionalRating;
        }
      }
      
      await addReview(reviewData);

      Alert.alert(
        'Avaliação enviada!',
        'Avaliacao enviada! Aguardando aprovacao do estabelecimento. Apos aprovada, ela aparecera na pagina.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);

      Alert.alert(
        'Erro ao enviar',
        'Não foi possível enviar sua avaliação. Tente novamente.',
        [{ text: 'OK' }],
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{screenTitle}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Informações do serviço */}
        <View style={styles.serviceInfo}>
          <Icon name="business" size={24} color={colors.primary} />
          <View style={styles.serviceDetails}>
            <Text style={styles.businessName}>{businessName}</Text>
            {professionalName && (
              <Text style={styles.professionalName}>Profissional: {professionalName}</Text>
            )}
          </View>
        </View>

        {/* Avaliacao por estrelas - Estabelecimento */}
        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>Como foi sua experiencia no estabelecimento?</Text>
          <View style={styles.starsContainer}>
            {renderStars(rating, setRating)}
          </View>
          <Text style={styles.ratingText}>{getRatingText(rating)}</Text>
        </View>
        {/* Avaliacao do profissional */}
        {professionalId && professionalName ? (
          <View style={styles.ratingSection}>
            <View style={styles.professionalAvatarContainer}>
              {professionalImageUrl ? (
                <Image
                  source={{ uri: professionalImageUrl }}
                  style={styles.professionalAvatar}
                />
              ) : (
                <View style={styles.professionalAvatarFallback}>
                  <Text style={styles.professionalAvatarFallbackText}>
                    {(professionalName || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.sectionTitle}>Como foi o atendimento de {professionalName}?</Text>
            <View style={styles.starsContainer}>
              {renderStars(professionalRating, setProfessionalRating)}
            </View>
            <Text style={styles.ratingText}>{getRatingText(professionalRating)}</Text>
          </View>
        ) : null}

        {/* Comentário */}
        <View style={styles.commentSection}>
          <Text style={styles.sectionTitle}>Conte-nos mais sobre sua experiência</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Escreva seu comentário aqui... (mínimo 10 caracteres)"
            placeholderTextColor={colors.lightText}
            multiline
            numberOfLines={4}
            maxLength={500}
            value={comment}
            onChangeText={setComment}
          />
          <Text style={styles.characterCount}>{comment.length}/500</Text>
        </View>

        {/* Dicas */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Dicas para uma boa avaliação:</Text>
          <Text style={styles.tip}>• Seja específico sobre o que gostou ou não gostou</Text>
          <Text style={styles.tip}>• Mencione a qualidade do atendimento</Text>
          <Text style={styles.tip}>• Comente sobre a pontualidade</Text>
          <Text style={styles.tip}>• Seja respeitoso em seus comentários</Text>
        </View>

        {/* Botão de envio */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitReview}
          disabled={isSubmitting || rating === 0 || (!!professionalId && professionalRating === 0)}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  }, header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerSpacer: {
    width: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  serviceDetails: {
    marginLeft: 12,
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  professionalName: {
    fontSize: 14,
    color: colors.lightText,
    marginTop: 4,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  professionalAvatarContainer: {
    marginBottom: 12,
    alignItems: 'center',
  },
  professionalAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  professionalAvatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  professionalAvatarFallbackText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: 'bold',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starButton: {
    marginHorizontal: 4,
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  commentSection: {
    marginBottom: 24,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    color: colors.lightText,
    marginTop: 8,
  },
  tipsSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  tip: {
    fontSize: 14,
    color: colors.lightText,
    marginBottom: 4,
    paddingLeft: 8,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitButtonDisabled: {
    backgroundColor: colors.lightGray,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
});

export default ReviewScreen;
