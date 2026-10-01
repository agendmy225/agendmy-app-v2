// src/services/adminAnalytics.ts
// Calcula os numeros do Painel Admin > Analytics.
// Following React Native Firebase v22 modular API patterns
import { collection, getDocs } from '@react-native-firebase/firestore';
import { firebaseDb } from '../config/firebase';
import { getAllBusinessesAdmin, Business } from './businesses';
import { getAllUsersAdmin, AdminUser } from './adminUsers';
import { getCategoryById } from './categories';

export interface RankItem {
  label: string;
  count: number;
}

export interface AdminAnalytics {
  businesses: { total: number; active: number; inactive: number; newLast30: number };
  users: { total: number; clients: number; owners: number; newLast30: number };
  appointments: {
    total: number;
    scheduled: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    noShow: number;
    completedValue: number;
    newLast30: number;
  };
  byState: RankItem[];
  byCity: RankItem[];
  byCategory: RankItem[];
  withoutCity: string[];
  generatedAt: Date;
}

type RawDoc = {
  id: string;
  data: () => Record<string, any> | undefined;
};

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

const inc = (map: Map<string, number>, key: string) => {
  map.set(key, (map.get(key) || 0) + 1);
};

const rank = (map: Map<string, number>): RankItem[] => {
  const list: RankItem[] = [];
  map.forEach((count: number, label: string) => {
    list.push({ label, count });
  });
  list.sort((a: RankItem, b: RankItem) => b.count - a.count || a.label.localeCompare(b.label));
  return list;
};

export const getAdminAnalytics = async (): Promise<AdminAnalytics> => {
  const now = Date.now();
  const isRecent = (d: Date | null) => !!d && now - d.getTime() <= 30 * DAY_MS;

  const [businesses, users, apptDocs] = await Promise.all([
    getAllBusinessesAdmin(),
    getAllUsersAdmin(),
    getDocs(collection(firebaseDb, 'appointments'))
      .then((snap: { docs: RawDoc[] }) => snap.docs)
      .catch((error: unknown) => {
        console.warn('[getAdminAnalytics] erro ao ler appointments:', error);
        return [] as RawDoc[];
      }),
  ]);

  // ----- Estabelecimentos -----
  const stateMap = new Map<string, number>();
  const cityMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();
  const withoutCity: string[] = [];
  let activeCount = 0;
  let newBusinesses = 0;

  businesses.forEach((b: Business) => {
    if (b.active) {
      activeCount++;
    }
    if (isRecent(toDate(b.createdAt))) {
      newBusinesses++;
    }

    const city = (b.city || '').trim();
    const state = (b.state || '').trim().toUpperCase();
    if (state) {
      inc(stateMap, state);
    }
    if (city) {
      inc(cityMap, state ? `${city} - ${state}` : city);
    } else {
      withoutCity.push(b.name || 'Sem nome');
    }

    const categoryName =
      getCategoryById(b.category)?.name || b.category || 'Sem categoria';
    inc(categoryMap, categoryName);
  });

  // ----- Usuarios -----
  let clients = 0;
  let owners = 0;
  let newUsers = 0;
  users.forEach((u: AdminUser) => {
    if (u.userType === 'client') {
      clients++;
    } else if (u.userType === 'owner') {
      owners++;
    }
    if (isRecent(u.createdAt)) {
      newUsers++;
    }
  });

  // ----- Agendamentos -----
  const appt = {
    total: apptDocs.length,
    scheduled: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    completedValue: 0,
    newLast30: 0,
  };
  apptDocs.forEach((d: RawDoc) => {
    const data = d.data() || {};
    switch (data.status) {
      case 'scheduled': appt.scheduled++; break;
      case 'confirmed': appt.confirmed++; break;
      case 'completed':
        appt.completed++;
        appt.completedValue += Number(data.price) || 0;
        break;
      case 'cancelled': appt.cancelled++; break;
      case 'no_show': appt.noShow++; break;
      default: break;
    }
    if (isRecent(toDate(data.createdAt))) {
      appt.newLast30++;
    }
  });

  return {
    businesses: {
      total: businesses.length,
      active: activeCount,
      inactive: businesses.length - activeCount,
      newLast30: newBusinesses,
    },
    users: { total: users.length, clients, owners, newLast30: newUsers },
    appointments: appt,
    byState: rank(stateMap),
    byCity: rank(cityMap),
    byCategory: rank(categoryMap),
    withoutCity: withoutCity.sort((a: string, b: string) => a.localeCompare(b)),
    generatedAt: new Date(),
  };
};
