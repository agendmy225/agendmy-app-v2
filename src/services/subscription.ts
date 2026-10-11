// src/services/subscription.ts
// Assinatura dos donos: regras do plano e como mostrar a situacao.
// A situacao e atualizada pela rotina diaria "rotinaAssinaturas" (Cloud Function).
import { colors } from '../constants/colors';

export const PLAN = {
  trialDays: 30,
  graceDays: 5,
  introPrice: 49.9,
  introMonths: 3,
  fullPrice: 99.9,
};

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled';

export interface SubscriptionView {
  status: SubscriptionStatus;
  label: string;
  color: string;
  icon: string;
  description: string;
  daysLeft: number | null;     // dias de teste restantes
  overdueDays: number | null;  // dias de atraso
  trialEndsAt: Date | null;
  exempt: boolean;
  paidCount: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return value;
  }
  const ts = value as { toDate?: () => Date } | undefined;
  if (ts && typeof ts.toDate === 'function') {
    return ts.toDate();
  }
  return null;
};

export const formatMoney = (value: number): string => `R$ ${value.toFixed(2).replace('.', ',')}`;

export const formatDate = (d: Date | null): string => {
  if (!d) {
    return '-';
  }
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** Converte os dados do negocio na situacao da assinatura para exibir. */
export const getSubscriptionView = (business: Record<string, any> | null | undefined): SubscriptionView => {
  const sub = (business && business.subscription) || {};
  const now = Date.now();
  const trialEndsAt = toDate(sub.trialEndsAt);
  const overdueSince = toDate(sub.overdueSince);
  const paidCount = Number(sub.paidCount) || 0;
  const exempt = sub.exempt === true;
  const status: SubscriptionStatus =
    ['trial', 'active', 'past_due', 'suspended', 'cancelled'].includes(sub.status) ? sub.status : 'trial';

  const base = { status, trialEndsAt, exempt, paidCount, daysLeft: null, overdueDays: null };

  if (exempt) {
    return { ...base, label: 'Isento', color: colors.success, icon: 'verified', description: 'Este negocio nao paga mensalidade.' };
  }
  if (status === 'active') {
    return { ...base, label: 'Em dia', color: colors.success, icon: 'check-circle', description: 'Sua assinatura esta ativa.' };
  }
  if (status === 'past_due') {
    const overdueDays = overdueSince ? Math.max(0, Math.floor((now - overdueSince.getTime()) / DAY_MS)) : 0;
    const left = Math.max(0, PLAN.graceDays - overdueDays);
    return {
      ...base,
      overdueDays,
      label: 'Pagamento pendente',
      color: colors.warning,
      icon: 'warning',
      description: left > 0
        ? `Ative sua assinatura em ate ${left} dia(s) para seu negocio continuar aparecendo no app.`
        : 'Ative sua assinatura para seu negocio continuar aparecendo no app.',
    };
  }
  if (status === 'suspended') {
    return {
      ...base,
      label: 'Suspenso',
      color: colors.error,
      icon: 'block',
      description: 'Seu negocio nao esta aparecendo para os clientes. Ative a assinatura para voltar.',
    };
  }
  if (status === 'cancelled') {
    return { ...base, label: 'Cancelada', color: colors.lightText, icon: 'cancel', description: 'Sua assinatura foi cancelada.' };
  }
  // teste gratis
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now) / DAY_MS)) : PLAN.trialDays;
  return {
    ...base,
    daysLeft,
    label: 'Teste gratis',
    color: colors.primary,
    icon: 'card-giftcard',
    description: trialEndsAt
      ? `Seu teste gratis termina em ${daysLeft} dia(s), no dia ${formatDate(trialEndsAt)}.`
      : `Voce tem ${PLAN.trialDays} dias de teste gratis.`,
  };
};

/** Mostrar aviso na tela inicial do dono? */
export const needsAttention = (view: SubscriptionView): boolean =>
  !view.exempt &&
  (view.status === 'past_due' || view.status === 'suspended' ||
   (view.status === 'trial' && view.daysLeft !== null && view.daysLeft <= 7));
