// src/hooks/useClientUnreadCount.ts
// Quantos agendamentos do cliente tem novidade (confirmado, remarcado, cancelado...)
// que ele ainda nao abriu. Usado no numero da aba Agendamentos.
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { firebaseDb } from '../config/firebase';

export const useClientUnreadCount = (uid?: string | null): number => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!uid) {
      setCount(0);
      return;
    }
    const q = query(
      collection(firebaseDb, 'appointments'),
      where('clientId', '==', uid),
      where('clientUnread', '==', true),
    );
    return onSnapshot(
      q,
      (snap: { size: number }) => setCount(snap.size),
      () => setCount(0),
    );
  }, [uid]);

  return count;
};

export default useClientUnreadCount;
