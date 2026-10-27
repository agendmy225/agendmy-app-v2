// src/services/cityLocation.ts
// Cidade do cliente a partir das coordenadas (Nominatim/OpenStreetMap) e filtros
// de estabelecimentos por cidade, distancia, nota e promocao.
import { Business } from './businesses';

export type Scope = 'city' | 'radius10' | 'radius30' | 'all';

export interface PlaceInfo {
  city: string;
  state?: string;
}

export interface BusinessFilters {
  scope: Scope;
  minRating: number;
  onlyPromotions: boolean;
}

export const DEFAULT_FILTERS: BusinessFilters = { scope: 'city', minRating: 0, onlyPromotions: false };

const placeCache = new Map<string, PlaceInfo | null>();

export const normalizeText = (s?: string | null): string =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Cidade e estado de um ponto (com cache por regiao de ~1 km). */
export const getCityFromCoordinates = async (lat: number, lon: number): Promise<PlaceInfo | null> => {
  const key = lat.toFixed(2) + ',' + lon.toFixed(2);
  if (placeCache.has(key)) {
    return placeCache.get(key) || null;
  }
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=10&accept-language=pt-BR`;
    const res = await fetch(url, { headers: { 'User-Agent': 'AgendMy/1.0 (agendmy@gmail.com)' } });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    const a = (data && data.address) || {};
    const city = a.city || a.town || a.village || a.municipality || a.city_district || '';
    const info: PlaceInfo | null = city ? { city: String(city), state: a.state ? String(a.state) : undefined } : null;
    placeCache.set(key, info);
    return info;
  } catch {
    return null;
  }
};

export const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const businessCity = (b: Business): string => (b && (b.city || (b.location && b.location.city))) || '';

const kmFrom = (b: Business, lat?: number, lon?: number): number | null => {
  const blat = b && b.location && b.location.latitude;
  const blon = b && b.location && b.location.longitude;
  if (typeof lat !== 'number' || typeof lon !== 'number' || !blat || !blon) {
    return null;
  }
  return distanceKm(lat, lon, blat, blon);
};

/** O estabelecimento fica nessa cidade? (pela cidade cadastrada, pelo endereco ou, sem dados, por ate 15 km) */
export const isInCity = (b: Business, city: string, lat?: number, lon?: number): boolean => {
  const target = normalizeText(city);
  if (!target) {
    return false;
  }
  const c = normalizeText(businessCity(b));
  if (c) {
    return c === target;
  }
  const addr = normalizeText([b.address, b.location && b.location.address].filter(Boolean).join(' '));
  if (addr && addr.includes(target)) {
    return true;
  }
  const km = kmFrom(b, lat, lon);
  return km !== null && km <= 15;
};

/** Filtra pela area escolhida: cidade, 10 km, 30 km ou todas. */
export const filterByScope = (
  list: Business[],
  scope: Scope,
  place: { city?: string; lat?: number; lon?: number },
): Business[] => {
  const safe = (list || []).filter((b) => !!b && !!b.id);
  if (scope === 'all') {
    return safe;
  }
  let effective: Scope = scope;
  if (scope === 'city') {
    if (place.city) {
      return safe.filter((b) => isInCity(b, place.city as string, place.lat, place.lon));
    }
    effective = 'radius30'; // cidade ainda desconhecida: usa 30 km
  }
  if (typeof place.lat !== 'number' || typeof place.lon !== 'number') {
    return safe;
  }
  const r = effective === 'radius10' ? 10 : 30;
  return safe.filter((b) => {
    const km = kmFrom(b, place.lat, place.lon);
    return km !== null && km <= r;
  });
};

/** Nota minima e "so com promocao". */
export const applyExtraFilters = (list: Business[], f: { minRating: number; onlyPromotions: boolean }): Business[] =>
  list.filter((b) =>
    (!f.minRating || (Number(b.rating) || 0) >= f.minRating) &&
    (!f.onlyPromotions || b.hasActivePromotions === true));

const toMillis = (v: any): number => {
  if (!v) {
    return 0;
  }
  if (typeof v.toMillis === 'function') {
    return v.toMillis();
  }
  if (v instanceof Date) {
    return v.getTime();
  }
  const n = Date.parse(String(v));
  return isNaN(n) ? 0 : n;
};

export const sortRecent = (list: Business[]): Business[] =>
  [...list].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

export const sortTopRated = (list: Business[]): Business[] =>
  [...list]
    .filter((b) => (Number(b.rating) || 0) > 0)
    .sort((a, b) =>
      ((Number(b.rating) || 0) - (Number(a.rating) || 0)) ||
      ((Number(b.reviewCount) || 0) - (Number(a.reviewCount) || 0)));

export const scopeLabel = (f: BusinessFilters, city?: string): string => {
  const parts: string[] = [];
  if (f.scope === 'city') {
    parts.push(city ? `Em ${city}` : 'Na sua região');
  } else if (f.scope === 'radius10') {
    parts.push('Até 10 km de você');
  } else if (f.scope === 'radius30') {
    parts.push('Até 30 km de você');
  } else {
    parts.push('Todas as cidades');
  }
  if (f.minRating) {
    parts.push(`nota ${String(f.minRating).replace('.', ',')}+`);
  }
  if (f.onlyPromotions) {
    parts.push('só promoções');
  }
  return parts.join(' · ');
};
