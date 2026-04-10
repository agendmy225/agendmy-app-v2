import { firestore, serverTimestamp, doc, setDoc, getDoc, addDoc, collection, query, where, orderBy, limit, getDocs, updateDoc } from '../config/firebase';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Tipos
export interface NotificationSettings {
  userId: string;
  appointmentReminders: boolean;
  appointmentConfirmations: boolean;
  promotions: boolean;
  news: boolean;
}

// Solicitar permissÃ£o para notificaÃ§Ãµes
export const requestNotificationPermission = async (): Promise<boolean> => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  return enabled;
};

// Registrar token do dispositivo
export const registerDeviceToken = async (userId: string): Promise<void> => {
  try {
    // Verificar se jÃ¡ tem permissÃ£o
    const enabled = await requestNotificationPermission();

    if (!enabled) {
      throw new Error('PermissÃ£o para notificaÃ§Ãµes nÃ£o concedida');
    }


    // Obter token do dispositivo
    const token = await messaging().getToken();

    if (token) {
      // Salvar token no Firestore usando API modular
      // Salva em users/{userId}/tokens/{token} â€” mesmo path usado pela Cloud Function
      await setDoc(doc(firestore, 'users', userId, 'tokens', token), {
        token,
        platform: Platform.OS,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Salvar localmente para referÃªncia
      await AsyncStorage.setItem('fcmToken', token);
    }
  } catch (error) {
    throw error;
  }
};

// Salvar configuraÃ§Ãµes de notificaÃ§Ã£o
export const saveNotificationSettings = async (settings: NotificationSettings): Promise<void> => {
  try {
    await setDoc(doc(firestore, 'notificationSettings', settings.userId), settings, { merge: true });
  } catch (error) {
    throw error;
  }
};

// Obter configuraÃ§Ãµes de notificaÃ§Ã£o
export const getNotificationSettings = async (userId: string): Promise<NotificationSettings | null> => {
  try {
    const settingsDoc = await getDoc(doc(firestore, 'notificationSettings', userId));

    if (settingsDoc.exists()) {
      return settingsDoc.data() as NotificationSettings;
    }

    // ConfiguraÃ§Ãµes padrÃ£o
    const defaultSettings: NotificationSettings = {
      userId,
      appointmentReminders: true,
      appointmentConfirmations: true,
      promotions: false,
      news: false,
    };

    // Salvar configuraÃ§Ãµes padrÃ£o
    await saveNotificationSettings(defaultSettings);

    return defaultSettings;
  } catch {
    return null;
  }
};

// Enviar notificaÃ§Ã£o de lembrete de agendamento
export const sendAppointmentReminder = async (
  userId: string,
  appointmentId: string,
  businessName: string,
  serviceName: string,
  appointmentDate: Date,
  appointmentTime: string,
): Promise<void> => {
  try {
    // Verificar configuraÃ§Ãµes do usuÃ¡rio
    const settings = await getNotificationSettings(userId);

    if (!settings || !settings.appointmentReminders) {
      return;
    }

    // Formatar data
    const formattedDate = appointmentDate.toLocaleDateString('pt-BR');

    // Criar notificaÃ§Ã£o no Firestore (para histÃ³rico) usando API modular
    await addDoc(collection(firestore, 'notifications'), {
      userId,
      appointmentId,
      type: 'reminder',
      title: 'Lembrete de Agendamento',
      body: `VocÃª tem um agendamento de ${serviceName} em ${businessName} amanhÃ£, ${formattedDate} Ã s ${appointmentTime}.`,
      data: {
        appointmentId,
        businessName,
        serviceName,
        appointmentDate: formattedDate,
        appointmentTime,
      },
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

// Enviar notificaÃ§Ã£o de confirmaÃ§Ã£o de agendamento
export const sendAppointmentConfirmation = async (
  userId: string,
  appointmentId: string,
  businessName: string,
  serviceName: string,
  appointmentDate: Date,
  appointmentTime: string,
): Promise<void> => {
  try {
    // Verificar configuraÃ§Ãµes do usuÃ¡rio
    const settings = await getNotificationSettings(userId);

    if (!settings || !settings.appointmentConfirmations) {
      return;
    }

    // Formatar data
    const formattedDate = appointmentDate.toLocaleDateString('pt-BR');

    // Criar notificaÃ§Ã£o no Firestore (para histÃ³rico) usando API modular
    await addDoc(collection(firestore, 'notifications'), {
      userId,
      appointmentId,
      type: 'confirmation',
      title: 'Agendamento Confirmado',
      body: `Seu agendamento de ${serviceName} em ${businessName} foi confirmado para ${formattedDate} Ã s ${appointmentTime}.`,
      data: {
        appointmentId,
        businessName,
        serviceName,
        appointmentDate: formattedDate,
        appointmentTime,
      },
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

// Obter histÃ³rico de notificaÃ§Ãµes
export const getNotificationHistory = async (userId: string, limitCount = 20): Promise<unknown[]> => {
  try {
    const notificationsQuery = query(
      collection(firestore, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount),
    );

    const notificationsSnapshot = await getDocs(notificationsQuery);

    const notifications: unknown[] = [];

    notificationsSnapshot.forEach((docSnapshot) => {
      notifications.push({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      });
    });

    return notifications;
  } catch {
    return [];
  }
};

// Marcar notificaÃ§Ã£o como lida
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await updateDoc(doc(firestore, 'notifications', notificationId), {
      read: true,
    });
  } catch (error) {
    throw error;
  }
};

// Configurar listeners para notificaÃ§Ãµes em foreground
export const setupNotificationListeners = (): (() => void) => {
  const unsubscribe = messaging().onMessage(async () => {
    // Processar notificaÃ§Ã£o recebida com o app em foreground
    // Aqui vocÃª pode mostrar uma notificaÃ§Ã£o local ou atualizar a UI
    // Por exemplo, usando a biblioteca react-native-push-notification
  });
  return unsubscribe;
};

// Configurar handler para notificaÃ§Ãµes em background/killed state
export const setupBackgroundHandler = (): void => {
  messaging().setBackgroundMessageHandler(async () => {
    // NÃ£o Ã© necessÃ¡rio fazer nada aqui, o sistema Android mostrarÃ¡ a notificaÃ§Ã£o automaticamente
  });
};
