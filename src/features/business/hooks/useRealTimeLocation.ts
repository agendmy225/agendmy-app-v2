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

  // Checar permissão inicial
  useEffect(() => {
    const checkInitialPermission = async () => {
      try {
        if (Platform.OS === 'android') {
          const permissionStatus = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          setHasPermission(permissionStatus);
          if (permissionStatus) {
            console.log('Permissão de localização já estava concedida.');
          }
        } else {
          // No iOS, a permissão é verificada automaticamente quando usamos o Geolocation
          // Assumimos que temos permissão inicialmente, será verificada quando necessário
          setHasPermission(false);
        }
      } catch (err) {
        console.error('Erro ao verificar permissão:', err);
        setHasPermission(false);
      }
    };

    checkInitialPermission();
  }, []);

  // Solicitar permissão de localização
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
            title: 'Permissão de Localização',
            message: 'Este aplicativo precisa acessar sua localização',
            buttonNeutral: 'Perguntar depois',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          }
        );
        const permissionGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        setHasPermission(permissionGranted);

        if (!permissionGranted) {
          setError('Permissão de localização foi negada');
        }

        return permissionGranted;
      } else {
        // No iOS, tentamos obter a localização atual para solicitar permissão
        return new Promise((resolve) => {
          Geolocation.getCurrentPosition(
            () => {
              setHasPermission(true);
              resolve(true);
            },
            (geoError) => {
              console.error('Erro ao solicitar permissão no iOS:', geoError);
              setError('Permissão de localização foi negada');
              setHasPermission(false);
              resolve(false);
            },
            { enableHighAccuracy: false, timeout: 15000 }
          );
        });
      }
    } catch (err) {
      console.error('Erro ao solicitar permissão de localização:', err);
      setError('Erro ao solicitar permissão de localização');
      setHasPermission(false);
      return false;
    } finally {
      setIsLoading(false);
      isRequestingPermissionRef.current = false;
    }
  }, [hasPermission]);

  // Parar de observar a localização
  const stopWatching = useCallback(() => {
    if (locationSubscription.current !== null) {
      Geolocation.clearWatch(locationSubscription.current);
      locationSubscription.current = null;
      setIsWatching(false);
      console.log('Parou de observar a localização');
    }
  }, []);

  // Iniciar observação da localização
  const startWatching = useCallback(async () => {
    if (!hasPermission) {
      console.log('Sem permissão para observar localização');
      return;
    }

    if (locationSubscription.current) {
      console.log('Já está observando a localização');
      return;
    }

    if (isWatching) {
      console.log('Já está no processo de observação');
      return;
    }

    if (isStartingWatchRef.current) {
      console.log('Já está iniciando observação');
      return;
    }

    isStartingWatchRef.current = true;
    setIsLoading(true);
    setError(null);
    setIsWatching(true);

    console.log('Iniciando observação da localização...');

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
          console.error('Erro na observação de localização:', geoError);
          setError(`Erro de localização: ${geoError.message}`);
          setIsLoading(false);
        },
        {
          enableHighAccuracy: false, // Balanced accuracy
          timeout: 60000, // 60 segundos
          maximumAge: 60000, // Cache por 60 segundos
          distanceFilter: 100, // 100 metros
        }
      );

      console.log('Observação da localização iniciada');
      isStartingWatchRef.current = false;
    } catch (err) {
      console.error('Erro ao iniciar observação de localização:', err);
      setError('Erro ao iniciar observação de localização');
      setIsLoading(false);
      setIsWatching(false);
      isStartingWatchRef.current = false;
    }
  }, [hasPermission, isWatching]);

  // Gerenciar estado do app
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('App state mudou de', appStateRef.current, 'para', nextAppState);

      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App voltou para foreground - só reinicia se não estiver observando
        if (hasPermission && !isWatching && !locationSubscription.current) {
          console.log('App voltou ao foreground, reiniciando localização...');
          startWatching();
        }
      } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App foi para background
        console.log('App foi para background, parando localização...');
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
