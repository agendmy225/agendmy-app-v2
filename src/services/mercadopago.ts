// ServiÃ§o de integraÃ§Ã£o com Mercado Pago
// Usa Firebase Functions como backend seguro para nÃ£o expor credenciais no app

import { httpsCallable } from '@react-native-firebase/functions';
import { firebaseFunctions, firebaseAuth } from '../config/firebase';

// â”€â”€â”€ Tipos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card';

export interface CardData {
  cardNumber: string;
  cardholderName: string;
  expirationMonth: string;
  expirationYear: string;
  securityCode: string;
  docType: 'CPF' | 'CNPJ';
  docNumber: string;
  email: string;
  installments?: number;
}

export interface CreatePaymentParams {
  appointmentId: string;
  amount: number;           // em centavos (ex: 5000 = R$50,00)
  description: string;
  paymentMethod: PaymentMethod;
  cardData?: CardData;
  pixEmail?: string;
}

export interface PaymentResult {
  id: string;
  status: 'approved' | 'pending' | 'rejected' | 'cancelled';
  statusDetail: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  pixExpirationDate?: string;
  transactionAmount: number;
}

export interface SavedCard {
  id: string;
  lastFourDigits: string;
  brand: string;
  holderName: string;
  expirationMonth: string;
  expirationYear: string;
  isDefault: boolean;
  customerId: string;
}

// â”€â”€â”€ FunÃ§Ãµes principais â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Cria um pagamento via Mercado Pago.
 * O processamento real ocorre na Cloud Function para manter a chave secreta segura.
 */
export const createPayment = async (params: CreatePaymentParams): Promise<PaymentResult> => {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) throw new Error('UsuÃ¡rio nÃ£o autenticado.');

  const createPaymentFn = httpsCallable<CreatePaymentParams, PaymentResult>(
    firebaseFunctions,
    'createMercadoPagoPayment',
  );

  const result = await createPaymentFn(params);
  return result.data;
};

/**
 * Gera um QR Code Pix para pagamento.
 */
export const createPixPayment = async (
  appointmentId: string,
  amount: number,
  description: string,
  payerEmail: string,
): Promise<PaymentResult> => {
  return createPayment({
    appointmentId,
    amount,
    description,
    paymentMethod: 'pix',
    pixEmail: payerEmail,
  });
};

/**
 * Processa pagamento com cartÃ£o de crÃ©dito/dÃ©bito.
 */
export const createCardPayment = async (
  appointmentId: string,
  amount: number,
  description: string,
  cardData: CardData,
  method: 'credit_card' | 'debit_card' = 'credit_card',
): Promise<PaymentResult> => {
  return createPayment({
    appointmentId,
    amount,
    description,
    paymentMethod: method,
    cardData,
  });
};

/**
 * Busca o status atual de um pagamento.
 */
export const getPaymentStatus = async (paymentId: string): Promise<PaymentResult> => {
  const getStatusFn = httpsCallable<{ paymentId: string }, PaymentResult>(
    firebaseFunctions,
    'getMercadoPagoPaymentStatus',
  );
  const result = await getStatusFn({ paymentId });
  return result.data;
};

/**
 * Busca os cartÃµes salvos do usuÃ¡rio no Mercado Pago.
 */
export const getSavedCards = async (): Promise<SavedCard[]> => {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) return [];

  const getSavedCardsFn = httpsCallable<Record<string, never>, SavedCard[]>(
    firebaseFunctions,
    'getMercadoPagoSavedCards',
  );

  const result = await getSavedCardsFn({});
  return result.data ?? [];
};

/**
 * Cancela um pagamento pendente.
 */
export const cancelPayment = async (paymentId: string): Promise<void> => {
  const cancelFn = httpsCallable<{ paymentId: string }, void>(
    firebaseFunctions,
    'cancelMercadoPagoPayment',
  );
  await cancelFn({ paymentId });
};

// â”€â”€â”€ Helpers de formataÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const formatAmount = (amountInCents: number): string => {
  return (amountInCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

export const getPaymentStatusLabel = (status: PaymentResult['status']): string => {
  const labels: Record<PaymentResult['status'], string> = {
    approved: 'Aprovado',
    pending: 'Aguardando pagamento',
    rejected: 'Recusado',
    cancelled: 'Cancelado',
  };
  return labels[status] ?? status;
};

export const getPaymentStatusColor = (status: PaymentResult['status']): string => {
  const colors: Record<PaymentResult['status'], string> = {
    approved: '#4CAF50',
    pending: '#FFA000',
    rejected: '#D32F2F',
    cancelled: '#777777',
  };
  return colors[status] ?? '#777777';
};

export const maskCardNumber = (number: string): string =>
  number.replace(/\s/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim();

export const validateCardNumber = (number: string): boolean => {
  const digits = number.replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(digits)) return false;
  // Luhn
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
};

export const detectCardBrand = (number: string): string => {
  const n = number.replace(/\s/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^5[1-5]/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^6(?:011|5)/.test(n)) return 'Elo';
  if (/^(?:636368|438935|504175|451416|636297)/.test(n)) return 'Elo';
  return 'CartÃ£o';
};
