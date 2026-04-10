// Following React Native Firebase v22 modular API patterns  
import { useState, useEffect } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from '@react-native-firebase/firestore';
import { firebaseDb, firebaseAuth } from '../config/firebase';
import { Business } from './businesses';

export interface FavoriteItem {
  id: string;
  userId: string;
  businessId: string;
  businessName: string;
  businessImage?: string;
  businessRating: number;
  businessAddress: string;
  createdAt: Date;
}

// Adicionar estabelecimento aos favoritos
export const addToFavorites = async (business: Business): Promise<void> => {
  try {
    const currentUser = firebaseAuth.currentUser; // Usar instÃƒÆ’Ã‚Â¢ncia firebaseAuth
    if (!currentUser) {
      throw new Error('UsuÃƒÆ’Ã‚Â¡rio nÃƒÆ’Ã‚Â£o autenticado');
    }

    const favoriteData = {
      userId: currentUser.uid,
      businessId: business.id,
      businessName: business.name,
      businessImage: business.imageUrl || business.coverImage, // Usar imageUrl ou coverImage
      businessRating: business.rating || 0,
      businessAddress: business.address,
      createdAt: serverTimestamp(), // Usar serverTimestamp() importado
    };

    const favoriteDocRef = doc(firebaseDb, 'favorites', `${currentUser.uid}_${business.id}`);
    await setDoc(favoriteDocRef, favoriteData);

  } catch (error) {
    throw error;
  }
};

// Remover estabelecimento dos favoritos
export const removeFromFavorites = async (businessId: string): Promise<void> => {
  try {
    const currentUser = firebaseAuth.currentUser; // Usar instÃƒÆ’Ã‚Â¢ncia firebaseAuth
    if (!currentUser) {
      throw new Error('UsuÃƒÆ’Ã‚Â¡rio nÃƒÆ’Ã‚Â£o autenticado');
    }

    const favoriteDocRef = doc(firebaseDb, 'favorites', `${currentUser.uid}_${businessId}`);
    await deleteDoc(favoriteDocRef);

  } catch (error) {
    throw error;
  }
};

// Verificar se estabelecimento estÃƒÆ’Ã‚Â¡ nos favoritos
export const isFavorite = async (businessId: string): Promise<boolean> => {
  try {
    const currentUser = firebaseAuth.currentUser; // Usar instÃƒÆ’Ã‚Â¢ncia firebaseAuth
    if (!currentUser) {
      return false;
    }

    const favoriteDocRef = doc(firebaseDb, 'favorites', `${currentUser.uid}_${businessId}`);
    const docSnap = await getDoc(favoriteDocRef);

    return docSnap.exists();

  } catch (error) {
    return false;
  }
};

// Obter lista de favoritos do usuÃƒÆ’Ã‚Â¡rio
export const getUserFavorites = async (): Promise<FavoriteItem[]> => {
  try {
    const currentUser = firebaseAuth.currentUser; // Usar instÃƒÆ’Ã‚Â¢ncia firebaseAuth
    if (!currentUser) {
      return [];
    }

    const favoritesCollectionRef = collection(firebaseDb, 'favorites');
    const q = query(
      favoritesCollectionRef,
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
    );
    const querySnapshot = await getDocs(q);

    const favorites: FavoriteItem[] = [];
    querySnapshot.forEach((documentSnapshot: any) => {
      const data = documentSnapshot.data();
      const createdAtTimestamp = data.createdAt as Timestamp; // Cast para Timestamp
      favorites.push({
        id: documentSnapshot.id,
        userId: data.userId,
        businessId: data.businessId,
        businessName: data.businessName,
        businessImage: data.businessImage,
        businessRating: data.businessRating,
        businessAddress: data.businessAddress,
        createdAt: createdAtTimestamp?.toDate() || new Date(), // Converter Timestamp para Date
      });
    });

    return favorites;

  } catch (error) {
    return [];
  }
};

// Listener para mudanÃƒÆ’Ã‚Â§as nos favoritos
export const subscribeFavorites = (
  onFavoritesUpdate: (favorites: FavoriteItem[]) => void,
): (() => void) => {
  const currentUser = firebaseAuth.currentUser; // Usar instÃƒÆ’Ã‚Â¢ncia firebaseAuth
  if (!currentUser) {
    return () => { }; // Retorna uma funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o vazia para o unsubscribe
  }

  const favoritesCollectionRef = collection(firebaseDb, 'favorites');
  const q = query(
    favoritesCollectionRef,
    where('userId', '==', currentUser.uid),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(q, querySnapshot => {
    const favorites: FavoriteItem[] = [];
    querySnapshot.forEach((documentSnapshot: any) => {
      const data = documentSnapshot.data();
      const createdAtTimestamp = data.createdAt as Timestamp; // Cast para Timestamp
      favorites.push({
        id: documentSnapshot.id,
        userId: data.userId,
        businessId: data.businessId,
        businessName: data.businessName,
        businessImage: data.businessImage,
        businessRating: data.businessRating,
        businessAddress: data.businessAddress,
        createdAt: createdAtTimestamp?.toDate() || new Date(), // Converter Timestamp para Date
      });
    });
    onFavoritesUpdate(favorites);
  }, () => {
  });
};

// Hook customizado para favoritos
export const useFavorites = () => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const userFavorites = await getUserFavorites();
        setFavorites(userFavorites);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();

    // Listener para mudanÃƒÆ’Ã‚Â§as em tempo real
    const unsubscribe = subscribeFavorites((updatedFavorites) => {
      setFavorites(updatedFavorites);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const addFavorite = async (business: Business) => {
    try {
      await addToFavorites(business);
    } catch (error) {
      throw error;
    }
  };

  const removeFavorite = async (businessId: string) => {
    try {
      await removeFromFavorites(businessId);
    } catch (error) {
      throw error;
    }
  };

  const checkIsFavorite = async (businessId: string): Promise<boolean> => {
    try {
      return await isFavorite(businessId);
    } catch (error) {
      return false;
    }
  };

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    checkIsFavorite,
  };
};
