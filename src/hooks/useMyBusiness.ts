// src/hooks/useMyBusiness.ts
// Negocio do dono logado, em tempo real (usado na assinatura).
// Following React Native Firebase v22 modular API patterns
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from '@react-native-firebase/firestore';
import { firebaseDb } from '../config/firebase';
import { useAuth } from '../features/auth/context/AuthContext';

export const useMyBusiness = (): { business: Record<string, any> | null; loaded: boolean } => {
  const { user } = useAuth();
  const businessId = user?.businessId;
  const [business, setBusiness] = useState<Record<string, any> | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!businessId) {
      setBusiness(null);
      setLoaded(true);
      return;
    }
    const unsubscribe = onSnapshot(
      doc(firebaseDb, 'businesses', businessId),
      (snap: { data: () => Record<string, any> | undefined }) => {
        setBusiness(snap.data() || null);
        setLoaded(true);
      },
      (error: unknown) => {
        console.warn('[useMyBusiness] erro:', error);
        setLoaded(true);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [businessId]);

  return { business, loaded };
};
