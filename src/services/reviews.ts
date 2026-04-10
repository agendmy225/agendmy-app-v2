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

// Adicionar uma nova avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
export const addReview = async (
  review: Omit<Review, 'id' | 'date' | 'status'>,
): Promise<string> => {
  try {
    console.log('Adicionando nova avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:', { businessId: review.businessId, userId: review.userId, rating: review.rating });

    const reviewData = {
      ...review,
      date: serverTimestamp(),
      status: 'approved', // Auto-approve reviews to avoid confusion
    };

    const reviewsCollectionRef = collection(
      firebaseDb,
      'businesses',
      review.businessId,
      'reviews',
    );
    const docRef = await addDoc(reviewsCollectionRef, reviewData);

    console.log('AvaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o adicionada com sucesso, ID:', docRef.id);

    // Atualizar mÃƒÆ’Ã‚Â©dia de avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do estabelecimento
    await updateBusinessRating(review.businessId);

    // Atualizar mÃƒÆ’Ã‚Â©dia de avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do profissional, se aplicÃƒÆ’Ã‚Â¡vel
    if (review.professionalId) {
      await updateProfessionalRating(review.professionalId);
    }

    return docRef.id;
  } catch (error) {
    console.error('Erro ao adicionar avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o:', error);
    throw error;
  }
};

// Buscar avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de um estabelecimento
export const getBusinessReviews = async (
  businessId: string,
  status: 'all' | 'pending' | 'approved' | 'rejected' = 'approved',
  limitNum = 10, // Renomeado para evitar conflito
): Promise<Review[]> => {
  try {
    console.log('Buscando avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do estabelecimento:', businessId, 'Status:', status);

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

    q = query(q, firestoreLimit(limitNum)); // Usando a funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o renomeada

    const reviewsSnapshot = await getDocs(q);

    const reviews: Review[] = [];

    reviewsSnapshot.forEach((docSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      reviews.push({
        id: docSnapshot.id,
        ...docSnapshot.data() as Review,
      });
    });

    console.log(`Encontradas ${reviews.length} avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes para o estabelecimento ${businessId}`);
    return reviews;
  } catch (error) {
    console.error('Erro ao buscar avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do estabelecimento:', error);
    throw error;
  }
};

// Buscar avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de um profissional
export const getProfessionalReviews = async (
  professionalId: string,
  status: 'all' | 'pending' | 'approved' | 'rejected' = 'approved',
  limitNum = 10, // Renomeado para evitar conflito
): Promise<Review[]> => {
  try {
    console.log('Buscando avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do profissional:', professionalId, 'Status:', status);

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

    const reviewsSnapshot = await getDocs(query(q, firestoreLimit(limitNum))); // Usando a funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o renomeada

    const reviews: Review[] = [];

    reviewsSnapshot.forEach((docSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      reviews.push({
        id: docSnapshot.id,
        ...docSnapshot.data() as Review,
      });
    });

    console.log(`Encontradas ${reviews.length} avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes para o profissional ${professionalId}`);
    return reviews;
  } catch (error) {
    console.error('Erro ao buscar avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do profissional:', error);
    throw error;
  }
};

// Buscar avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de um usuÃƒÆ’Ã‚Â¡rio
export const getUserReviews = async (
  userId: string,
  limitNum = 10, // Renomeado para evitar conflito
): Promise<Review[]> => {
  try {
    // Buscar reviews em todas as subcoleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de reviews usando collectionGroup
    const q = query(
      collectionGroup(firebaseDb, 'reviews'),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      firestoreLimit(limitNum), // Usando a funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o renomeada
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
    console.error('Erro ao buscar avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do usuÃƒÆ’Ã‚Â¡rio:', error);
    throw error;
  }
};

// Aprovar uma avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
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

    // Buscar dados da avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para atualizar mÃƒÆ’Ã‚Â©dias
    const reviewDoc = await getDoc(reviewRef);

    if (reviewDoc.exists()) {
      const reviewData = reviewDoc.data() as Review;

      // Atualizar mÃƒÆ’Ã‚Â©dia de avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do estabelecimento
      await updateBusinessRating(reviewData.businessId);

      // Atualizar mÃƒÆ’Ã‚Â©dia de avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do profissional, se aplicÃƒÆ’Ã‚Â¡vel
      if (reviewData.professionalId) {
        await updateProfessionalRating(reviewData.professionalId);
      }
    }
  } catch (error) {
    throw error;
  }
};

// Rejeitar uma avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
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
    await updateDoc(reviewRef, {
      status: 'rejected',
    });
  } catch (error) {
    throw error;
  }
};

// Responder a uma avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
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

// Atualizar mÃƒÆ’Ã‚Â©dia de avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do estabelecimento
export const updateBusinessRating = async (
  businessId: string,
): Promise<number> => {
  try {
    console.log('Atualizando rating do estabelecimento:', businessId);

    // Buscar todas as avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes aprovadas deste estabelecimento
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

    console.log(`Estabelecimento ${businessId}: ${count} avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes, mÃƒÆ’Ã‚Â©dia ${averageRating.toFixed(1)}`);

    // Atualizar a mÃƒÆ’Ã‚Â©dia no documento do estabelecimento
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

// Atualizar mÃƒÆ’Ã‚Â©dia de avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do profissional
export const updateProfessionalRating = async (
  professionalId: string,
): Promise<number> => {
  try {
    console.log('Atualizando rating do profissional:', professionalId);

    // Buscar todas as avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes aprovadas deste profissional em todos os negÃƒÆ’Ã‚Â³cios
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

    console.log(`Profissional ${professionalId}: ${count} avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes, mÃƒÆ’Ã‚Â©dia ${averageRating.toFixed(1)}`);

    // Atualizar a mÃƒÆ’Ã‚Â©dia no documento do profissional
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

// FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para recalcular todas as contagens de avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes
export const recalculateAllBusinessRatings = async (): Promise<void> => {
  try {
    // Buscar todos os negÃƒÆ’Ã‚Â³cios
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
