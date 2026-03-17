import React, { memo, useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Business } from '../../../services/businesses';
import { colors } from '../../../constants/colors';

interface BusinessMarkerProps {
  business: Business;
  onPress: () => void;
}

const MARKER_SIZE = 40;

// Mapeamento de categorias para ícones do Material Icons
const getCategoryIcon = (category: string): string => {
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
      return 'store'; // Ícone padrão para loja
  }
};

// Cores específicas para cada categoria
const getCategoryColor = (category: string): string => {
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

export const BusinessMarker: React.FC<BusinessMarkerProps> = memo(({ business, onPress }) => {
  const [isRenderComplete, setIsRenderComplete] = useState(false);

  // Mark render as complete after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRenderComplete(true);
    }, 200);
    return () => clearTimeout(timer);
  }, [business.id]);

  // Não renderiza nada se o negócio não tiver localização.
  if (!business.location?.latitude || !business.location?.longitude) {
    return null;
  }

  const iconName = getCategoryIcon(business.category);
  const backgroundColor = getCategoryColor(business.category);

  return (
    <Marker
      key={`business_marker_${business.id}`}
      coordinate={{
        latitude: business.location.latitude,
        longitude: business.location.longitude,
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
        {/* Pequeno triângulo apontando para baixo */}
        <View style={[styles.markerTriangle, { borderTopColor: backgroundColor }]} />
      </View>
    </Marker>
  );
});

BusinessMarker.displayName = 'BusinessMarker';

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
    borderWidth: 2,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    // Sombra para Android
    elevation: 5,
    // Sombra para iOS
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  markerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.primary, // Será sobrescrito
    marginTop: -1,
  },
});