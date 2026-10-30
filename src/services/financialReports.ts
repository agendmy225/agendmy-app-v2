// src/services/financialReports.ts
// Relatorios financeiros do estabelecimento: receita, comissao por profissional e receita por servico.
// Os agendamentos guardam a data como texto 'AAAA-MM-DD', entao a busca compara texto com texto.
// Comissao: taxa do profissional (commissionRate, se existir) ou a taxa padrao das configuracoes.
// Following React Native Firebase v22 modular API patterns
import {
  firebaseDb,
  Timestamp,
  serverTimestamp,
  collection,
  doc,
  getDocs,
  getDoc,
  where,
  query,
  addDoc,
  orderBy,
  limit as limitTo,
  deleteDoc,
} from '../config/firebase';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { isRevenueStatus, isCanceledStatus, toValidPrice } from '../constants/reportConfig';
import { toLocalDateString } from '../utils/localDate';

export interface FinancialReport {
  id?: string;
  businessId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  startDate: Timestamp;
  endDate: Timestamp;
  totalRevenue: number;
  totalAppointments: number;
  completedAppointments: number;
  canceledAppointments: number;
  noShowAppointments?: number;
  totalCommission?: number;
  professionalCommissions: {
    [professionalId: string]: {
      name: string;
      totalRevenue: number;
      appointmentsCount: number;
      commission: number;
      commissionRate?: number;
    };
  };
  serviceRevenue: {
    [serviceId: string]: {
      name: string;
      totalRevenue: number;
      appointmentsCount: number;
    };
  };
  createdAt?: Timestamp;
}

export interface ReportParams {
  businessId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  startDate: Date;
  endDate: Date;
}

type AnyData = Record<string, any>;

// taxa guardada como fracao (0,5 = 50%); aceita tambem quem gravou 50
const normalizeRate = (v: unknown): number => {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) {
    return 0;
  }
  return n > 1 ? n / 100 : n;
};

const loadAppointments = async (businessId: string, startDate: Date, endDate: Date): Promise<AnyData[]> => {
  const snap = await getDocs(query(
    collection(firebaseDb, 'appointments'),
    where('businessId', '==', businessId),
    where('date', '>=', toLocalDateString(startDate)),
    where('date', '<=', toLocalDateString(endDate)),
  ));
  return snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({ id: d.id, ...(d.data() || {}) }));
};

const loadProfessionals = async (ids: string[]): Promise<Record<string, AnyData>> => {
  const out: Record<string, AnyData> = {};
  await Promise.all(ids.map(async (id) => {
    try {
      const s = await getDoc(doc(firebaseDb, 'professionals', id));
      out[id] = s.exists() ? s.data() || {} : {};
    } catch {
      out[id] = {};
    }
  }));
  return out;
};

const loadServiceNames = async (businessId: string, ids: string[]): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  await Promise.all(ids.map(async (id) => {
    try {
      const s = await getDoc(doc(firebaseDb, 'businesses', businessId, 'services', id));
      out[id] = (s.exists() && (s.data() || {}).name) || '';
    } catch {
      out[id] = '';
    }
  }));
  return out;
};

/** Calcula os numeros do periodo (sem salvar). */
export const computeFinancialData = async (businessId: string, startDate: Date, endDate: Date) => {
  const businessSnap = await getDoc(doc(firebaseDb, 'businesses', businessId));
  if (!businessSnap.exists()) {
    throw new Error('Estabelecimento não encontrado.');
  }
  const business = businessSnap.data() || {};
  const defaultRate = normalizeRate(business.defaultCommissionRate);

  const appointments = await loadAppointments(businessId, startDate, endDate);
  const completed = appointments.filter((a) => isRevenueStatus(a.status));
  const profIds = Array.from(new Set(completed.map((a) => a.professionalId).filter(Boolean))) as string[];
  const serviceIds = Array.from(new Set(completed.map((a) => a.serviceId).filter(Boolean))) as string[];
  const [profs, serviceNames] = await Promise.all([
    loadProfessionals(profIds),
    loadServiceNames(businessId, serviceIds),
  ]);

  let totalRevenue = 0;
  let totalCommission = 0;
  const professionalCommissions: FinancialReport['professionalCommissions'] = {};
  const serviceRevenue: FinancialReport['serviceRevenue'] = {};

  completed.forEach((a) => {
    const price = toValidPrice(a.price);
    totalRevenue += price;

    if (a.serviceId) {
      if (!serviceRevenue[a.serviceId]) {
        serviceRevenue[a.serviceId] = {
          name: serviceNames[a.serviceId] || a.serviceName || 'Serviço',
          totalRevenue: 0,
          appointmentsCount: 0,
        };
      }
      serviceRevenue[a.serviceId].totalRevenue += price;
      serviceRevenue[a.serviceId].appointmentsCount += 1;
    }

    if (a.professionalId) {
      const prof = profs[a.professionalId] || {};
      const rate = normalizeRate(prof.commissionRate) || defaultRate;
      if (!professionalCommissions[a.professionalId]) {
        professionalCommissions[a.professionalId] = {
          name: prof.name || a.professionalName || 'Profissional',
          totalRevenue: 0,
          appointmentsCount: 0,
          commission: 0,
          commissionRate: rate,
        };
      }
      const entry = professionalCommissions[a.professionalId];
      entry.totalRevenue += price;
      entry.appointmentsCount += 1;
      const c = Math.round(price * rate * 100) / 100;
      entry.commission = Math.round((entry.commission + c) * 100) / 100;
      totalCommission += c;
    }
  });

  return {
    defaultRate,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCommission: Math.round(totalCommission * 100) / 100,
    totalAppointments: appointments.length,
    completedAppointments: completed.length,
    canceledAppointments: appointments.filter((a) => isCanceledStatus(a.status)).length,
    noShowAppointments: appointments.filter((a) => a.status === 'no_show').length,
    professionalCommissions,
    serviceRevenue,
  };
};

// Gerar relatorio financeiro (calcula e salva)
export const generateFinancialReport = async (params: ReportParams): Promise<FinancialReport> => {
  const { businessId, period, startDate, endDate } = params;
  if (!businessId || !period || !startDate || !endDate) {
    throw new Error('Parâmetros obrigatórios não fornecidos para gerar o relatório.');
  }
  const data = await computeFinancialData(businessId, startDate, endDate);
  const report: FinancialReport = {
    businessId,
    period,
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(endDate),
    totalRevenue: data.totalRevenue,
    totalCommission: data.totalCommission,
    totalAppointments: data.totalAppointments,
    completedAppointments: data.completedAppointments,
    canceledAppointments: data.canceledAppointments,
    noShowAppointments: data.noShowAppointments,
    professionalCommissions: data.professionalCommissions,
    serviceRevenue: data.serviceRevenue,
    createdAt: serverTimestamp() as Timestamp,
  };
  try {
    const ref = await addDoc(collection(firebaseDb, 'businesses', businessId, 'financialReports'), report);
    return { ...report, id: ref.id };
  } catch {
    // se nao conseguir salvar, mostra mesmo assim
    return report;
  }
};

// Buscar relatorios financeiros salvos
export const getFinancialReports = async (businessId: string, limit = 10): Promise<FinancialReport[]> => {
  const snap = await getDocs(query(
    collection(firebaseDb, 'businesses', businessId, 'financialReports'),
    orderBy('createdAt', 'desc'),
    limitTo(limit),
  ));
  return snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
    id: d.id,
    ...(d.data() as FinancialReport),
  }));
};

export const getFinancialReportById = async (businessId: string, reportId: string): Promise<FinancialReport | null> => {
  const s = await getDoc(doc(firebaseDb, 'businesses', businessId, 'financialReports', reportId));
  if (!s.exists()) {
    return null;
  }
  return { id: s.id, ...(s.data() as FinancialReport) };
};

export const deleteFinancialReport = async (businessId: string, reportId: string): Promise<void> => {
  await deleteDoc(doc(firebaseDb, 'businesses', businessId, 'financialReports', reportId));
};

// Comissoes por periodo
export const calculateCommissions = async (
  businessId: string,
  startDate: Date,
  endDate: Date,
): Promise<{ [professionalId: string]: { name: string; commission: number } }> => {
  const data = await computeFinancialData(businessId, startDate, endDate);
  const out: { [professionalId: string]: { name: string; commission: number } } = {};
  Object.entries(data.professionalCommissions).forEach(([id, p]) => {
    out[id] = { name: p.name, commission: p.commission };
  });
  return out;
};
