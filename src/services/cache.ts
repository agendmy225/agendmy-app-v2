// Serviço de cache para otimizar carregamento da HomeScreen
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Business } from './businesses';

const CACHE_KEYS = {
  MOST_RECENT: 'cache_most_recent_businesses',
  TOP_RATED: 'cache_top_rated_businesses',
  PROMOTIONS: 'cache_promotions_businesses',
  ALL_ACTIVE: 'cache_all_active_businesses',
  LAST_UPDATE: 'cache_last_update',
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos em milliseconds

export interface CachedBusinessData {
  mostRecent: Business[];
  topRated: Business[];
  promotions: Business[];
  allActive: Business[];
  lastUpdate: number;
}

export const cacheService = {
  // Verifica se o cache ainda é válido
  async isCacheValid(): Promise<boolean> {
    try {
      const lastUpdateStr = await AsyncStorage.getItem(CACHE_KEYS.LAST_UPDATE);
      if (!lastUpdateStr) { return false; }

      const lastUpdate = parseInt(lastUpdateStr, 10);
      const now = Date.now();
      return (now - lastUpdate) < CACHE_DURATION;
    } catch {
      return false;
    }
  },

  // Salva dados no cache
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
    } catch {
    }
  },

  // Recupera dados do cache
  async getCachedData(): Promise<CachedBusinessData | null> {
    try {
      const [mostRecentStr, topRatedStr, promotionsStr, allActiveStr, lastUpdateStr] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEYS.MOST_RECENT),
        AsyncStorage.getItem(CACHE_KEYS.TOP_RATED),
        AsyncStorage.getItem(CACHE_KEYS.PROMOTIONS),
        AsyncStorage.getItem(CACHE_KEYS.ALL_ACTIVE),
        AsyncStorage.getItem(CACHE_KEYS.LAST_UPDATE),
      ]);

      if (!mostRecentStr || !topRatedStr || !promotionsStr || !allActiveStr || !lastUpdateStr) {
        return null;
      }

      return {
        mostRecent: JSON.parse(mostRecentStr),
        topRated: JSON.parse(topRatedStr),
        promotions: JSON.parse(promotionsStr),
        allActive: JSON.parse(allActiveStr),
        lastUpdate: parseInt(lastUpdateStr, 10),
      };
    } catch {
      return null;
    }
  },

  // Limpa todo o cache
  async clearCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CACHE_KEYS.MOST_RECENT),
        AsyncStorage.removeItem(CACHE_KEYS.TOP_RATED),
        AsyncStorage.removeItem(CACHE_KEYS.PROMOTIONS),
        AsyncStorage.removeItem(CACHE_KEYS.ALL_ACTIVE),
        AsyncStorage.removeItem(CACHE_KEYS.LAST_UPDATE),
      ]);
    } catch {
    }
  },

  // Força atualização (limpa cache e força novo carregamento)
  async forceRefresh(): Promise<void> {
    await this.clearCache();
  },
};
