import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { useRealTimeLocation, UseRealTimeLocationResult } from '../features/business/hooks/useRealTimeLocation';

// Contexto UNICO de localizacao para o app inteiro.
// O provider pede a permissao e liga o GPS sozinho; todas as telas e o
// mapa leem a mesma posicao daqui (nada de pedir localizacao em paralelo).
const LocationContext = createContext<UseRealTimeLocationResult | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const locationData = useRealTimeLocation();
  const { hasPermission, isWatching, requestPermission, startWatching } = locationData;
  const askedPermissionRef = useRef(false);

  useEffect(() => {
    if (hasPermission) {
      if (!isWatching) {
        startWatching();
      }
      return;
    }
    // Pede a permissao uma vez ao abrir o app. Se o usuario negar,
    // o botao PERMITIR da tela inicial pede de novo.
    if (!askedPermissionRef.current) {
      askedPermissionRef.current = true;
      requestPermission();
    }
  }, [hasPermission, isWatching, requestPermission, startWatching]);

  return (
    <LocationContext.Provider value={locationData}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): UseRealTimeLocationResult => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation deve ser usado dentro de um LocationProvider');
  }
  return context;
};
