// src/services/professionalAccess.ts
// Acesso dos profissionais ao app: convites com codigo e limite por plano.
// Following React Native Firebase v22 modular API patterns
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import { firebaseDb } from '../config/firebase';

// Plano Basico: ate 5 profissionais com acesso. Plano Plus: ate 10.
export const PLAN_LIMITS = { basic: 5, plus: 10 };

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O e 1/I

export const generateInviteCode = (): string => {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
};

export const getPlanLimit = async (businessId: string): Promise<number> => {
  try {
    const snap = await getDoc(doc(firebaseDb, 'businesses', businessId));
    const plan = snap.exists() ? snap.data()?.subscription?.plan : undefined;
    return plan === 'plus' ? PLAN_LIMITS.plus : PLAN_LIMITS.basic;
  } catch {
    return PLAN_LIMITS.basic;
  }
};

/** Profissionais com acesso + convites pendentes (cada um ocupa uma vaga). */
export const countUsedSlots = async (businessId: string): Promise<number> => {
  const [withAccess, pending] = await Promise.all([
    getDocs(query(collection(firebaseDb, 'professionals'),
      where('businessId', '==', businessId), where('appAccess', '==', true))),
    getDocs(query(collection(firebaseDb, 'professionalInvites'),
      where('businessId', '==', businessId), where('status', '==', 'pending'))),
  ]);
  return withAccess.docs.length + pending.docs.length;
};

export class PlanLimitError extends Error {
  limit: number;
  constructor(limit: number) {
    super('Limite de profissionais do plano atingido');
    this.limit = limit;
  }
}

/** Cria um convite e devolve o codigo. */
export const createInvite = async (params: {
  businessId: string;
  businessName: string;
  professionalId: string;
  professionalName: string;
  ownerId: string;
}): Promise<string> => {
  const [limit, used] = await Promise.all([
    getPlanLimit(params.businessId),
    countUsedSlots(params.businessId),
  ]);
  if (used >= limit) {
    throw new PlanLimitError(limit);
  }
  let code = generateInviteCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await getDoc(doc(firebaseDb, 'professionalInvites', code));
    if (!existing.exists()) {
      break;
    }
    code = generateInviteCode();
  }
  await setDoc(doc(firebaseDb, 'professionalInvites', code), {
    code,
    businessId: params.businessId,
    businessName: params.businessName,
    professionalId: params.professionalId,
    professionalName: params.professionalName,
    createdBy: params.ownerId,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return code;
};

export const revokeInvite = async (code: string): Promise<void> => {
  await updateDoc(doc(firebaseDb, 'professionalInvites', code), {
    status: 'revoked',
    revokedAt: serverTimestamp(),
  });
};

export const removeAppAccess = async (professionalId: string): Promise<void> => {
  await updateDoc(doc(firebaseDb, 'professionals', professionalId), {
    appAccess: false,
    updatedAt: serverTimestamp(),
  });
};

export const buildInviteMessage = (professionalName: string, businessName: string, code: string): string =>
  `Ola, ${professionalName}! Voce foi convidado(a) para ver sua agenda do ${businessName} no app AgendMy.\n\n` +
  '1. Baixe o AgendMy\n2. Escolha PROFISSIONAL\n3. Toque em "Cadastrar agora!"\n' +
  `4. Use o codigo de convite: ${code}`;
