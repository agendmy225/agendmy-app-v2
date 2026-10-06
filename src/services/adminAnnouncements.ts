// src/services/adminAnnouncements.ts
// Painel Admin > Comunicados. O app so grava o comunicado na colecao
// "announcements"; quem envia as notificacoes e a Cloud Function
// "enviarComunicado" (pasta functions-comunicados).
// Following React Native Firebase v22 modular API patterns
import {
  addDoc,
  collection,
  collectionGroup,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import { firebaseDb } from '../config/firebase';

export type Audience = 'all' | 'client' | 'owner';
export type AnnouncementStatus = 'pending' | 'sending' | 'sent' | 'error';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  status: AnnouncementStatus;
  createdAt: Date | null;
  recipients?: number;
  tokens?: number;
  successCount?: number;
  failureCount?: number;
  errorMessage?: string;
}

type RawDoc = {
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

const mapDoc = (d: RawDoc): Announcement => {
  const data = d.data() || {};
  const status = data.status;
  return {
    id: d.id,
    title: (data.title as string) || '',
    body: (data.body as string) || '',
    audience: data.audience === 'client' || data.audience === 'owner' ? data.audience : 'all',
    status: status === 'sending' || status === 'sent' || status === 'error' ? status : 'pending',
    createdAt: toDate(data.createdAt),
    recipients: typeof data.recipients === 'number' ? data.recipients : undefined,
    tokens: typeof data.tokens === 'number' ? data.tokens : undefined,
    successCount: typeof data.successCount === 'number' ? data.successCount : undefined,
    failureCount: typeof data.failureCount === 'number' ? data.failureCount : undefined,
    errorMessage: (data.errorMessage as string) || undefined,
  };
};

/** Coloca um comunicado na fila de envio. */
export const sendAnnouncement = async (
  title: string,
  body: string,
  audience: Audience,
  createdBy: string,
): Promise<void> => {
  await addDoc(collection(firebaseDb, 'announcements'), {
    title: title.trim(),
    body: body.trim(),
    audience,
    status: 'pending',
    createdBy,
    createdAt: serverTimestamp(),
  });
};

/** Historico em tempo real (ultimos 20). Retorna a funcao para parar. */
export const subscribeAnnouncements = (
  onChange: (list: Announcement[]) => void,
): (() => void) => {
  const q = query(collection(firebaseDb, 'announcements'), orderBy('createdAt', 'desc'), limit(20));
  return onSnapshot(
    q,
    (snap: { docs: RawDoc[] }) => onChange(snap.docs.map(mapDoc)),
    (error: unknown) => console.warn('[announcements] erro no tempo real:', error),
  );
};

/** Quantos aparelhos estao registrados para receber notificacao. */
export const countRegisteredDevices = async (): Promise<number> => {
  try {
    const snap = await getDocs(collectionGroup(firebaseDb, 'tokens'));
    return snap.docs.length;
  } catch (error) {
    console.warn('[announcements] erro ao contar aparelhos:', error);
    return 0;
  }
};
