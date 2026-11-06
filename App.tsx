import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { OwnerProvider } from './src/context/OwnerContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { registerForPushNotificationsAsync } from './src/services/notificationService';

export default function App() {
  useEffect(() => {
    // Inicializar canales de notificación en Android y solicitar permisos al OS
    registerForPushNotificationsAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OwnerProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </OwnerProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
