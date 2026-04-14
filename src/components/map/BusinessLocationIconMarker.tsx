import React, { memo, useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';

interface BusinessLocation {
  businessId: string;
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  category?: string; // Pode não ter categoria, então opcional
}

interface BusinessLocationIconMarkerProps {
  business: BusinessLocation;
  onPress?: () => void;
}

const MARKER_SIZE = 40;

// Mapeamento de categorias para ícones do Material Icons
const getCategoryIcon = (category?: string): string => {
  if (!category) return 'store'; // Ãcone padrão se não tiver categoria
  
  switch (category) {
    case 'saloes-beleza':
      return 'content-cut'; // Tesoura
    case 'barbearias':
      return 'storefront'; // Loja/estabelecimento
    case 'estetica':
      return 'spa'; // Spa
    case 'pet-shops':
      return 'pets'; // Pet
    case 'tatuagem':
      return 'brush'; // Pincel
    case 'academia':
      return 'fitness-center'; // Academia
    case 'odontologia':
      return 'local-hospital'; // Hospital/saúde
    case 'fisioterapia':
      return 'accessibility'; // Acessibilidade
    case 'massagem':
      return 'healing'; // Cura/massagem
    case 'manicure':
      return 'colorize'; // Colorir/manicure
    default:
      return 'store'; // Ãcone padrão para loja
  }
};

// Cores específicas para cada categoria
const getCategoryColor = (category?: string): string => {
  if (!category) return colors.primary; // Cor padrão se não tiver categoria
  
  switch (category) {
    case 'saloes-beleza':
      return '#E91E63'; // Rosa
    case 'barbearias':
      return '#795548'; // Marrom
    case 'estetica':
      return '#9C27B0'; // Roxo
    case 'pet-shops':
      return '#FF9800'; // Laranja
    case 'tatuagem':
      return '#424242'; // Cinza escuro
    case 'academia':
      return '#F44336'; // Vermelho
    case 'odontologia':
      return '#2196F3'; // Azul
    case 'fisioterapia':
      return '#4CAF50'; // Verde
    case 'massagem':
      return '#00BCD4'; // Ciano
    case 'manicure':
      return '#FF5722'; // Laranja avermelhado
    default:
      return colors.primary; // Cor padrão
  }
};

export const BusinessLocationIconMarker: React.FC<BusinessLocationIconMarkerProps> = memo(({ business, onPress }) => {
  const [isRenderComplete, setIsRenderComplete] = useState(false);

  // Mark render as complete after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRenderComplete(true);
    }, 200);
    return () => clearTimeout(timer);
  }, [business.businessId]);

  const iconName = getCategoryIcon(business.category);
  const backgroundColor = getCategoryColor(business.category);

  return (
    <Marker
      key={`location_icon_marker_${business.businessId}`}
      coordinate={{
        latitude: business.latitude,
        longitude: business.longitude,
      }}
      onPress={onPress}
      title={business.name}
      description={business.description}
      // Para de rastrear mudanças quando renderização estiver completa
      tracksViewChanges={!isRenderComplete}
    >
      <View style={styles.markerContainer}>
        <View style={[styles.markerWrapper, { backgroundColor }]}>
          <Icon 
            name={iconName} 
            size={24} 
            color={colors.white} 
          />
        </View>
        {/* Pequeno triÃ¢ngulo apontando para baixo */}
        <View style={[styles.markerTriangle, { borderTopColor: backgroundColor }]} />
      </View>
    </Marker>
  );
});

BusinessLocationIconMarker.displayName = 'BusinessLocationIconMarker';

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerWrapper: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  markerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.primary,
    marginTop: -1,
  },
});
