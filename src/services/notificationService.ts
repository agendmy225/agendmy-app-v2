import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import { doc, setDoc, serverTimestamp, firestore } from '../config/firebase';
import { Platform } from 'react-native';

class NotificationService {
  constructor() {
    // Configurar PushNotification para React Native CLI
    PushNotification.configure({
      onRegister: function (token) {
        console.log('TOKEN:', token);
      },
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Criar canal de notificaÃ§Ã£o para Android
    PushNotification.createChannel(
      {
        channelId: 'default',
        channelName: 'Default Channel',
        channelDescription: 'Canal padrÃ£o para notificaÃ§Ãµes',
        playSound: true,
        soundName: 'default',
        importance: 4, // High importance
        vibrate: true,
      },
      (created) => console.log(`createChannel returned '${created}'`)
    );
  }

  /**
   * Solicita permissÃ£o do usuÃ¡rio para receber notificaÃ§Ãµes push.
   */
  public async requestUserPermission(userId: string | null): Promise<void> {
    if (!userId) return;

    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Authorization status:', authStatus);
        this.getAndSaveFcmToken(userId);
      }
    } catch (error) {
      console.error('Erro ao solicitar permissÃ£o de notificaÃ§Ã£o:', error);
    }
  }

  /**
   * ObtÃ©m o token FCM do dispositivo e salva no Firestore para o usuÃ¡rio logado.
   */
  private async getAndSaveFcmToken(userId: string): Promise<void> {
    try {
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        console.log('FCM Token:', fcmToken);
        const tokenRef = doc(firestore, 'users', userId, 'tokens', fcmToken);
        await setDoc(tokenRef, {
          token: fcmToken,
          createdAt: serverTimestamp(),
          platform: Platform.OS,
        });
      }
    } catch (error) {
      console.error('Erro ao obter e salvar token FCM:', error);
    }
  }

  /**
   * Configura os listeners para notificaÃ§Ãµes recebidas enquanto o app estÃ¡ em primeiro plano (foreground)
   * e para quando o usuÃ¡rio abre o app clicando em uma notificaÃ§Ã£o.
   */
  public initializeNotificationListeners(): () => void {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('A new FCM message arrived!', JSON.stringify(remoteMessage));
      if (remoteMessage.notification) {
        this.displayLocalNotification(
          remoteMessage.notification.title || 'Nova NotificaÃ§Ã£o',
          remoteMessage.notification.body || '',
        );
      }
    });

    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log(
        'Notification caused app to open from background state:',
        remoteMessage.notification,
      );
    });

    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log(
            'Notification caused app to open from quit state:',
            remoteMessage.notification,
          );
        }
      });

    return unsubscribe;
  }

  /**
   * Exibe uma notificaÃ§Ã£o local usando react-native-push-notification.
   * NecessÃ¡rio para mostrar notificaÃ§Ãµes quando o app estÃ¡ em primeiro plano.
   */
  private async displayLocalNotification(title: string, body: string): Promise<void> {
    try {
      PushNotification.localNotification({
        channelId: 'default',
        title,
        message: body,
        playSound: true,
        soundName: 'default',
        importance: 'high',
        priority: 'high',
        smallIcon: 'ic_stat_ic_notification', // IMPORTANTE: Deve corresponder ao nome do arquivo em android/app/src/main/res/drawable
        largeIcon: '',
        vibrate: true,
        vibration: 300,
        ongoing: false,
        ignoreInForeground: false,
        shortcutId: 'shortcut-id',
        onlyAlertOnce: false,
        when: null,
        usesChronometer: false,
        timeoutAfter: null,
        invokeApp: true,
        actions: ['OK'],
      });
    } catch (error) {
      console.error('Erro ao exibir notificaÃ§Ã£o local:', error);
    }
  }
}

export const notificationService = new NotificationService();