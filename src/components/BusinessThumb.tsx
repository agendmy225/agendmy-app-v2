// src/components/BusinessThumb.tsx
// Foto (logo) atual do estabelecimento, buscada pelo id.
// Usado nos cards de agendamentos e favoritos.
import React, { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { getBusinessById } from '../services/businesses';
import { useResolvedFirebaseUrl } from '../hooks/useResolvedFirebaseUrl';

// cache simples para nao buscar o mesmo negocio varias vezes
const cache = new Map<string, { image: string | null; name: string }>();

interface Props {
  businessId?: string;
  fallbackUri?: string | null;
  name?: string;
  style?: StyleProp<ImageStyle>;
}

const BusinessThumb: React.FC<Props> = ({ businessId, fallbackUri, name, style }) => {
  const cached = businessId ? cache.get(businessId) : undefined;
  const [image, setImage] = useState<string | null>(cached?.image ?? null);
  const [label, setLabel] = useState<string>(cached?.name || name || '');

  useEffect(() => {
    let mounted = true;
    if (!businessId || cache.has(businessId)) {
      return;
    }
    getBusinessById(businessId)
      .then((b) => {
        const img = (b && (b.logo || b.coverImage || b.imageUrl)) || null;
        const nm = (b && b.name) || name || '';
        cache.set(businessId, { image: img, name: nm });
        if (mounted) {
          setImage(img);
          setLabel(nm);
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [businessId, name]);

  const resolved = useResolvedFirebaseUrl(image || fallbackUri || null);

  if (resolved) {
    return <Image source={{ uri: resolved }} style={style} />;
  }
  return (
    <View style={[style as any, styles.fallback]}>
      <Text style={styles.fallbackText}>{(label || '?').charAt(0).toUpperCase()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: 'bold',
  },
});

export default BusinessThumb;
