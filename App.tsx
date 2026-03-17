import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/features/auth/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import AppNavigator from './src/navigation/AppNavigator';
import { notificationService } from './src/services/notificationService';
import messaging from '@react-native-firebase/messaging';

// Handler para notificações recebidas com o app fechado (deve ficar fora do componente)
messaging().setBackgroundMessageHandler(async () => {
  // O sistema exibe a notificação automaticamente em background/killed state
});

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    // Inicializar listeners de notificação (foreground + tap em notificação)
    const unsubscribe = notificationService.initializeNotificationListeners();
    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LocationProvider>
          <NavigationContainer>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <AppNavigator />
          </NavigationContainer>
        </LocationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
