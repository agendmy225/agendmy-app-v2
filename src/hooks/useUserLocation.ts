import { useMemo } from 'react';
import { useLocation } from '../context/LocationContext';

/**
 * Posicao do usuario no formato do LeafletMap ({ latitude, longitude } | null).
 * Le do contexto UNICO de localizacao (LocationContext). Nao cria outro
 * pedido de GPS: o LocationProvider ja cuida da permissao e do acompanhamento.
 */
export function useUserLocation(): { latitude: number; longitude: number } | null {
  const { location } = useLocation();
  const lat = location?.latitude;
  const lon = location?.longitude;

  return useMemo(() => {
    if (lat === undefined || lon === undefined) {
      return null;
    }
    return { latitude: lat, longitude: lon };
  }, [lat, lon]);
}

export default useUserLocation;
