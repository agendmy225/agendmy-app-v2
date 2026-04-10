import { firestore, serverTimestamp, collection, doc, query, where, limit, getDocs, updateDoc, addDoc } from '../config/firebase';
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';


// Tipos
export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface BusinessLocation {
  id?: string;
  businessId: string;
  location: LocationData;

  distance?: number;
}

export interface NearbyBusiness extends BusinessLocation {
  name: string;
  categories?: string[];
  active?: boolean;
  [key: string]: unknown; // For other business properties
}

// Solicitar permissÃ£o de localizaÃ§Ã£o
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'PermissÃ£o de LocalizaÃ§Ã£o',
          message: 'Este app precisa acessar sua localizaÃ§Ã£o para mostrar estabelecimentos prÃ³ximos.',
          buttonNeutral: 'Perguntar depois',
          buttonNegative: 'Cancelar',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true; // iOS jÃ¡ lida com permissÃµes automaticamente
  } catch (error) {
    console.error('Erro ao solicitar permissÃ£o de localizaÃ§Ã£o:', error);
    return false;
  }
};

// Obter localizaÃ§Ã£o atual (melhorada)
export const getCurrentLocation = async (options?: {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}): Promise<LocationData | null> => {
  return new Promise(async (resolve) => {
    try {
      const hasPermission = await requestLocationPermission();

      if (!hasPermission) {
        Alert.alert('PermissÃ£o Negada', 'PermissÃ£o de localizaÃ§Ã£o Ã© necessÃ¡ria para esta funcionalidade.');
        resolve(null);
        return;
      }

      const geoOptions = {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 15000,
        maximumAge: options?.maximumAge ?? 60000,
      };

      Geolocation.getCurrentPosition(
        (position) => {
          console.log('LocalizaÃ§Ã£o atual obtida:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });

          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Erro ao obter localizaÃ§Ã£o atual:', error);
          Alert.alert('Erro', 'NÃ£o foi possÃ­vel obter sua localizaÃ§Ã£o. Verifique se o GPS estÃ¡ ativado.');
          resolve(null);
        },
        geoOptions
      );
    } catch (error) {
      console.error('Erro ao obter localizaÃ§Ã£o atual:', error);
      Alert.alert('Erro', 'NÃ£o foi possÃ­vel obter sua localizaÃ§Ã£o. Verifique se o GPS estÃ¡ ativado.');
      resolve(null);
    }
  });
};

// Obter endereÃ§o a partir de coordenadas (usando Google Geocoding API)
export const getAddressFromCoordinates = async (
  latitude: number,
  longitude: number,
  apiKey: string,
): Promise<string | null> => {
  if (!apiKey) {
    console.warn('Google Maps API Key is missing for geocoding.');
    return null;
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const address = data.results[0].formatted_address;
      return address;
    }

    return null;
  } catch (error) {
    return null;
  }
};

// Obter coordenadas a partir de um endereÃ§o (usando Google Geocoding API)
export const getCoordinatesFromAddress = async (
  address: string,
  apiKey: string,
): Promise<LocationData | null> => {
  if (!apiKey) {
    console.warn('Google Maps API Key is missing for geocoding.');
    return null;
  }
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      const locationData = {
        latitude: lat,
        longitude: lng,
        address: data.results[0].formatted_address, // Optionally include formatted address
      };
      return locationData;
    }

    return null;
  } catch (error) {
    return null;
  }
};

// Salvar localizaÃ§Ã£o do estabelecimento
export const saveBusinessLocation = async (
  businessId: string,
  location: LocationData,
): Promise<string> => {
  try {
    // Verificar se jÃ¡ existe uma localizaÃ§Ã£o para este estabelecimento
    const businessLocationsRef = collection(firestore, 'businessLocations');
    const q = query(businessLocationsRef, where('businessId', '==', businessId), limit(1));
    const locationSnapshot = await getDocs(q);

    if (!locationSnapshot.empty) {
      // Atualizar localizaÃ§Ã£o existente
      const locationDoc = locationSnapshot.docs[0];
      const locationDocRef = doc(firestore, 'businessLocations', locationDoc.id);
      await updateDoc(locationDocRef, {
        location,
        updatedAt: serverTimestamp(),
      });

      return locationDoc.id;
    } else {
      // Criar nova localizaÃ§Ã£o
      const locationRef = await addDoc(businessLocationsRef, {
        businessId,
        location,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return locationRef.id;
    }
  } catch (error) {
    throw error;
  }
};

// Obter localizaÃ§Ã£o do estabelecimento
export const getBusinessLocation = async (
  businessId: string,
): Promise<BusinessLocation | null> => {
  try {
    const businessLocationsRef = collection(firestore, 'businessLocations');
    const q = query(businessLocationsRef, where('businessId', '==', businessId), limit(1));
    const locationSnapshot = await getDocs(q);

    if (locationSnapshot.empty) {
      return null;
    }

    const locationDoc = locationSnapshot.docs[0];

    return {
      id: locationDoc.id,
      businessId,
      location: locationDoc.data().location,

    };
  } catch (error) {
    throw error;
  }
};

// Buscar estabelecimentos prÃ³ximos
export const getNearbyBusinesses = async (
  latitude: number,
  longitude: number,
  radiusInKm: number = 5,
  categories: string[] = [],
): Promise<NearbyBusiness[]> => {
  try {
    // Em uma implementaÃ§Ã£o real, usarÃ­amos GeoFirestore ou uma soluÃ§Ã£o similar
    // para consultas geoespaciais. Para simplificar, vamos simular isso.    // Buscar todos os estabelecimentos
    const businessesRef = collection(firestore, 'businesses');
    const businessesSnapshot = await getDocs(businessesRef);

    const businesses: NearbyBusiness[] = [];

    // Para cada estabelecimento, buscar sua localizaÃ§Ã£o
    for (const businessDoc of businessesSnapshot.docs) {
      const business = businessDoc.data();

      // Filtrar por categoria, se especificado
      if (categories.length > 0) {
        const businessCategories = business.categories || [];
        if (!categories.some(category => businessCategories.includes(category))) {
          continue;
        }
      }

      const businessLocationsRef = collection(firestore, 'businessLocations');
      const locationQuery = query(businessLocationsRef, where('businessId', '==', businessDoc.id), limit(1));
      const locationSnapshot = await getDocs(locationQuery);

      if (!locationSnapshot.empty) {
        const locationData = locationSnapshot.docs[0].data().location;

        // Calcular distÃ¢ncia (fÃ³rmula de Haversine)
        const distance = calculateDistance(
          latitude,
          longitude,
          locationData.latitude,
          locationData.longitude,
        );

        // Incluir apenas estabelecimentos dentro do raio especificado
        if (distance <= radiusInKm) {
          businesses.push({
            id: businessDoc.id,
            businessId: businessDoc.id,
            name: business.name || 'Nome nÃ£o informado',
            categories: business.categories,
            active: business.active,
            ...business,
            location: locationData,
            distance,
          });
        }
      }
    }

    // Ordenar por distÃ¢ncia
    return businesses.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  } catch (error) {
    return [];
  }
};

// FunÃ§Ã£o auxiliar para calcular distÃ¢ncia entre duas coordenadas (fÃ³rmula de Haversine)
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // Raio da Terra em km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // DistÃ¢ncia em km
  return distance;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

// Verificar se estabelecimentos tÃªm dados de localizaÃ§Ã£o (melhorado)
export const checkBusinessesLocationData = async (): Promise<{
  total: number;
  withLocation: number;
  withoutLocation: string[];
  withValidImages: number;
  withoutValidImages: string[];
}> => {
  try {
    // Buscar todos os estabelecimentos ativos
    const businessesSnapshot = await getDocs(
      query(
        collection(firestore, 'businesses'),
        where('active', '==', true),
      ),
    );

    const total = businessesSnapshot.size;
    let withLocation = 0;
    let withValidImages = 0;
    const withoutLocation: string[] = [];
    const withoutValidImages: string[] = [];

    for (const businessDoc of businessesSnapshot.docs) {
      const business = businessDoc.data();
      const businessId = businessDoc.id;
      const businessName = business.name || 'Nome nÃ£o informado';

      // Verificar localizaÃ§Ã£o
      let hasLocation = false;
      if (business.location?.latitude && business.location?.longitude) {
        hasLocation = true;
      } else {
        // Verificar se tem localizaÃ§Ã£o na coleÃ§Ã£o separada
        const locationSnapshot = await getDocs(
          query(
            collection(firestore, 'businessLocations'),
            where('businessId', '==', businessId),
            limit(1),
          ),
        );

        if (!locationSnapshot.empty) {
          const locationData = locationSnapshot.docs[0].data().location;
          if (locationData?.latitude && locationData?.longitude) {
            hasLocation = true;
          }
        }
      }

      if (hasLocation) {
        withLocation++;
      } else {
        withoutLocation.push(`${businessName} (ID: ${businessId})`);
      }

      // Verificar imagens vÃ¡lidas
      const hasValidImage = hasValidBusinessImage(business);
      if (hasValidImage) {
        withValidImages++;
      } else {
        withoutValidImages.push(`${businessName} (ID: ${businessId})`);
      }
    }

    return {
      total,
      withLocation,
      withoutLocation,
      withValidImages,
      withoutValidImages,
    };
  } catch (error) {
    console.error('Erro ao verificar dados de estabelecimentos:', error);
    throw error;
  }
};

// FunÃ§Ã£o auxiliar para verificar se um estabelecimento tem imagem vÃ¡lida
const hasValidBusinessImage = (business: any): boolean => {
  const images = [business.logo, business.imageUrl, business.coverImage].filter(Boolean);

  for (const image of images) {
    if (typeof image === 'string' &&
      image.length > 0 &&
      !image.includes('via.placeholder.com') &&
      !image.includes('placeholder') &&
      (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('file://'))
    ) {
      return true;
    }
  }

  return false;
};

// FunÃ§Ã£o para validar se uma URL de imagem Ã© vÃ¡lida
export const validateImageUrl = async (url: string): Promise<boolean> => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Verificar se nÃ£o Ã© placeholder
  if (url.includes('via.placeholder.com') || url.includes('placeholder')) {
    return false;
  }

  // Verificar se Ã© uma URL vÃ¡lida
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
    return false;
  }

  try {
    // Criar um AbortController para timeout manual
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Tentar fazer uma requisiÃ§Ã£o HEAD para verificar se a imagem existe
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    return response.ok && (contentType?.startsWith('image/') || false);
  } catch (error) {
    console.warn('Erro ao validar URL de imagem:', url, error);
    return false;
  }
};
