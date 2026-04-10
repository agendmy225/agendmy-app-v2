// Following React Native Firebase v22 modular API patterns
// https://rnfirebase.io/migrating-to-v22
import {
  serverTimestamp,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from '@react-native-firebase/firestore';
import { firebaseDb } from '../config/firebase';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// Tipos
export interface Service {
  id: string; // Tornar id obrigatÃƒÆ’Ã‚Â³rio
  businessId: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  category: string;
  active: boolean;
  isPromotionActive?: boolean; // Adicionado para promoÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes
  discountPercentage?: number; // Adicionado para promoÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes
  promotionalPrice?: number; // Adicionado para promoÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes
  numSessions?: number; // NÃƒÆ’Ã‚Âºmero de sessÃƒÆ’Ã‚Âµes para pacotes
  professionalIds?: string[]; // IDs dos profissionais que realizam o serviÃƒÆ’Ã‚Â§o
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Buscar todos os serviÃƒÆ’Ã‚Â§os de um estabelecimento
export const getServicesByBusiness = async (businessId: string): Promise<Service[]> => {
  try {
    const servicesRef = collection(firebaseDb, 'businesses', businessId, 'services');
    const q = query(
      servicesRef,
      where('active', '==', true),
      orderBy('name'),
    );
    const servicesSnapshot = await getDocs(q);

    const services: Service[] = [];

    servicesSnapshot.forEach((docSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const data = docSnapshot.data();
      services.push({
        id: docSnapshot.id,
        businessId, // Adicionar businessId
        ...data,
      } as Service);
    });

    return services;
  } catch (error) {
    throw error;
  }
};

// Buscar um serviÃƒÆ’Ã‚Â§o especÃƒÆ’Ã‚Â­fico
export const getServiceById = async (businessId: string, serviceId: string): Promise<Service | null> => {
  try {
    const serviceDocRef = doc(firebaseDb, 'businesses', businessId, 'services', serviceId);
    const serviceDoc = await getDoc(serviceDocRef);

    if (!serviceDoc.exists()) {
      return null;
    }

    const data = serviceDoc.data()!; // Adicionar non-null assertion
    return {
      id: serviceDoc.id,
      businessId, // Adicionar businessId
      ...data,
    } as Service;
  } catch (error) {
    throw error;
  }
};

// Criar um novo serviÃƒÆ’Ã‚Â§o
export const createService = async (businessId: string, serviceData: any): Promise<Service> => {
  try {
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚â€ž [createService] Iniciando criaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de serviÃƒÆ’Ã‚Â§o');
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Â [createService] BusinessID:', businessId);
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚â€¹ [createService] ServiceData:', JSON.stringify(serviceData, null, 2));

    if (!businessId) {
      console.log('ÃƒÂ¢Ã‚ÂÃ‚Å’ [createService] BusinessId vazio');
      throw new Error('BusinessId ÃƒÆ’Ã‚Â© obrigatÃƒÆ’Ã‚Â³rio para criar um serviÃƒÆ’Ã‚Â§o');
    }

    // Validar campos obrigatÃƒÆ’Ã‚Â³rios
    if (!serviceData.name || !serviceData.price || !serviceData.duration || !serviceData.category) {
      console.log('ÃƒÂ¢Ã‚ÂÃ‚Å’ [createService] Campos obrigatÃƒÆ’Ã‚Â³rios ausentes:', {
        name: !!serviceData.name,
        price: !!serviceData.price,
        duration: !!serviceData.duration,
        category: !!serviceData.category
      });
      throw new Error('Campos obrigatÃƒÆ’Ã‚Â³rios nÃƒÆ’Ã‚Â£o preenchidos: name, price, duration, category');
    }

    console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ [createService] ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes bÃƒÆ’Ã‚Â¡sicas passaram');

    const servicesRef = collection(firebaseDb, 'businesses', businessId, 'services');
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚â€š [createService] ReferÃƒÆ’Ã‚Âªncia da coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o criada para:', `businesses/${businessId}/services`);

    const dataToSave: any = {
      name: serviceData.name,
      description: serviceData.description || '',
      price: serviceData.price,
      duration: serviceData.duration,
      category: serviceData.category,
      active: serviceData.active !== undefined ? serviceData.active : true,
      isPromotionActive: serviceData.isPromotionActive !== undefined ? serviceData.isPromotionActive : false,
      discountPercentage: serviceData.discountPercentage || 0,
      promotionalPrice: serviceData.promotionalPrice || 0,
      professionalIds: serviceData.professionalIds || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Adicionar numSessions se fornecido
    if (serviceData.numSessions && serviceData.numSessions > 1) {
      dataToSave.numSessions = serviceData.numSessions;
    }

    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€™Ã‚Â¾ [createService] Dados a serem salvos:', JSON.stringify(dataToSave, null, 2));

    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Â [createService] Tentando adicionar documento...');
    const docRef = await addDoc(servicesRef, dataToSave);
    console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ [createService] Documento criado com ID:', docRef.id);

    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Â [createService] Recuperando serviÃƒÆ’Ã‚Â§o criado...');
    const newService = await getServiceById(businessId, docRef.id);
    if (!newService) {
      console.log('ÃƒÂ¢Ã‚ÂÃ‚Å’ [createService] Falha ao recuperar serviÃƒÆ’Ã‚Â§o criado');
      throw new Error('Erro ao recuperar serviÃƒÆ’Ã‚Â§o criado');
    }

    console.log('ÃƒÂ°Ã‚Å¸Ã‚Å½Ã‚â€° [createService] ServiÃƒÆ’Ã‚Â§o criado com sucesso:', newService);
    return newService;
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ [createService] Erro ao criar serviÃƒÆ’Ã‚Â§o:', error);
    console.error('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Â [createService] Tipo do erro:', typeof error);
    console.error('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Å  [createService] Stack trace:', (error as Error)?.stack);

    if (error instanceof Error) {
      console.error('ÃƒÂ°Ã‚Å¸Ã‚â€™Ã‚Â¬ [createService] Mensagem:', error.message);
    }

    throw error;
  }
};

// Atualizar um serviÃƒÆ’Ã‚Â§o existente
export const updateService = async (businessId: string, serviceId: string, serviceData: Partial<Service>): Promise<Service> => {
  try {
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚â€ž [updateService] Iniciando atualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de serviÃƒÆ’Ã‚Â§o');
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Â [updateService] BusinessID:', businessId);
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Â [updateService] ServiceID:', serviceId);
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚â€¹ [updateService] ServiceData recebido:', serviceData);

    // Remover campos undefined para evitar erro no firebaseDb
    const cleanedData: Record<string, unknown> = {};
    Object.keys(serviceData).forEach(key => {
      const value = (serviceData as Record<string, unknown>)[key];
      if (value !== undefined) {
        cleanedData[key] = value;
      }
    });

    console.log('ÃƒÂ°Ã‚Å¸Ã‚Â§Ã‚Â¹ [updateService] Dados limpos (sem undefined):', cleanedData);

    const serviceDocRef = doc(firebaseDb, 'businesses', businessId, 'services', serviceId);
    await updateDoc(serviceDocRef, {
      ...cleanedData,
      updatedAt: serverTimestamp(),
    });

    console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ [updateService] Documento atualizado com sucesso');

    const updatedService = await getServiceById(businessId, serviceId);
    if (!updatedService) {
      throw new Error('ServiÃƒÆ’Ã‚Â§o nÃƒÆ’Ã‚Â£o encontrado apÃƒÆ’Ã‚Â³s atualizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o');
    }

    console.log('ÃƒÂ°Ã‚Å¸Ã‚Å½Ã‚â€° [updateService] ServiÃƒÆ’Ã‚Â§o atualizado:', updatedService);
    return updatedService;
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ [updateService] Erro ao atualizar serviÃƒÆ’Ã‚Â§o:', error);
    throw error;
  }
};

// Deletar um serviÃƒÆ’Ã‚Â§o (soft delete)
export const deleteService = async (businessId: string, serviceId: string): Promise<void> => {
  try {
    const serviceDocRef = doc(firebaseDb, 'businesses', businessId, 'services', serviceId);
    await updateDoc(serviceDocRef, {
      active: false,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

// Ativar/desativar um serviÃƒÆ’Ã‚Â§o
export const toggleServiceStatus = async (businessId: string, serviceId: string, active: boolean): Promise<void> => {
  try {
    const serviceDocRef = doc(firebaseDb, 'businesses', businessId, 'services', serviceId);
    await updateDoc(serviceDocRef, {
      active,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

// Atribuir profissionais a um serviÃƒÆ’Ã‚Â§o
export const assignProfessionalsToService = async (
  businessId: string,
  serviceId: string,
  professionalIds: string[],
): Promise<void> => {
  try {
    const serviceRef = doc(firebaseDb, 'businesses', businessId, 'services', serviceId);
    await updateDoc(serviceRef, {
      professionalIds,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

// Buscar serviÃƒÆ’Ã‚Â§os por categoria
export const getServicesByCategory = async (businessId: string, category: string): Promise<Service[]> => {
  try {
    const servicesRef = collection(firebaseDb, 'businesses', businessId, 'services');
    const q = query(
      servicesRef,
      where('category', '==', category),
      where('active', '==', true),
      orderBy('name'),
    );
    const servicesSnapshot = await getDocs(q);

    const services: Service[] = [];

    servicesSnapshot.forEach((docSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const data = docSnapshot.data()!; // Adicionar non-null assertion
      services.push({
        id: docSnapshot.id,
        businessId, // Adicionar businessId
        ...data,
      } as Service);
    });

    return services;
  } catch (error) {
    throw error;
  }
};

// Buscar todas as categorias de um estabelecimento
export const getServiceCategories = async (businessId: string): Promise<string[]> => {
  try {
    const servicesRef = collection(firebaseDb, 'businesses', businessId, 'services');
    const q = query(
      servicesRef,
      where('active', '==', true),
    );
    const servicesSnapshot = await getDocs(q);

    const categories = new Set<string>();

    servicesSnapshot.forEach((docSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const service = docSnapshot.data() as Service;
      if (service.category) {
        categories.add(service.category);
      }
    });

    return Array.from(categories).sort();
  } catch (error) {
    throw error;
  }
};
