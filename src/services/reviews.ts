// Following React Native Firebase v22 modular API patterns
// https://rnfirebase.io/migrating-to-v22
import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  firebaseDb,
  Timestamp,
} from '../config/firebase';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// Tipos
export interface Review {
  id?: string;
  businessId: string;
  userId: string;
  userName: string;
  serviceId?: string; // Adicionar serviceId opcional
  professionalId?: string;
  professionalName?: string;
  appointmentId?: string;
  rating: number;
  comment: string;
  date: Timestamp; // Timestamp
  status: 'pending' | 'approved' | 'rejected';
  response?: {
    text: string;
    date: Timestamp; // Timestamp
  };
}

// Adicionar uma nova avaliação
export const addReview = async (
  review: Omit<Review, 'id' | 'date' | 'status'>,
): Promise<string> => {
  try {
    console.log('Adicionando nova avaliação:', { businessId: review.businessId, userId: review.userId, rating: review.rating });

    const reviewData = {
      ...review,
      date: serverTimestamp(),
      status: 'pending', // Avaliacoes vem como pendentes - precisam ser aprovadas pelo dono
    };

    const reviewsCollectionRef = collection(
      firebaseDb,
      'businesses',
      review.businessId,
      'reviews',
    );
    const docRef = await addDoc(reviewsCollectionRef, reviewData);

    console.log('Avaliação adicionada com sucesso, ID:', docRef.id);

    // Atualizar média de avaliações do estabelecimento
    await updateBusinessRating(review.businessId);

    // Atualizar média de avaliações do profissional, se aplicável
    if (review.professionalId) {
      await updateProfessionalRating(review.professionalId);
    }

    return docRef.id;
  } catch (error) {
    console.error('Erro ao adicionar avaliação:', error);
    throw error;
  }
};

// Buscar avaliações de um estabelecimento
export const getBusinessReviews = async (
  businessId: string,
  status: 'all' | 'pending' | 'approved' | 'rejected' = 'approved',
  limitNum = 10, // Renomeado para evitar conflito
): Promise<Review[]> => {
  try {
    console.log('Buscando avaliações do estabelecimento:', businessId, 'Status:', status);

    const reviewsCollectionRef = collection(
      firebaseDb,
      'businesses',
      businessId,
      'reviews',
    );
    let q = query(reviewsCollectionRef, orderBy('date', 'desc'));

    if (status !== 'all') {
      q = query(q, where('status', '==', status));
    }

    q = query(q, firestoreLimit(limitNum)); // Usando a função renomeada

    const reviewsSnapshot = await getDocs(q);

    const reviews: Review[] = [];

    reviewsSnapshot.forEach((docSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      reviews.push({
        id: docSnapshot.id,
        ...docSnapshot.data() as Review,
      });
    });

    console.log(`Encontradas ${reviews.length} avaliações para o estabelecimento ${businessId}`);
    return reviews;
  } catch (error) {
    console.error('Erro ao buscar avaliações do estabelecimento:', error);
    throw error;
  }
};

// Buscar avaliações de um profissional
export const getProfessionalReviews = async (
  professionalId: string,
  status: 'all' | 'pending' | 'approved' | 'rejected' = 'approved',
  limitNum = 10, // Renomeado para evitar conflito
): Promise<Review[]> => {
  try {
    console.log('Buscando avaliações do profissional:', professionalId, 'Status:', status);

    // This query is complex across all businesses.
    // For performance, it's better to query reviews per business
    // and then filter by professional.
    // For now, leaving as is, but consider refactoring if performance issues arise.
    let q = query(
      collectionGroup(firebaseDb, 'reviews'), // Use collectionGroup to search across all 'reviews' subcollections
      where('professionalId', '==', professionalId),
      orderBy('date', 'desc'),
    );

    if (status !== 'all') {
      q = query(q, where('status', '==', status));
    }

    const reviewsSnapshot = await getDocs(query(q, firestoreLimit(limitNum))); // Usando a função renomeada

    const reviews: Review[] = [];

    reviewsSnapshot.forEach((docSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      reviews.push({
        id: docSnapshot.id,
        ...docSnapshot.data() as Review,
      });
    });

    console.log(`Encontradas ${reviews.length} avaliações para o profissional ${professionalId}`);
    return reviews;
  } catch (error) {
    console.error('Erro ao buscar avaliações do profissional:', error);
    throw error;
  }
};

// Buscar avaliações de um usuário
export const getUserReviews = async (
  userId: string,
  limitNum = 10, // Renomeado para evitar conflito
): Promise<Review[]> => {
  try {
    // Buscar reviews em todas as subcoleções de reviews usando collectionGroup
    const q = query(
      collectionGroup(firebaseDb, 'reviews'),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      firestoreLimit(limitNum), // Usando a função renomeada
    );
    const reviewsSnapshot = await getDocs(q);

    const reviews: Review[] = [];

    reviewsSnapshot.forEach((docSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      reviews.push({
        id: docSnapshot.id,
        ...docSnapshot.data() as Review,
      });
    });

    return reviews;
  } catch (error) {
    console.error('Erro ao buscar avaliações do usuário:', error);
    throw error;
  }
};

// Aprovar uma avaliação
export const approveReview = async (
  businessId: string,
  reviewId: string,
): Promise<void> => {
  try {
    const reviewRef = doc(
      firebaseDb,
      'businesses',
      businessId,
      'reviews',
      reviewId,
    );
    await updateDoc(reviewRef, {
      status: 'approved',
    });

    // Buscar dados da avaliação para atualizar médias
    const reviewDoc = await getDoc(reviewRef);

    if (reviewDoc.exists()) {
      const reviewData = reviewDoc.data() as Review;

      // Atualizar média de avaliações do estabelecimento
      await updateBusinessRating(reviewData.businessId);

      // Atualizar média de avaliações do profissional, se aplicável
      if (reviewData.professionalId) {
        await updateProfessionalRating(reviewData.professionalId);
      }
    }
  } catch (error) {
    throw error;
  }
};

// Rejeitar uma avaliação
export const rejectReview = async (
  businessId: string,
  reviewId: string,
): Promise<void> => {
  try {
    const reviewRef = doc(
      firebaseDb,
      'businesses',
      businessId,
      'reviews',
      reviewId,
    );
    // Buscar dados antes de rejeitar para saber o professionalId
    const reviewDoc = await getDoc(reviewRef);
    const reviewData = reviewDoc.exists() ? reviewDoc.data() as Review : null;
    
    await updateDoc(reviewRef, {
      status: 'rejected',
    });
    
    // Atualizar medias removendo essa review do calculo
    if (reviewData) {
      await updateBusinessRating(reviewData.businessId);
      if (reviewData.professionalId) {
        await updateProfessionalRating(reviewData.professionalId);
      }
    }
  } catch (error) {
    throw error;
  }
};

// Responder a uma avaliação
export const respondToReview = async (
  businessId: string,
  reviewId: string,
  responseText: string,
): Promise<void> => {
  try {
    const reviewRef = doc(
      firebaseDb,
      'businesses',
      businessId,
      'reviews',
      reviewId,
    );
    await updateDoc(reviewRef, {
      response: {
        text: responseText,
        date: serverTimestamp(),
      },
    });
  } catch (error) {
    throw error;
  }
};

// Atualizar média de avaliações do estabelecimento
export const updateBusinessRating = async (
  businessId: string,
): Promise<number> => {
  try {
    console.log('Atualizando rating do estabelecimento:', businessId);

    // Buscar todas as avaliações aprovadas deste estabelecimento
    const reviewsCollectionRef = collection(
      firebaseDb,
      'businesses',
      businessId,
      'reviews',
    );
    const q = query(reviewsCollectionRef, where('status', '==', 'approved'));
    const reviewsSnapshot = await getDocs(q);

    let totalRating = 0;
    let count = 0;

    reviewsSnapshot.forEach((docSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const review = docSnapshot.data() as Review;
      totalRating += review.rating;
      count++;
    });

    const averageRating = count > 0 ? totalRating / count : 0;

    console.log(`Estabelecimento ${businessId}: ${count} avaliações, média ${averageRating.toFixed(1)}`);

    // Atualizar a média no documento do estabelecimento
    const businessRef = doc(firebaseDb, 'businesses', businessId);
    await updateDoc(businessRef, {
      rating: averageRating,
      reviewCount: count,
    });

    return averageRating;
  } catch (error) {
    console.error('Erro ao atualizar rating do estabelecimento:', error);
    throw error;
  }
};

// Atualizar média de avaliações do profissional
export const updateProfessionalRating = async (
  professionalId: string,
): Promise<number> => {
  try {
    console.log('Atualizando rating do profissional:', professionalId);

    // Buscar todas as avaliações aprovadas deste profissional em todos os negócios
    const q = query(
      collectionGroup(firebaseDb, 'reviews'), // Use collectionGroup
      where('professionalId', '==', professionalId),
      where('status', '==', 'approved'),
    );
    const reviewsSnapshot = await getDocs(q);

    let totalRating = 0;
    let count = 0;

    reviewsSnapshot.forEach((docSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const review = docSnapshot.data() as Review;
      totalRating += review.rating;
      count++;
    });

    const averageRating = count > 0 ? totalRating / count : 0;

    console.log(`Profissional ${professionalId}: ${count} avaliações, média ${averageRating.toFixed(1)}`);

    // Atualizar a média no documento do profissional
    const professionalRef = doc(firebaseDb, 'professionals', professionalId);
    await updateDoc(professionalRef, {
      rating: averageRating,
      reviewsCount: count,
    });

    return averageRating;
  } catch (error) {
    console.error('Erro ao atualizar rating do profissional:', error);
    throw error;
  }
};

// Função para recalcular todas as contagens de avaliações
export const recalculateAllBusinessRatings = async (): Promise<void> => {
  try {
    // Buscar todos os negócios
    const businessesSnapshot = await getDocs(collection(firebaseDb, 'businesses'));

    const promises: Promise<number>[] = [];

    businessesSnapshot.forEach((docSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const businessId = docSnapshot.id;
      promises.push(updateBusinessRating(businessId));
    });

    await Promise.all(promises);

  } catch (error) {
    throw error;
  }
};
