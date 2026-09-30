// src/services/adminUsers.ts
// Servicos exclusivos do Painel Admin para a colecao "users".
// Following React Native Firebase v22 modular API patterns
import { collection, getDocs } from '@react-native-firebase/firestore';
import { firebaseDb } from '../config/firebase';

export interface AdminUser {
  uid: string;
  name: string;
  email: string;
  userType: 'client' | 'owner' | 'unknown';
  businessId?: string;
  role?: 'admin';
  photoURL?: string;
  createdAt: Date | null;
}

type RawUserDoc = {
  id: string;
  data: () => Record<string, any> | undefined;
};

const toDate = (value: unknown): Date | null => {
  const ts = value as { toDate?: () => Date } | undefined;
  if (ts && typeof ts.toDate === 'function') {
    return ts.toDate();
  }
  return null;
};

const mapDocumentToAdminUser = (docSnap: RawUserDoc): AdminUser => {
  const data = docSnap.data() || {};
  const rawType = data.userType;
  const userType: AdminUser['userType'] =
    rawType === 'client' || rawType === 'owner' ? rawType : 'unknown';
  return {
    uid: docSnap.id,
    name: (data.name as string) || (data.displayName as string) || '',
    email: (data.email as string) || '',
    userType,
    businessId: (data.businessId as string) || undefined,
    role: data.role === 'admin' ? 'admin' : undefined,
    photoURL: (data.photoURL as string) || undefined,
    createdAt: toDate(data.createdAt),
  };
};

/**
 * ADMIN: retorna todos os usuarios, do mais novo para o mais antigo.
 */
export const getAllUsersAdmin = async (): Promise<AdminUser[]> => {
  try {
    const usersRef = collection(firebaseDb, 'users');
    const snapshot = await getDocs(usersRef);
    const users = snapshot.docs.map((d: RawUserDoc) => mapDocumentToAdminUser(d));
    users.sort((a: AdminUser, b: AdminUser) => {
      const ta = a.createdAt ? a.createdAt.getTime() : 0;
      const tb = b.createdAt ? b.createdAt.getTime() : 0;
      return tb - ta;
    });
    return users;
  } catch (error) {
    console.warn('[getAllUsersAdmin] erro:', error);
    return [];
  }
};
