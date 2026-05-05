import { useMemo } from 'react';
import { Business } from '../services/businesses';
import { useMultipleMarkerImages } from './useMarkerImage';
import type { LeafletMarker } from '../components/map/LeafletMap';

/**
 * Recebe uma lista de Business e devolve LeafletMarker[]
 * com logos ja resolvidas (URL HTTPS direta, via useMultipleMarkerImages).
 *
 * - Filtra businesses sem location/lat/lng.
 * - Quando a logo ainda nao foi resolvida, logoUrl fica undefined
 *   e o LeafletMap mostra o fallback (inicial do nome em vermelho).
 */
export function useBusinessMarkers(
  businesses?: Business[] | null
): LeafletMarker[] {
  const businessIds = useMemo(() => {
    if (!businesses) return [];
    return businesses
      .filter(
        (b) => b?.id && b?.location?.latitude && b?.location?.longitude
      )
      .map((b) => b.id);
  }, [businesses]);

  const { states } = useMultipleMarkerImages(businessIds);

  return useMemo(() => {
    if (!businesses) return [];
    return businesses
      .filter(
        (b) => b?.location?.latitude && b?.location?.longitude
      )
      .map((b) => ({
        id: b.id,
        latitude: b.location!.latitude,
        longitude: b.location!.longitude,
        logoUrl: states.get(b.id)?.uri,
        name: b.name,
        category: b.category,
      }));
  }, [businesses, states]);
}

export default useBusinessMarkers;
