// src/services/adminReviews.ts
// Servicos do Painel Admin > Avaliacoes (moderacao global).
// Following React Native Firebase v22 modular API patterns
import {
  collectionGroup,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from '@react-native-firebase/firestore';
import { firebaseDb } from '../config/firebase';
import { approveReview, rejectReview } from './reviews';
import { getAllBusinessesAdmin, Business } from './businesses';

export type AdminReviewStatus = 'pending' | 'approved' | 'rejected';

export interface AdminReview {
  id: string;
  path: string; // caminho completo do documento no Firestore
  isLegacy: boolean; // true = colecao "reviews" da raiz (formato antigo)
  businessId: string;
  businessName: string;
  userName: string;
  professionalName?: string;
  rating: number;
  professionalRating?: number;
  comment: string;
  status: AdminReviewStatus;
  date: Date | null;
  hasResponse: boolean;
}

type RawReviewDoc = {
  id: string;
  ref: { path: string };
  data: () => Record<string, any> | undefined;
};

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return value;
  }
  const ts = value as { toDate?: () => Date } | undefined;
  if (ts && typeof ts.toDate === 'function') {
    return ts.toDate();
  }
  return null;
};

const normalizeStatus = (value: unknown): AdminReviewStatus => {
  if (value === 'approved' || value === 'rejected') {
    return value;
  }
  return 'pending';
};

/**
 * ADMIN: retorna todas as avaliacoes do app (todas as colecoes "reviews"),
 * da mais recente para a mais antiga.
 */
export const getAllReviewsAdmin = async (): Promise<AdminReview[]> => {
  try {
    const [snapshot, businesses] = await Promise.all([
      getDocs(collectionGroup(firebaseDb, 'reviews')),
      getAllBusinessesAdmin(),
    ]);

    const nameById = new Map<string, string>();
    businesses.forEach((b: Business) => {
      nameById.set(b.id, b.name || 'Sem nome');
    });

    const reviews: AdminReview[] = snapshot.docs.map((d: RawReviewDoc) => {
      const data = d.data() || {};
      const path = d.ref.path;
      const segments = path.split('/');
      const isLegacy = segments[0] !== 'businesses';
      const businessId = isLegacy ? (data.businessId as string) || '' : segments[1];

      return {
        id: d.id,
        path,
        isLegacy,
        businessId,
        businessName: nameById.get(businessId) || 'Estabelecimento removido',
        userName: (data.userName as string) || 'Cliente',
        professionalName: (data.professionalName as string) || undefined,
        rating: Number(data.rating) || 0,
        professionalRating: data.professionalRating ? Number(data.professionalRating) : undefined,
        comment: (data.comment as string) || '',
        status: normalizeStatus(data.status),
        date: toDate(data.date) || toDate(data.createdAt),
        hasResponse: !!(data.response && data.response.text),
      };
    });

    reviews.sort((a: AdminReview, b: AdminReview) => {
      const ta = a.date ? a.date.getTime() : 0;
      const tb = b.date ? b.date.getTime() : 0;
      return tb - ta;
    });
    return reviews;
  } catch (error) {
    console.warn('[getAllReviewsAdmin] erro:', error);
    throw error;
  }
};

/**
 * ADMIN: aprova ou rejeita uma avaliacao.
 * Avaliacoes atuais usam as funcoes do app (que recalculam as notas).
 * Avaliacoes antigas da raiz so tem o status atualizado.
 */
export const setReviewStatusAdmin = async (
  review: AdminReview,
  status: 'approved' | 'rejected',
): Promise<void> => {
  if (!review.isLegacy && review.businessId) {
    if (status === 'approved') {
      await approveReview(review.businessId, review.id);
    } else {
      await rejectReview(review.businessId, review.id);
    }
    return;
  }
  await updateDoc(doc(firebaseDb, review.path), {
    status,
    updatedAt: serverTimestamp(),
  });
};
