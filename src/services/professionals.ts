// Following React Native Firebase v22 modular API patterns
// https://rnfirebase.io/migrating-to-v22
import {
  collection,
  query,
  orderBy,
  getDocs,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  FieldValue,
  Timestamp,
} from '@react-native-firebase/firestore';
import { firebaseDb } from '../config/firebase';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// Tipos
export interface Professional {
  id: string;
  businessId: string;
  name: string;
  specialty: string;
  bio: string;
  image: string;
  rating: number;
  active: boolean;
  instagram?: string;
  portfolioImages?: string[];
  portfolioVideo?: string;
  services?: string[];
  schedule?: {
    [day: string]: {
      start: string;
      end: string;
      breaks?: { start: string; end: string }[];
    };
  };
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

// Buscar todos os profissionais de um estabelecimento
export const getProfessionalsByBusiness = async (businessId: string): Promise<Professional[]> => {
  try {
    const professionalsRef = collection(firebaseDb, 'professionals');
    const q = query(
      professionalsRef,
      where('businessId', '==', businessId),
      where('active', '==', true),
      orderBy('name'),
    );
    const professionalsSnapshot = await getDocs(q);

    const professionals: Professional[] = [];
    professionalsSnapshot.forEach((docSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const data = docSnapshot.data();
      professionals.push({
        id: docSnapshot.id,
        ...data,
      } as Professional);
    });

    return professionals;
  } catch (error) {
    throw error;
  }
};

// Buscar um profissional específico
export const getProfessionalById = async (professionalId: string): Promise<Professional | null> => {
  try {
    const professionalDocRef = doc(firebaseDb, 'professionals', professionalId);
    const professionalDoc = await getDoc(professionalDocRef);

    if (!professionalDoc.exists()) {
      return null;
    }

    const data = professionalDoc.data()!;
    return {
      id: professionalDoc.id,
      ...data,
    } as Professional;
  } catch (error) {
    throw error;
  }
};

// Adicionar um novo profissional
export const addProfessional = async (professional: Omit<Professional, 'id'>): Promise<string> => {
  try {
    const professionalsRef = collection(firebaseDb, 'professionals');
    const professionalData: Omit<Professional, 'id'> & {
      createdAt: FieldValue;
      updatedAt: FieldValue;
    } = {
      ...professional,
      rating: professional.rating || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(professionalsRef, professionalData);

    return docRef.id;
  } catch (error) {
    throw error;
  }
};

// Atualizar um profissional existente
export const updateProfessional = async (professionalId: string, professionalData: Partial<Omit<Professional, 'id'>>): Promise<void> => {
  try {
    const professionalDocRef = doc(firebaseDb, 'professionals', professionalId);
    const updateData = {
      ...professionalData,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(professionalDocRef, updateData);
  } catch (error) {
    throw error;
  }
};

// Ativar/desativar um profissional
export const toggleProfessionalStatus = async (professionalId: string, active: boolean): Promise<void> => {
  try {
    const professionalDocRef = doc(firebaseDb, 'professionals', professionalId);
    await updateDoc(professionalDocRef, {
      active,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

// Excluir um profissional
export const deleteProfessional = async (professionalId: string): Promise<void> => {
  try {
    const professionalDocRef = doc(firebaseDb, 'professionals', professionalId);
    await deleteDoc(professionalDocRef);
  } catch (error) {
    throw error;
  }
};

// Atualizar serviços de um profissional
export const updateProfessionalServices = async (professionalId: string, serviceIds: string[]): Promise<void> => {
  try {
    const professionalDocRef = doc(firebaseDb, 'professionals', professionalId);
    await updateDoc(professionalDocRef, {
      services: serviceIds,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

// Atualizar agenda de um profissional
export const updateProfessionalSchedule = async (
  professionalId: string,
  schedule: Professional['schedule'],
): Promise<void> => {
  try {
    const professionalDocRef = doc(firebaseDb, 'professionals', professionalId);
    await updateDoc(professionalDocRef, {
      schedule,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

// Calcular e atualizar a média de avaliações de um profissional
export const updateProfessionalRating = async (professionalId: string): Promise<number> => {
  try {
    // Buscar todas as avaliações deste profissional
    const reviewsRef = collection(firebaseDb, 'reviews');
    const q = query(reviewsRef, where('professionalId', '==', professionalId));
    const reviewsSnapshot = await getDocs(q);

    let totalRating = 0;
    let count = 0;
    reviewsSnapshot.forEach((reviewDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const review = reviewDoc.data();
      if (review.rating) {
        totalRating += review.rating;
        count++;
      }
    });

    const averageRating = count > 0 ? totalRating / count : 0;

    // Atualizar a média no documento do profissional
    const professionalDocRef = doc(firebaseDb, 'professionals', professionalId);
    await updateDoc(professionalDocRef, {
      rating: averageRating,
      updatedAt: serverTimestamp(),
    });

    return averageRating;
  } catch (error) {
    throw error;
  }
};
