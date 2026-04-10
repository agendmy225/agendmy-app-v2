ÃƒÂ¯Ã‚Â»Ã‚Â¿// Following React Native Firebase v22 modular API patterns
// https://rnfirebase.io/migrating-to-v22
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import { firebaseDb } from '../config/firebase';
import { getCoordinatesFromAddress } from './maps'; // Adicionado: Importa a funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de geocodificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
import Config from 'react-native-config';

export interface Business {
  businessId: unknown;
  id: string;
  ownerId: string;
  name: string;
  description: string;
  address: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone: string;
  email: string;
  imageUrl: string; // Deprecated, use logo
  coverImage: string;
  logo: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
  };
  category: string; // UMA categoria sÃƒÆ’Ã‚Â³, nÃƒÆ’Ã‚Â£o array
  rating: number;
  reviewCount: number;
  workingHours: {
    [day: string]: {
      open: boolean;
      start: string;
      end: string;
    };
  };
  policies: {
    cancellationTimeLimit: number;
    cancellationFee: number;
    noShowFee: number;
    advanceBookingLimit: number;
  }; notifications: {
    confirmationEnabled: boolean;
    reminderEnabled: boolean;
    reminderTime: number;
  };
  paymentMethods: {
    cash: boolean;
    creditCard: boolean;
    debitCard: boolean;
    pix: boolean;
    transfer: boolean;
    inApp: boolean;
  };
  defaultCommissionRate: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  nameLowercase?: string;
  hasActivePromotions?: boolean;
}

export interface CreateBusinessData {
  ownerId: string;
  name: string;
  description: string;
  address: string;
  addressNumber?: string;
  addressComplement?: string;
  phone: string;
  email: string;
  location?: Business['location'];
  imageUrl?: string;
  coverImage?: string;
  logo?: string;
  category: string; // UMA categoria sÃƒÆ’Ã‚Â³
  workingHours: Business['workingHours'];
  policies: Business['policies'];
  notifications: Business['notifications'];
  paymentMethods: Business['paymentMethods'];
  defaultCommissionRate: number;
}

const COLLECTION_NAME = 'businesses';

const mapDocumentToBusiness = (documentSnapshot: { id: string; data: () => Record<string, unknown> | undefined; exists: () => boolean }): Business => {
  const data = documentSnapshot.data();
  if (!data) {
    throw new Error(`Dados nÃƒÆ’Ã‚Â£o encontrados para o documento ${documentSnapshot.id}`);
  }

 // CORRIGIDO: normalizar campo logotipo -> logo (Firebase usa nome em portugues)
  if ((data as any).logotipo && !data.logo) {
    data.logo = (data as any).logotipo as string;
  }

  // CORRIGIDO: normalizar campo localizacao -> location (Firebase usa nome em portugues)
  if ((data as any).localizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o && !data.location) {
    const loc = (data as any).localizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o as any;
    if (loc._latitude !== undefined) {
      data.location = { latitude: loc._latitude, longitude: loc._longitude };
    } else if (loc.latitude !== undefined) {
      data.location = { latitude: loc.latitude, longitude: loc.longitude };
    }
  }

  // CORRIGIDO: normalizar location com underscore (GeoPoint serializado)
  if (data.location && typeof data.location === 'object' && '_latitude' in (data.location as any)) {
    const loc = data.location as any;
    data.location = {
      latitude: loc._latitude,
      longitude: loc._longitude,
      address: loc.address,
      city: loc.city,
    };
  }
  const createdAtTimestamp = data.createdAt as Timestamp | undefined;
  const updatedAtTimestamp = data.updatedAt as Timestamp | undefined;
  return {
    id: documentSnapshot.id,
    ...data,
    createdAt: createdAtTimestamp instanceof Timestamp ? createdAtTimestamp.toDate() : new Date(),
    updatedAt: updatedAtTimestamp instanceof Timestamp ? updatedAtTimestamp.toDate() : new Date(),
  } as Business;
};

export const getBusinesses = async (): Promise<Business[]> => {
  try {
    const businessesCollectionRef = collection(firebaseDb, COLLECTION_NAME);
    const q = query(
      businessesCollectionRef,
      where('active', '==', true),
      orderBy('rating', 'desc'),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapDocumentToBusiness);
  } catch (error) {

    throw new Error('Erro ao carregar estabelecimentos');
  }
};

export const getBusinessById = async (id: string): Promise<Business | null> => {
  try {
    const docRef = doc(firebaseDb, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return mapDocumentToBusiness(docSnap);
    }
    return null;
  } catch (error) {

    throw new Error('Erro ao carregar estabelecimento');
  }
};

export const getBusinessByOwnerId = async (ownerId: string): Promise<Business | null> => {
  try {
    const businessesCollectionRef = collection(firebaseDb, COLLECTION_NAME);
    const q = query(
      businessesCollectionRef,
      where('ownerId', '==', ownerId),
      limit(1),
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const documentSnapshot = querySnapshot.docs[0];
      if (documentSnapshot && documentSnapshot.exists()) {
        return mapDocumentToBusiness(documentSnapshot);
      }
    }
    return null;
  } catch (error) {

    throw new Error('Erro ao carregar estabelecimento');
  }
};


export const searchBusinesses = async (
  searchText: string,
  filters?: {
    category?: string;
    city?: string;
    minRating?: number;
  },
): Promise<Business[]> => {
  try {
    const businessesCollectionRef = collection(firebaseDb, 'businesses');
    let firestoreQueryBuilder = query(businessesCollectionRef, where('active', '==', true));

    const searchTermProvided = searchText.trim().length > 0;

    if (searchTermProvided) {
      const searchTerm = searchText.toLowerCase().trim();

      // Para buscar pelo nome
      firestoreQueryBuilder = query(
        firestoreQueryBuilder,
        where('nameLowercase', '>=', searchTerm),
        where('nameLowercase', '<=', searchTerm + '\uf8ff'),
        orderBy('nameLowercase'),
        orderBy('rating', 'desc'),
      );
    } else if (filters?.category) {
      // Se houver filtro de categoria, buscar pela categoria exata
      firestoreQueryBuilder = query(
        firestoreQueryBuilder,
        where('category', '==', filters.category),
        orderBy('rating', 'desc'),
      );
    } else {
      // OrdenaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o padrÃƒÆ’Ã‚Â£o quando nÃƒÆ’Ã‚Â£o hÃƒÆ’Ã‚Â¡ busca por texto ou categoria
      firestoreQueryBuilder = query(firestoreQueryBuilder, orderBy('rating', 'desc'));
    }

    // Aplicar filtros adicionais (exceto categoria que jÃƒÆ’Ã‚Â¡ foi aplicada no bloco principal)
    if (filters?.city) {
      firestoreQueryBuilder = query(firestoreQueryBuilder, where('location.city', '==', filters.city));
    }
    if (filters?.minRating) {
      firestoreQueryBuilder = query(firestoreQueryBuilder, where('rating', '>=', filters.minRating));
    }

    firestoreQueryBuilder = query(firestoreQueryBuilder, limit(20));

    const querySnapshot = await getDocs(firestoreQueryBuilder);

    let businesses = querySnapshot.docs.map(mapDocumentToBusiness);

    // Se nÃƒÆ’Ã‚Â£o conseguiu encontrar resultados por nome e hÃƒÆ’Ã‚Â¡ um termo de busca,
    // tenta buscar pela categoria ou descriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o no lado cliente
    if (businesses.length === 0 && searchTermProvided) {
      console.log('Primeira busca sem resultados, tentando busca ampliada...');

      // Fazer uma busca mais ampla
      const broadQueryBuilder = query(
        businessesCollectionRef,
        where('active', '==', true),
        orderBy('rating', 'desc'),
        limit(50) // Buscar mais resultados para filtrar localmente
      );

      const broadQuerySnapshot = await getDocs(broadQueryBuilder);
      const allBusinesses = broadQuerySnapshot.docs.map(mapDocumentToBusiness);

      const searchTermLower = searchText.toLowerCase().trim();

      // Filtrar localmente por nome, categoria ou descriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
      businesses = allBusinesses.filter((business: Business) => {
        const nameMatch = business.name.toLowerCase().includes(searchTermLower);
        const categoryMatch = business.category && business.category.toLowerCase().includes(searchTermLower);
        const descriptionMatch = business.description && business.description.toLowerCase().includes(searchTermLower);

        // Verificar se o termo de busca corresponde aos nomes das categorias
        const categoryNameMatch = (() => {
          switch (searchTermLower) {
            case 'barbearia':
            case 'barbearias':
              return business.category === 'barbearias' || business.category === 'barbearia';
            case 'estetica':
            case 'estÃƒÆ’Ã‚Â©tica':
            case 'esteticas':
            case 'estÃƒÆ’Ã‚Â©ticas':
              return business.category === 'estetica' || business.category === 'estÃƒÆ’Ã‚Â©tica';
            case 'salao':
            case 'salÃƒÆ’Ã‚Â£o':
            case 'saloes':
            case 'salÃƒÆ’Ã‚Âµes':
              return business.category === 'saloes-beleza' || business.category === 'salÃƒÆ’Ã‚Â£o-beleza';
            case 'pet':
            case 'pet shop':
            case 'petshop':
              return business.category === 'pet-shops' || business.category === 'pet';
            case 'manicure':
            case 'pedicure':
            case 'nail':
              return business.category === 'unhas';
            case 'massagem':
            case 'spa':
              return business.category === 'spa-massagem';
            default:
              return false;
          }
        })();

        return nameMatch || categoryMatch || descriptionMatch || categoryNameMatch;
      });

      // Aplicar filtros adicionais se especificados
      if (filters?.city) {
        businesses = businesses.filter((business: Business) => business.location?.city === filters.city);
      }
      if (filters?.minRating) {
        businesses = businesses.filter((business: Business) => business.rating >= filters.minRating!);
      }

      // Limitar resultados finais
      businesses = businesses.slice(0, 20);
    }

    return businesses;
  } catch (error) {
    console.error('Erro ao buscar estabelecimentos:', error);

    // Se houve erro na consulta principal e hÃƒÆ’Ã‚Â¡ um termo de busca, tentar uma busca de fallback
    if (searchText.trim().length > 0) {
      try {
        console.log('Tentando busca de fallback devido ao erro...');
        const fallbackQueryBuilder = query(
          collection(firebaseDb, 'businesses'),
          where('active', '==', true),
          orderBy('rating', 'desc'),
          limit(30)
        );

        const fallbackSnapshot = await getDocs(fallbackQueryBuilder);
        const allBusinesses = fallbackSnapshot.docs.map(mapDocumentToBusiness);

        const searchTermLower = searchText.toLowerCase().trim();

        const filteredBusinesses = allBusinesses.filter((business: Business) => {
          const nameMatch = business.name.toLowerCase().includes(searchTermLower);
          const categoryMatch = business.category && business.category.toLowerCase().includes(searchTermLower);

          const categoryNameMatch = (() => {
            switch (searchTermLower) {
              case 'barbearia':
              case 'barbearias':
                return business.category === 'barbearias' || business.category === 'barbearia';
              case 'estetica':
              case 'estÃƒÆ’Ã‚Â©tica':
                return business.category === 'estetica' || business.category === 'estÃƒÆ’Ã‚Â©tica';
              case 'salao':
              case 'salÃƒÆ’Ã‚Â£o':
                return business.category === 'saloes-beleza' || business.category === 'salÃƒÆ’Ã‚Â£o-beleza';
              case 'pet':
              case 'pet shop':
              case 'petshop':
                return business.category === 'pet-shops' || business.category === 'pet';
              default:
                return false;
            }
          })();

          return nameMatch || categoryMatch || categoryNameMatch;
        });

        return filteredBusinesses.slice(0, 20);
      } catch (fallbackError) {
        console.error('Erro na busca de fallback:', fallbackError);
        throw new Error('NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel realizar a busca. Tente novamente.');
      }
    }

    throw new Error('Erro na busca de estabelecimentos. Tente novamente.');
  }
};

export const debugAllBusinesses = async (): Promise<void> => {
  try {
    const businessesCollectionRef = collection(firebaseDb, 'businesses');
    const q = query(businessesCollectionRef, where('active', '==', true));
    const querySnapshot = await getDocs(q);

    querySnapshot.docs.forEach((docSnapshot: any, _index: number) => {
      const data = docSnapshot.data();
      if (data.location) {
      }
    });
  } catch (error) {
  }
};

export const getTopRatedBusinesses = async (limitNum: number = 10): Promise<Business[]> => {
  try {
    const businessesCollectionRef = collection(firebaseDb, 'businesses');
    const q = query(
      businessesCollectionRef,
      where('active', '==', true),
      orderBy('rating', 'desc'),
      orderBy('reviewCount', 'desc'),
      limit(limitNum),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapDocumentToBusiness);
  } catch (error) {
    throw error;
  }
};

export const createBusiness = async (data: CreateBusinessData): Promise<Business> => {
  try {
    const businessesCollectionRef = collection(firebaseDb, COLLECTION_NAME);
    const docData = {
      ...data,
      rating: 0,
      reviewCount: 0,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      nameLowercase: data.name.toLowerCase(),
      hasActivePromotions: false,
    };
    const docRef = await addDoc(businessesCollectionRef, docData);
    const newBusiness = await getBusinessById(docRef.id);
    if (!newBusiness) {
      throw new Error('Erro ao criar estabelecimento, nÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel buscar apÃƒÆ’Ã‚Â³s a criaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.');
    }
    return newBusiness;
  } catch (error) {

    throw new Error('Erro ao criar estabelecimento');
  }
};

export const updateBusiness = async (id: string, data: Partial<Business>): Promise<Business> => {
  try {
    const docRef = doc(firebaseDb, COLLECTION_NAME, id);
    const updatePayload: { [key: string]: any } = { updatedAt: serverTimestamp() };

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key) && key !== 'id' && key !== 'createdAt') {
        updatePayload[key] = data[key as keyof Business];
      }
    }

    if (data.name) {
      updatePayload.nameLowercase = data.name.toLowerCase();
    }

    await updateDoc(docRef, updatePayload);
    const updatedBusiness = await getBusinessById(id);
    if (!updatedBusiness) {
      throw new Error('Estabelecimento nÃƒÆ’Ã‚Â£o encontrado apÃƒÆ’Ã‚Â³s atualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o');
    }
    return updatedBusiness;
  } catch (error) {

    throw new Error('Erro ao atualizar estabelecimento');
  }
};

export const deleteBusiness = async (id: string): Promise<void> => {
  try {
    const docRef = doc(firebaseDb, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      active: false,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {

    throw new Error('Erro ao deletar estabelecimento');
  }
};

export const updateBusinessRating = async (businessId: string, newRating: number): Promise<void> => {
  try {
    const business: Business | null = await getBusinessById(businessId);
    if (!business) {
      throw new Error('Estabelecimento nÃƒÆ’Ã‚Â£o encontrado para atualizar rating');
    }
    const totalRating = (business.rating || 0) * (business.reviewCount || 0) + newRating;
    const newReviewCount = (business.reviewCount || 0) + 1;
    const averageRating = newReviewCount > 0 ? totalRating / newReviewCount : 0;
    await updateBusiness(businessId, { // Removido '...business' e 'as any'
      rating: Math.round(averageRating * 10) / 10,
      reviewCount: newReviewCount,
    });
  } catch (error) {

    throw new Error('Erro ao atualizar avaliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o');
  }
};

export const getBusinessesWithPromotions = async (limitNum: number = 10): Promise<Business[]> => {
  try {
    const businessesCollectionRef = collection(firebaseDb, 'businesses');

    const q = query(
      businessesCollectionRef,
      where('active', '==', true),
      where('hasActivePromotions', '==', true),
      orderBy('updatedAt', 'desc'),
      limit(limitNum),
    );

    const querySnapshot = await getDocs(q);
    const businessesWithPromotions = querySnapshot.docs.map(mapDocumentToBusiness);

    return businessesWithPromotions;
  } catch (error) {

    throw error;
  }
};

export const createQuickBusiness = async (ownerId: string, businessName: string, address: string): Promise<string> => {
  try {
    // Obter coordenadas do endereÃƒÆ’Ã‚Â§o
    const coords = await getCoordinatesFromAddress(address, Config.GOOGLE_MAPS_API_KEY || '');
    if (!coords) {
      throw new Error('NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel obter coordenadas para o endereÃƒÆ’Ã‚Â§o fornecido.');
    }

    // Create a business with minimal required data
    const quickBusinessData: CreateBusinessData = {
      ownerId: ownerId,
      name: businessName,
      description: 'DescriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do negÃƒÆ’Ã‚Â³cio a ser preenchida',
      address: address, // Usa o endereÃƒÆ’Ã‚Â§o fornecido
      phone: 'Telefone a ser preenchido',
      email: 'Email a ser preenchido',
      category: 'outros',
      location: { // Adiciona o campo de localizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: coords.address || address, // Opcional: usa o endereÃƒÆ’Ã‚Â§o formatado da geocodificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
      },
      workingHours: {
        monday: { open: true, start: '09:00', end: '18:00' },
        tuesday: { open: true, start: '09:00', end: '18:00' },
        wednesday: { open: true, start: '09:00', end: '18:00' },
        thursday: { open: true, start: '09:00', end: '18:00' },
        friday: { open: true, start: '09:00', end: '18:00' },
        saturday: { open: true, start: '09:00', end: '18:00' },
        sunday: { open: false, start: '', end: '' },
      },
      policies: {
        cancellationTimeLimit: 24,
        cancellationFee: 0,
        noShowFee: 0,
        advanceBookingLimit: 30,
      }, notifications: {
        confirmationEnabled: true,
        reminderEnabled: true,
        reminderTime: 2,
      },
      paymentMethods: {
        cash: true,
        creditCard: false,
        debitCard: false,
        pix: false,
        transfer: false,
        inApp: false,
      },
      defaultCommissionRate: 10,
    };

    // Create the business
    const business = await createBusiness(quickBusinessData);
    const businessId = business.id;

    // Update user document with businessId
    const userRef = doc(firebaseDb, 'users', ownerId);
    await updateDoc(userRef, {
      businessId: businessId,
      updatedAt: serverTimestamp(),
    });

    return businessId;
  } catch (error) {
    console.error('Erro ao criar negÃƒÆ’Ã‚Â³cio:', error); // Log do erro para debug
    throw new Error('Erro ao criar negÃƒÆ’Ã‚Â³cio');
  }
};

export const getMostRecentBusinesses = async (limitNum: number = 20): Promise<Business[]> => {
  try {
    const businessesCollectionRef = collection(firebaseDb, 'businesses');
    const q = query(
      businessesCollectionRef,
      where('active', '==', true),
      orderBy('createdAt', 'desc'),
      limit(limitNum),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapDocumentToBusiness);
  } catch (error) {

    throw error;
  }
};

export const getAllActiveBusinesses = async (limitNum: number = 50): Promise<Business[]> => {
  try {
    const businessesCollectionRef = collection(firebaseDb, 'businesses');
    const q = query(
      businessesCollectionRef,
      where('active', '==', true),
      orderBy('createdAt', 'desc'),
      limit(limitNum),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapDocumentToBusiness);
  } catch (error) {

    throw error;
  }
};

export const getAllBusinessesForOwner = async (limitNum: number = 200): Promise<Business[]> => {
  try {
    const businessesCollectionRef = collection(firebaseDb, 'businesses');
    // Para proprietÃƒÆ’Ã‚Â¡rios, nÃƒÆ’Ã‚Â£o filtramos por `active`, apenas ordenamos e limitamos
    const q = query(
      businessesCollectionRef,
      orderBy('createdAt', 'desc'),
      limit(limitNum),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapDocumentToBusiness);
  } catch (error) {

    throw error;
  }
};


