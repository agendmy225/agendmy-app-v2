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
  id: string; // Tornar id obrigatório
  businessId: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  category: string;
  active: boolean;
  isPromotionActive?: boolean; // Adicionado para promoçÃµes
  discountPercentage?: number; // Adicionado para promoçÃµes
  promotionalPrice?: number; // Adicionado para promoçÃµes
  numSessions?: number; // Número de sessÃµes para pacotes
  professionalIds?: string[]; // IDs dos profissionais que realizam o serviço
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Buscar todos os serviços de um estabelecimento
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

// Buscar um serviço específico
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

// Criar um novo serviço
export const createService = async (businessId: string, serviceData: any): Promise<Service> => {
  try {
    console.log('ðŸ”„ [createService] Iniciando criação de serviço');
    console.log('ðŸ“ [createService] BusinessID:', businessId);
    console.log('ðŸ“‹ [createService] ServiceData:', JSON.stringify(serviceData, null, 2));

    if (!businessId) {
      console.log('âŒ [createService] BusinessId vazio');
      throw new Error('BusinessId é obrigatório para criar um serviço');
    }

    // Validar campos obrigatórios
    if (!serviceData.name || !serviceData.price || !serviceData.duration || !serviceData.category) {
      console.log('âŒ [createService] Campos obrigatórios ausentes:', {
        name: !!serviceData.name,
        price: !!serviceData.price,
        duration: !!serviceData.duration,
        category: !!serviceData.category
      });
      throw new Error('Campos obrigatórios não preenchidos: name, price, duration, category');
    }

    console.log('âœ… [createService] ValidaçÃµes básicas passaram');

    const servicesRef = collection(firebaseDb, 'businesses', businessId, 'services');
    console.log('ðŸ“‚ [createService] ReferÃªncia da coleção criada para:', `businesses/${businessId}/services`);

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

    console.log('ðŸ’¾ [createService] Dados a serem salvos:', JSON.stringify(dataToSave, null, 2));

    console.log('ðŸ“ [createService] Tentando adicionar documento...');
    const docRef = await addDoc(servicesRef, dataToSave);
    console.log('âœ… [createService] Documento criado com ID:', docRef.id);

    console.log('ðŸ” [createService] Recuperando serviço criado...');
    const newService = await getServiceById(businessId, docRef.id);
    if (!newService) {
      console.log('âŒ [createService] Falha ao recuperar serviço criado');
      throw new Error('Erro ao recuperar serviço criado');
    }

    console.log('ðŸŽ‰ [createService] Serviço criado com sucesso:', newService);
    return newService;
  } catch (error) {
    console.error('âŒ [createService] Erro ao criar serviço:', error);
    console.error('ðŸ” [createService] Tipo do erro:', typeof error);
    console.error('ðŸ“Š [createService] Stack trace:', (error as Error)?.stack);

    if (error instanceof Error) {
      console.error('ðŸ’¬ [createService] Mensagem:', error.message);
    }

    throw error;
  }
};

// Atualizar um serviço existente
export const updateService = async (businessId: string, serviceId: string, serviceData: Partial<Service>): Promise<Service> => {
  try {
    console.log('ðŸ”„ [updateService] Iniciando atualização de serviço');
    console.log('ðŸ“ [updateService] BusinessID:', businessId);
    console.log('ðŸ“ [updateService] ServiceID:', serviceId);
    console.log('ðŸ“‹ [updateService] ServiceData recebido:', serviceData);

    // Remover campos undefined para evitar erro no firebaseDb
    const cleanedData: Record<string, unknown> = {};
    Object.keys(serviceData).forEach(key => {
      const value = (serviceData as Record<string, unknown>)[key];
      if (value !== undefined) {
        cleanedData[key] = value;
      }
    });

    console.log('ðŸ§¹ [updateService] Dados limpos (sem undefined):', cleanedData);

    const serviceDocRef = doc(firebaseDb, 'businesses', businessId, 'services', serviceId);
    await updateDoc(serviceDocRef, {
      ...cleanedData,
      updatedAt: serverTimestamp(),
    });

    console.log('âœ… [updateService] Documento atualizado com sucesso');

    const updatedService = await getServiceById(businessId, serviceId);
    if (!updatedService) {
      throw new Error('Serviço não encontrado após atualização');
    }

    console.log('ðŸŽ‰ [updateService] Serviço atualizado:', updatedService);
    return updatedService;
  } catch (error) {
    console.error('âŒ [updateService] Erro ao atualizar serviço:', error);
    throw error;
  }
};

// Deletar um serviço (soft delete)
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

// Ativar/desativar um serviço
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

// Atribuir profissionais a um serviço
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

// Buscar serviços por categoria
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
