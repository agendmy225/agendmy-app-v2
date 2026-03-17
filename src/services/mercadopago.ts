// Serviço de integração com Mercado Pago
// O app usa o SDK do Mercado Pago via Cloud Functions (backend) para criar preferências de pagamento
// O frontend abre o Checkout Pro via deep link / WebView

import {
  doc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
} from '@react-native-firebase/firestore';
import { firebaseDb, firebaseAuth, firebaseFunctions } from '../config/firebase';
import { httpsCallable } from '@react-native-firebase/functions';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'authorized'
  | 'in_process'
  | 'in_mediation'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back';

export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'credit_card' | 'debit_card' | 'pix';
  // Dados do cartão tokenizado pelo Mercado Pago (nunca armazenamos dados brutos)
  mpCardId?: string;        // ID do cartão no Mercado Pago
  lastFourDigits?: string;
  brand?: string;           // 'visa', 'mastercard', etc.
  expirationMonth?: string;
  expirationYear?: string;
  holderName?: string;
  isDefault: boolean;
  createdAt?: Date;
}

export interface PaymentPreference {
  id: string;
  appointmentId: string;
  userId: string;
  businessId: string;
  amount: number;
  currency: string;
  description: string;
  status: PaymentStatus;
  mpPreferenceId?: string;   // ID da preferência no Mercado Pago
  mpPaymentId?: string;      // ID do pagamento após aprovação
  checkoutUrl?: string;      // URL do Checkout Pro
  pixQrCode?: string;        // QR Code para Pix
  pixQrCodeBase64?: string;
  createdAt?: Date;
  updatedAt?: Date;
  paidAt?: Date;
}

// ─── Criar preferência de pagamento via Cloud Function ────────────────────────

export const createPaymentPreference = async (params: {
  appointmentId: string;
  businessId: string;
  amount: number;
  description: string;
  paymentType?: 'checkout_pro' | 'pix';
}): Promise<{ preferenceId: string; checkoutUrl?: string; pixQrCode?: string; pixQrCodeBase64?: string }> => {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) throw new Error('Usuário não autenticado');

  try {
    // Chamar Cloud Function que cria a preferência no Mercado Pago
    const createPreference = httpsCallable(firebaseFunctions, 'createPaymentPreference');
    const result = await createPreference({
      appointmentId: params.appointmentId,
      businessId: params.businessId,
      amount: params.amount,
      description: params.description,
      paymentType: params.paymentType ?? 'checkout_pro',
      userId: currentUser.uid,
      userEmail: currentUser.email,
    });

    const data = result.data as {
      preferenceId: string;
      checkoutUrl?: string;
      pixQrCode?: string;
      pixQrCodeBase64?: string;
    };

    // Registrar no Firestore para rastreamento
    await addDoc(collection(firebaseDb, 'payments'), {
      appointmentId: params.appointmentId,
      userId: currentUser.uid,
      businessId: params.businessId,
      amount: params.amount,
      currency: 'BRL',
      description: params.description,
      status: 'pending' as PaymentStatus,
      mpPreferenceId: data.preferenceId,
      checkoutUrl: data.checkoutUrl,
      pixQrCode: data.pixQrCode,
      pixQrCodeBase64: data.pixQrCodeBase64,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return data;
  } catch (error) {
    throw new Error('Não foi possível criar o pagamento. Tente novamente.');
  }
};

// ─── Buscar status de um pagamento ───────────────────────────────────────────

export const getPaymentByAppointment = async (
  appointmentId: string,
): Promise<PaymentPreference | null> => {
  try {
    const q = query(
      collection(firebaseDb, 'payments'),
      where('appointmentId', '==', appointmentId),
      orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as PaymentPreference;
  } catch {
    return null;
  }
};

// ─── Métodos de pagamento salvos ──────────────────────────────────────────────

export const getSavedPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) return [];

  try {
    const q = query(
      collection(firebaseDb, 'paymentMethods'),
      where('userId', '==', currentUser.uid),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentMethod));
  } catch {
    return [];
  }
};

export const setDefaultPaymentMethod = async (paymentMethodId: string): Promise<void> => {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) throw new Error('Usuário não autenticado');

  // Remover default de todos os outros
  const q = query(
    collection(firebaseDb, 'paymentMethods'),
    where('userId', '==', currentUser.uid),
  );
  const snap = await getDocs(q);

  const updates = snap.docs.map(d =>
    updateDoc(doc(firebaseDb, 'paymentMethods', d.id), {
      isDefault: d.id === paymentMethodId,
    }),
  );
  await Promise.all(updates);
};

export const deletePaymentMethod = async (paymentMethodId: string): Promise<void> => {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) throw new Error('Usuário não autenticado');

  const pmDoc = await getDoc(doc(firebaseDb, 'paymentMethods', paymentMethodId));
  if (!pmDoc.exists()) throw new Error('Método de pagamento não encontrado');
  if (pmDoc.data()?.userId !== currentUser.uid) throw new Error('Sem permissão');

  // Chamar Cloud Function para remover o cartão no Mercado Pago também
  try {
    const removeCard = httpsCallable(firebaseFunctions, 'removePaymentMethod');
    await removeCard({ paymentMethodId, mpCardId: pmDoc.data()?.mpCardId });
  } catch { /* se falhar no MP, ainda remove localmente */ }

  await updateDoc(doc(firebaseDb, 'paymentMethods', paymentMethodId), {
    active: false,
    deletedAt: serverTimestamp(),
  });
};

// ─── Verificar status do pagamento via Cloud Function ─────────────────────────

export const checkPaymentStatus = async (
  mpPreferenceId: string,
): Promise<PaymentStatus> => {
  try {
    const checkStatus = httpsCallable(firebaseFunctions, 'checkPaymentStatus');
    const result = await checkStatus({ preferenceId: mpPreferenceId });
    return (result.data as { status: PaymentStatus }).status;
  } catch {
    return 'pending';
  }
};
