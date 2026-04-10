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

// Solicitar permissÃƒÆ’Ã‚Â£o para notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes
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
    // Verificar se jÃƒÆ’Ã‚Â¡ tem permissÃƒÆ’Ã‚Â£o
    const enabled = await requestNotificationPermission();

    if (!enabled) {
      throw new Error('PermissÃƒÆ’Ã‚Â£o para notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes nÃƒÆ’Ã‚Â£o concedida');
    }


    // Obter token do dispositivo
    const token = await messaging().getToken();

    if (token) {
      // Salvar token no Firestore usando API modular
      // Salva em users/{userId}/tokens/{token} ÃƒÂ¢Ã‚â‚¬Ã‚â€ mesmo path usado pela Cloud Function
      await setDoc(doc(firestore, 'users', userId, 'tokens', token), {
        token,
        platform: Platform.OS,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Salvar localmente para referÃƒÆ’Ã‚Âªncia
      await AsyncStorage.setItem('fcmToken', token);
    }
  } catch (error) {
    throw error;
  }
};

// Salvar configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
export const saveNotificationSettings = async (settings: NotificationSettings): Promise<void> => {
  try {
    await setDoc(doc(firestore, 'notificationSettings', settings.userId), settings, { merge: true });
  } catch (error) {
    throw error;
  }
};

// Obter configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
export const getNotificationSettings = async (userId: string): Promise<NotificationSettings | null> => {
  try {
    const settingsDoc = await getDoc(doc(firestore, 'notificationSettings', userId));

    if (settingsDoc.exists()) {
      return settingsDoc.data() as NotificationSettings;
    }

    // ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes padrÃƒÆ’Ã‚Â£o
    const defaultSettings: NotificationSettings = {
      userId,
      appointmentReminders: true,
      appointmentConfirmations: true,
      promotions: false,
      news: false,
    };

    // Salvar configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes padrÃƒÆ’Ã‚Â£o
    await saveNotificationSettings(defaultSettings);

    return defaultSettings;
  } catch {
    return null;
  }
};

// Enviar notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de lembrete de agendamento
export const sendAppointmentReminder = async (
  userId: string,
  appointmentId: string,
  businessName: string,
  serviceName: string,
  appointmentDate: Date,
  appointmentTime: string,
): Promise<void> => {
  try {
    // Verificar configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do usuÃƒÆ’Ã‚Â¡rio
    const settings = await getNotificationSettings(userId);

    if (!settings || !settings.appointmentReminders) {
      return;
    }

    // Formatar data
    const formattedDate = appointmentDate.toLocaleDateString('pt-BR');

    // Criar notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o no Firestore (para histÃƒÆ’Ã‚Â³rico) usando API modular
    await addDoc(collection(firestore, 'notifications'), {
      userId,
      appointmentId,
      type: 'reminder',
      title: 'Lembrete de Agendamento',
      body: `VocÃƒÆ’Ã‚Âª tem um agendamento de ${serviceName} em ${businessName} amanhÃƒÆ’Ã‚Â£, ${formattedDate} ÃƒÆ’Ã‚Â s ${appointmentTime}.`,
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

// Enviar notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de confirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de agendamento
export const sendAppointmentConfirmation = async (
  userId: string,
  appointmentId: string,
  businessName: string,
  serviceName: string,
  appointmentDate: Date,
  appointmentTime: string,
): Promise<void> => {
  try {
    // Verificar configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do usuÃƒÆ’Ã‚Â¡rio
    const settings = await getNotificationSettings(userId);

    if (!settings || !settings.appointmentConfirmations) {
      return;
    }

    // Formatar data
    const formattedDate = appointmentDate.toLocaleDateString('pt-BR');

    // Criar notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o no Firestore (para histÃƒÆ’Ã‚Â³rico) usando API modular
    await addDoc(collection(firestore, 'notifications'), {
      userId,
      appointmentId,
      type: 'confirmation',
      title: 'Agendamento Confirmado',
      body: `Seu agendamento de ${serviceName} em ${businessName} foi confirmado para ${formattedDate} ÃƒÆ’Ã‚Â s ${appointmentTime}.`,
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

// Obter histÃƒÆ’Ã‚Â³rico de notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes
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

// Marcar notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o como lida
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await updateDoc(doc(firestore, 'notifications', notificationId), {
      read: true,
    });
  } catch (error) {
    throw error;
  }
};

// Configurar listeners para notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes em foreground
export const setupNotificationListeners = (): (() => void) => {
  const unsubscribe = messaging().onMessage(async () => {
    // Processar notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o recebida com o app em foreground
    // Aqui vocÃƒÆ’Ã‚Âª pode mostrar uma notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o local ou atualizar a UI
    // Por exemplo, usando a biblioteca react-native-push-notification
  });
  return unsubscribe;
};

// Configurar handler para notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes em background/killed state
export const setupBackgroundHandler = (): void => {
  messaging().setBackgroundMessageHandler(async () => {
    // NÃƒÆ’Ã‚Â£o ÃƒÆ’Ã‚Â© necessÃƒÆ’Ã‚Â¡rio fazer nada aqui, o sistema Android mostrarÃƒÆ’Ã‚Â¡ a notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o automaticamente
  });
};
