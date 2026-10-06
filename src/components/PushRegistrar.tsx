// src/components/PushRegistrar.tsx
// Registra o celular para receber notificacoes sempre que o app abre com
// alguem logado (antes so registrava no momento do login).
// No Android 13+ tambem pede a permissao POST_NOTIFICATIONS, sem a qual a
// notificacao chega mas nao aparece.
// Following React Native Firebase v22 modular API patterns
import React, { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { doc, serverTimestamp, setDoc } from '@react-native-firebase/firestore';
import { firebaseDb } from '../config/firebase';
import { useAuth } from '../features/auth/context/AuthContext';

const saveToken = async (uid: string, token: string): Promise<void> => {
  await setDoc(
    doc(firebaseDb, 'users', uid, 'tokens', token),
    { token, platform: Platform.OS, updatedAt: serverTimestamp() },
    { merge: true },
  );
};

const askAndroidNotificationPermission = async (): Promise<void> => {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    try {
      await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS' as any);
    } catch (err) {
      console.warn('[PushRegistrar] permissao de notificacao:', err);
    }
  }
};

const PushRegistrar: React.FC = () => {
  const { user } = useAuth();
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) {
      return;
    }
    let cancelled = false;
    let unsubscribeRefresh: (() => void) | null = null;

    const register = async () => {
      try {
        await askAndroidNotificationPermission();
        await messaging().requestPermission();
        const token = await messaging().getToken();
        if (token && !cancelled) {
          await saveToken(uid, token);
        }
        if (!cancelled) {
          unsubscribeRefresh = messaging().onTokenRefresh((newToken: string) => {
            saveToken(uid, newToken).catch(() => undefined);
          });
        }
      } catch (err) {
        console.warn('[PushRegistrar] erro ao registrar:', err);
      }
    };

    register();

    return () => {
      cancelled = true;
      if (unsubscribeRefresh) {
        unsubscribeRefresh();
      }
    };
  }, [uid]);

  return null;
};

export default PushRegistrar;
