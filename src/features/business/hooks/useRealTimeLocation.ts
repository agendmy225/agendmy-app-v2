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
  /** TEMPORARIO: trilha de diagnostico exibida na tela inicial */
  debug: string;
}

// Configura o provedor uma unica vez para o app todo.
let geolocationConfigured = false;
const configureGeolocation = () => {
  if (geolocationConfigured) {
    return;
  }
  geolocationConfigured = true;
  try {
    Geolocation.setRNConfiguration({
      skipPermissionRequests: true,
      locationProvider: 'auto',
    } as any);
  } catch (err) {
    console.warn('[useRealTimeLocation] setRNConfiguration falhou:', err);
  }
};

const toLocationData = (position: any): LocationData => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy || 0,
  timestamp: position.timestamp,
});

const SAFETY_TIMEOUT_MS = 30000;

export const useRealTimeLocation = (): UseRealTimeLocationResult => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [debug, setDebug] = useState('');

  const locationSubscription = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isRequestingPermissionRef = useRef(false);
  const isStartingWatchRef = useRef(false);
  const hasLocationRef = useRef(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debugLinesRef = useRef<string[]>([]);
  const startTimeRef = useRef(Date.now());

  // ---------- diagnostico ----------
  const log = useCallback((msg: string) => {
    const t = ((Date.now() - startTimeRef.current) / 1000).toFixed(0);
    debugLinesRef.current = [...debugLinesRef.current.slice(-4), `${t}s ${msg}`];
    setDebug(debugLinesRef.current.join(' | '));
  }, []);

  // ---------- permissao inicial ----------
  useEffect(() => {
    const checkInitialPermission = async () => {
      try {
        if (Platform.OS === 'android') {
          const ok = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          setHasPermission(ok);
          log(`perm inicial ${ok ? 'OK' : 'NAO'}`);
        } else {
          setHasPermission(false);
        }
      } catch (err) {
        setHasPermission(false);
        log('perm inicial ERRO');
      }
    };
    checkInitialPermission();
  }, [log]);

  // ---------- pedir permissao ----------
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (isRequestingPermissionRef.current) {
      return hasPermission;
    }
    isRequestingPermissionRef.current = true;
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
        const ok = granted === PermissionsAndroid.RESULTS.GRANTED;
        setHasPermission(ok);
        log(`pedido perm ${ok ? 'OK' : 'NEGADA'}`);
        if (!ok) {
          setError('Permissao de localizacao foi negada');
        }
        return ok;
      }
      return await new Promise<boolean>((resolve) => {
        Geolocation.getCurrentPosition(
          () => { setHasPermission(true); resolve(true); },
          () => {
            setError('Permissao de localizacao foi negada');
            setHasPermission(false);
            resolve(false);
          },
          { enableHighAccuracy: true, timeout: 15000 }
        );
      });
    } catch (err) {
      setError('Erro ao solicitar permissao de localizacao');
      setHasPermission(false);
      log('pedido perm ERRO');
      return false;
    } finally {
      isRequestingPermissionRef.current = false;
    }
  }, [hasPermission, log]);

  // ---------- parar ----------
  const stopWatching = useCallback(() => {
    if (locationSubscription.current !== null) {
      Geolocation.clearWatch(locationSubscription.current);
      locationSubscription.current = null;
      log('watch parado');
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    setIsWatching(false);
  }, [log]);

  // ---------- receber posicao ----------
  const onPosition = useCallback((source: string) => (position: any) => {
    hasLocationRef.current = true;
    const data = toLocationData(position);
    setLocation(data);
    setIsLoading(false);
    setError(null);
    log(`${source} OK ${data.latitude.toFixed(4)},${data.longitude.toFixed(4)} ~${Math.round(data.accuracy)}m`);
  }, [log]);

  const onError = useCallback((source: string) => (geoError: any) => {
    log(`${source} ERRO ${geoError?.code ?? '?'} ${geoError?.message ?? ''}`);
  }, [log]);

  // ---------- iniciar ----------
  const startWatching = useCallback(() => {
    if (!hasPermission) {
      return;
    }
    if (locationSubscription.current !== null || isWatching || isStartingWatchRef.current) {
      return;
    }

    configureGeolocation();
    isStartingWatchRef.current = true;
    setIsWatching(true);
    setError(null);
    if (!hasLocationRef.current) {
      setIsLoading(true);
    }
    log('iniciando');

    // Seguranca: nunca deixar a tela presa em "Obtendo sua localizacao..."
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
    }
    safetyTimerRef.current = setTimeout(() => {
      if (!hasLocationRef.current) {
        setIsLoading(false);
        setError('Nao foi possivel obter sua localizacao. Toque em ALTERAR para informar.');
        log('desistiu apos 30s');
      }
    }, SAFETY_TIMEOUT_MS);

    // Passo 2: posicao precisa (GPS)
    const requestPrecise = () => {
      Geolocation.getCurrentPosition(
        onPosition('gps'),
        onError('gps'),
        { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 }
      );
    };

    // Passo 1: ultima posicao conhecida / rede (instantaneo dentro de casa)
    Geolocation.getCurrentPosition(
      (position: any) => {
        onPosition('rapida')(position);
        requestPrecise();
      },
      (geoError: any) => {
        onError('rapida')(geoError);
        requestPrecise();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 24 * 60 * 60 * 1000 }
    );

    // Passo 3: acompanhar movimento
    try {
      locationSubscription.current = Geolocation.watchPosition(
        onPosition('watch'),
        onError('watch'),
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000, distanceFilter: 20 }
      );
    } catch (err) {
      log('watch falhou ao iniciar');
      setIsWatching(false);
    } finally {
      isStartingWatchRef.current = false;
    }
  }, [hasPermission, isWatching, log, onPosition, onError]);

  // ---------- app em segundo plano / primeiro plano ----------
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        if (hasPermission && !isWatching && locationSubscription.current === null) {
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

  // ---------- limpeza ----------
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
    debug,
  };
};
