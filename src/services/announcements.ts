// src/services/announcements.ts
// Caixa de comunicados para clientes e donos (lado do usuario).
// Le os comunicados ja ENVIADOS da colecao "announcements", filtra pelo
// publico do usuario e controla quais ele ainda nao viu (salvo no aparelho).
// Following React Native Firebase v22 modular API patterns
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, limit, onSnapshot, orderBy, query } from '@react-native-firebase/firestore';
import { firebaseDb } from '../config/firebase';
import { useAuth } from '../features/auth/context/AuthContext';

export interface UserAnnouncement {
  id: string;
  title: string;
  body: string;
  createdAt: Date | null;
}

type RawDoc = {
  id: string;
  data: () => Record<string, any> | undefined;
};

// Sem registro de "ultima vez visto", conta como novo o que tiver ate 7 dias
const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const keyFor = (uid: string) => `announcements_last_seen_${uid}`;

// Avisa todos os sinos abertos quando o usuario abre a caixa de comunicados
const lastSeenListeners = new Set<(time: number) => void>();

const toDate = (value: unknown): Date | null => {
  const ts = value as { toDate?: () => Date } | undefined;
  if (ts && typeof ts.toDate === 'function') {
    return ts.toDate();
  }
  return null;
};

export const useAnnouncements = () => {
  const { user } = useAuth();
  const uid = user?.uid;
  const userType = user?.userType;

  const [list, setList] = useState<UserAnnouncement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [lastSeen, setLastSeen] = useState<number | null>(null);

  // comunicados em tempo real
  useEffect(() => {
    const q = query(collection(firebaseDb, 'announcements'), orderBy('createdAt', 'desc'), limit(30));
    const unsubscribe = onSnapshot(
      q,
      (snap: { docs: RawDoc[] }) => {
        const items: UserAnnouncement[] = [];
        snap.docs.forEach((d: RawDoc) => {
          const data = d.data() || {};
          if (data.status !== 'sent') {
            return;
          }
          const audience = data.audience || 'all';
          if (audience !== 'all' && audience !== userType) {
            return;
          }
          items.push({
            id: d.id,
            title: (data.title as string) || '',
            body: (data.body as string) || '',
            createdAt: toDate(data.createdAt),
          });
        });
        setList(items);
        setLoaded(true);
      },
      (error: unknown) => {
        console.warn('[announcements] erro no tempo real:', error);
        setLoaded(true);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [userType]);

  // ultima vez que o usuario abriu a caixa (neste aparelho)
  useEffect(() => {
    if (!uid) {
      return;
    }
    let active = true;
    AsyncStorage.getItem(keyFor(uid))
      .then((value: string | null) => {
        if (active) {
          setLastSeen(value ? Number(value) : null);
        }
      })
      .catch(() => undefined);
    const listener = (time: number) => setLastSeen(time);
    lastSeenListeners.add(listener);
    return () => {
      active = false;
      lastSeenListeners.delete(listener);
    };
  }, [uid]);

  const markAllSeen = useCallback(async () => {
    if (!uid) {
      return;
    }
    const now = Date.now();
    try {
      await AsyncStorage.setItem(keyFor(uid), String(now));
    } catch {
      // se falhar, so nao guarda; nao atrapalha o uso
    }
    lastSeenListeners.forEach((listener) => listener(now));
  }, [uid]);

  const threshold = lastSeen ?? Date.now() - NEW_WINDOW_MS;
  const isUnread = (a: UserAnnouncement): boolean =>
    !!a.createdAt && a.createdAt.getTime() > threshold;
  const unreadCount = list.filter(isUnread).length;

  return { list, loaded, unreadCount, isUnread, markAllSeen };
};
