// src/hooks/useOwnerPendingCount.ts
// Agendamentos do estabelecimento aguardando confirmacao (numero na aba Agendamentos do dono).
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { firebaseDb } from '../config/firebase';
import { toLocalDateString } from '../utils/localDate';

export const useOwnerPendingCount = (businessId?: string | null): number => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!businessId) {
      setCount(0);
      return;
    }
    const q = query(
      collection(firebaseDb, 'appointments'),
      where('businessId', '==', businessId),
      where('status', '==', 'scheduled'),
    );
    return onSnapshot(
      q,
      (snap: { docs: { data: () => Record<string, any> | undefined }[] }) => {
        const today = toLocalDateString(new Date());
        setCount(snap.docs.filter((d) => String((d.data() || {}).date || '') >= today).length);
      },
      () => setCount(0),
    );
  }, [businessId]);

  return count;
};

export default useOwnerPendingCount;
