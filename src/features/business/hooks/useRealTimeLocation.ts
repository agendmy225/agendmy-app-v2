import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, AppState, AppStateStatus, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface UseRealTimeLocationResult {
  location: LocationData | null;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  startWatching: () => void;
  stopWatching: () => void;
  isWatching: boolean;
}

export const useRealTimeLocation = (): UseRealTimeLocationResult => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isWatching, setIsWatching] = useState(false);

  const locationSubscription = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isRequestingPermissionRef = useRef(false);
  const isStartingWatchRef = useRef(false);

  // Checar permissao inicial
  useEffect(() => {
    const checkInitialPermission = async () => {
      try {
        if (Platform.OS === 'android') {
          const permissionStatus = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          setHasPermission(permissionStatus);
        } else {
          setHasPermission(false);
        }
      } catch (err) {
        console.error('Erro ao verificar permissao:', err);
        setHasPermission(false);
      }
    };

    checkInitialPermission();
  }, []);

  // Solicitar permissao de localizacao
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (isRequestingPermissionRef.current) {
      return hasPermission;
    }

    isRequestingPermissionRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permissao de Localizacao',
            message: 'Este aplicativo precisa acessar sua localizacao para mostrar estabelecimentos proximos.',
            buttonNeutral: 'Perguntar depois',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          }
        );
        const permissionGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        setHasPermission(permissionGranted);

        if (!permissionGranted) {
          setError('Permissao de localizacao foi negada');
        }

        return permissionGranted;
      } else {
        return new Promise((resolve) => {
          Geolocation.getCurrentPosition(
            () => {
              setHasPermission(true);
              resolve(true);
            },
            (geoError) => {
              console.error('Erro ao solicitar permissao no iOS:', geoError);
              setError('Permissao de localizacao foi negada');
              setHasPermission(false);
              resolve(false);
            },
            { enableHighAccuracy: true, timeout: 15000 }
          );
        });
      }
    } catch (err) {
      console.error('Erro ao solicitar permissao de localizacao:', err);
      setError('Erro ao solicitar permissao de localizacao');
      setHasPermission(false);
      return false;
    } finally {
      setIsLoading(false);
      isRequestingPermissionRef.current = false;
    }
  }, [hasPermission]);

  // Parar de observar a localizacao
  const stopWatching = useCallback(() => {
    if (locationSubscription.current !== null) {
      Geolocation.clearWatch(locationSubscription.current);
      locationSubscription.current = null;
      setIsWatching(false);
    }
  }, []);

  // Iniciar observacao da localizacao
  const startWatching = useCallback(async () => {
    if (!hasPermission) {
      return;
    }

    if (locationSubscription.current) {
      return;
    }

    if (isWatching) {
      return;
    }

    if (isStartingWatchRef.current) {
      return;
    }

    isStartingWatchRef.current = true;
    setIsLoading(true);
    setError(null);
    setIsWatching(true);

    // CORRIGIDO: Obter localizacao imediata primeiro
    Geolocation.getCurrentPosition(
      (position: any) => {
        const immediateLocation: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy || 0,
          timestamp: position.timestamp,
        };
        setLocation(immediateLocation);
        setIsLoading(false);
        console.log('Localizacao imediata obtida:', immediateLocation.latitude, immediateLocation.longitude);
      },
      (geoError: any) => {
        console.warn('Erro ao obter localizacao imediata:', geoError.message);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    try {
      locationSubscription.current = Geolocation.watchPosition(
        (position: any) => {
          const newLocation: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy || 0,
            timestamp: position.timestamp,
          };

          setLocation(newLocation);
          setIsLoading(false);
          setError(null);
        },
        (geoError: any) => {
          console.error('Erro na observacao de localizacao:', geoError);
          setError(`Erro de localizacao: ${geoError.message}`);
          setIsLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 5000,
          distanceFilter: 10,
        }
      );

      isStartingWatchRef.current = false;
    } catch (err) {
      console.error('Erro ao iniciar observacao de localizacao:', err);
      setError('Erro ao iniciar observacao de localizacao');
      setIsLoading(false);
      setIsWatching(false);
      isStartingWatchRef.current = false;
    }
  }, [hasPermission, isWatching]);

  // Gerenciar estado do app
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        if (hasPermission && !isWatching && !locationSubscription.current) {
          startWatching();
        }
      } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        stopWatching();
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [hasPermission, isWatching, startWatching, stopWatching]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, [stopWatching]);

  return {
    location,
    isLoading,
    error,
    hasPermission,
    requestPermission,
    startWatching,
    stopWatching,
    isWatching,
  };
};
