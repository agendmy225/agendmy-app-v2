// Following React Native Firebase v22 modular API patterns
// https://rnfirebase.io/migrating-to-v22
import { Alert } from 'react-native';
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
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { firebaseDb, firebaseAuth } from '../config/firebase';

// Tipo completo para o agendamento
export interface Appointment {
  id: string; // Tornar id obrigatÃƒÆ’Ã‚Â³rio
  businessId: string;
  serviceId: string;
  professionalId: string;
  clientId: string;
  clientEmail?: string;
  clientName?: string;
  clientPhone?: string;
  date: string;
  time: string;
  serviceName: string;
  professionalName: string;
  businessName: string;
  price: number;
  duration: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  reminderSent?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Tipo para criaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de agendamento (campos obrigatÃƒÆ’Ã‚Â³rios)
type AppointmentData = Omit<Appointment, 'id' | 'clientId' | 'clientEmail' | 'createdAt' | 'updatedAt'>;

// FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para salvar um novo agendamento no Firestore
export const saveAppointment = async (appointmentData: AppointmentData): Promise<string> => {
  try {
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Âµ [saveAppointment] Iniciando...');
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Å  [saveAppointment] Dados recebidos:', appointmentData);

    // Verificar se o usuÃƒÆ’Ã‚Â¡rio estÃƒÆ’Ã‚Â¡ autenticado
    const currentUser = firebaseAuth.currentUser;
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€˜Ã‚Â¤ [saveAppointment] UsuÃƒÆ’Ã‚Â¡rio atual:', {
      uid: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
    });

    if (!currentUser) {
      console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ [saveAppointment] UsuÃƒÆ’Ã‚Â¡rio nÃƒÆ’Ã‚Â£o autenticado');
      throw new Error('UsuÃƒÆ’Ã‚Â¡rio nÃƒÆ’Ã‚Â£o autenticado. Por favor, faÃƒÆ’Ã‚Â§a login novamente.');
    }

    // Buscar dados do cliente para incluir o nome
    let clientName = appointmentData.clientName;
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€˜Ã‚Â¤ [saveAppointment] Nome do cliente inicial:', clientName);

    if (!clientName && currentUser.uid) {
      try {
        console.log('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Â [saveAppointment] Buscando dados do usuÃƒÆ’Ã‚Â¡rio no Firestore...');
        const userDoc = await getDoc(doc(firebaseDb, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          clientName = userData?.name || userData?.displayName || '';
          console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ [saveAppointment] Dados do usuÃƒÆ’Ã‚Â¡rio encontrados:', {
            name: userData?.name,
            displayName: userData?.displayName,
            clientNameFinal: clientName,
          });
        } else {
          console.log('ÃƒÂ¢Ã‚Å¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â [saveAppointment] Documento do usuÃƒÆ’Ã‚Â¡rio nÃƒÆ’Ã‚Â£o encontrado no Firestore');
        }
      } catch (userError) {
        console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ [saveAppointment] Erro ao buscar dados do usuÃƒÆ’Ã‚Â¡rio:', userError);
        // Silently fail
      }
    }

    const finalClientName = clientName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Cliente';
    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€˜Ã‚Â¤ [saveAppointment] Nome final do cliente:', finalClientName);

    const appointmentToSave = {
      ...appointmentData,
      clientId: currentUser.uid,
      clientEmail: currentUser.email,
      clientName: finalClientName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    console.log('ÃƒÂ°Ã‚Å¸Ã‚â€™Ã‚Â¾ [saveAppointment] Dados finais para salvar:', appointmentToSave);

    try {
      console.log('ÃƒÂ°Ã‚Å¸Ã‚â€Ã‚Â¥ [saveAppointment] Salvando no Firestore...');
      // Criar um novo documento na coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o 'appointments'
      const appointmentRef = await addDoc(collection(firebaseDb, 'appointments'), appointmentToSave);
      console.log('ÃƒÂ¢Ã‚Å“Ã‚â€¦ [saveAppointment] Agendamento salvo com sucesso! ID:', appointmentRef.id);
      return appointmentRef.id;
    } catch (firestoreError) {
      console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ [saveAppointment] Erro do Firestore:', firestoreError);
      console.error('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Å  [saveAppointment] Detalhes do erro do Firestore:', {
        code: (firestoreError as any)?.code,
        message: (firestoreError as any)?.message,
        details: (firestoreError as any)?.details,
      });
      throw new Error(`Erro ao salvar no banco de dados: ${(firestoreError as any)?.message || 'Erro desconhecido'}`);
    }
  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ‚Å’ [saveAppointment] Erro geral:', error);
    console.error('ÃƒÂ°Ã‚Å¸Ã‚â€œÃ‚Å  [saveAppointment] Stack trace:', (error as Error)?.stack);

    // NÃƒÆ’Ã‚Â£o mostrar Alert aqui, deixar para a tela que chama
    throw error;
  }
};

// FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para cancelar um agendamento
export const cancelAppointment = async (appointmentId: string): Promise<void> => {
  try {
    // Verificar se o usuÃƒÆ’Ã‚Â¡rio estÃƒÆ’Ã‚Â¡ autenticado
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      throw new Error('UsuÃƒÆ’Ã‚Â¡rio nÃƒÆ’Ã‚Â£o autenticado');
    }

    // Buscar o agendamento para verificar se pertence ao usuÃƒÆ’Ã‚Â¡rio atual
    const appointmentDocSnap = await getDoc(doc(firebaseDb, 'appointments', appointmentId));

    if (!appointmentDocSnap.exists()) {
      throw new Error('Agendamento nÃƒÆ’Ã‚Â£o encontrado');
    }

    const appointmentData = appointmentDocSnap.data();
    if (appointmentData?.clientId !== currentUser.uid) {
      throw new Error('VocÃƒÆ’Ã‚Âª nÃƒÆ’Ã‚Â£o tem permissÃƒÆ’Ã‚Â£o para cancelar este agendamento');
    }

    // Atualizar o status do agendamento para 'cancelled'
    await updateDoc(doc(firebaseDb, 'appointments', appointmentId), {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    Alert.alert('Erro', 'NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel cancelar o agendamento. Tente novamente.');
    throw error;
  }
};

// FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para buscar os agendamentos de um cliente
export const getClientAppointments = async (status?: 'scheduled' | 'completed' | 'cancelled'): Promise<Appointment[]> => {
  try {
    // Verificar se o usuÃƒÆ’Ã‚Â¡rio estÃƒÆ’Ã‚Â¡ autenticado
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      throw new Error('UsuÃƒÆ’Ã‚Â¡rio nÃƒÆ’Ã‚Â£o autenticado');
    }

    // Criar a consulta base usando a API modular
    let queryRef = query(
      collection(firebaseDb, 'appointments'),
      where('clientId', '==', currentUser.uid),
      orderBy('date', 'desc'),
      orderBy('time', 'desc'),
    );

    // Adicionar filtro por status, se fornecido
    if (status) {
      queryRef = query(queryRef, where('status', '==', status));
    }

    // Executar a consulta
    const snapshot = await getDocs(queryRef);    // Mapear os documentos para um array de objetos
    return snapshot.docs.map((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
      } as Appointment;
    });
  } catch (error) {
    Alert.alert('Erro', 'NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel carregar seus agendamentos. Tente novamente.');
    return [];
  }
};

// FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para buscar agendamentos de um estabelecimento (para proprietÃƒÆ’Ã‚Â¡rios)
export const getBusinessAppointments = async (
  businessId: string,
  status?: string,
  startDate?: string,
  endDate?: string,
): Promise<Appointment[]> => {
  try {
    // Buscar na coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o raiz 'appointments' filtrando por businessId
    let queryRef = query(
      collection(firebaseDb, 'appointments'),
      where('businessId', '==', businessId),
    );

    if (status && status !== 'all') {
      queryRef = query(queryRef, where('status', '==', status));
    }

    if (startDate) {
      queryRef = query(queryRef, where('date', '>=', startDate));
    }

    if (endDate) {
      queryRef = query(queryRef, where('date', '<=', endDate));
    }
    queryRef = query(queryRef, orderBy('date', 'desc'), orderBy('time', 'desc'));

    const snapshot = await getDocs(queryRef);

    const appointmentsWithClientNames = await Promise.all(
      snapshot.docs.map(async (appointmentDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
        const data = appointmentDoc.data();
        let clientName = data.clientName;

        // Se nÃƒÆ’Ã‚Â£o houver nome do cliente, buscar na coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de usuÃƒÆ’Ã‚Â¡rios
        if (!clientName && data.clientId) {
          try {
            const userDoc = await getDoc(doc(firebaseDb, 'users', data.clientId));
            if (userDoc.exists()) {
              clientName = userDoc.data()?.name || userDoc.data()?.displayName || 'Cliente Desconhecido';
            }
          } catch (error) {
            // Silently fail
          }
        }

        return {
          id: appointmentDoc.id,
          ...data,
          clientName: clientName || 'Cliente Desconhecido',
        } as Appointment;
      }),
    );

    return appointmentsWithClientNames;
  } catch (error) {
    throw error;
  }
};

// FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para buscar agendamentos de um profissional
export const getProfessionalAppointments = async (
  professionalId: string,
  status?: string,
  date?: string,
): Promise<Appointment[]> => {
  try {
    let queryRef = query(
      collection(firebaseDb, 'appointments'),
      where('professionalId', '==', professionalId),
    );

    if (status && status !== 'all') {
      queryRef = query(queryRef, where('status', '==', status));
    }

    if (date) {
      queryRef = query(queryRef, where('date', '==', date));
    } queryRef = query(queryRef, orderBy('date', 'desc'), orderBy('time', 'asc'));

    const snapshot = await getDocs(queryRef);
    return snapshot.docs.map((professionalDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const data = professionalDoc.data();
      return {
        id: professionalDoc.id,
        ...data,
      } as Appointment;
    });
  } catch (error) {
    throw error;
  }
};

// FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para atualizar status de um agendamento
export const updateAppointmentStatus = async (
  appointmentId: string,
  status: Appointment['status'],
  notes?: string,
): Promise<void> => {
  try {
    const updateData: { status: Appointment['status']; updatedAt: unknown; notes?: string } = {
      status,
      updatedAt: serverTimestamp(),
    };

    if (notes) {
      updateData.notes = notes;
    }

    await updateDoc(doc(firebaseDb, 'appointments', appointmentId), updateData);
  } catch (error) {
    throw error;
  }
};

// FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para buscar um agendamento especÃƒÆ’Ã‚Â­fico
export const getAppointmentById = async (appointmentId: string): Promise<Appointment | null> => {
  try {
    const docSnap = await getDoc(doc(firebaseDb, 'appointments', appointmentId));

    if (!docSnap.exists()) {
      return null;
    }
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
    } as Appointment;
  } catch (error) {
    throw error;
  }
};

// FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para reagendar um agendamento
export const rescheduleAppointment = async (
  appointmentId: string,
  newDate: string,
  newTime: string,
): Promise<void> => {
  try {
    await updateDoc(doc(firebaseDb, 'appointments', appointmentId), {
      date: newDate,
      time: newTime,
      status: 'scheduled',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

// FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para buscar agendamentos em um perÃƒÆ’Ã‚Â­odo
export const getAppointmentsByDateRange = async (
  businessId: string,
  startDate: string,
  endDate: string,
): Promise<Appointment[]> => {
  try {
    const queryRef = query(
      collection(firebaseDb, 'appointments'),
      where('businessId', '==', businessId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc'),
      orderBy('time', 'asc'),
    );
    const snapshot = await getDocs(queryRef);

    return snapshot.docs.map((dateRangeDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const data = dateRangeDoc.data();
      return {
        id: dateRangeDoc.id,
        ...data,
      } as Appointment;
    });
  } catch (error) {
    throw error;
  }
};

// FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para obter estatÃƒÆ’Ã‚Â­sticas de agendamentos
export const getAppointmentStats = async (businessId: string, period: 'today' | 'week' | 'month'): Promise<{
  total: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  revenue: number;
}> => {
  try {
    const now = new Date();
    let startDate: string;

    switch (period) {
      case 'today':
        startDate = now.toISOString().split('T')[0];
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = monthAgo.toISOString().split('T')[0];
        break;
    }

    const endDate = now.toISOString().split('T')[0];

    const queryRef = query(
      collection(firebaseDb, 'appointments'),
      where('businessId', '==', businessId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
    );
    const snapshot = await getDocs(queryRef);

    let total = 0;
    let confirmed = 0;
    let completed = 0;
    let cancelled = 0;
    let revenue = 0;
    snapshot.docs.forEach((statsDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
      const appointment = statsDoc.data() as Appointment;
      total++;

      switch (appointment.status) {
        case 'confirmed':
        case 'scheduled':
          confirmed++;
          break;
        case 'completed': completed++;
          revenue += appointment.price || 0;
          break;
        case 'cancelled':
          cancelled++;
          break;
      }
    });

    return { total, confirmed, completed, cancelled, revenue };
  } catch (error) {
    throw error;
  }
};

// FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para verificar disponibilidade de horÃƒÆ’Ã‚Â¡rio
export const checkTimeSlotAvailability = async (
  professionalId: string,
  date: string,
  time: string, // <-- O parÃƒÆ’Ã‚Â¢metro 'time' foi adicionado aqui (corrigindo um bug potencial)
  duration: number = 60,
): Promise<boolean> => {
  try {
    const queryRef = query(
      collection(firebaseDb, 'appointments'),
      where('professionalId', '==', professionalId),
      where('date', '==', date),
      where('status', 'in', ['scheduled', 'confirmed']),
    );
    const snapshot = await getDocs(queryRef);

    const requestedStart = new Date(`${date}T${time}`); // Agora 'time' estÃƒÆ’Ã‚Â¡ disponÃƒÆ’Ã‚Â­vel
    const requestedEnd = new Date(requestedStart.getTime() + duration * 60000);
    for (const availabilityDoc of snapshot.docs) {
      const appointment = availabilityDoc.data() as Appointment;
      const existingStart = new Date(`${appointment.date}T${appointment.time}`);
      const existingEnd = new Date(existingStart.getTime() + (parseInt(appointment.duration, 10) || 60) * 60000);

      // Verifica se hÃƒÆ’Ã‚Â¡ sobreposiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
      if (requestedStart < existingEnd && requestedEnd > existingStart) {
        return false;
      }
    }

    return true;
  } catch (error) {
    return false;
  }
};

// FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para marcar como falta (no-show)
export const markNoShow = async (appointmentId: string): Promise<void> => {
  try {
    await updateDoc(doc(firebaseDb, 'appointments', appointmentId), {
      status: 'no_show',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

// FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para enviar lembrete (placeholder - implementar com notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes push)
export const sendReminder = async (appointmentId: string): Promise<void> => {
  try {
    await updateDoc(doc(firebaseDb, 'appointments', appointmentId), {
      reminderSent: true,
      updatedAt: serverTimestamp(),
    });

  } catch (error) {
    throw error;
  }
};

// FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para verificar se um cliente tem agendamentos concluÃƒÆ’Ã‚Â­dos com um negÃƒÆ’Ã‚Â³cio especÃƒÆ’Ã‚Â­fico
export const hasCompletedAppointmentWithBusiness = async (userId: string | undefined, businessId: string): Promise<boolean> => {
  try {
    // Verificar se o usuÃƒÆ’Ã‚Â¡rio estÃƒÆ’Ã‚Â¡ autenticado
    if (!userId) {
      return false;
    }

    // Criar consulta para buscar agendamentos concluÃƒÆ’Ã‚Â­dos do usuÃƒÆ’Ã‚Â¡rio com o negÃƒÆ’Ã‚Â³cio
    const queryRef = query(
      collection(firebaseDb, 'appointments'),
      where('clientId', '==', userId),
      where('businessId', '==', businessId),
      where('status', '==', 'completed'),
      limit(1), // SÃƒÆ’Ã‚Â³ precisamos saber se existe pelo menos um
    );

    const snapshot = await getDocs(queryRef);
    return !snapshot.empty;
  } catch (error) {
    return false;
  }
};

export default {
  saveAppointment,
  cancelAppointment,
  getClientAppointments,
  getBusinessAppointments,
  getProfessionalAppointments,
  updateAppointmentStatus,
  getAppointmentById,
  rescheduleAppointment,
  getAppointmentsByDateRange,
  getAppointmentStats,
  checkTimeSlotAvailability,
  markNoShow,
  sendReminder,
  hasCompletedAppointmentWithBusiness,
};
