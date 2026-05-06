import { useEffect } from 'react';
import { useRealTimeLocation } from '../features/business/hooks/useRealTimeLocation';

/**
 * Wrapper sobre useRealTimeLocation que automaticamente:
 *  - Pede permissao de localizacao se ainda nao foi concedida.
 *  - Inicia o watching da posicao em tempo real.
 *  - Retorna { latitude, longitude } | null no formato esperado pelo LeafletMap.
 *
 * Idempotente: se ja houver outro lugar do app pedindo permissao ou observando,
 * o useRealTimeLocation tem refs que evitam chamadas duplicadas.
 */
export function useUserLocation(): { latitude: number; longitude: number } | null {
  const { location, hasPermission, requestPermission, startWatching } =
    useRealTimeLocation();

  useEffect(() => {
    let mounted = true;
    if (!hasPermission) {
      requestPermission().then((granted) => {
        if (granted && mounted) startWatching();
      });
    } else {
      startWatching();
    }
    return () => {
      mounted = false;
    };
  }, [hasPermission, requestPermission, startWatching]);

  if (!location) return null;
  return { latitude: location.latitude, longitude: location.longitude };
}

export default useUserLocation;
