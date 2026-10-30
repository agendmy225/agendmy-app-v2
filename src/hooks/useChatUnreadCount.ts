// src/hooks/useChatUnreadCount.ts
// Total de mensagens nao lidas nas conversas da pessoa (numero nas abas e menus).
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { firebaseDb } from '../config/firebase';

export const useChatUnreadCount = (uid?: string | null): number => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!uid) {
      setCount(0);
      return;
    }
    const q = query(collection(firebaseDb, 'chats'), where('participants', 'array-contains', uid));
    return onSnapshot(
      q,
      (snap: { docs: { data: () => Record<string, any> | undefined }[] }) => {
        let total = 0;
        snap.docs.forEach((d) => {
          const unread = (d.data() || {}).unread;
          total += Number((unread && unread[uid]) || 0);
        });
        setCount(total);
      },
      () => setCount(0),
    );
  }, [uid]);

  return count;
};

export default useChatUnreadCount;
