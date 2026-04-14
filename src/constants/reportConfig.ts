// Configurações para relatórios financeiros
export const REPORT_CONFIG = {
  // IMPORTANTE: NÃƒO usar valor fixo - sempre usar configuração do usuário
  // Se não houver configuração, o sistema deve alertar o usuário para configurar
  DEFAULT_COMMISSION_RATE: null, // Removido valor fixo
  
  // Configurações de formatação
  CURRENCY_LOCALE: 'pt-BR',
  CURRENCY_CODE: 'BRL',
  
  // Períodos disponíveis para relatórios
  AVAILABLE_PERIODS: [
    { value: 'daily', label: 'Diário' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'yearly', label: 'Anual' },
    { value: 'custom', label: 'Personalizado' },
  ] as const,
  
  // Status de agendamentos que devem ser considerados como receita
  REVENUE_STATUSES: ['completed'],
  
  // Status de agendamentos cancelados
  CANCELED_STATUSES: ['canceled', 'cancelled'],
  
  // Configurações de cache
  CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutos
} as const;

export type ReportPeriod = typeof REPORT_CONFIG.AVAILABLE_PERIODS[number]['value'];

/**
 * Formata valor monetário no padrão brasileiro
 */
export const formatCurrency = (value: number): string => {
  const numValue = typeof value === 'number' ? value : parseFloat(value as string) || 0;
  return new Intl.NumberFormat(REPORT_CONFIG.CURRENCY_LOCALE, {
    style: 'currency',
    currency: REPORT_CONFIG.CURRENCY_CODE,
  }).format(numValue);
};

/**
 * Verifica se um status de agendamento deve ser contabilizado como receita
 */
export const isRevenueStatus = (status: string): boolean => {
  return REPORT_CONFIG.REVENUE_STATUSES.includes(status as any);
};

/**
 * Verifica se um status de agendamento é de cancelamento
 */
export const isCanceledStatus = (status: string): boolean => {
  return REPORT_CONFIG.CANCELED_STATUSES.includes(status as any);
};

/**
 * Valida se um valor monetário é válido
 */
export const isValidPrice = (price: unknown): price is number => {
  if (typeof price === 'number') {
    return !isNaN(price) && price >= 0;
  }
  if (typeof price === 'string') {
    const parsed = parseFloat(price);
    return !isNaN(parsed) && parsed >= 0;
  }
  return false;
};

/**
 * Converte um valor para número monetário válido
 */
export const toValidPrice = (price: unknown): number => {
  if (typeof price === 'number') {
    return isNaN(price) ? 0 : Math.max(0, price);
  }
  if (typeof price === 'string') {
    const parsed = parseFloat(price);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }
  return 0;
};
