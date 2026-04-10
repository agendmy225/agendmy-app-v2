import React, { createContext, useContext, ReactNode } from 'react';
import { useRealTimeLocation, UseRealTimeLocationResult } from '../features/business/hooks/useRealTimeLocation';

// Criar o contexto para localizaÃ§Ã£o
const LocationContext = createContext<UseRealTimeLocationResult | undefined>(undefined);

// Provider para o contexto de localizaÃ§Ã£o
interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const locationData = useRealTimeLocation();

  return (
    <LocationContext.Provider value={locationData}>
      {children}
    </LocationContext.Provider>
  );
};

// Hook para usar o contexto de localizaÃ§Ã£o
export const useLocation = (): UseRealTimeLocationResult => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation deve ser usado dentro de um LocationProvider');
  }
  return context;
};
