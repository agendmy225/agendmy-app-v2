// Servico de cache DESABILITADO temporariamente para debug
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Business } from './businesses';

const CACHE_KEYS = {
  MOST_RECENT: 'cache_most_recent_businesses',
  TOP_RATED: 'cache_top_rated_businesses',
  PROMOTIONS: 'cache_promotions_businesses',
  ALL_ACTIVE: 'cache_all_active_businesses',
  LAST_UPDATE: 'cache_last_update',
};

const CACHE_DURATION = 5 * 60 * 1000;

export interface CachedBusinessData {
  mostRecent: Business[];
  topRated: Business[];
  promotions: Business[];
  allActive: Business[];
  lastUpdate: number;
}

export const cacheService = {
  async isCacheValid(): Promise<boolean> {
    return false; // DESABILITADO
  },

  async saveCachedData(data: Omit<CachedBusinessData, 'lastUpdate'>): Promise<void> {
    try {
      const now = Date.now();
      await Promise.all([
        AsyncStorage.setItem(CACHE_KEYS.MOST_RECENT, JSON.stringify(data.mostRecent)),
        AsyncStorage.setItem(CACHE_KEYS.TOP_RATED, JSON.stringify(data.topRated)),
        AsyncStorage.setItem(CACHE_KEYS.PROMOTIONS, JSON.stringify(data.promotions)),
        AsyncStorage.setItem(CACHE_KEYS.ALL_ACTIVE, JSON.stringify(data.allActive)),
        AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, now.toString()),
      ]);
    } catch {}
  },

  async getCachedData(): Promise<CachedBusinessData | null> {
    return null; // DESABILITADO - sempre busca do Firebase
  },

  async clearCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CACHE_KEYS.MOST_RECENT),
        AsyncStorage.removeItem(CACHE_KEYS.TOP_RATED),
        AsyncStorage.removeItem(CACHE_KEYS.PROMOTIONS),
        AsyncStorage.removeItem(CACHE_KEYS.ALL_ACTIVE),
        AsyncStorage.removeItem(CACHE_KEYS.LAST_UPDATE),
      ]);
    } catch {}
  },

  async forceRefresh(): Promise<void> {
    await this.clearCache();
  },
};
